import { NextResponse } from 'next/server';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import { PDFDocument } from 'pdf-lib';

const pdfParse = require('pdf-parse');
export const config = {
  api: {
    bodyParser: true,
  },
};

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024;
const CONCURRENCY = 8; // parallel Gemini fallback calls in-flight at once

// ─────────────────────────────────────────────────────────────
// LAYER 1: Local, zero-cost, zero-latency pattern parser
// ─────────────────────────────────────────────────────────────

interface LocalRow {
  date: string;
  description: string;
  amount: number; // signed: negative = debit, positive = credit
  balance: number;
}

interface MoneyToken {
  raw: string;
  value: number;
  explicitSign: -1 | 1 | 0; // -1 if "-123.45" or "(123.45)", 1 if "+123.45", 0 if unsigned
}

const MONEY_REGEX = /\(?-?\+?\$?\s?[\d,]+\.\d{2}\)?/g;
const DATE_REGEX =
  /^\s*(\d{1,2}[\/\-.]\d{1,2}(?:[\/\-.]\d{2,4})?|\d{4}-\d{1,2}-\d{1,2}|[A-Za-z]{3,9}\.?\s+\d{1,2},?\s*(?:\d{2,4})?)\b/;

function extractMoneyTokens(line: string): MoneyToken[] {
  const matches = line.match(MONEY_REGEX) || [];
  return matches.map((raw) => {
    const trimmed = raw.trim();
    const isParen = trimmed.startsWith('(') && trimmed.endsWith(')');
    const isNeg = isParen || trimmed.includes('-');
    const isPos = trimmed.includes('+');
    const numeric = parseFloat(trimmed.replace(/[^0-9.]/g, ''));
    return { raw, value: numeric, explicitSign: isNeg ? -1 : isPos ? 1 : 0 };
  });
}

function tryParseLine(
  line: string
): { date: string; description: string; amountToken: MoneyToken; balanceToken: MoneyToken } | null {
  const dateMatch = line.match(DATE_REGEX);
  if (!dateMatch) return null;

  const tokens = extractMoneyTokens(line);
  if (tokens.length < 2) return null; // need at least an amount AND a balance on the line

  const balanceToken = tokens[tokens.length - 1];
  const amountToken = tokens[tokens.length - 2];

  const dateEnd = dateMatch[0].length;
  const amountIndex = line.lastIndexOf(amountToken.raw);
  if (amountIndex <= dateEnd) return null; // overlapping/malformed match, bail out safely

  const description = line
    .slice(dateEnd, amountIndex)
    .replace(/[|•\-–—]+$/, '')
    .trim();
  if (!description) return null;

  return { date: dateMatch[0].trim(), description, amountToken, balanceToken };
}

// Parses one page's text. Returns rows it's fully confident about, whether
// every row on the page reconciled, and the ending balance to carry forward.
function parsePageLocally(
  text: string,
  openingBalance: number | null
): { rows: LocalRow[]; resolved: boolean; endingBalance: number | null } {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const candidates = lines.map(tryParseLine).filter((r): r is NonNullable<typeof r> => r !== null);

  if (candidates.length === 0) {
    return { rows: [], resolved: false, endingBalance: openingBalance };
  }

  const rows: LocalRow[] = [];
  let running = openingBalance;
  let allResolved = true;

  for (const c of candidates) {
    const amountAbs = Math.abs(c.amountToken.value);
    const balanceVal = c.balanceToken.value; // always trust the printed balance directly — it's read, not computed

    let signedAmount: number | null = null;

    if (c.amountToken.explicitSign === -1) {
      signedAmount = -amountAbs;
    } else if (c.amountToken.explicitSign === 1) {
      signedAmount = amountAbs;
    } else if (running !== null) {
      // No explicit sign printed — reconcile against the running balance to determine direction.
      // Only trust it if EXACTLY ONE direction makes the math work.
      const asCredit = Math.abs(running + amountAbs - balanceVal) < 0.01;
      const asDebit = Math.abs(running - amountAbs - balanceVal) < 0.01;
      if (asCredit && !asDebit) signedAmount = amountAbs;
      else if (asDebit && !asCredit) signedAmount = -amountAbs;
      // if both or neither reconcile, signedAmount stays null -> this row is NOT trusted
    }

    if (signedAmount === null) {
      allResolved = false;
      running = balanceVal; // still anchor forward — the balance itself is printed, not guessed
      continue;
    }

    rows.push({ date: c.date, description: c.description, amount: signedAmount, balance: balanceVal });
    running = balanceVal;
  }

  return { rows, resolved: allResolved, endingBalance: running };
}

// ─────────────────────────────────────────────────────────────
// LAYER 2: Gemini fallback (only for pages Layer 1 couldn't fully trust)
// ─────────────────────────────────────────────────────────────

const TRANSACTION_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      d: { type: Type.STRING, description: 'Transaction date exactly as printed on the statement' },
      t: { type: Type.STRING, description: 'Transaction category as printed, e.g. "ATM Withdrawal", "Direct Deposit"' },
      desc: { type: Type.STRING, description: 'Full transaction description/memo line, exactly as printed' },
      a: { type: Type.NUMBER, description: 'Absolute value of the transaction amount. Always positive, never negative.' },
      dir: {
        type: Type.STRING,
        enum: ['debit', 'credit'],
        description:
          '"debit" if money left the account (withdrawal, purchase, fee, transfer out). "credit" if money was added (deposit, transfer in, refund).',
      },
      b: { type: Type.NUMBER, description: 'Running balance printed on the statement immediately after this transaction' },
    },
    required: ['d', 'desc', 'a', 'dir', 'b'],
    propertyOrdering: ['d', 't', 'desc', 'a', 'dir', 'b'],
  },
};

function buildExtractionPrompt(text: string | null): string {
  const instructions = `You are extracting transaction rows from a bank statement.

Extract EVERY transaction row visible in this document or text — including the very first and very last row. Do not skip, summarize, merge, or truncate any row.

Rules:
- "a" (amount) is always a positive number. Never put a minus sign or negative number here — use the "dir" field for that instead.
- "dir" is "debit" for money leaving the account (withdrawals, purchases, fees, transfers out) and "credit" for money coming in (deposits, transfers in, refunds).
- "b" (balance) is the running balance printed on the statement after that specific transaction, as a plain number.
- If there are no transaction rows (e.g. a cover page), return an empty array. Do not invent rows.`;

  if (text) {
    return `${instructions}\n\nSTATEMENT TEXT:\n${text}`;
  }
  return `${instructions}\n\nThe statement page is attached as a PDF below. Read it visually.`;
}

function formatMoney(value: number): string {
  const sign = value < 0 ? '-' : '';
  return `${sign}$${Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

async function buildPageChunk(
  srcDoc: PDFDocument,
  start: number,
  end: number
): Promise<{ base64: string; buffer: Buffer }> {
  const newDoc = await PDFDocument.create();
  const rangeIndices = Array.from({ length: end - start + 1 }, (_, i) => start + i);
  const copiedPages = await newDoc.copyPages(srcDoc, rangeIndices);
  copiedPages.forEach((page) => newDoc.addPage(page));

  const pdfBytes = await newDoc.save();
  const buffer = Buffer.from(pdfBytes);
  return { base64: buffer.toString('base64'), buffer };
}

async function withRetry<T>(fn: () => Promise<T>, attempts = 2): Promise<T> {
  let lastErr: any;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i < attempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, 400 * (i + 1)));
      }
    }
  }
  throw lastErr;
}

async function runWithConcurrency<T, R>(items: T[], limit: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;

  async function next(): Promise<void> {
    const current = cursor++;
    if (current >= items.length) return;
    results[current] = await worker(items[current]);
    return next();
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => next());
  await Promise.all(workers);
  return results;
}

async function callGemini(
  ai: GoogleGenAI,
  prepared: { base64: string; text: string }
): Promise<{ rows: any[]; error?: string }> {
  const t0 = Date.now();
  try {
    const useDigitalText = prepared.text.trim().length > 50;

    const contents = useDigitalText
      ? [{ text: buildExtractionPrompt(prepared.text) }]
      : [
          { text: buildExtractionPrompt(null) },
          { inlineData: { data: prepared.base64, mimeType: 'application/pdf' } },
        ];

    const response = await withRetry(() =>
      ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents,
        config: {
          responseMimeType: 'application/json',
          responseJsonSchema: TRANSACTION_SCHEMA,
        },
      })
    );

    const parsed = JSON.parse(response.text || '[]');
    return { rows: Array.isArray(parsed) ? parsed : [] };
  } catch (err: any) {
    console.error('Gemini fallback failed:', err?.message);
    return { rows: [], error: err?.message || 'unknown error' };
  } finally {
    console.log(`⏱ Gemini fallback call took ${Date.now() - t0}ms`);
  }
}

// ─────────────────────────────────────────────────────────────
// MAIN HANDLER
// ─────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'GEMINI_API_KEY is missing.' }, { status: 500 });

    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: `File exceeds the ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB limit.` },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const rawBuffer = Buffer.from(bytes);

    const srcDoc = await PDFDocument.load(rawBuffer, { ignoreEncryption: true });
    const totalPages = srcDoc.getPageCount();

    if (totalPages === 0) {
      return NextResponse.json({ error: 'PDF has no pages.' }, { status: 400 });
    }

    const ai = new GoogleGenAI({ apiKey });

    // Extract every page's text + base64 up front (fast, local, sequential — pdf-lib isn't safe to hammer concurrently)
    const pages: { text: string; base64: string }[] = [];
    for (let p = 0; p < totalPages; p++) {
      const { base64, buffer } = await buildPageChunk(srcDoc, p, p);
      let text = '';
      try {
        
        const parsed = await pdfParse(buffer);
        text = parsed.text || '';
      } catch {
        // no embedded text layer — scanned page, will need Gemini vision
      }
      pages.push({ text, base64 });
    }

    // LAYER 1: local parse, sequential (needs balance-chain continuity, but this is regex — effectively instant)
    const t0 = Date.now();
    const pageResults: { rows: LocalRow[]; needsGemini: boolean }[] = [];
    let runningBalance: number | null = null;

    for (const page of pages) {
      if (page.text.trim().length < 50) {
        pageResults.push({ rows: [], needsGemini: true }); // scanned page, no text layer at all
        continue;
      }
      const { rows, resolved, endingBalance } = parsePageLocally(page.text, runningBalance);
      if (endingBalance !== null) runningBalance = endingBalance;
      pageResults.push({ rows, needsGemini: !resolved });
    }
    console.log(`⏱ Local layer resolved in ${Date.now() - t0}ms`);

    // LAYER 2: Gemini fallback, only for pages Layer 1 couldn't fully trust — run in parallel
    const fallbackIndices = pageResults.map((r, i) => (r.needsGemini ? i : -1)).filter((i) => i !== -1);

    const fallbackResults = await runWithConcurrency(fallbackIndices, CONCURRENCY, async (i) => ({
      index: i,
      ...(await callGemini(ai, pages[i])),
    }));
    const fallbackMap = new Map(fallbackResults.map((r) => [r.index, r]));

    let failedPages = 0;
    let localPageCount = 0;
    let geminiPageCount = 0;

    const masterTransactions: { date: string; type: string; description: string; amount: number; balance: number }[] = [];

    for (let i = 0; i < totalPages; i++) {
      if (pageResults[i].needsGemini) {
        geminiPageCount++;
        const fb = fallbackMap.get(i);
        if (fb?.error) failedPages++;
        for (const tx of fb?.rows || []) {
          const amount = typeof tx.a === 'number' ? tx.a : parseFloat(tx.a) || 0;
          const balance = typeof tx.b === 'number' ? tx.b : parseFloat(tx.b) || 0;
          masterTransactions.push({
            date: tx.d || '',
            type: tx.t || 'Transaction',
            description: tx.desc || '',
            amount: tx.dir === 'debit' ? -Math.abs(amount) : Math.abs(amount),
            balance,
          });
        }
      } else {
        localPageCount++;
        for (const row of pageResults[i].rows) {
          masterTransactions.push({
            date: row.date,
            type: 'Transaction',
            description: row.description,
            amount: row.amount,
            balance: row.balance,
          });
        }
      }
    }

    const finalizedRows = masterTransactions.map((tx, index) => ({
      id: index + 1,
      date: tx.date,
      type: tx.type,
      description: tx.description,
      amount: formatMoney(tx.amount),
      balance: formatMoney(tx.balance),
    }));

    console.log(
      `✅ Extracted ${finalizedRows.length} rows from ${totalPages} page(s) — ${localPageCount} resolved locally, ${geminiPageCount} via Gemini` +
        (failedPages ? `, ${failedPages} page(s) failed.` : '.')
    );

    return NextResponse.json({
      success: true,
      filename: file.name,
      engine_used: 'SwiftLedger Hybrid Engine (local + Gemini 3.6 fallback)',
      total_transactions: finalizedRows.length,
      page_count: totalPages,
      rows: finalizedRows,
      ...(failedPages ? { warning: `${failedPages} of ${totalPages} page(s) failed to parse and were skipped.` } : {}),
    });
  } catch (error: any) {
    console.error('Core Exception caught:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Parsing failed' }, { status: 500 });
  }
}