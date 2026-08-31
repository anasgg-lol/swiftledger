import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { PDFDocument } from 'pdf-lib';

export const config = {
  api: {
    bodyParser: false, 
  },
};

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024;

// 🔥 CRITICAL UPGRADE: Enforce the required new active core model asset exclusively
const GEMINI_MODELS = ['gemini-3.6-flash'];

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

    // ⚡ STEP 1: PARSE EMBEDDED TEXT LAYER INSTANTLY (COMPLETES IN MILLISECONDS)
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

    // If a valid embedded digital font mapping layout is found, execute text token conversion
    if (localTextContent.trim().length > 50) {
      console.log('⚡ DIGITAL FILE TRAFFIC DETECTED: EXECUTING INSTANT TOKEN PARSE...');
      
      const textPrompt = `You are an elite financial database compiler. Convert this raw bank statement text dump into a clean, structured JSON transaction array.
      CRITICAL ACCOUNTING RULES:
      1. Extract EVERY single transaction row printed. DO NOT skip or truncate data.
      2. Read the running balance directly from the right-hand column metrics. DO NOT recalculate or guess balances.
      3. For outbounds/debits: If an amount represents a withdrawal, charge, fee, or negative indicator, you MUST output it prefixed with an explicit minus sign, like "-$42,148.24".

      RAW DATA INPUT DUMP:
      ${localTextContent}

      RETURN TARGET SCHEMA:
      {
        "transactions": [
          {
            "id": 1,
            "date": "Date",
            "type": "Card Payment | Wire | ACH | Direct Debit | Fee",
            "description": "Row details",
            "amount": "-$42,148.24",
            "balance": "$157,100.00"
          }
        ]
      }`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash', // Fully synchronized active production engine
        contents: [{ text: textPrompt }],
        config: { responseMimeType: 'application/json', temperature: 0.0 }
      });

      const parsedData = cleanAndParseJSON(response.text || '{}');
      masterTransactions = parsedData.transactions || parsedData.rows || parsedData || [];
    } else {
      // 📸 STEP 2: CONCURRENT GRAPHIC VISUAL SHARDING FOR SCANNED DOCUMENTS / IMAGES
      console.log('📸 SCANNED LAYER DETECTED: LAUNCHING MULTI-THREADED ASYNC VISUAL PLUMBING...');
      
      const chunkSize = 45; 
      const chunks: { start: number; end: number }[] = [];

      for (let i = 0; i < totalPages; i += chunkSize) {
        chunks.push({ start: i, end: Math.min(i + chunkSize - 1, totalPages - 1) });
      }

      const chunkPromises = chunks.map(async (chunk) => {
        const chunkBase64 = await extractPageRange(srcDoc, chunk.start, chunk.end);
        
        const visualPrompt = `Extract ALL transaction rows from this bank statement chunk.
        CRITICAL RULES:
        1. Extract EVERY single transaction row printed. DO NOT skip or truncate rows.
        2. Read the running balance directly from the right column exactly as printed. Do not calculate.
        3. Withdrawals/debits MUST be prefixed explicitly with a minus sign like "-$42,148.24".
        
        RETURN SCHEMA:
        { "transactions": [{ "id": 1, "date": "Date", "type": "Type", "description": "Details", "amount": "-$42,148.24", "balance": "$157,100.00" }] }`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.6-flash', // Fully upgraded active production visual parser
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
        if (Array.isArray(segment)) {
          masterTransactions = masterTransactions.concat(segment);
        }
      }
    }

    const finalizedRows = masterTransactions.map((tx, index) => ({
      ...tx,
      id: index + 1
    }));

    console.log(`✅ HYBRID PARSER COMPLETE: Extracted ${finalizedRows.length} total transaction rows.`);

    return NextResponse.json({
      success: true,
      filename: file.name,
      engine_used: 'SwiftLedger Gemini 3.6 Hybrid Core',
      total_transactions: finalizedRows.length,
      page_count: totalPages,
      rows: finalizedRows,
    });
  } catch (error: any) {
    console.error('Core Exception caught:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Parsing failed' }, { status: 500 });
  }
}
