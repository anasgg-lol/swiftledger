import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { PDFDocument } from 'pdf-lib';

export const config = {
  api: {
    bodyParser: false, 
  },
};

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024;
const GEMINI_MODELS = ['gemini-2.5-flash'];

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

async function extractPageRange(srcDoc: PDFDocument, start: number, end: number): Promise<string> {
  const newDoc = await PDFDocument.create();
  const rangeIndices = Array.from({ length: end - start + 1 }, (_, i) => start + i);
  const copiedPages = await newDoc.copyPages(srcDoc, rangeIndices);
  copiedPages.forEach(page => newDoc.addPage(page));
  
  const pdfBytes = await newDoc.save();
  const uint8Array = new Uint8Array(pdfBytes);
  return Buffer.from(uint8Array.buffer, uint8Array.byteOffset, uint8Array.byteLength).toString('base64');
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
    const rawBuffer = Buffer.from(bytes);

    const srcDoc = await PDFDocument.load(rawBuffer, { ignoreEncryption: true });
    const totalPages = srcDoc.getPageCount();
    
    // 💡 10 pages per chunk maximizes computing efficiency while preventing 10s timeouts
    const chunkSize = 10; 
    let masterTransactions: any[] = [];

    const ai = new GoogleGenAI({ apiKey });

    console.log(`🚀 SWIFTLEDGER ACTIVE RUNTIME: PARSING ${totalPages} PAGES IN BATCHES`);

    for (let i = 0; i < totalPages; i += chunkSize) {
      const startPage = i;
      const endPage = Math.min(i + chunkSize - 1, totalPages - 1);
      
      console.log(`📦 Compiling Batch Segment: Pages ${startPage + 1} to ${endPage + 1}`);
      const chunkBase64 = await extractPageRange(srcDoc, startPage, endPage);

      const prompt = `You are a professional ledger parser. Extract ALL transaction rows from this bank statement chunk.

CRITICAL PRECISION RULES:
1. Extract EVERY single row printed. DO NOT skip or truncate data.
2. Read the running balance directly from the right-hand side column of each row EXACTLY as printed. DO NOT calculate balances.
3. Hard-enforcement for outbounds/debits: If an amount represents a withdrawal, charge, or negative value (indicated by parentheses like "(42,148.24)" or minus sign "-42,148.24"), you MUST output it with an explicit minus sign prefixed to the string, like "-$42,148.24".

RETURN SCHEMA:
{
  "transactions": [
    {
      "id": 1,
      "date": "Date",
      "type": "Card Payment | Wire | ACH | Direct Debit | Fee",
      "description": "Full row details",
      "amount": "-$42,148.24",
      "balance": "$157,100.00"
    }
  ]
}`;

      try {
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [
            { text: prompt },
            { inlineData: { data: chunkBase64, mimeType: 'application/pdf' } }
          ],
          config: { responseMimeType: 'application/json', temperature: 0.0 }
        });

        const chunkText = response.text || '{}';
        const chunkData = cleanAndParseJSON(chunkText);
        const txs = chunkData.transactions || chunkData.rows || chunkData || [];
        
        if (Array.isArray(txs)) {
          masterTransactions = masterTransactions.concat(txs);
        }
      } catch (err) {
        console.warn(`⚠️ Batch segment failed, bypassing window parameters:`, err);
      }
    }

    const finalizedRows = masterTransactions.map((tx, index) => ({
      ...tx,
      id: index + 1
    }));

    return NextResponse.json({
      success: true,
      filename: file.name,
      engine_used: 'SwiftLedger Gemini 2.5 Batch Stream',
      total_transactions: finalizedRows.length,
      page_count: totalPages,
      rows: finalizedRows,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Parsing failed' }, { status: 500 });
  }
}
