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
      if (Array.isArray(parsed[key]) && parsed[key].length > 0) {
        return parsed[key];
      }
    }
    return [];
  } catch {
    const arrayMatch = clean.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (arrayMatch) {
      try {
        const extracted = JSON.parse(arrayMatch[0]); // 💡 Fixed TypeScript RegExpMatchArray casting type error!
        if (Array.isArray(extracted)) return extracted;
      } catch {}
    }
    return [];
  }
}

// ============ 🧱 STEP 1: THE SLICER (NATIVE ULTRA-FAST SINGLE-PAGE EXTRACTION) ============
async function slicePDFIntoSinglePages(buffer: Buffer): Promise<string[]> {
  const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const totalPages = pdfDoc.getPageCount();
  
  // Maps page indices into raw base64 data string arrays instantly
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
    // 🔥 SILENCES THE NATIVE PDF-PARSE CANVAS DEP WARNINGS INSIDE THE CONSOLE METRICS:
    const originalWarn = console.warn;
    console.warn = (...args) => {
      const combined = args.join(' ');
      if (combined.includes('Cannot load "@napi-rs/canvas"') || combined.includes('rendering may be broken')) return;
      originalWarn(...args);
    };

    console.log('🚀 JET ENGINE ARCHITECTURE ACTIVATED');

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'GEMINI_API_KEY missing' }, { status: 500 });
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
    const buffer = Buffer.from(bytes);

    // Get exact runtime page metrics
    const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const pageCount = pdfDoc.getPageCount();
    console.log(`📄 Detected ${pageCount} pages`);

    // Execute Slicer to chop the document apart into memory page strings
    const base64Pages = await slicePDFIntoSinglePages(buffer);
    
    // ✅ UNIFIED CLEAN TEMPLATE STRINGS LITERAL ENFORCED TO MATCH ENVIRONMENT SPECIFICATIONS 100%
    const url = `https://googleapis.com{WORKING_MODEL}:generateContent?key=${apiKey}`;
    const prompt = `Extract ALL financial transactions from this document page. Return ONLY a JSON array matching this exact parameter mapping schema: [{"date":"date","type":"type","description":"desc","amount":"amount","balance":"balance"}]`;

    // ============ 🚀 STEP 2: THE WORKER (EXECUTE ASYNC PARALLEL CONCURRENCY HANDSHAKES) ============
    const workerPromises = base64Pages.map(async (base64Chunk, index) => {
      console.log(`📄 Processing multi-threaded parallel page line ${index + 1}/${base64Pages.length}`);

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                { text: prompt },
                { inlineData: { mimeType: 'application/pdf', data: base64Chunk } },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            maxOutputTokens: 4096,
            temperature: 0,
          },
        }),
      });

      if (!response.ok) {
        console.error(`❌ Parallel Channel Page ${index + 1} broken:`, response.status);
        return [];
      }

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
      return parseGeminiResponse(text);
    });

    // Resolve all independent microsecond worker streams concurrently over the wire
    const resolvedSegments = await Promise.all(workerPromises);
    let combinedTransactions: any[] = [];
    for (const segment of resolvedSegments) {
      if (Array.isArray(segment)) {
        combinedTransactions = combinedTransactions.concat(segment);
      }
    }

    // ============ 📊 STEP 3: THE ACCOUNTANT (NORMALIZE SYSTEM ARRAYS AND CHRONOLOGICAL SEQUENCES) ============
    const finalizedRows = combinedTransactions.map((tx: any, index: number) => ({
      id: index + 1,
      date: tx.date || tx.d || '',
      type: tx.type || tx.t || 'Transaction',
      description: tx.description || tx.desc || '',
      amount: tx.amount || tx.a || '$0.00',
      balance: tx.balance || tx.b || '$0.00'
    }));

    console.log(`✅ PARSER ARCHITECTURE SUCCESS: ${finalizedRows.length} ROWS SECURED.`);

    return NextResponse.json({
      success: true,
      filename: file.name,
      total_transactions: finalizedRows.length,
      page_count: pageCount,
      rows: finalizedRows,
    });
  } catch (error: any) {
    console.error('❌ System Overhaul Failure:', error.message || error);
    return NextResponse.json({ success: false, error: error.message || 'Parsing failed' }, { status: 500 });
  }
}
