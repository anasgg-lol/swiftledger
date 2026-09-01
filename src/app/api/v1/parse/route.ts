import { NextResponse } from 'next/server';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import { PDFDocument } from 'pdf-lib';

export const config = {
  api: {
    bodyParser: true,
  },
};

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024;
const PAGE_CHUNK_SIZE = 1;      // 1 page per Gemini call — maximum parallelism, smallest output per call
const CONCURRENCY = 10;         // parallel Gemini calls in-flight at once — tune against your Gemini tier's RPM limit

// Strict schema, short keys — the model CANNOT return malformed rows, missing fields, or free text,
// and short keys mean less JSON to generate per row (less time typing "description": vs "desc":).
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
        description: '"debit" if money left the account (withdrawal, purchase, fee, transfer out). "credit" if money was added (deposit, transfer in, refund).',
      },
      b: { type: Type.NUMBER, description: 'Running balance printed on the statement immediately after this transaction' },
    },
    required: ['d', 'desc', 'a', 'dir', 'b'],
    propertyOrdering: ['d', 't', 'desc', 'a', 'dir', 'b'],
  },
};

function buildExtractionPrompt(text: string | null): string {
  const instructions = `You are extracting transaction rows from a bank statement.

Extract EVERY transaction row visible in this document or text chunk — including the very first and very last row. Do not skip, summarize, merge, or truncate any row, even if the chunk starts or ends mid-page.

Rules:
- "a" (amount) is always a positive number. Never put a minus sign or negative number here — use the "dir" field for that instead.
- "dir" is "debit" for money leaving the account (withdrawals, purchases, fees, transfers out) and "credit" for money coming in (deposits, transfers in, refunds).
- "b" (balance) is the running balance printed on the statement after that specific transaction, as a plain number.
- If this chunk has no transaction rows on it (e.g. a cover page), return an empty array. Do not invent rows.`;

  if (text) {
    return `${instructions}\n\nSTATEMENT TEXT:\n${text}`;
  }
  return `${instructions}\n\nThe statement page(s) are attached as a PDF below. Read them visually.`;
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

// Runs `worker` over `items` with at most `limit` in flight at once.
async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>
): Promise<R[]> {
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
          thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
          responseMimeType: 'application/json',
          responseJsonSchema: TRANSACTION_SCHEMA,
        },
      })
    );

    const parsed = JSON.parse(response.text || '[]');
    return { rows: Array.isArray(parsed) ? parsed : [] };
  } catch (err: any) {
    console.error('Chunk extraction failed:', err?.message);
    return { rows: [], error: err?.message || 'unknown error' };
  } finally {
    console.log(`⏱ chunk took ${Date.now() - t0}ms`);
  }
}

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

    // Split into page-chunks up front (fast, local, sequential — pdf-lib isn't safe to hammer concurrently).
    const chunkRanges: { start: number; end: number }[] = [];
    for (let i = 0; i < totalPages; i += PAGE_CHUNK_SIZE) {
      chunkRanges.push({ start: i, end: Math.min(i + PAGE_CHUNK_SIZE - 1, totalPages - 1) });
    }

    const preparedChunks: { base64: string; text: string }[] = [];
    for (const range of chunkRanges) {
      const { base64, buffer } = await buildPageChunk(srcDoc, range.start, range.end);
      let chunkText = '';
      try {
        const pdfParse = require('pdf-parse');
        const parsed = await pdfParse(buffer);
        chunkText = parsed.text || '';
      } catch {
        console.warn(`⚠️ No embedded text layer for pages ${range.start}-${range.end}, using visual extraction.`);
      }
      preparedChunks.push({ base64, text: chunkText });
    }

    // Now do the slow part — the actual Gemini calls — in parallel, capped at CONCURRENCY.
    const chunkResults = await runWithConcurrency(preparedChunks, CONCURRENCY, (prepared) =>
      callGemini(ai, prepared)
    );

    const masterTransactions: any[] = [];
    let failedChunks = 0;
    for (const result of chunkResults) {
      if (result.error) failedChunks++;
      masterTransactions.push(...result.rows);
    }

    const finalizedRows = masterTransactions.map((tx, index) => {
      const amount = typeof tx.a === 'number' ? tx.a : parseFloat(tx.a) || 0;
      const balance = typeof tx.b === 'number' ? tx.b : parseFloat(tx.b) || 0;
      const signedAmount = tx.dir === 'debit' ? -Math.abs(amount) : Math.abs(amount);

      return {
        id: index + 1,
        date: tx.d || '',
        type: tx.t || 'Transaction',
        description: tx.desc || '',
        amount: formatMoney(signedAmount),
        balance: formatMoney(balance),
      };
    });

    console.log(
      `✅ Extracted ${finalizedRows.length} rows from ${totalPages} page(s) across ${chunkRanges.length} chunk(s)` +
        (failedChunks ? `, ${failedChunks} chunk(s) failed.` : '.')
    );

    return NextResponse.json({
      success: true,
      filename: file.name,
      engine_used: 'SwiftLedger Gemini 3.6 JetCore',
      total_transactions: finalizedRows.length,
      page_count: totalPages,
      rows: finalizedRows,
      ...(failedChunks
        ? { warning: `${failedChunks} of ${chunkRanges.length} page-chunk(s) failed to parse and were skipped.` }
        : {}),
    });
  } catch (error: any) {
    console.error('Core Exception caught:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Parsing failed' }, { status: 500 });
  }
}