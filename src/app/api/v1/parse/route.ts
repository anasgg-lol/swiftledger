import { NextResponse } from 'next/server';
import { PDFDocument } from 'pdf-lib';
import PDFParser from 'pdf2json';
import { createWorker } from 'tesseract.js';

export const maxDuration = 60; // Next.js official Route segment configuration config object [pdf_nQFnlh.pdf]

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

if (typeof global.DOMMatrix === 'undefined') {
  (global as any).DOMMatrix = class {};
}

// Helper to parse strings cleanly into decimal numbers for precise balancing
function cleanMathValue(val: string): number {
  if (!val) return 0;
  const cleaned = val.replace(/[^0-9.\-]/g, '');
  return parseFloat(cleaned) || 0;
}

// ============ BULLETPROOF NATIVE RESPONSE TOKEN MAPPER ============
function parseGeminiResponse(text: string): any[] {
  let clean = text.trim().replace(/```json/gi, '').replace(/```/g, '').trim();
  try {
    const parsed = JSON.parse(clean);
    const rawRows = Array.isArray(parsed) ? parsed : (parsed.transactions || parsed.rows || parsed.data || []);
    return rawRows.map((row: any) => {
      const normalized: Record<string, any> = {};
      Object.keys(row).forEach(key => { normalized[key.toLowerCase()] = row[key]; });
      return normalized;
    });
  } catch {
    const arrayMatch = clean.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (arrayMatch) {
      try {
        const extracted = JSON.parse(arrayMatch[0]); 
        return Array.isArray(extracted) ? extracted.map((row: any) => {
          const normalized: Record<string, any> = {};
          Object.keys(row).forEach(key => { normalized[key.toLowerCase()] = row[key]; });
          return normalized;
        }) : [];
      } catch {}
    }
    return [];
  }
}

// ============ 🧱 VECTOR LAYER DETECTOR: GEOMETRIC POSITIONING EXTRACTION ============
async function extractGeometryNatively(buffer: Buffer): Promise<{ pages: any[], rawText: string }> {
  return new Promise((resolve) => {
    const pdfParser = new PDFParser();
    pdfParser.on('pdfParser_dataError', () => resolve({ pages: [], rawText: '' }));
    pdfParser.on('pdfParser_dataReady', (pdfData) => {
      let rawText = '';
      if (!pdfData || !pdfData.Pages) {
        return resolve({ pages: [], rawText: '' });
      }
      const processedPages = pdfData.Pages.map((page: any) => {
        const linesMap: Record<number, any[]> = {};
        page.Texts.forEach((textObj: any) => {
          const textStr = decodeURIComponent(textObj.R[0].T).trim(); 
          rawText += textStr + ' ';
          const yKey = Math.round(textObj.y * 100); 
          if (!linesMap[yKey]) linesMap[yKey] = [];
          linesMap[yKey].push({ x: textObj.x, text: textStr });
        });
        
        const sortedY = Object.keys(linesMap).map(Number).sort((a, b) => a - b);
        const structuredLines = sortedY.map(y => linesMap[y].sort((a, b) => a.x - b.x));
        return { structuredLines };
      });
      resolve({ pages: processedPages, rawText });
    });
    pdfParser.parseBuffer(buffer);
  });
}

// ============ 📸 LOCAL HIGH-SPEED OCR PIPELINE (SCANNED FALLBACK OVERRIDE) ============
// ============ 📸 LOCAL HIGH-SPEED OCR PIPELINE (SCANNED FALLBACK OVERRIDE) ============
async function performLocalOCR(buffer: Buffer): Promise<{ pages: any[], rawText: string }> {
  console.log('🛠️ INITIALIZING INDEPENDENT BACKEND OCR WORKER MATRIX...');
  const worker = await createWorker('eng');
  let rawText = '';
  const pages: any[] = [];

  try {
    // ✅ FIX: Force type assignment to 'any' to completely bypass tesseract type system boundaries
    const result: any = await worker.recognize(buffer);
    const lines = result?.data?.lines || [];
    const structuredLines: any[] = [];

    lines.forEach((lineItem: any) => {
      const pageTokens: any[] = [];
      const words = lineItem?.words || [];
      
      words.forEach((wordItem: any) => {
        const textStr = (wordItem?.text || '').trim();
        if (textStr) {
          rawText += textStr + ' ';
          const bbox = wordItem?.bbox || { x0: 0 };
          // Map layout bounding boxes directly to artificial spatial X/Y coordinate nodes
          pageTokens.push({
            x: (bbox.x0 / 10), // Normalize layout constraints to match native pdf2json grids
            text: textStr
          });
        }
      });
      if (pageTokens.length > 0) {
        structuredLines.push(pageTokens.sort((a, b) => a.x - b.x));
      }
    });

    pages.push({ structuredLines });
  } catch (ocrError: any) {
    console.error('❌ Local OCR Engine Exception Intercepted:', ocrError.message);
  } finally {
    await worker.terminate();
  }

  return { pages, rawText };
}
// ============ MAIN SERVICE CORE ============
export async function POST(req: Request) {
  try {
    console.log('🚀 JET ENGINE GEOMETRY ARCHITECTURE ACTIVATED');
    const apiKey = process.env.GEMINI_API_KEY; 

    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
    if (file.size > MAX_FILE_SIZE_BYTES) return NextResponse.json({ success: false, error: 'File exceeds 10MB' }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    
    // ✅ FIX: Define the model API parameters globally at the top of the function to prevent scoping errors
    const url = `https://googleapis.com{WORKING_MODEL}:generateContent?key=${apiKey}`;
    const basePrompt = `Extract ALL financial transaction rows from this document data context.
    Return ONLY a JSON array where each object strictly matches this schema mapping layout:
    [{"date":"date","type":"type","description":"desc","amount":"amount","balance":"balance"}]
    CRITICAL: Extract EVERY single printed transaction row. Do not truncate, skip, or summarize anything.`;

    // Attempt standard fast vector geometry pass first
    let { pages, rawText } = await extractGeometryNatively(buffer);
    let engineUsed = 'SwiftLedger Coordinate Geometry Core';
    
    // If native text layer length is 0, activate the Local OCR Driveway instantly! [pdf_XZdc6j.pdf]
    if (pages.length === 0 || rawText.trim().length < 50) {
      console.log('📸 FLAT SCANNED IMAGE PDF DETECTED. ACTIVATING ZERO-COST LOCAL OCR DRIVEWAY CONTEXT...');
      engineUsed = 'SwiftLedger Local High-Speed OCR Pipeline';
      const ocrResults = await performLocalOCR(buffer);
      pages = ocrResults.pages;
      rawText = ocrResults.rawText;
    }

    let combinedTransactions: any[] = [];
    let localSuccess = false;

    // 🧱 GEOMETRIC MATCHING PASS WITH ACCOUNTING ARITHMETIC RECONCILIATION
    if (pages.length > 0 && rawText.trim().length > 50) {
      try {
        let globalTxList: any[] = [];
        let totalMathChecksPassed = true;

        for (let p = 0; p < pages.length; p++) {
          const pageData = pages[p];
          let pageTxList: any[] = [];
          
          let dateX = 0, descX = 10, amtX = 35, balX = 45; 

          pageData.structuredLines.forEach((line: any[]) => {
            let combinedLineText = line.map((t: any) => t.text).join(' ').toUpperCase();
            
            if (combinedLineText.includes('DATE') && combinedLineText.includes('BALANCE')) {
              line.forEach((token: any) => {
                const text = token.text.toUpperCase();
                if (text.includes('DATE')) dateX = token.x;
                if (text.includes('DESC') || text.includes('PARTICULARS')) descX = token.x;
                if (text.includes('DEBIT') || text.includes('CREDIT') || text.includes('AMOUNT')) amtX = token.x;
                if (text.includes('BALANCE')) balX = token.x;
              });
              return; 
            }

            let rowDate = '', rowDesc = '', rowAmt = '', rowBal = '';
            line.forEach((token: any) => {
              if (Math.abs(token.x - dateX) < 4) rowDate = token.text;
              else if (token.x >= descX && token.x < amtX - 2) rowDesc += token.text + ' ';
              else if (token.x >= amtX - 2 && token.x < balX - 2) rowAmt = token.text;
              else if (token.x >= balX - 2) rowBal = token.text;
            });

            rowDesc = rowDesc.trim();

            if (rowDate && (rowAmt || rowBal)) {
              pageTxList.push({ date: rowDate, type: 'Transaction', description: rowDesc, amount: rowAmt, balance: rowBal });
            } else if (rowDesc && pageTxList.length > 0 && !rowDate && !rowAmt && !rowBal) {
              pageTxList[pageTxList.length - 1].description += ' ' + rowDesc;
            }
          });

          let pageBalancesReconciled = false;
          if (pageTxList.length >= 2) {
            let pageValid = true;
            for (let i = 1; i < pageTxList.length; i++) {
              const prevBal = cleanMathValue(pageTxList[i-1].balance);
              const currBal = cleanMathValue(pageTxList[i].balance);
              const txAmt = cleanMathValue(pageTxList[i].amount);
              
              if (txAmt !== 0 && prevBal !== 0 && currBal !== 0) {
                const matchesNormalMath = Math.abs(prevBal + txAmt - currBal) < 0.05 || Math.abs(prevBal - txAmt - currBal) < 0.05;
                if (!matchesNormalMath) { pageValid = false; break; }
              }
            }
            pageBalancesReconciled = pageValid;
          }

          if (pageBalancesReconciled && pageTxList.length > 0) {
            globalTxList = globalTxList.concat(pageTxList);
          } else {
            totalMathChecksPassed = false;
            break; 
          }
        }

        if (totalMathChecksPassed && globalTxList.length > 0) {
          combinedTransactions = globalTxList;
          localSuccess = true;
          console.log(`⚡ LOCAL GEOMETRIC DRIVEWAY SUCCESS: Parsed ${combinedTransactions.length} balanced records natively.`);
        }
      } catch (err) {
        console.warn('⚠️ Local coordinate calculation mismatch. Switching to fallback models...', err);
      }
    }

    // 📡 ULTIMATE SAFETY NET: If local coordinates mismatch, run the cloud API fallback cluster safely
    if (!localSuccess && apiKey) {
      console.log('📸 LOCAL MATHEMATICS SHIELD BROKEN: REVERTING CLOUD CLUSTER CHUNKS NATIVELY...');
      engineUsed = 'SwiftLedger Async Worker Pipeline Fallback';
      
      const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      const totalPages = pdfDoc.getPageCount();
      const slicePromises = Array.from({ length: totalPages }, async (_, i) => {
        const newDoc = await PDFDocument.create();
        const [copiedPage] = await newDoc.copyPages(pdfDoc, [i]);
        newDoc.addPage(copiedPage);
        const chunkBytes = await newDoc.save();
        return Buffer.from(chunkBytes.buffer, chunkBytes.byteOffset, chunkBytes.byteLength).toString('base64');
      });
      const base64Pages = await Promise.all(slicePromises);

      const workerPromises = base64Pages.map(async (base64Chunk, index) => {
        console.log(`📄 Streaming concurrent fallback window line ${index + 1}/${base64Pages.length}`);
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
        return parseGeminiResponse(data?.candidates?.[0]?.content?.parts?.[0]?.text || '[]');
      });

      const resolvedSegments = await Promise.all(workerPromises);
      for (const segment of resolvedSegments) {
        if (Array.isArray(segment)) combinedTransactions = combinedTransactions.concat(segment);
      }
    }

    // ============ 📊 STEP 3: THE ACCOUNTANT (NORMALIZE ALL FIELDS NATIVELY) ============
    const finalizedRows = combinedTransactions.map((tx: any, index: number) => ({
      id: index + 1,
      date: tx.date || '',
      type: tx.type || 'Transaction',
      description: (tx.description || '').trim(),
      amount: typeof tx.amount === 'number' ? `$${tx.amount.toFixed(2)}` : String(tx.amount || '$0.00'),
      balance: typeof tx.balance === 'number' ? `$${tx.balance.toFixed(2)}` : String(tx.balance || '$0.00')
    }));

    console.log(`✅ PARSER ARCHITECTURE SUCCESS: ${finalizedRows.length} ROWS SECURED VIA [${engineUsed}].`);

    return NextResponse.json({ 
      success: true, 
      filename: file.name, 
      engine_used: engineUsed, 
      total_transactions: finalizedRows.length, 
      page_count: pages.length || 1, 
      rows: finalizedRows 
    });
  } catch (error: any) {
    console.error('❌ Root System Exception Caught:', error.message || error);
    return NextResponse.json({ success: false, error: error.message || 'Parsing failed' }, { status: 500 });
  }
}

// Helper utility block to slice files page-by-page when API fallback overrides execute
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
