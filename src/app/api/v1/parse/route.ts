import { NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import { PDFDocument } from 'pdf-lib';

export const maxDuration = 60; 

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
      t: { type: Type.STRING, description: 'Transaction category' },
      desc: { type: Type.STRING, description: 'Full transaction description memo line' },
      a: { type: Type.NUMBER, description: 'Absolute value of the transaction amount. Always positive.' },
      dir: { type: Type.STRING, enum: ['debit', 'credit'] },
      b: { type: Type.NUMBER, description: 'Running balance printed immediately after this transaction' },
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
    if (!apiKey) return NextResponse.json({ error: 'GEMINI_API_KEY is missing.' }, { status: 500 });

    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const rawBuffer = Buffer.from(bytes);

    let pageCount = 1;
    let fullDocumentText = '';

    // ⚡ INSTANT TOP-LEVEL STRING PARSE (COMPLETES IN MILLISECONDS)
    try {
      const dynamicPdfParse = require('pdf-parse');
      const parsed = await dynamicPdfParse(rawBuffer);
      fullDocumentText = parsed.text || '';
      pageCount = parsed.numpages || 1;
    } catch {
      // Scanned fallback
    }

    const ai = new GoogleGenAI({ apiKey });
    let masterTransactions: any[] = [];

    // 💡 IF DIGITAL TEXT LAYER IS PRESENT: BYPASS VISUAL OCR LATENCY COMPLETELY
    if (fullDocumentText.trim().length > 100) {
      console.log(`⚡ DIGITAL TEXT LOGIC IGNITED: PROCESSING ${pageCount} PAGES INSTANTLY...`);
      
      const textPrompt = `You are an institutional financial spreadsheet engine. Convert this raw bank statement text dump into a structured JSON array.
      CRITICAL LAWS:
      1. Extract EVERY single transaction row printed. DO NOT skip or truncate data.
      2. Read the running balance column EXACTLY as printed next to each row.
      3. For outbounds/debits (withdrawals, charges, checks, fees), ensure the "dir" value is output explicitly as "debit".

      RAW DATA INPUT FEED:
      ${fullDocumentText}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: [{ text: textPrompt }],
        config: {
          responseMimeType: 'application/json',
          responseJsonSchema: TRANSACTION_SCHEMA,
          temperature: 0.0,
        },
      });

      const parsedData = cleanAndParseJSON(response.text || '[]');
      masterTransactions = Array.isArray(parsedData) ? parsedData : parsedData.transactions || [];
    } else {
      // 📸 SCANNED / IMAGE FALLBACK CHAIN
      console.log('📸 SCANNED LAYER CORE: RUNNING SINGLE-PASS VISUAL VECTOR MAP...');
      const base64Data = rawBuffer.toString('base64');
      
      const visualPrompt = `Extract EVERY transaction row visible on this bank statement into a structured JSON array matching the schema.
      "dir" must be "debit" for money leaving the account, and "credit" for deposits.
      Read the running balance column exactly as printed next to each row.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: [
          { text: visualPrompt },
          { inlineData: { data: base64Data, mimeType: 'application/pdf' } },
        ],
        config: {
          responseMimeType: 'application/json',
          responseJsonSchema: TRANSACTION_SCHEMA,
          temperature: 0.0,
        },
      });

      const parsedData = cleanAndParseJSON(response.text || '[]');
      masterTransactions = Array.isArray(parsedData) ? parsedData : parsedData.transactions || [];
    }

    const finalizedRows = masterTransactions.map((tx, index) => {
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

    console.log(`✅ SUCCESS: Extracted ${finalizedRows.length} rows across ${pageCount} pages.`);

    return NextResponse.json({
      success: true,
      filename: file.name,
      engine_used: 'SwiftLedger Hyper-Speed Hybrid Core',
      total_transactions: finalizedRows.length,
      page_count: pageCount,
      rows: finalizedRows,
    });
  } catch (error: any) {
    console.error('System Exception caught:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Parsing failed' }, { status: 500 });
  }
}
