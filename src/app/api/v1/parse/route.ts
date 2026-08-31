import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { PDFDocument } from 'pdf-lib';

export const config = {
  api: {
    bodyParser: false, 
  },
};

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024;
const GEMINI_MODELS = ['gemini-3.6-flash'];

// Advanced text stream parser to convert raw text lists back into pristine objects in milliseconds
function parseTextToJSON(text: string): any[] {
  const transactions: any[] = [];
  try {
    const lines = text.split('\n');
    let currentId = 1;
    
    for (const line of lines) {
      if (!line.includes('|')) continue;
      const parts = line.split('|').map(p => p.trim());
      if (parts.length < 5) continue;
      
      transactions.push({
        id: currentId++,
        date: parts[0] || '',
        type: parts[1] || 'Transaction',
        description: parts[2] || '',
        amount: parts[3] || '$0.00',
        balance: parts[4] || '$0.00'
      });
    }
    return transactions;
  } catch {
    return [];
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
    
    // Balanced concurrent sharding configuration
    const chunkSize = 20; 
    const chunks: { start: number; end: number }[] = [];

    for (let i = 0; i < totalPages; i += chunkSize) {
      chunks.push({ start: i, end: Math.min(i + chunkSize - 1, totalPages - 1) });
    }

    const ai = new GoogleGenAI({ apiKey });
    console.log(`🚀 CHEAT-CODE ACTIVE: INITIATING PARALLEL TEXT STREAM ON ${chunks.length} BATCHES...`);

    const chunkPromises = chunks.map(async (chunk) => {
      const chunkBase64 = await extractPageRange(srcDoc, chunk.start, chunk.end);
      
      // Prompt optimized for high-speed raw textual extraction instead of slow JSON schemas
      const prompt = `Extract ALL transaction rows from this bank statement chunk. Output raw text lines only.
      Format exactly like this for EVERY row, using pipe delimiters, with no markdown code blocks and no text description headers:
      Date | Type | Description | Amount | RunningBalance
      
      LAWS:
      1. Extract EVERY single transaction row printed. DO NOT skip or truncate data.
      2. Withdrawals/debits MUST be prefixed explicitly with a minus sign like "-$42,148.24".`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: [
          { text: prompt },
          { inlineData: { data: chunkBase64, mimeType: 'application/pdf' } }
        ],
        config: { 
          temperature: 0.0 // Locks analytical precision
        }
      });

      return response.text || '';
    });

    const resolvedTexts = await Promise.all(chunkPromises);
    let masterTransactions: any[] = [];
    
    for (const textChunk of resolvedTexts) {
      const parsedRows = parseTextToJSON(textChunk);
      masterTransactions = masterTransactions.concat(parsedRows);
    }

    const finalizedRows = masterTransactions.map((tx, index) => ({
      ...tx,
      id: index + 1
    }));

    console.log(`✅ CHEAT-CODE SUCCESS: Extracted ${finalizedRows.length} total rows in parallel.`);

    return NextResponse.json({
      success: true,
      filename: file.name,
      engine_used: 'SwiftLedger Hyper-Speed Concurrent Stream',
      total_transactions: finalizedRows.length,
      page_count: totalPages,
      rows: finalizedRows,
    });
  } catch (error: any) {
    console.error('Parser Exception:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Parsing failed' }, { status: 500 });
  }
}
