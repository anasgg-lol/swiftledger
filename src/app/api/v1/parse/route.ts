import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import sharp from 'sharp';
import { PDFDocument } from 'pdf-lib';

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

async function getPDFPageCount(buffer: Buffer): Promise<number> {
  try {
    const pdfDoc = await PDFDocument.load(buffer);
    return pdfDoc.getPageCount();
  } catch {
    return 1;
  }
}

// Splits the main master PDF into compressed page array buffers for sequential parsing
async function extractPageRange(srcDoc: PDFDocument, start: number, end: number): Promise<string> {
  const newDoc = await PDFDocument.create();
  const rangeIndices = Array.from({ length: end - start + 1 }, (_, i) => start + i);
  const copiedPages = await newDoc.copyPages(srcDoc, rangeIndices);
  copiedPages.forEach(page => newDoc.addPage(page));
  const pdfBytes = await newDoc.save();
  return Buffer.from(pdfBytes).toString('base64');
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
    let mimeType = file.type || 'application/pdf';

    if (mimeType !== 'application/pdf') {
      return NextResponse.json({ error: 'Multi-page pagination loops require PDF format.' }, { status: 400 });
    }

    const srcDoc = await PDFDocument.load(rawBuffer);
    const totalPages = srcDoc.getPageCount();
    const chunkSize = 5; // Safe parsing bracket window to prevent token overflow
    let masterTransactions: any[] = [];

    const ai = new GoogleGenAI({ apiKey });

    console.log(`🚀 INITIALIZING SWIFTLEDGER CHUNKED PROCESSING: ${totalPages} TOTAL PAGES`);

    for (let i = 0; i < totalPages; i += chunkSize) {
      const startPage = i;
      const endPage = Math.min(i + chunkSize - 1, totalPages - 1);
      
      console.log(`📦 Processing segment array pages: ${startPage + 1} to ${endPage + 1}`);
      const chunkBase64 = await extractPageRange(srcDoc, startPage, endPage);

      const prompt = `Extract ALL transaction rows from this bank statement page chunk. 
DO NOT skip rows. Read the running balance directly from the right column of each row exactly as printed.

RETURN SCHEMA:
{
  "transactions": [
    {
      "id": 1,
      "date": "Date",
      "type": "Card Payment | Wire | ACH | Direct Debit",
      "description": "Row description particulars",
      "amount": "$Amount",
      "balance": "$RunningBalance"
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

        const chunkData = cleanAndParseJSON(response.text || '{}');
        const txs = chunkData.transactions || chunkData.rows || chunkData || [];
        masterTransactions = masterTransactions.concat(txs);
      } catch (err) {
        console.warn(`⚠️ Segment block ${startPage + 1} failed, dropping parameters:`, err);
      }
    }

    // Re-index all processed IDs sequentially for clean frontend sorting grids
    const finalizedRows = masterTransactions.map((tx, index) => ({
      ...tx,
      id: index + 1
    }));

    console.log(`✅ COMPLETE: Extracted ${finalizedRows.length} total rows across ${totalPages} pages.`);

    return NextResponse.json({
      success: true,
      filename: file.name,
      engine_used: 'Gemini 2.5 Chunked Engine',
      total_transactions: finalizedRows.length,
      page_count: totalPages,
      rows: finalizedRows,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Parsing failed' }, { status: 500 });
  }
}
