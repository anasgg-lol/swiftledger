import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { PDFDocument } from 'pdf-lib';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

// ============ STEP 1: THE SLICER ============
async function slicePDFIntoPages(buffer: Buffer): Promise<Buffer[]> {
  try {
    const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const totalPages = pdfDoc.getPageCount();
    const pages: Buffer[] = [];

    for (let i = 0; i < totalPages; i++) {
      const newDoc = await PDFDocument.create();
      const [copiedPage] = await newDoc.copyPages(pdfDoc, [i]);
      newDoc.addPage(copiedPage);
      const pageBytes = await newDoc.save();
      pages.push(Buffer.from(pageBytes));
    }

    return pages;
  } catch (error) {
    console.error('❌ Slicer failed:', error);
    return [buffer]; // Fallback: return the whole PDF as one page
  }
}

// ============ STEP 2: THE WORKER ============
async function parsePageWithGemini(pageBuffer: Buffer, pageIndex: number, apiKey: string): Promise<any[]> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const base64Data = pageBuffer.toString('base64');

  const prompt = `Extract ALL financial transactions from this document into a JSON object matching this exact schema:
{
  "transactions": [
    {
      "id": 1,
      "date": "1st November 2018",
      "type": "Card Payment | Direct Debit | Bank Credit | Cashpoint | Standing Order",
      "description": "Clean description",
      "amount": "£10.00",
      "balance": "£500.00"
    }
  ]
}`;

  try {
    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            { inlineData: { mimeType: 'application/pdf', data: base64Data } },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        maxOutputTokens: 4096,
        temperature: 0.1,
      },
    });

    const text = result.response.text() || '{}';
    let clean = text.trim();
    clean = clean.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsedData = JSON.parse(clean);
    const transactions = parsedData.transactions || parsedData.rows || [];
    return transactions;
  } catch (error: any) {
    console.error(`❌ Page ${pageIndex + 1} failed:`, error?.message || error);
    return [];
  }
}

// ============ STEP 3: THE ACCOUNT ============
function reconcileBalances(transactions: any[]): any[] {
  if (transactions.length === 0) return transactions;

  let runningBalance = 0;
  const reconciled = [];

  for (const tx of transactions) {
    const amount = parseFloat(tx.amount?.replace(/[^0-9.-]/g, '') || '0');
    const balance = parseFloat(tx.balance?.replace(/[^0-9.-]/g, '') || '0');

    // If balance is missing, calculate it
    if (isNaN(balance)) {
      runningBalance += amount;
      tx.calculated_balance = runningBalance.toFixed(2);
    } else {
      runningBalance = balance;
      tx.balance = balance.toFixed(2);
    }

    reconciled.push(tx);
  }

  return reconciled;
}

// ============ MAIN POST ============
export async function POST(req: Request) {
  const startTime = Date.now();

  try {
    console.log('🚀 API called');

    // 1. Check API key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('❌ GEMINI_API_KEY missing');
      return NextResponse.json(
        { success: false, error: 'GEMINI_API_KEY missing' },
        { status: 500 }
      );
    }

    // 2. Parse file
    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file uploaded' },
        { status: 400 }
      );
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { success: false, error: 'File exceeds 10MB' },
        { status: 400 }
      );
    }

    // 3. Read file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    console.log('📁 File:', file.name, file.size, 'bytes');

    // ============ STEP 1: SLICER ============
    console.log('🔪 Slicing PDF into pages...');
    const pageBuffers = await slicePDFIntoPages(buffer);
    console.log(`📄 Sliced into ${pageBuffers.length} pages`);

    // ============ STEP 2: WORKER (Parallel) ============
    console.log('⚡ Processing pages in parallel...');
    const pagePromises = pageBuffers.map((pageBuffer, index) =>
      parsePageWithGemini(pageBuffer, index, apiKey)
    );

    const pageResults = await Promise.all(pagePromises);

    // Flatten all transactions
    let allTransactions: any[] = [];
    for (const result of pageResults) {
      allTransactions = allTransactions.concat(result);
    }

    console.log(`📊 Extracted ${allTransactions.length} raw transactions`);

    // ============ STEP 3: ACCOUNT ============
    console.log('🧮 Reconciling balances...');
    const reconciledTransactions = reconcileBalances(allTransactions);

    const elapsed = Date.now() - startTime;
    console.log(`✅ Done in ${elapsed}ms`);

    // ============ Return ============
    return NextResponse.json({
      success: true,
      filename: file.name,
      total_transactions: reconciledTransactions.length,
      processing_time_ms: elapsed,
      rows: reconciledTransactions,
    });
  } catch (error: any) {
    console.error('❌ Error:', error?.message || error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Parsing failed' },
      { status: 500 }
    );
  }
}