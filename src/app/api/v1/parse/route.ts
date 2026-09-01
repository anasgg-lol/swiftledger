import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export const maxDuration = 60; // Next.js official Route segment configuration option

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
        const dynamicPdfParse = require('pdf-parse');
        const parsed = await dynamicPdfParse(processedBuffer);
        pageCount = parsed.numpages || 1;
      } catch {
        pageCount = 1;
      }
    }

    const base64Data = processedBuffer.toString('base64');
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `You are a financial document parser. Extract ALL transaction rows from this bank statement.

CRITICAL PRECISION RULES:
1. Extract EVERY single transaction row printed. DO NOT truncate, skip, or summarize.
2. Every transaction MUST include a "balance" field read directly from the statement.
3. Read the running balance directly from the right-hand side column of each row EXACTLY as printed. DO NOT recalculate or guess balances.
4. If an amount represents a withdrawal, debit, charge, fee, or negative value, explicitly output it with a minus sign prefixed to the string, like "-$1,476.44".

THE SCHEMA:
{
  "transactions": [
    {
      "id": 1,
      "date": "Date",
      "type": "Card Payment | Wire | ACH | Direct Debit | Fee",
      "description": "Full description particulars",
      "amount": "-$438,176.22",
      "balance": "$60,351,658.28"
    }
  ]
}

OUTPUT ONLY VALID JSON. NO MARKDOWN. NO EXPLANATION.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: [
        { text: prompt },
        { inlineData: { data: base64Data, mimeType: mimeType } },
      ],
      config: {
        responseMimeType: 'application/json',
        maxOutputTokens: 16384,
        temperature: 0.0,
      },
    });

    const responseText = response.text || '{}';
    const parsedData = cleanAndParseJSON(responseText);
    const transactions = parsedData.transactions || parsedData.rows || parsedData || [];

    return NextResponse.json({
      success: true,
      filename: file.name,
      engine_used: 'SwiftLedger Hyper-Speed Core',
      total_transactions: transactions.length,
      page_count: pageCount,
      rows: transactions,
    });
  } catch (error: any) {
    console.error('Parsing System Failure:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Parsing failed' }, { status: 500 });
  }
}
