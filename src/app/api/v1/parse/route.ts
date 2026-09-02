import { NextResponse } from 'next/server';
import { PDFDocument } from 'pdf-lib';

export const maxDuration = 60; // Next.js official Route segment configuration config object

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const WORKING_MODEL = 'gemini-flash-lite-latest'; // Pinned securely to your functional lightweight core asset

if (typeof global.DOMMatrix === 'undefined') {
  (global as any).DOMMatrix = class {};
}

// ============ PARSE GEMINI RESPONSE ============
function parseGeminiResponse(text: string): any[] {
  let clean = text.trim();
  clean = clean.replace(/```json/gi, '').replace(/```/g, '').trim();
  
  try {
    const parsed = JSON.parse(clean);
    if (Array.isArray(parsed)) return parsed;
    if (parsed.transactions) return parsed.transactions;
    if (parsed.rows) return parsed.rows;
    for (const key of Object.keys(parsed)) {
      if (Array.isArray(parsed[key]) && parsed[key].length > 0) return parsed[key];
    }
    return [];
  } catch {
    const arrayMatch = clean.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (arrayMatch) {
      try {
        const extracted = JSON.parse(arrayMatch[0]);
        if (Array.isArray(extracted)) return extracted;
      } catch {}
    }
    return [];
  }
}

// ============ 🧱 NATIVE EXTRACTOR: SAFE PURE STRING LAYER READER ============
async function extractTextNatively(buffer: Buffer): Promise<string> {
  try {
    const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const pages = pdfDoc.getPages();
    let textDump = '';
    
    for (const page of pages) {
      const { text } = page as any;
      if (text) textDump += text + '\n';
    }
    
    if (textDump.trim().length === 0) {
      textDump = buffer.toString('utf8').replace(/[^\x20-\x7E\n\t]/g, '');
    }
    return textDump;
  } catch {
    return '';
  }
}

async function slicePDFIntoSinglePages(buffer: Buffer): Promise<string[]> {
  const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const totalPages = pdfDoc.getPageCount();
  
  const slicePromises = Array.from({ length: totalPages }, async (_, i) => {
    const newDoc = await PDFDocument.create();
    const [copiedPage] = await newDoc.copyPages(pdfDoc, [i]);
    newDoc.addPage(copiedPage);
    const chunkBytes = await newDoc.save();
    return Buffer.from(chunkBytes.buffer, chunkBytes.byteOffset, chunkBytes.byteLength).toString('base64');
  });
  
  return Promise.all(slicePromises);
}

// ============ MAIN SERVICE CORE ============
export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ success: false, error: 'GEMINI_API_KEY missing' }, { status: 500 });

    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });

    if (file.size > MAX_FILE_SIZE_BYTES) return NextResponse.json({ success: false, error: 'File exceeds 10MB' }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const pageCount = pdfDoc.getPageCount();
    console.log(`📄 Detected ${pageCount} pages`);

    // ⚡ INSTANT LAYER: READ NATIVE EMBEDDED TEXT
    const rawTextContent = await extractTextNatively(buffer);
    const hasReadableText = rawTextContent.trim().length > 100;

    let combinedTransactions: any[] = [];
    let processingEngine = 'SwiftLedger Hyper-Speed Digital Text Channel';

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${WORKING_MODEL}:generateContent?key=${apiKey}`;

    if (hasReadableText) {
      // 🚀 DIGITAL CORE CHANNEL: SEND LIGHTWEIGHT TEXT STREAM INSTEAD OF BULKY IMAGES
      console.log(`⚡ DIGITAL CORE CHANNEL: TEXT LAYER FOUND (${rawTextContent.length} chars). BYPASSING OCR CHUNKING...`);
      
      const textPrompt = `Extract ALL financial transaction rows from this raw text bank statement dump.
      Return ONLY a JSON array where each object strictly matches this schema mapping:
      [{"date":"date","type":"type","description":"desc","amount":"amount","balance":"balance"}]
      
      CRITICAL: Extract EVERY single printed transaction row. Do not truncate, skip, or summarize anything.
      
      RAW DATA TEXT:
      ${rawTextContent}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: textPrompt }] }],
          generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 8192, temperature: 0.0 },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
        combinedTransactions = parseGeminiResponse(text);
      }
    } else {
      // 📸 SCANNED LAYER FALLBACK CHANNEL GRIDS (FOR TRUE SCANNED IMAGES)
      console.log('📸 SCANNED LAYER FALLBACK ACTIVATED: TRIGGERING PARALLEL CONCURRENT WORKERS...');
      processingEngine = 'SwiftLedger Async Worker Pipeline';
      
      const base64Pages = await slicePDFIntoSinglePages(buffer);
      const prompt = `Extract ALL financial transactions from this document page. Return ONLY a JSON array matching this exact parameter mapping schema: [{"date":"date","type":"type","description":"desc","amount":"amount","balance":"balance"}]`;

      const workerPromises = base64Pages.map(async (base64Chunk, index) => {
        console.log(`📄 Processing multi-threaded parallel page line ${index + 1}/${base64Pages.length}`);
        
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }, { inlineData: { mimeType: 'application/pdf', data: base64Chunk } }] }],
            generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 4096, temperature: 0 },
          }),
        });

        if (!response.ok) return [];
        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
        return parseGeminiResponse(text);
      });

      const resolvedSegments = await Promise.all(workerPromises);
      for (const segment of resolvedSegments) {
        if (Array.isArray(segment)) combinedTransactions = combinedTransactions.concat(segment);
      }
    }

    // ============ 📊 STEP 3: THE ACCOUNTANT ============
    const finalizedRows = combinedTransactions.map((tx: any, index: number) => ({
      id: index + 1,
      date: tx.date || tx.d || '',
      type: tx.type || tx.t || 'Transaction',
      description: tx.description || tx.desc || '',
      amount: tx.amount || tx.a || '$0.00',
      balance: tx.balance || tx.b || '$0.00'
    }));

    console.log(`✅ EXECUTION RESOLVED: Securing ${finalizedRows.length} total transactional records.`);

    return NextResponse.json({
      success: true,
      filename: file.name,
      engine_used: processingEngine,
      total_transactions: finalizedRows.length,
      page_count: pageCount,
      rows: finalizedRows,
    });
  } catch (error: any) {
    console.error('❌ Root System Exception Caught:', error.message || error);
    return NextResponse.json({ success: false, error: error.message || 'Parsing failed' }, { status: 500 });
  }
}
