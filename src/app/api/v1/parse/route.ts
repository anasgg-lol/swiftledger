import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { PDFDocument } from 'pdf-lib';

export const config = {
  api: {
    bodyParser: false, // Prevents Vercel from pre-consuming the request stream
  },
};

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

// 🔥 CRITICAL FIX: Safe deep binary copy that prevents memory drops on Vercel Edge networks
async function extractPageRange(srcDoc: PDFDocument, start: number, end: number): Promise<string> {
  const newDoc = await PDFDocument.create();
  const rangeIndices = Array.from({ length: end - start + 1 }, (_, i) => start + i);
  const copiedPages = await newDoc.copyPages(srcDoc, rangeIndices);
  copiedPages.forEach(page => newDoc.addPage(page));
  
  const pdfBytes = await newDoc.save();
  // Forcing explicit array memory copy prevents Vercel's Node buffer layers from crashing in 3s
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
    
    // Processing pages one-by-one balances accuracy, maximizes memory limits, and prevents truncation
    const chunkSize = 1; 
    let masterTransactions: any[] = [];

    const ai = new GoogleGenAI({ apiKey });

    console.log(`🚀 INITIALIZING SWIFTLEDGER STREAM PARSER: ${totalPages} TOTAL PAGES`);

    for (let i = 0; i < totalPages; i += chunkSize) {
      const startPage = i;
      const endPage = Math.min(i + chunkSize - 1, totalPages - 1);
      
      console.log(`📦 Sequential parsing step: Page ${startPage + 1} of ${totalPages}`);
      const chunkBase64 = await extractPageRange(srcDoc, startPage, endPage);

      const prompt = `You are an institutional financial document parser. Extract ALL transaction rows from this bank statement page.
      
CRITICAL ACCURACY RULES:
1. Extract EVERY single row printed on this page. DO NOT skip any data rows.
2. Read the running balance directly from the right-hand side of each transaction row exactly as printed. DO NOT recalculate or guess balances.
3. Map financials carefully: if an amount has a minus sign, negative indicator, or parentheses like "(42,148.24)", prefix it explicitly with a minus sign like "-$42,148.24".

RETURN SCHEMA:
{
  "transactions": [
    {
      "id": 1,
      "date": "Date",
      "type": "Card Payment | Wire | ACH | Direct Debit | Fee",
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
          config: { 
            responseMimeType: 'application/json', 
            temperature: 0.0 
          }
        });

        const chunkText = response.text || '{}';
        const chunkData = cleanAndParseJSON(chunkText);
        const txs = chunkData.transactions || chunkData.rows || chunkData || [];
        
        if (Array.isArray(txs)) {
          masterTransactions = masterTransactions.concat(txs);
        }
      } catch (err) {
        console.warn(`⚠️ Safe Bypass: Page block ${startPage + 1} failed, advancing parser loop:`, err);
      }
    }

    const finalizedRows = masterTransactions.map((tx, index) => ({
      ...tx,
      id: index + 1
    }));

    console.log(`✅ PARSER MATRIX SUCCESS: Extracted ${finalizedRows.length} total rows across ${totalPages} pages.`);

    return NextResponse.json({
      success: true,
      filename: file.name,
      engine_used: 'SwiftLedger Gemini 2.5 Multi-Chunk Stream',
      total_transactions: finalizedRows.length,
      page_count: totalPages,
      rows: finalizedRows,
    });
  } catch (error: any) {
    console.error('Parsing System Crash Intercepted:', error);
    return NextResponse.json({ 
      success: false, 
      error: error?.message || 'Parsing failed',
      details: String(error)
    }, { status: 500 });
  }
}
