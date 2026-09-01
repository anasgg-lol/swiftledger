import { NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';

export const maxDuration = 60; // Next.js official Route Segment Config

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
      t: { type: Type.STRING, description: 'Transaction category type' },
      desc: { type: Type.STRING, description: 'Full transaction description memo line exactly as printed' },
      a: { type: Type.NUMBER, description: 'Absolute transaction amount value. Always positive, never negative.' },
      dir: { type: Type.STRING, enum: ['debit', 'credit'], description: '"debit" if money left the account, "credit" if money was added.' },
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
    let localTextContent = '';

    if (mimeType === 'application/pdf') {
      try {
        const dynamicPdfParse = require('pdf-parse'); // Dynamic scoping passes build sweeps safely
        const parsed = await dynamicPdfParse(processedBuffer);
        pageCount = parsed.numpages || 1;
        localTextContent = parsed.text || '';
      } catch (e) {
        pageCount = 1;
      }
    }

    const ai = new GoogleGenAI({ apiKey });
    let masterTransactions: any[] = [];

    // ⚡ IF DIGITAL TEXT LAYER IS PRESENT: BYPASS VISUAL OCR LATENCY AND IMAGE PROCESSING LATENCY COMPLETELY
    if (localTextContent.trim().length > 50) {
      console.log(`⚡ HYPER-SPEED DIGITAL CORE: EXTRACTING TEXT FOR ${pageCount} PAGES INSTANTLY...`);
      
      const textPrompt = `You are an expert financial ledger engine. Convert this raw bank statement text dump into a structured JSON array.
      
      CRITICAL ACCURACY LAWS:
      1. Extract EVERY single transaction row printed. DO NOT truncate, skip, or summarize anything.
      2. Read the running balance directly from the data text lines EXACTLY as printed next to each row. DO NOT guess balances.
      3. For outbounds/debits (withdrawals, charges, checks, fees), ensure the "dir" value is output explicitly as "debit".

      RAW DATA TEXT FEED:
      ${localTextContent}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: [{ text: textPrompt }],
        config: {
          responseMimeType: 'application/json',
          responseJsonSchema: TRANSACTION_SCHEMA,
          temperature: 0.0,
        },
      });

      const responseText = response.text || '{}';
      const parsedData = cleanAndParseJSON(responseText);
      masterTransactions = parsedData.transactions || parsedData.rows || parsedData || [];
    } else {
      // 📸 SCANNED / IMAGE FALLBACK CHANNEL
      console.log('📸 SCANNED DOCUMENT CORE: RUNNING SINGLE-PASS VISUAL VECTOR PROMPT...');
      const base64Data = processedBuffer.toString('base64');
      
      const visualPrompt = `You are a financial spreadsheet parser. Extract ALL transaction rows from this bank statement sheet into a structured JSON array matching the schema.
      "dir" must be "debit" for money leaving the account, and "credit" for deposits.
      Read the running balance column exactly as printed next to each row.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: [
          { text: visualPrompt },
          { inlineData: { data: base64Data, mimeType: mimeType } },
        ],
        config: {
          responseMimeType: 'application/json',
          responseJsonSchema: TRANSACTION_SCHEMA,
          temperature: 0.0,
          maxOutputTokens: 16384,
        },
      });

      const responseText = response.text || '{}';
      const parsedData = cleanAndParseJSON(responseText);
      masterTransactions = parsedData.transactions || parsedData.rows || parsedData || [];
    }

    const finalizedRows = masterTransactions.map((tx: any, index: number) => {
      const amount = typeof tx.a === 'number' ? tx.a : parseFloat(tx.a) || 0;
      const balance = typeof tx.b === 'number' ? tx.b : parseFloat(tx.b) || 0;
      const isDebit = String(tx.dir).toLowerCase() === 'debit';
      
      return {
        id: index + 1,
        date: tx.d || '',
        type: tx.t || (isDebit ? 'Debit' : 'Credit'),
        description: tx.desc || '',
        amount: formatMoney(isDebit ? -Math.abs(amount) : Math.abs(amount)),
        balance: formatMoney(balance),
      };
    });

    console.log(`✅ PARSER SUCCESS: Extracted ${finalizedRows.length} rows across ${pageCount} pages.`);

    return NextResponse.json({
      success: true,
      filename: file.name,
      engine_used: 'SwiftLedger Hyper-Speed Hybrid Core',
      total_transactions: finalizedRows.length,
      page_count: pageCount,
      rows: finalizedRows,
    });
  } catch (error: any) {
    console.error('Parsing System Failure:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Parsing failed' }, { status: 500 });
  }
}
