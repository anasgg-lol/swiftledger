import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import sharp from 'sharp';
import { PDFDocument } from 'pdf-lib';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

// ============ FAST PAGE COUNT ============
async function getPDFPageCount(buffer: Buffer): Promise<number> {
  try {
    const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    return pdfDoc.getPageCount();
  } catch {
    return Math.max(1, Math.floor(buffer.length / 10000));
  }
}

// ============ FAST JSON SALVAGE ============
function cleanAndParseJSON(rawResponse: string): any {
  let clean = rawResponse.trim();
  clean = clean.replace(/```json/gi, '').replace(/```/g, '').trim();
  try {
    return JSON.parse(clean);
  } catch {
    if (clean.startsWith('[') && !clean.endsWith(']')) {
      const lastValid = clean.lastIndexOf('{');
      if (lastValid !== -1) {
        try {
          return JSON.parse(clean.substring(0, lastValid) + '}]');
        } catch {}
      }
    }
    if (clean.startsWith('{') && !clean.endsWith('}')) {
      const lastValid = clean.lastIndexOf('}');
      if (lastValid !== -1) {
        try {
          return JSON.parse(clean.substring(0, lastValid + 1) + '}');
        } catch {}
      }
    }
    throw new Error('Could not parse JSON');
  }
}

// ============ CHUNK LARGE PDFS ============
async function splitPDFIntoChunks(buffer: Buffer, chunkSize: number = 15): Promise<Buffer[]> {
  try {
    const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const totalPages = pdfDoc.getPageCount();
    const chunks: Buffer[] = [];

    for (let i = 0; i < totalPages; i += chunkSize) {
      const newDoc = await PDFDocument.create();
      const end = Math.min(i + chunkSize, totalPages);
      const pageIndices = Array.from({ length: end - i }, (_, idx) => i + idx);
      const copiedPages = await newDoc.copyPages(pdfDoc, pageIndices);
      copiedPages.forEach(page => newDoc.addPage(page));
      chunks.push(Buffer.from(await newDoc.save()));
    }
    return chunks;
  } catch {
    return [buffer];
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
      return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ success: false, error: 'File exceeds 10MB' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const rawBuffer = Buffer.from(bytes);
    let mimeType = file.type || '';
    let pageCount = 1;

    if (!mimeType) {
      if (file.name.endsWith('.pdf')) mimeType = 'application/pdf';
      else if (file.name.endsWith('.png')) mimeType = 'image/png';
      else mimeType = 'image/jpeg';
    }

    const ai = new GoogleGenAI({ apiKey });
    const basePrompt = `Extract ALL financial transactions into JSON array: [{"id":1,"date":"date","type":"Card Payment|Direct Debit|Bank Credit|Cashpoint|Standing Order","description":"desc","amount":"$10.00","balance":"$500.00"}]`;

    // ============ IMAGES ============
    if (mimeType.startsWith('image/')) {
      const processedBuffer = await sharp(rawBuffer)
        .rotate()
        .resize({ width: 1600, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer();
      const base64 = processedBuffer.toString('base64');
      
      const result = await ai.models.generateContent({
        model: 'gemini-3.5-flash-lite',
        contents: [{ role: 'user', parts: [{ text: basePrompt }, { inlineData: { data: base64, mimeType: 'image/jpeg' } }] }],
        config: { responseMimeType: 'application/json', maxOutputTokens: 4096, temperature: 0.1 },
      });
      
      // ✅ FIX: Get text from the response correctly
      const text = result.text || '[]';
      const rows = cleanAndParseJSON(text);
      const transactions = Array.isArray(rows) ? rows : rows.transactions || rows.rows || [];
      return NextResponse.json({ success: true, filename: file.name, total_transactions: transactions.length, page_count: 1, rows: transactions });
    }

    // ============ PDF: GET PAGE COUNT ============
    if (mimeType === 'application/pdf') {
      pageCount = await getPDFPageCount(rawBuffer);
    }

    // ============ FAST PATH: SMALL PDF (< 20 PAGES) ============
    if (pageCount <= 20) {
      const base64 = rawBuffer.toString('base64');
      
      const result = await ai.models.generateContent({
        model: 'gemini-3.5-flash-lite',
        contents: [{ role: 'user', parts: [{ text: basePrompt }, { inlineData: { data: base64, mimeType: 'application/pdf' } }] }],
        config: { responseMimeType: 'application/json', maxOutputTokens: 4096, temperature: 0.1 },
      });
      
      // ✅ FIX: Get text from the response correctly
      const text = result.text || '[]';
      const rows = cleanAndParseJSON(text);
      const transactions = Array.isArray(rows) ? rows : rows.transactions || rows.rows || [];
      return NextResponse.json({ success: true, filename: file.name, total_transactions: transactions.length, page_count: pageCount, rows: transactions });
    }

    // ============ SLOW PATH: LARGE PDF (> 20 PAGES) ============
    const chunks = await splitPDFIntoChunks(rawBuffer, 15);
    let allTransactions: any[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunkBase64 = chunks[i].toString('base64');
      
      const result = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: [{ role: 'user', parts: [{ text: basePrompt }, { inlineData: { data: chunkBase64, mimeType: 'application/pdf' } }] }],
        config: { responseMimeType: 'application/json', maxOutputTokens: 8192, temperature: 0.1 },
      });
      
      // ✅ FIX: Get text from the response correctly
      const text = result.text || '[]';
      const rows = cleanAndParseJSON(text);
      const transactions = Array.isArray(rows) ? rows : rows.transactions || rows.rows || [];
      allTransactions = allTransactions.concat(transactions);
      if (i < chunks.length - 1) await new Promise(r => setTimeout(r, 300));
    }

    return NextResponse.json({
      success: true,
      filename: file.name,
      total_transactions: allTransactions.length,
      page_count: pageCount,
      rows: allTransactions,
    });
  } catch (error: any) {
    console.error('❌ Error:', error?.message || error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Parsing failed' },
      { status: 500 }
    );
  }
}