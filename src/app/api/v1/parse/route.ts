import { NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import { PDFDocument } from 'pdf-lib';

export const maxDuration = 60; // Next.js official Route segment configuration config object replacement

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024;
const CONCURRENCY = 8; // Restores true multi-threaded parallel processing limits

if (typeof global.DOMMatrix === 'undefined') {
  (global as any).DOMMatrix = class {};
}

interface LocalRow {
  date: string;
  description: string;
  amount: number; 
  balance: number;
}

interface MoneyToken {
  raw: string;
  value: number;
  explicitSign: -1 | 1 | 0; 
}

const MONEY_REGEX = /\(?-?\+?\$?\s?[\d,]+\.\d{2}\)?/g;
const DATE_REGEX = /^\s*(\d{1,2}[\/\-.]\d{1,2}(?:[\/\-.]\d{2,4})?|\d{4}-\d{1,2}-\d{1,2}|[A-Za-z]{3,9}\.?\s+\d{1,2},?\s*(?:\d{2,4})?)\b/;

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

function tryParseLine(line: string): { date: string; description: string; amountToken: MoneyToken; balanceToken: MoneyToken } | null {
  const dateMatch = line.match(DATE_REGEX);
  if (!dateMatch) return null;

  const tokens = extractMoneyTokens(line);
  if (tokens.length < 2) return null; 

  const balanceToken = tokens[tokens.length - 1];
  const amountToken = tokens[tokens.length - 2];

  const dateEnd = dateMatch.length;
  const amountIndex = line.lastIndexOf(amountToken.raw);
  if (amountIndex <= dateEnd) return null; 

  const description = line.slice(dateEnd, amountIndex).replace(/[|•\-–—]+$/, '').trim();
  if (!description) return null;

  // ✅ PASTE THIS EXPLICIT INDEXED REPLACEMENT INSTEAD:
  return { date: dateMatch[0].trim(), description, amountToken, balanceToken }; // 💡 Explicit array referencing clears the type error!

}

function parsePageLocally(text: string, openingBalance: number | null): { rows: LocalRow[]; resolved: boolean; endingBalance: number | null } {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const candidates = lines.map(tryParseLine).filter((r): r is NonNullable<typeof r> => r !== null);

  if (candidates.length === 0) {
    return { rows: [], resolved: false, endingBalance: openingBalance };
  }

  const rows: LocalRow[] = [];
  let running = openingBalance;
  let allResolved = true;

  for (const c of candidates) {
    const amountAbs = Math.abs(c.amountToken.value);
    const balanceVal = c.balanceToken.value; 

    let signedAmount: number | null = null;

    if (c.amountToken.explicitSign === -1) {
      signedAmount = -amountAbs;
    } else if (c.amountToken.explicitSign === 1) {
      signedAmount = amountAbs;
    } else if (running !== null) {
      const asCredit = Math.abs(running + amountAbs - balanceVal) < 0.01;
      const asDebit = Math.abs(running - amountAbs - balanceVal) < 0.01;
      if (asCredit && !asDebit) signedAmount = amountAbs;
      else if (asDebit && !asCredit) signedAmount = -amountAbs;
    }

    if (signedAmount === null) {
      allResolved = false;
      running = balanceVal; 
      continue;
    }

    rows.push({ date: c.date, description: c.description, amount: signedAmount, balance: balanceVal });
    running = balanceVal;
  }

  return { rows, resolved: allResolved, endingBalance: running };
}

const TRANSACTION_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      d: { type: Type.STRING, description: 'Transaction date exactly as printed' },
      t: { type: Type.STRING, description: 'Transaction category' },
      desc: { type: Type.STRING, description: 'Full transaction description memo line' },
      a: { type: Type.NUMBER, description: 'Absolute value of the transaction amount. Always positive.' },
      dir: { type: Type.STRING, enum: ['debit', 'credit'] },
      b: { type: Type.NUMBER, description: 'Running balance printed immediately after this transaction' },
    },
    required: ['d', 'desc', 'a', 'dir', 'b'],
  },
};

function buildExtractionPrompt(text: string | null): string {
  const instructions = `Extract EVERY transaction row visible in this bank statement. Do not skip, summarize, or truncate.
  Rules:
  - "a" (amount) is always positive. Use the "dir" field ('debit' or 'credit') to indicate flow direction.
  - "b" (balance) is the running balance printed after that specific transaction.`;

  if (text) return `${instructions}\n\nSTATEMENT TEXT:\n${text}`;
  return `${instructions}\n\nThe statement page is attached as a PDF below.`;
}

function formatMoney(value: number): string {
  const sign = value < 0 ? '-' : '';
  return `${sign}$${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

async function buildPageChunk(srcDoc: PDFDocument, start: number, end: number): Promise<{ base64: string; buffer: Buffer }> {
  const newDoc = await PDFDocument.create();
  const rangeIndices = Array.from({ length: end - start + 1 }, (_, i) => start + i);
  const copiedPages = await newDoc.copyPages(srcDoc, rangeIndices);
  copiedPages.forEach((page) => newDoc.addPage(page));

  const pdfBytes = await newDoc.save();
  const buffer = Buffer.from(pdfBytes);
  return { base64: buffer.toString('base64'), buffer };
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

async function callGemini(ai: GoogleGenAI, prepared: { base64: string; text: string }): Promise<{ rows: any[]; error?: string }> {
  try {
    const useDigitalText = prepared.text.trim().length > 50;
    const contents = useDigitalText
      ? [{ text: buildExtractionPrompt(prepared.text) }]
      : [
          { text: buildExtractionPrompt(null) },
          { inlineData: { data: prepared.base64, mimeType: 'application/pdf' } },
        ];

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents,
      config: {
        responseMimeType: 'application/json',
        responseJsonSchema: TRANSACTION_SCHEMA,
      },
    });

    const parsed = JSON.parse(response.text || '[]');
    return { rows: Array.isArray(parsed) ? parsed : [] };
  } catch (err: any) {
    return { rows: [], error: err?.message || 'unknown error' };
  }
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'GEMINI_API_KEY is missing.' }, { status: 500 });

    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const rawBuffer = Buffer.from(bytes);

    const srcDoc = await PDFDocument.load(rawBuffer, { ignoreEncryption: true });
    const totalPages = srcDoc.getPageCount();

    const ai = new GoogleGenAI({ apiKey });
    const dynamicPdfParse = require('pdf-parse');

    const pages: { text: string; base64: string }[] = [];
    for (let p = 0; p < totalPages; p++) {
      const { base64, buffer } = await buildPageChunk(srcDoc, p, p);
      let text = '';
      try {
        const parsed = await dynamicPdfParse(buffer);
        text = parsed.text || '';
      } catch {
        // Scanned fallback
      }
      pages.push({ text, base64 });
    }

    const pageResults: { rows: LocalRow[]; needsGemini: boolean }[] = [];
    let runningBalance: number | null = null;

    for (const page of pages) {
      if (page.text.trim().length < 50) {
        pageResults.push({ rows: [], needsGemini: true });
        continue;
      }
      const { rows, resolved, endingBalance } = parsePageLocally(page.text, runningBalance);
      if (endingBalance !== null) runningBalance = endingBalance;
      pageResults.push({ rows, needsGemini: !resolved });
    }

    const fallbackIndices = pageResults.map((r, i) => (r.needsGemini ? i : -1)).filter((i) => i !== -1);
    
    const fallbackResults = await runWithConcurrency(fallbackIndices, CONCURRENCY, async (i) => ({
      index: i,
      ...(await callGemini(ai, pages[i])),
    }));
    
    const fallbackMap = new Map(fallbackResults.map((r) => [r.index, r]));
    const masterTransactions: { date: string; type: string; description: string; amount: number; balance: number }[] = [];

    for (let i = 0; i < totalPages; i++) {
      if (pageResults[i].needsGemini) {
        const fb = fallbackMap.get(i);
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
      // ✅ PASTE THIS EXACT REMAINDER CONTAINER TO FINALIZE THE ENTIRE FILE:
      description: tx.description,
      amount: formatMoney(tx.amount),
      balance: formatMoney(tx.balance),
    }));

    return NextResponse.json({
      success: true,
      filename: file.name,
      engine_used: 'SwiftLedger Ultra-Speed Hybrid Core',
      total_transactions: finalizedRows.length,
      page_count: totalPages,
      rows: finalizedRows,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Parsing failed' }, { status: 500 });
  }
}
