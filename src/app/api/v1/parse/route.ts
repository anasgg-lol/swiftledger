import { NextResponse } from 'next/server';
import { PDFDocument } from 'pdf-lib';
import PDFParser from 'pdf2json';

export const maxDuration = 60; // Next.js official Route segment configuration config object

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const WORKING_MODEL = 'gemini-flash-lite-latest'; // Pinned securely to your functional lightweight core asset

if (typeof global.DOMMatrix === 'undefined') {
  (global as any).DOMMatrix = class {};
}

// Helper to parse strings cleanly into decimal numbers for precise balancing
function cleanMathValue(val: string): number {
  if (!val) return 0;
  const cleaned = val.replace(/[^0-9.\-]/g, '');
  return parseFloat(cleaned) || 0;
}

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
        const extracted = JSON.parse(arrayMatch[0]); // Explicit element lookup clears typing errors
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

// Parse PDF structure geometrically via coordinates
async function extractGeometryNatively(buffer: Buffer): Promise<{ pages: any[], rawText: string }> {
  return new Promise((resolve) => {
    const pdfParser = new PDFParser();
    pdfParser.on('pdfParser_dataError', () => resolve({ pages: [], rawText: '' }));
    pdfParser.on('pdfParser_dataReady', (pdfData) => {
      let rawText = '';
      const processedPages = pdfData.Pages.map((page) => {
        // Group texts by Y coordinate to re-assemble horizontal text lines
        const linesMap: Record<number, any[]> = {};
        page.Texts.forEach((textObj) => {
          const textStr = decodeURIComponent(textObj.R[0].T).trim(); // Fixed data structure access for pdf2json stability
          rawText += textStr + ' ';
          const yKey = Math.round(textObj.y * 100); // Normalize floating coords
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
// ============ MAIN SERVICE CORE ============
export async function POST(req: Request) {
  try {
    console.log('🚀 JET ENGINE GEOMETRY ARCHITECTURE ACTIVATED');
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ success: false, error: 'GEMINI_API_KEY missing' }, { status: 500 });

    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
    if (file.size > MAX_FILE_SIZE_BYTES) return NextResponse.json({ success: false, error: 'File exceeds 10MB' }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const { pages, rawText } = await extractGeometryNatively(buffer);
    
    let pageCount = pages.length || 1;
    let combinedTransactions: any[] = [];
    let localSuccess = false;
    let engineUsed = 'SwiftLedger Coordinate Geometry Core';

    // 🧱 LOCAL GEOMETRIC MATCHING PASS WITH ACCOUNTING ARITHMETIC RECONCILIATION
    if (pages.length > 0 && rawText.trim().length > 100) {
      try {
        let globalTxList: any[] = [];
        let totalMathChecksPassed = true;

        for (let p = 0; p < pages.length; p++) {
          const pageData = pages[p];
          let pageTxList: any[] = [];
          
          // Column boundary anchors (X positions) initialized on header detection sweeps
          let dateX = 0, descX = 10, amtX = 35, balX = 45; 

          pageData.structuredLines.forEach((line: any[]) => {
            let combinedLineText = line.map((t: any) => t.text).join(' ').toUpperCase();
            
            // Auto-detect column spatial fields on current page layout context
            if (combinedLineText.includes('DATE') && combinedLineText.includes('BALANCE')) {
              line.forEach((token: any) => {
                const text = token.text.toUpperCase();
                if (text.includes('DATE')) dateX = token.x;
                if (text.includes('DESC') || text.includes('PARTICULARS')) descX = token.x;
                if (text.includes('DEBIT') || text.includes('CREDIT') || text.includes('AMOUNT')) amtX = token.x;
                if (text.includes('BALANCE')) balX = token.x;
              });
              return; // Header row assigned, bypass row processing loop
            }

            // Extract tokens matching spatial layout coordinates
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
              // 💡 CLAUDE'S FIX: Multi-line description continuation block locked!
              pageTxList[pageTxList.length - 1].description += ' ' + rowDesc;
            }
          });

          // Run running balance arithmetic reconciliation sweep on current page dataset array
          let pageBalancesReconciled = false;
          if (pageTxList.length >= 2) {
            let pageValid = true;
            for (let i = 1; i < pageTxList.length; i++) {
              const prevBal = cleanMathValue(pageTxList[i-1].balance);
              const currBal = cleanMathValue(pageTxList[i].balance);
              const txAmt = cleanMathValue(pageTxList[i].amount);
              
              // ✅ FIXED COMPILER SYNTAX: All variable metrics map uniformly to currBal boundaries
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
            break; // Break execution sweep to force secure API fallback cluster instantly
          }
        }

        if (totalMathChecksPassed && globalTxList.length > 0) {
          combinedTransactions = globalTxList;
          localSuccess = true;
          console.log(`⚡ CLAUDE LOCAL PATH SUCCESS: Natively parsed ${combinedTransactions.length} balanced records in milliseconds.`);
        }
      } catch (err) {
        console.warn('⚠️ Local coordinate calculation mismatch. Switching to fallback models...', err);
      }
    }

    // 📡 FALLBACK GATE: If geometry math fails or it's a visual scan, run the multi-threaded parallel array
    if (!localSuccess) {
      console.log('📸 LOCAL MATHEMATICS SHIELD BROKEN: TRIGGERING PARALLEL CONCURRENT API WORKERS...');
      engineUsed = 'SwiftLedger Async Worker Pipeline Fallback';
      
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${WORKING_MODEL}:generateContent?key=${apiKey}`;
      const prompt = `Extract ALL financial transactions from this document page. Return ONLY a JSON array matching this parameter schema: [{"date":"date","type":"type","description":"desc","amount":"amount","balance":"balance"}]`;

      const base64Pages = await slicePDFIntoSinglePages(buffer);
      const workerPromises = base64Pages.map(async (base64Chunk, index) => {
        console.log(`📄 Streaming concurrent fallback window line ${index + 1}/${base64Pages.length}`);
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
        // ✅ FIXED OPTIONAL CHAINING SYNTAX: Restored valid indexing tokens across child arrays
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
        return parseGeminiResponse(text);
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

    return NextResponse.json({ success: true, filename: file.name, engine_used: engineUsed, total_transactions: finalizedRows.length, page_count: pageCount, rows: finalizedRows });
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
