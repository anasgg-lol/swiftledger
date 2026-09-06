import { NextResponse } from 'next/server';
import { PDFDocument } from 'pdf-lib';
import PDFParser from 'pdf2json';
import { createWorker } from 'tesseract.js';

export const maxDuration = 60; // Next.js official Route segment configuration config object [pdf_nQFnlh.pdf]
export const WORKING_MODEL = 'gemini-flash-lite-latest';
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

if (typeof global.DOMMatrix === 'undefined') {
  (global as any).DOMMatrix = class {};
}

// Helper to parse strings cleanly into decimal numbers for precise balancing.
// Sign-aware for parentheses "(1,234.56)" and trailing "DR"/"CR" suffix, in addition
// to a plain leading "-". Also disambiguates US (1,234.56) vs European (1.234,56)
// number formatting so it works regardless of which convention a statement uses.
function cleanMathValue(val: string): number {
  if (!val) return 0;
  let str = String(val).trim();
  if (!str) return 0;

  // Normalize non-breaking/unusual whitespace and unicode minus/dash variants
  str = str.replace(/[\u00A0\u2007\u202F]/g, ' ').trim();
  str = str.replace(/[\u2012\u2013\u2014\u2212]/g, '-');

  let negative = false;

  if (/^\(.*\)$/.test(str)) {
    negative = true;
    str = str.slice(1, -1).trim();
  }

  const upper = str.toUpperCase();
  if (/(^|\s)DR(\s|$)/.test(upper)) negative = true;
  if (/(^|\s)CR(\s|$)/.test(upper)) negative = false;

  // Strip everything except digits, comma, period, minus, and spaces (removes any
  // currency symbol or letter code — $, €, £, ¥, USD, EUR, leftover DR/CR text, etc.)
  str = str.replace(/[^0-9.,\-\s]/g, '');
  str = str.replace(/\s+/g, '');

  // Disambiguate thousands vs decimal separator (US "1,234.56" vs EU "1.234,56")
  const lastComma = str.lastIndexOf(',');
  const lastDot = str.lastIndexOf('.');
  if (lastComma !== -1 && lastDot !== -1) {
    if (lastComma > lastDot) {
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      str = str.replace(/,/g, '');
    }
  } else if (lastComma !== -1 && lastDot === -1) {
    const afterComma = str.length - lastComma - 1;
    if (afterComma === 2) str = str.replace(',', '.');
    else str = str.replace(/,/g, '');
  }

  let num = parseFloat(str) || 0;
  if (negative) num = -Math.abs(num);
  return num;
}

// ✅ Detect a currency symbol/code present in a raw amount string, for display purposes.
const CURRENCY_SYMBOLS = ['$', '€', '£', '¥', '₹', '₩', '₽', '₺', '₫', '฿'];
function detectCurrencySymbol(str: string): string {
  const s = String(str || '');
  for (const sym of CURRENCY_SYMBOLS) {
    if (s.includes(sym)) return sym;
  }
  const codeMatch = s.match(/\b(USD|EUR|GBP|INR|JPY|AUD|CAD|CHF|CNY|NZD|ZAR|SGD|HKD|AED|MXN|BRL)\b/i);
  if (codeMatch) return codeMatch[1].toUpperCase() + ' ';
  return '$';
}

// Formats a raw amount string into a clean, consistent "-$1,234.56"-style display,
// regardless of source notation (parentheses, DR/CR suffix, European commas, etc).
// forceSign lets dual-column debit/credit extraction force the correct sign even when
// the source column itself printed the value as an unsigned magnitude.
function formatCurrencyDisplay(raw: string | number, forceSign?: 'positive' | 'negative'): string {
  if (raw === undefined || raw === null || raw === '') return '$0.00';
  const rawStr = String(raw);
  const symbol = detectCurrencySymbol(rawStr);
  let num = cleanMathValue(rawStr);
  if (forceSign === 'negative') num = -Math.abs(num);
  if (forceSign === 'positive') num = Math.abs(num);
  const formatted = Math.abs(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${num < 0 ? '-' : ''}${symbol}${formatted}`;
}

// ✅ FIX: a "transaction row" must actually have a plausible date in its date field.
// Without this, non-transaction lines (account summary blocks, address text, currency
// labels sitting above the real table) can get geometrically bucketed into date/desc/
// amount/balance slots just like a real row, producing fake transactions. This gate
// rejects anything that doesn't look like a real calendar date instead of accepting
// it into the ledger. If this ever mis-rejects a genuinely unusual date format, the
// existing balance-reconciliation check below will catch the broken chain and fall
// back to the cloud engine for that page — so being strict here is safe.
const MONTH_NAMES = /\b(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)/i;
function looksLikeTransactionDate(str: string): boolean {
  if (!str) return false;
  const s = str.trim();
  if (!s) return false;
  if (MONTH_NAMES.test(s)) return true;
  if (/^\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}$/.test(s)) return true; // 12/31/2025, 31-12-2025
  if (/^\d{4}[\/\-.]\d{1,2}[\/\-.]\d{1,2}$/.test(s)) return true;   // 2025-12-31
  return false;
}

// ============ COLUMN HEADER KEYWORD DICTIONARIES ============
const DATE_KW = ['DATE'];
const DESC_KW = ['DESC', 'PARTICULAR', 'NARRATIV', 'DETAIL', 'MEMO', 'REMARK'];
const DEBIT_KW = ['DEBIT', 'WITHDRAWAL', 'WITHDRAWALS'];
const CREDIT_KW = ['CREDIT', 'DEPOSIT', 'DEPOSITS'];
const AMOUNT_KW = ['AMOUNT'];
const BALANCE_KW = ['BALANCE'];
const matchesAny = (text: string, kws: string[]) => kws.some((k) => text.includes(k));

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
async function performLocalOCR(buffer: Buffer): Promise<{ pages: any[], rawText: string }> {
  console.log('🛠️ INITIALIZING INDEPENDENT BACKEND OCR WORKER MATRIX...');
  const worker = await createWorker('eng');
  let rawText = '';
  const pages: any[] = [];

  try {
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
          pageTokens.push({
            x: (bbox.x0 / 10),
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
    
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${WORKING_MODEL}:generateContent?key=${apiKey}`;
    const basePrompt = `Extract ALL financial transaction rows from this document data context.
    Return ONLY a JSON array where each object strictly matches this schema mapping layout:
    [{"date":"date","type":"type","description":"desc","amount":"amount","balance":"balance"}]
    CRITICAL: Extract EVERY single printed transaction row. Do not truncate, skip, or summarize anything.
    CRITICAL: Do NOT extract account-summary or header information (account number, account holder name, currency type, branch address, starting balance, total credits/debits, statement period) as if it were a transaction row. Only real dated transaction line-items belong in the output.
    CRITICAL SIGN RULE: If the statement has separate "Debit"/"Withdrawal" and "Credit"/"Deposit" columns, you MUST return "amount" as a NEGATIVE number for any value found in the Debit/Withdrawal column, and a POSITIVE number for any value found in the Credit/Deposit column. If instead amounts use parentheses like "(1,234.56)" or a trailing "DR" suffix to mean negative, still return a plain NEGATIVE number, not the parentheses/suffix notation. Never drop the dollar figure into the description field — it must always appear in the "amount" field, signed correctly.`;

    let { pages, rawText } = await extractGeometryNatively(buffer);
    let engineUsed = 'SwiftLedger Coordinate Geometry Core';
    
    if (pages.length === 0 || rawText.trim().length < 50) {
      console.log('📸 FLAT SCANNED IMAGE PDF DETECTED. ACTIVATING ZERO-COST LOCAL OCR DRIVEWAY CONTEXT...');
      engineUsed = 'SwiftLedger Local High-Speed OCR Pipeline';
      const ocrResults = await performLocalOCR(buffer);
      pages = ocrResults.pages;
      rawText = ocrResults.rawText;
    }

    let combinedTransactions: any[] = [];
    let localSuccess = false;
    let detectedFormat = 'unknown';

    // 🧱 GEOMETRIC MATCHING PASS WITH ACCOUNTING ARITHMETIC RECONCILIATION
    if (pages.length > 0 && rawText.trim().length > 50) {
      try {
        let globalTxList: any[] = [];
        let totalMathChecksPassed = true;

        let dateX = 0, descX = 10, debitX = 0, creditX = 0, amtX = 35, balX = 45;
        let hasDebitCol = false, hasCreditCol = false, columnsCalibrated = false;

        for (let p = 0; p < pages.length; p++) {
          const pageData = pages[p];
          let pageTxList: any[] = [];

          pageData.structuredLines.forEach((line: any[]) => {
            const combinedLineText = line.map((t: any) => t.text).join(' ').toUpperCase();

            if (matchesAny(combinedLineText, DATE_KW) && matchesAny(combinedLineText, BALANCE_KW)) {
              line.forEach((token: any) => {
                const text = token.text.toUpperCase();
                if (matchesAny(text, DATE_KW)) dateX = token.x;
                if (matchesAny(text, DESC_KW)) descX = token.x;
                if (matchesAny(text, DEBIT_KW)) { debitX = token.x; hasDebitCol = true; }
                if (matchesAny(text, CREDIT_KW)) { creditX = token.x; hasCreditCol = true; }
                if (matchesAny(text, AMOUNT_KW) && !matchesAny(text, DEBIT_KW) && !matchesAny(text, CREDIT_KW)) amtX = token.x;
                if (matchesAny(text, BALANCE_KW)) balX = token.x;
              });
              columnsCalibrated = true;
              detectedFormat = hasDebitCol && hasCreditCol ? 'dual_column (debit/credit)' : 'single_column (signed amount)';
              return;
            }

            if (!columnsCalibrated) return;

            const dualColumnMode = hasDebitCol && hasCreditCol;
            const numericCols: { key: 'debit' | 'credit' | 'amt' | 'bal'; x: number }[] = dualColumnMode
              ? [{ key: 'debit', x: debitX }, { key: 'credit', x: creditX }, { key: 'bal', x: balX }]
              : [{ key: 'amt', x: amtX }, { key: 'bal', x: balX }];
            const descBoundary = Math.min(...numericCols.map((c) => c.x));

            let rowDate = '', rowDesc = '', rowDebit = '', rowCredit = '', rowAmt = '', rowBal = '';
            line.forEach((token: any) => {
              if (Math.abs(token.x - dateX) < 4) { rowDate = token.text; return; }
              if (token.x < descBoundary - 2) { rowDesc += token.text + ' '; return; }

              let best = numericCols[0];
              let bestDist = Math.abs(token.x - best.x);
              for (const c of numericCols) {
                const d = Math.abs(token.x - c.x);
                if (d < bestDist) { best = c; bestDist = d; }
              }
              if (best.key === 'debit') rowDebit = token.text;
              else if (best.key === 'credit') rowCredit = token.text;
              else if (best.key === 'amt') rowAmt = token.text;
              else rowBal = token.text;
            });

            rowDesc = rowDesc.trim();

            if (dualColumnMode) {
              const debitVal = cleanMathValue(rowDebit);
              const creditVal = cleanMathValue(rowCredit);
              if (debitVal !== 0) rowAmt = formatCurrencyDisplay(rowDebit, 'negative');
              else if (creditVal !== 0) rowAmt = formatCurrencyDisplay(rowCredit, 'positive');
              else rowAmt = '';
            } else if (rowAmt) {
              rowAmt = formatCurrencyDisplay(rowAmt);
            }
            if (rowBal) rowBal = formatCurrencyDisplay(rowBal);

            // ✅ FIX: reject anything whose "date" isn't actually a plausible date —
            // stops account-summary/header lines from becoming fake transactions.
            if (rowDate && looksLikeTransactionDate(rowDate) && (rowAmt || rowBal)) {
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

              if (prevBal !== 0 && currBal !== 0) {
                if (txAmt === 0) {
                  if (Math.abs(prevBal - currBal) > 0.05) { pageValid = false; break; }
                } else {
                  const matchesNormalMath = Math.abs(prevBal + txAmt - currBal) < 0.05 || Math.abs(prevBal - txAmt - currBal) < 0.05;
                  if (!matchesNormalMath) { pageValid = false; break; }
                }
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
          console.log(`⚡ LOCAL GEOMETRIC DRIVEWAY SUCCESS: Parsed ${combinedTransactions.length} balanced records natively. Format: ${detectedFormat}`);
        }
      } catch (err) {
        console.warn('⚠️ Local coordinate calculation mismatch. Switching to fallback models...', err);
      }
    }

    // 📡 ULTIMATE SAFETY NET: If local coordinates mismatch, run the cloud API fallback cluster safely
    if (!localSuccess && apiKey) {
      console.log('📸 LOCAL MATHEMATICS SHIELD BROKEN: REVERTING CLOUD CLUSTER CHUNKS NATIVELY...');
      engineUsed = 'SwiftLedger Async Worker Pipeline Fallback';
      detectedFormat = 'delegated_to_cloud_model';
      
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
    const finalizedRows = combinedTransactions
      // ✅ FIX: apply the same date-sanity gate to rows coming from the cloud/OCR path too,
      // in case the model still slips a summary line through despite the prompt instruction.
      .filter((tx: any) => looksLikeTransactionDate(String(tx.date || '')))
      .map((tx: any, index: number) => ({
        id: index + 1,
        date: tx.date || '',
        type: tx.type || 'Transaction',
        description: (tx.description || '').trim(),
        amount: formatCurrencyDisplay(typeof tx.amount === 'number' ? tx.amount : String(tx.amount || '$0.00')),
        balance: formatCurrencyDisplay(typeof tx.balance === 'number' ? tx.balance : String(tx.balance || '$0.00'))
      }));

    console.log(`✅ PARSER ARCHITECTURE SUCCESS: ${finalizedRows.length} ROWS SECURED VIA [${engineUsed}]. Format detected: ${detectedFormat}`);

    if (finalizedRows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Could not confidently extract any transactions from this statement. The layout may be unusual — try a clearer scan or contact support.'
      }, { status: 422 });
    }

    return NextResponse.json({ 
      success: true, 
      filename: file.name, 
      engine_used: engineUsed, 
      format_detected: detectedFormat,
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