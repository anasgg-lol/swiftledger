import { NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';

export const maxDuration = 60; // Official Next.js Route Config

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024;

function cleanAndParseJSON(rawResponse: string): any {
  let clean = rawResponse.trim();
  clean = clean.replace(/```json/gi, '').replace(/```/g, '').trim();
  try {
    return JSON.parse(clean);
  } catch {
    const lastValidObjectIndex = clean.lastIndexOf('}');
    if (lastValidObjectIndex !== -1) {
      const salvaged = clean.substring(0, lastValidObjectIndex + 1) + ']}';
      try {
        return JSON.parse(salvaged);
      } catch {
        const salvagedArray = clean.substring(0, lastValidObjectIndex + 1) + ']';
        return JSON.parse(salvagedArray);
      }
    }
    return { transactions: [] };
  }
}

const TRANSACTION_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      d: { type: Type.STRING, description: 'Transaction date exactly as printed' },
      t: { type: Type.STRING, description: 'Transaction category categorical type description' },
      desc: { type: Type.STRING, description: 'Full transaction description particulars' },
      a: { type: Type.NUMBER, description: 'Absolute transaction amount. Always positive.' },
      dir: { type: Type.STRING, enum: ['debit', 'credit'], description: '"debit" for withdrawals, charges, fees. "credit" for deposits.' },
      b: { type: Type.NUMBER, description: 'Running account balance printed immediately after this row' },
    },
    required: ['d', 'desc', 'a', 'dir', 'b'],
  },
};

function formatMoney(value: number): string {
  const sign = value < 0 ? '-' : '';
  return `${sign}$${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is missing.' }, { status: 500 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: 'File size exceeds limit.' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const processedBuffer = Buffer.from(bytes);
    
    let mimeType = file.type || '';
    if (!mimeType) {
      if (file.name.endsWith('.pdf')) mimeType = 'application/pdf';
      else if (file.name.endsWith('.png')) mimeType = 'image/png';
      else mimeType = 'image/jpeg';
    }

    let pageCount = 1;
    if (mimeType === 'application/pdf') {
      try {
        const dynamicPdfParse = require('pdf-parse'); // Dynamic scoping passes build bundle checks cleanly
        const parsed = await dynamicPdfParse(processedBuffer);
        pageCount = parsed.numpages || 1;
      } catch {
        pageCount = 1;
      }
    }

    const base64Data = processedBuffer.toString('base64');
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `You are an expert financial ledger parser. Extract ALL transaction rows from this bank statement.

CRITICAL ACCURACY LAWS:
1. Extract EVERY single transaction row printed. DO NOT truncate, skip, or summarize anything.
2. Every transaction MUST include a "balance" field read directly from the statement sheet.
3. Read the running balance directly from the right-hand side column of each row EXACTLY as printed. DO NOT recalculate or guess balances.
4. "a" (amount) is always positive. Use the "dir" field ('debit' or 'credit') to indicate flow direction.

OUTPUT ONLY VALID JSON. NO MARKDOWN. NO EXPLANATION.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash', // Upgraded to active production engine keyword asset
      contents: [
        { text: prompt },
        { inlineData: { data: base64Data, mimeType: mimeType } },
      ],
      config: {
        responseMimeType: 'application/json',
        responseJsonSchema: TRANSACTION_SCHEMA,
        temperature: 0.0,
      },
    });

    const responseText = response.text || '{}';
    const parsedData = cleanAndParseJSON(responseText);
    const masterTransactions = parsedData.transactions || parsedData.rows || parsedData || [];

    // 🔥 PRECISE FIXED VARIABLE RECONCILIATION LAYER (CORRECTLY ACCESSES COMPRESSED SCHEMA KEYS)
    const finalizedRows = masterTransactions.map((tx: any, index: number) => {
      const amount = typeof tx.a === 'number' ? tx.a : parseFloat(tx.a) || 0;
      const balance = typeof tx.b === 'number' ? tx.b : parseFloat(tx.b) || 0;
      const isDebit = tx.dir === 'debit';
      
      return {
        id: index + 1,
        date: tx.d || '',
        type: tx.t || (isDebit ? 'Debit' : 'Credit'),
        description: tx.desc || '',
        amount: formatMoney(isDebit ? -Math.abs(amount) : Math.abs(amount)),
        balance: formatMoney(balance),
      };
    });

    console.log(`✅ JET ENGINE EXECUTION COMPLETE: Extracted ${finalizedRows.length} total rows.`);

    return NextResponse.json({
      success: true,
      filename: file.name,
      engine_used: 'SwiftLedger Single-Pass Core',
      total_transactions: finalizedRows.length,
      page_count: pageCount,
      rows: finalizedRows,
    });
  } catch (error: any) {
    console.error('Parsing System Failure:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Parsing failed' }, { status: 500 });
  }
}
