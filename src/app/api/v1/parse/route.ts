import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { PDFDocument } from 'pdf-lib';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

// ============ GET PAGE COUNT (FAST) ============
async function getPDFPageCount(buffer: Buffer): Promise<number> {
  try {
    const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    return pdfDoc.getPageCount();
  } catch {
    return 1;
  }
}

// ============ PARSE JSON (SIMPLE) ============
function cleanAndParseJSON(rawResponse: string): any {
  let clean = rawResponse.trim();
  clean = clean.replace(/```json/gi, '').replace(/```/g, '').trim();
  try {
    return JSON.parse(clean);
  } catch {
    // If it's an array that got cut off, close it
    if (clean.startsWith('[') && !clean.endsWith(']')) {
      try { return JSON.parse(clean + ']'); } catch {}
    }
    // If it's an object that got cut off, close it
    if (clean.startsWith('{') && !clean.endsWith('}')) {
      try { return JSON.parse(clean + '}'); } catch {}
    }
    // Try to extract individual objects
    const matches = clean.match(/\{[^{}]*\}/g);
    if (matches && matches.length > 0) {
      try { return matches.map(m => JSON.parse(m)); } catch {}
    }
    return [];
  }
}

// ============ MAIN POST ============
export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'GEMINI_API_KEY missing' },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file uploaded' },
        { status: 400 }
      );
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { success: false, error: 'File exceeds 10MB' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const rawBuffer = Buffer.from(bytes);
    let mimeType = file.type || '';

    if (!mimeType) {
      if (file.name.endsWith('.pdf')) mimeType = 'application/pdf';
      else if (file.name.endsWith('.png')) mimeType = 'image/png';
      else mimeType = 'image/jpeg';
    }

    // Get page count for PDFs
    let pageCount = 1;
    if (mimeType === 'application/pdf') {
      pageCount = await getPDFPageCount(rawBuffer);
    }

    const ai = new GoogleGenAI({ apiKey });
    const base64Data = rawBuffer.toString('base64');

    // THE EXACT PROMPT THAT WORKED
    const prompt = `Extract ALL financial transactions from this document into a JSON object matching this exact schema:
{
  "transactions": [
    {
      "id": 1,
      "date": "1st November 2018",
      "type": "Card Payment | Direct Debit | Bank Credit | Cashpoint | Standing Order",
      "description": "Clean description",
      "amount": "£10.00",
      "balance": "£500.00"
    }
  ]
}`;

    // THE EXACT MODEL AND CONFIG THAT WORKED
    const result = await ai.models.generateContent({
      model: 'gemini-3.5-flash-lite',
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            { inlineData: { data: base64Data, mimeType: mimeType } }
          ]
        }
      ],
      config: {
        responseMimeType: 'application/json',
        maxOutputTokens: 4096,
        temperature: 0.1,
      },
    });

    const text = result.text || '{}';
    const parsedData = cleanAndParseJSON(text);
    const transactions = Array.isArray(parsedData)
      ? parsedData
      : parsedData.transactions || parsedData.rows || Object.values(parsedData)[0] || [];

    return NextResponse.json({
      success: true,
      filename: file.name,
      total_transactions: transactions.length,
      page_count: pageCount,
      rows: transactions,
    });
  } catch (error: any) {
    console.error('❌ Error:', error?.message || error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Parsing failed' },
      { status: 500 }
    );
  }
}