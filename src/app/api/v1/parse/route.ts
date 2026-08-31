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

    // ⚡ STEP 1: FAST LOCAL EXTAL PULL ATTEMPT (COMPLETES IN MILLISECONDS)
    let localTextContent = '';
    try {
      const pdfParse = require('pdf-parse');
      const parsed = await pdfParse(rawBuffer);
      localTextContent = parsed.text || '';
    } catch (e) {
      console.warn('⚠️ Local text pull failed, using fallback.');
    }

    const ai = new GoogleGenAI({ apiKey });
    let masterTransactions: any[] = [];

    // If text layers exist, pass the raw text tokens directly to cut image execution delays entirely
    if (localTextContent.trim().length > 50) {
      console.log('⚡ DIGITAL PDF DETECTED: RUNNING INSTANT TEXT TOKEN MATRIX...');
      
      const textPrompt = `You are a financial spreadsheet architect. Convert this raw bank statement text dump into a structured JSON array.
      Extract EVERY single row. Do not truncate. Read the balance directly from the row.
      Withdrawals/debits MUST be prefixed with a minus sign like "-$42,148.24".

      DATA DUMP:
      ${localTextContent}

      RETURN SCHEMA:
      { "transactions": [{ "id": 1, "date": "Date", "type": "Type", "description": "Details", "amount": "-$42,148.24", "balance": "$157,100.00" }] }`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash', // Fast structural text extraction model
        contents: [{ text: textPrompt }],
        config: { responseMimeType: 'application/json', temperature: 0.0 }
      });

      const parsedData = cleanAndParseJSON(response.text || '{}');
      masterTransactions = parsedData.transactions || parsedData.rows || parsedData || [];
    } else {
      // 📸 FALLBACK STEP 2: CONCURRENT IMAGE SHARDING BRACKET FOR SCANS
      console.log('📸 SCANNED PDF DETECTED: INITIALIZING PARALLEL VISUAL CHUNKS...');
      const chunkSize = 15; 
      const chunks: { start: number; end: number }[] = [];

      for (let i = 0; i < totalPages; i += chunkSize) {
        chunks.push({ start: i, end: Math.min(i + chunkSize - 1, totalPages - 1) });
      }

      const chunkPromises = chunks.map(async (chunk) => {
        const chunkBase64 = await extractPageRange(srcDoc, chunk.start, chunk.end);
        const visualPrompt = `Extract ALL transaction rows from this bank statement chunk.
        Withdrawals/debits MUST be prefixed with a minus sign like "-$42,148.24".
        Read the balance column exactly as printed. Do not calculate.
        
        RETURN SCHEMA:
        { "transactions": [{ "id": 1, "date": "Date", "type": "Type", "description": "Details", "amount": "-$42,148.24", "balance": "$157,100.00" }] }`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
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

    return NextResponse.json({
      success: true,
      filename: file.name,
      engine_used: 'SwiftLedger Gemini Hybrid Core',
      total_transactions: finalizedRows.length,
      page_count: totalPages,
      rows: finalizedRows,
    });
  } catch (error: any) {
    console.error('System exception caught:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Parsing failed' }, { status: 500 });
  }
}
