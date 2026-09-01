import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { PDFDocument } from 'pdf-lib';

export const config = {
  api: {
    bodyParser: true, 
  },
};

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024;

// High-speed textual table parser that structures column matrices in milliseconds on the server
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

    // ⚡ STEP 1: MILLISECOND LOCAL TEXT TOKEN EXTRACTION CORE
    let localTextContent = '';
    try {
      const pdfParse = require('pdf-parse');
      const parsed = await pdfParse(rawBuffer);
      localTextContent = parsed.text || '';
    } catch (e) {
      console.warn('⚠️ Local font layer missing, using image fallback channels.');
    }

    const ai = new GoogleGenAI({ apiKey });
    let masterTransactions: any[] = [];

    // If an embedded digital text map is active, execute the instant string conversion loophole
    if (localTextContent.trim().length > 50) {
      console.log('⚡ HYPER-SPEED DIGITAL CORE ACTIVE: BYPASSING VISUAL QUEUES...');
      
      const prompt = `Extract ALL transaction rows from this bank statement text layout. Output raw data lines only.
      Format exactly like this for EVERY row, using pipe delimiters, with no markdown code blocks and no text description headers:
      Date | Type | Description | Amount | RunningBalance
      
      CRITICAL RULES:
      1. Extract EVERY single transaction row printed. DO NOT skip or truncate data.
      2. Withdrawals/debits MUST be prefixed explicitly with a minus sign like "-$14,250.00".
      
      RAW TEXT FEED INPUT:
      ${localTextContent}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash', // Required upgraded premium core engine
        contents: [{ text: prompt }],
        config: { temperature: 0.0 } // Locks absolute mathematical precision
      });

      masterTransactions = parseTextToJSON(response.text || '');
    } else {
      // 📸 FALLBACK STEP 2: CONCURRENT PIPELINE SHARDING FOR IMAGES / SCANS
      console.log('📸 SCANNED LAYER CORE ACTIVATED: EXECUTING PARALLEL VISUAL BATCHES...');
      const chunkSize = 30; 
      const chunks: { start: number; end: number }[] = [];

      for (let i = 0; i < totalPages; i += chunkSize) {
        chunks.push({ start: i, end: Math.min(i + chunkSize - 1, totalPages - 1) });
      }

      const chunkPromises = chunks.map(async (chunk) => {
        const chunkBase64 = await extractPageRange(srcDoc, chunk.start, chunk.end);
        const prompt = `Extract ALL transaction rows from this bank statement chunk. Output raw data lines only.
        Format exactly like this for EVERY row using pipe delimiters, with no markdown blocks:
        Date | Type | Description | Amount | RunningBalance
        
        LAWS: Withdrawals/debits MUST be prefixed with a minus sign like "-$42,148.24".`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: [
            { text: prompt },
            { inlineData: { data: chunkBase64, mimeType: 'application/pdf' } }
          ],
          config: { temperature: 0.0 }
        });

        return response.text || '';
      });

      const resolvedTexts = await Promise.all(chunkPromises);
      for (const textChunk of resolvedTexts) {
        const parsedRows = parseTextToJSON(textChunk);
        masterTransactions = masterTransactions.concat(parsedRows);
      }
    }

    const finalizedRows = masterTransactions.map((tx, index) => ({
      ...tx,
      id: index + 1
    }));

    console.log(`✅ JET ENGINE SYSTEM SUCCESS: Extracted ${finalizedRows.length} total rows.`);

    return NextResponse.json({
      success: true,
      filename: file.name,
      engine_used: 'SwiftLedger Gemini 3.6 JetCore',
      total_transactions: finalizedRows.length,
      page_count: totalPages,
      rows: finalizedRows,
    });
  } catch (error: any) {
    console.error('Core Exception caught:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Parsing failed' }, { status: 500 });
  }
}
