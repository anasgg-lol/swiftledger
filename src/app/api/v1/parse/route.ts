import { NextResponse } from 'next/server';
import { PDFDocument } from 'pdf-lib';
import PDFParser from 'pdf2json';

export const maxDuration = 60; // Next.js official Route segment configuration config object

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const WORKING_MODEL = 'gemini-flash-lite-latest'; // Pinned securely to your functional lightweight core asset

if (typeof global.DOMMatrix === 'undefined') {
  (global as any).DOMMatrix = class {};
}

// ============ BULLETPROOF CASE-INSENSITIVE JSON PARSE RECOVERY ============
function parseGeminiResponse(text: string): any[] {
  let clean = text.trim();
  
  // Clean markdown containers if present
  clean = clean.replace(/```json/gi, '').replace(/```/g, '').trim();
  
  try {
    const parsed = JSON.parse(clean);
    let rawRows: any[] = [];

    if (Array.isArray(parsed)) {
      rawRows = parsed;
    } else if (parsed.transactions && Array.isArray(parsed.transactions)) {
      rawRows = parsed.transactions;
    } else if (parsed.rows && Array.isArray(parsed.rows)) {
      rawRows = parsed.rows;
    } else if (parsed.data && Array.isArray(parsed.data)) {
      rawRows = parsed.data;
    } else {
      for (const key of Object.keys(parsed)) {
        if (Array.isArray(parsed[key])) {
          rawRows = parsed[key];
          break;
        }
      }
    }

    // Normalize every single key token to lowercase to prevent mapping skips
    return rawRows.map(row => {
      const normalized: Record<string, any> = {};
      Object.keys(row).forEach(key => {
        normalized[key.toLowerCase()] = row[key];
      });
      return normalized;
    });

  } catch {
    try {
      const arrayMatch = clean.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (arrayMatch) {
        const extracted = JSON.parse(arrayMatch[0]); // Explicit element lookup clears typing errors
        if (Array.isArray(extracted)) {
          return extracted.map(row => {
            const normalized: Record<string, any> = {};
            Object.keys(row).forEach(key => {
              normalized[key.toLowerCase()] = row[key];
            });
            return normalized;
          });
        }
      }
    } catch {}
    return [];
  }
}

// ============ 🧱 HIGH-SPEED STRUCTURAL TEXT GRID LAYOUT EXTRACTOR ============
async function extractTextNatively(buffer: Buffer): Promise<string> {
  return new Promise((resolve) => {
    const pdfParser = new PDFParser();
    
    pdfParser.on('pdfParser_dataError', () => resolve(''));
    pdfParser.on('pdfParser_dataReady', (pdfData) => {
      let extractedText = '';
      
      pdfData.Pages.forEach((page) => {
        let lastY = -1;
        page.Texts.forEach((textObj) => {
          const textStr = decodeURIComponent(textObj.R[0].T);
          if (lastY !== textObj.y && lastY !== -1) {
            extractedText += '\n';
          }
          extractedText += textStr + ' ';
          lastY = textObj.y;
        });
        extractedText += '\n--- PAGE BREAK ---\n';
      });
      
      resolve(extractedText);
    });

    pdfParser.parseBuffer(buffer);
  });
}

// ============ 🧱 STEP 1: THE SLICER (NATIVE ULTRA-FAST SINGLE-PAGE EXTRACTION) ============
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

    const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const pageCount = pdfDoc.getPageCount();
    console.log(`📄 Detected ${pageCount} pages`);

    // ⚡ INSTANT LOCAL DECODING CHECK WITH STRUCTURAL TEXT POSITIONING MAPS
    const rawTextContent = await extractTextNatively(buffer);
    const hasReadableText = rawTextContent.trim().length > 100;

    let combinedTransactions: any[] = [];
    let processingEngine = 'SwiftLedger Hyper-Speed Digital Text Channel';

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${WORKING_MODEL}:generateContent?key=${apiKey}`;
    const basePrompt = `Extract ALL financial transaction rows from this document data context.
    Return ONLY a JSON array where each object strictly matches this schema mapping layout:
    [{"date":"date","type":"type","description":"desc","amount":"amount","balance":"balance"}]
    CRITICAL: Extract EVERY single printed transaction row. Do not truncate, skip, or summarize anything.`;

    if (hasReadableText) {
      console.log(`⚡ DIGITAL CORE CHANNEL: TEXT LAYER FOUND (${rawTextContent.length} chars). BYPASSING OCR CHUNKING...`);
      
      const textPrompt = `${basePrompt}
      
      RAW DATA TEXT STRINGS:
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
        // ✅ FIXED: Repaired array selection layout syntax constraints
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
        console.log('📡 Gemini Raw Output:\n', text);
        combinedTransactions = parseGeminiResponse(text);
      }
    } else {
      console.log('📸 SCANNED LAYER FALLBACK ACTIVATED: TRIGGERING PARALLEL CONCURRENT WORKERS...');
      processingEngine = 'SwiftLedger Async Worker Pipeline';
      
      const base64Pages = await slicePDFIntoSinglePages(buffer);

      const workerPromises = base64Pages.map(async (base64Chunk) => {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: basePrompt }, { inlineData: { mimeType: 'application/pdf', data: base64Chunk } }] }],
            generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 4096, temperature: 0 },
          }),
        });

        if (!response.ok) return [];
        const data = await response.json();
        // ✅ FIXED: Repaired array selection layout syntax constraints
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
        return parseGeminiResponse(text);
      });

      const resolvedSegments = await Promise.all(workerPromises);
      for (const segment of resolvedSegments) {
        if (Array.isArray(segment)) combinedTransactions = combinedTransactions.concat(segment);
      }
    }

    // ============ 📊 STEP 3: THE ACCOUNTANT (NORMALIZE ALL FIELDS NATIVELY) ============
    const finalizedRows = combinedTransactions.map((tx: any, index: number) => {
      const dateVal = tx.date || tx.d || '';
      const typeVal = tx.type || tx.t || 'Transaction';
      const descVal = tx.description || tx.desc || tx.particulars || '';
      const amountVal = tx.amount || tx.a || '$0.00';
      const balanceVal = tx.balance || tx.b || '$0.00';

      return {
        id: index + 1,
        date: dateVal,
        type: typeVal,
        description: descVal,
        amount: typeof amountVal === 'number' ? `$${amountVal.toFixed(2)}` : String(amountVal),
        balance: typeof balanceVal === 'number' ? `$${balanceVal.toFixed(2)}` : String(balanceVal)
      };
    });

    console.log(`✅ PARSER ARCHITECTURE SUCCESS: ${finalizedRows.length} ROWS SECURED.`);

    return NextResponse.json({
      success: true,
      filename: file.name,
      engine_used: processingEngine,
      total_transactions: finalizedRows.length,
      page_count: pageCount,
      rows: finalizedRows,
    });
  } catch (error: any) {
    console.error('❌ System Overhaul Failure:', error.message || error);
    return NextResponse.json({ success: false, error: error.message || 'Parsing failed' }, { status: 500 });
  }
}
