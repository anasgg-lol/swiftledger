import { NextResponse } from 'next/server';
import { PDFDocument } from 'pdf-lib';
import PDFParser from 'pdf2json';
import { createWorker } from 'tesseract.js';

export const maxDuration = 60;
export const WORKING_MODEL = 'gemini-flash-lite-latest';
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

if (typeof global.DOMMatrix === 'undefined') {
  (global as any).DOMMatrix = class {};
}

// ================================================================
// 🔥 ULTIMATE NUMERIC PARSER – covers every format known to man
// ================================================================
function parseNumericString(raw: string): number {
  if (!raw) return 0;
  let str = String(raw).trim();

  // 1️⃣ Detect sign from parentheses, DR/CR, or leading minus/dash
  let negative = false;
  if (/^\(.*\)$/.test(str)) {
    negative = true;
    str = str.slice(1, -1);
  }
  const upper = str.toUpperCase();
  if (/(^|\s)DR(\s|$)/.test(upper)) negative = true;
  if (/(^|\s)CR(\s|$)/.test(upper)) negative = false;

  // 2️⃣ Remove spaces (some countries use space as thousands separator)
  str = str.replace(/\s/g, '');
  // Remove currency symbols and other non‑numeric characters (keep digits, comma, dot, minus)
  let cleaned = str.replace(/[^0-9,.\-]/g, '');

  // 3️⃣ Detect locale: if last '.' is before last ',', it's European
  const lastDot = cleaned.lastIndexOf('.');
  const lastComma = cleaned.lastIndexOf(',');
  let decimalSeparator = '.';
  let thousandsSeparator = ',';
  if (lastDot > lastComma) {
    decimalSeparator = '.';
    thousandsSeparator = ',';
  } else if (lastComma > lastDot) {
    decimalSeparator = ',';
    thousandsSeparator = '.';
  } else {
    // Only one separator type – treat as decimal if ≤2 digits after
    const sep = lastDot !== -1 ? '.' : ',';
    const parts = cleaned.split(sep);
    if (parts.length === 2 && parts[1].length <= 2) {
      decimalSeparator = sep;
    } else {
      thousandsSeparator = sep;
    }
  }

  // 4️⃣ Remove thousands separators
  if (thousandsSeparator === ',') cleaned = cleaned.replace(/,/g, '');
  else if (thousandsSeparator === '.') cleaned = cleaned.replace(/\./g, '');

  // 5️⃣ Replace decimal separator with '.'
  if (decimalSeparator === ',') cleaned = cleaned.replace(',', '.');

  // 6️⃣ Parse as float
  let num = parseFloat(cleaned);
  if (isNaN(num)) num = 0;
  if (negative) num = -Math.abs(num);
  return num;
}

// ================================================================
// 🔥 CLEAN MATH VALUE – uses the ultimate parser
// ================================================================
function cleanMathValue(val: string): number {
  if (!val) return 0;
  return parseNumericString(String(val).trim());
}

// ================================================================
// 🔥 NORMALIZE AMOUNT SIGN – for display in CSV/export
// ================================================================
function normalizeAmountSign(raw: string): string {
  if (!raw) return raw;
  let str = String(raw).trim();
  let negative = false;
  let changed = false;

  if (/^\(.*\)$/.test(str)) {
    negative = true;
    str = str.slice(1, -1).trim();
    changed = true;
  }
  if (/(^|\s)DR(\s|$)/i.test(str)) {
    negative = true;
    str = str.replace(/\s*DR\s*$/i, '').trim();
    changed = true;
  }
  if (/(^|\s)CR(\s|$)/i.test(str)) {
    str = str.replace(/\s*CR\s*$/i, '').trim();
    changed = true;
  }

  if (!changed) return raw;
  str = str.replace(/^[–—−-]\s*/, '');
  if (negative && !str.startsWith('-')) {
    str = '-' + str;
  }
  return str;
}

// ================================================================
// 🔥 MASSIVE COLUMN HEADER KEYWORD DICTIONARIES (covers 99% of banks)
// ================================================================
const DATE_KW = [
  'DATE', 'DATED', 'POSTING DATE', 'TRANSACTION DATE', 'EFFECTIVE DATE',
  'DATE DEBITED', 'DATE CREDITED', 'TX DATE', 'TRAN DATE'
];
const DESC_KW = [
  'DESC', 'DESCRIPTION', 'PARTICULAR', 'PARTICULARS', 'NARRATIVE',
  'DETAIL', 'DETAILS', 'MEMO', 'REMARK', 'REMARKS', 'TRANSACTION DETAILS',
  'REFERENCE', 'REF', 'CHEQUE', 'CHECK', 'CHQ', 'REFERENCE #', 'REF#'
];
const DEBIT_KW = [
  'DEBIT', 'WITHDRAWAL', 'WITHDRAWALS', 'DEBITED', 'AMOUNT DEBITED',
  'PAYMENT', 'PAYMENTS', 'OUTGOING', 'WITHDRAWN', 'CHARGES', 'DEBITS'
];
const CREDIT_KW = [
  'CREDIT', 'DEPOSIT', 'DEPOSITS', 'CREDITED', 'AMOUNT CREDITED',
  'RECEIPT', 'RECEIPTS', 'INCOMING', 'DEPOSIT AMOUNT', 'CREDITS'
];
const AMOUNT_KW = [
  'AMOUNT', 'AMT', 'TRANSACTION AMOUNT', 'NET AMOUNT', 'GROSS AMOUNT',
  'PAYMENT AMOUNT', 'WITHDRAWAL AMOUNT', 'DEPOSIT AMOUNT'
];
const BALANCE_KW = [
  'BALANCE', 'BAL', 'RUNNING BALANCE', 'LEDGER BALANCE', 'AVAILABLE BALANCE',
  'BOOK BALANCE', 'ENDING BALANCE', 'BALANCE FORWARD'
];

const matchesAny = (text: string, kws: string[]) => kws.some((k) => text.toUpperCase().includes(k.toUpperCase()));

// ================================================================
// 🔥 GEMINI RESPONSE PARSER (unchanged)
// ================================================================
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

// ================================================================
// 🔥 NATIVE GEOMETRY EXTRACTION (unchanged)
// ================================================================
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

// ================================================================
// 🔥 LOCAL OCR (unchanged)
// ================================================================
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

// ================================================================
// 🔥 MAIN POST HANDLER – THE BEAST
// ================================================================
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

    // ================================================================
    // GEOMETRIC EXTRACTION
    // ================================================================
    if (pages.length > 0 && rawText.trim().length > 50) {
      try {
        let globalTxList: any[] = [];
        let totalMathChecksPassed = true;

        let dateX = 0, descX = 10, debitX = 0, creditX = 0, amtX = 35, balX = 45;
        let hasDebitCol = false, hasCreditCol = false, columnsCalibrated = false;
        let pageCount = 0;

        for (let p = 0; p < pages.length; p++) {
          pageCount++;
          const pageData = pages[p];
          let pageTxList: any[] = [];

          pageData.structuredLines.forEach((line: any[]) => {
            const combinedLineText = line.map((t: any) => t.text).join(' ').toUpperCase();

            // Detect header row
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

            // Skip until we've calibrated
            if (!columnsCalibrated) return;

            // Determine which columns exist
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

            // Determine amount with sign
            if (dualColumnMode) {
              const debitVal = cleanMathValue(rowDebit);
              const creditVal = cleanMathValue(rowCredit);
              if (debitVal !== 0) rowAmt = `-${normalizeAmountSign(rowDebit).replace(/^-/, '')}`;
              else if (creditVal !== 0) rowAmt = normalizeAmountSign(rowCredit);
              else rowAmt = '';
            } else {
              rowAmt = normalizeAmountSign(rowAmt);
            }

            // Only add if we have a date and some amount/balance
            if (rowDate && (rowAmt || rowBal)) {
              pageTxList.push({ date: rowDate, type: 'Transaction', description: rowDesc, amount: rowAmt, balance: rowBal });
            } else if (rowDesc && pageTxList.length > 0 && !rowDate && !rowAmt && !rowBal) {
              // Merge continuation line
              pageTxList[pageTxList.length - 1].description += ' ' + rowDesc;
            }
          });

          // Validate page balances
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
            // If this page fails math, break and fall back to Gemini
            totalMathChecksPassed = false;
            console.warn(`⚠️ Page ${pageCount} failed balance reconciliation – falling back to Gemini.`);
            break;
          }
        }

        if (totalMathChecksPassed && globalTxList.length > 0) {
          combinedTransactions = globalTxList;
          localSuccess = true;
          console.log(`⚡ LOCAL GEOMETRIC DRIVEWAY SUCCESS: Parsed ${combinedTransactions.length} records. Format: ${detectedFormat}`);
        }
      } catch (err) {
        console.warn('⚠️ Local coordinate calculation mismatch. Switching to fallback models...', err);
      }
    }

    // ================================================================
    // FALLBACK TO GEMINI
    // ================================================================
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

    // ================================================================
    // SAFETY NET: if nothing extracted
    // ================================================================
    if (combinedTransactions.length === 0) {
      console.warn('⚠️ No transactions could be extracted from the document.');
      return NextResponse.json(
        { success: false, error: 'No transaction data found in the uploaded document. Please check the file format and try again.' },
        { status: 422 }
      );
    }

    // ================================================================
    // FINALIZE ROWS
    // ================================================================
    const finalizedRows = combinedTransactions.map((tx: any, index: number) => ({
      id: index + 1,
      date: tx.date || '',
      type: tx.type || 'Transaction',
      description: (tx.description || '').trim(),
      amount: normalizeAmountSign(typeof tx.amount === 'number' ? `$${tx.amount.toFixed(2)}` : String(tx.amount || '$0.00')),
      balance: typeof tx.balance === 'number' ? `$${tx.balance.toFixed(2)}` : String(tx.balance || '$0.00')
    }));

    console.log(`✅ PARSER ARCHITECTURE SUCCESS: ${finalizedRows.length} ROWS SECURED VIA [${engineUsed}]. Format detected: ${detectedFormat}`);

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

// ================================================================
// UTILITY: slice PDF into single pages (for Gemini fallback)
// ================================================================
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