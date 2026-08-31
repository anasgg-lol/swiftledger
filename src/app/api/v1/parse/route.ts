import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { PDFDocument } from 'pdf-lib';

export const config = {
  api: {
    bodyParser: false, 
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
    if (!apiKey) return NextResponse.json({ error: 'GEMINI_API_KEY is missing.' }, { status: 500 });

    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const rawBuffer = Buffer.from(bytes);

    const srcDoc = await PDFDocument.load(rawBuffer, { ignoreEncryption: true });
    const totalPages = srcDoc.getPageCount();

    // ⚡ STEP 1: LIGHTWEIGHT LOCAL TEXT STRING EXTRACTION (COMPLETES IN MILLISECONDS)
    let localTextContent = '';
    try {
      const pdfParse = require('pdf-parse');
      const parsed = await pdfParse(rawBuffer);
      localTextContent = parsed.text || '';
    } catch (e) {
      console.warn('⚠️ Local text layer parse fallback activated.');
    }

    const ai = new GoogleGenAI({ apiKey });
    let masterTransactions: any[] = [];

    // If a clean digital font text dump exists, bypass visual rendering queues completely
    if (localTextContent.trim().length > 50) {
      console.log('⚡ DIGITAL LOGIC DETECTED: EXECUTING HIGH-SPEED CHARACTER HANDSHAKE...');
      
      const textPrompt = `You are a financial data compiler. Convert this raw bank statement text dump into a structured JSON array.
      
      CRITICAL ACCURACY LAWS:
      1. Extract EVERY single transaction row printed. DO NOT skip or truncate rows.
      2. Read the running balance directly from the data lines exactly as printed. DO NOT calculate balances.
      3. For outbounds/debits: Prefix the amount string explicitly with a minus sign, like "-$14,250.00" or "-$3,420.50".

      RAW DATA INPUT DUMP:
      ${localTextContent}

      RETURN SCHEMA:
      {
        "transactions": [
          {
            "id": 1,
            "date": "Date",
            "type": "Card Payment | Wire | ACH | Direct Debit | Fee",
            "description": "Full description details",
            "amount": "-$3,420.50",
            "balance": "$153,679.50"
          }
        ]
      }`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash', // Active new model deployment layer
        contents: [{ text: textPrompt }],
        config: { 
          responseMimeType: 'application/json',
          temperature: 0.0 
        }
      });

      const parsedData = cleanAndParseJSON(response.text || '{}');
      masterTransactions = parsedData.transactions || parsedData.rows || parsedData || [];
    } else {
      // 📸 FALLBACK STEP 2: HYPER-SPEED PARALLEL CHUNKS FOR EMBEDDED SCANS / IMAGES
      console.log('📸 SCANNED DOCUMENT DETECTED: LAUNCHING PARALLEL CONCURRENT VISUAL LOOPS...');
      
      // Dynamic scaling: single pages request 1 chunk, huge files split into broad 30-page buckets
      const chunkSize = totalPages <= 5 ? totalPages : 30; 
      const chunks: { start: number; end: number }[] = [];

      for (let i = 0; i < totalPages; i += chunkSize) {
        chunks.push({ start: i, end: Math.min(i + chunkSize - 1, totalPages - 1) });
      }

      const chunkPromises = chunks.map(async (chunk) => {
        const chunkBase64 = await extractPageRange(srcDoc, chunk.start, chunk.end);
        
        const visualPrompt = `Extract ALL transaction rows from this bank statement chunk.
        Withdrawals/debits MUST be prefixed explicitly with a minus sign like "-$42,148.24".
        Read the balance column exactly as printed. Do not calculate.
        
        RETURN SCHEMA:
        { "transactions": [{ "id": 1, "date": "Date", "type": "Type", "description": "Details", "amount": "-$42,148.24", "balance": "$157,100.00" }] }`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: [
            { text: visualPrompt },
            { inlineData: { data: chunkBase64, mimeType: 'application/pdf' } }
          ],
          config: { responseMimeType: 'application/json', temperature: 0.0 }
        });

        const chunkData = cleanAndParseJSON(response.text || '{}');
        return chunkData.transactions || chunkData.rows || chunkData || [];
      });

      const resolvedSegments = await Promise.all(chunkPromises);
      for (const segment of resolvedSegments) {
        if (Array.isArray(segment)) masterTransactions = masterTransactions.concat(segment);
      }
    }

    const finalizedRows = masterTransactions.map((tx, index) => ({
      ...tx,
      id: index + 1
    }));

    console.log(`✅ COMPLETE: Extracted ${finalizedRows.length} total transaction rows.`);

    return NextResponse.json({
      success: true,
      filename: file.name,
      engine_used: 'SwiftLedger Gemini 3.6 Hybrid Stream',
      total_transactions: finalizedRows.length,
      page_count: totalPages,
      rows: finalizedRows,
    });
  } catch (error: any) {
    console.error('Core Exception caught:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Parsing failed' }, { status: 500 });
  }
}
