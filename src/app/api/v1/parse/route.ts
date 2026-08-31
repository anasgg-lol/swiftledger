import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import sharp from 'sharp';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

const GEMINI_MODELS = [
  'gemini-3.5-flash-lite',
];

function cleanAndParseJSON(rawResponse: string): any {
  let clean = rawResponse.trim();
  clean = clean.replace(/```json/gi, '').replace(/```/g, '').trim();
  try {
    return JSON.parse(clean);
  } catch {
    const lastValidObjectIndex = clean.lastIndexOf('}');
    if (lastValidObjectIndex !== -1) {
      const salvaged = clean.substring(0, lastValidObjectIndex + 1) + ']}';
      try {
        return JSON.parse(salvaged);
      } catch {
        const salvagedArray = clean.substring(0, lastValidObjectIndex + 1) + ']';
        return JSON.parse(salvagedArray);
      }
    }
    throw new Error('Could not parse or salvage JSON output.');
  }
}

async function getPageCountPdfParse(buffer: Buffer): Promise<number | null> {
  try {
    // @ts-ignore
    const pdfParse = require('pdf-parse');
    const data = await pdfParse(buffer);
    return data.numpages || 1;
  } catch (error) {
    console.warn('⚠️ pdf-parse failed:', error);
    return null;
  }
}

async function getPageCountPdfJs(buffer: Buffer): Promise<number | null> {
  try {
    try {
      const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
      const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
      return pdf.numPages;
    } catch {
      const pdfjsLib = await import('pdfjs-dist');
      const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
      return pdf.numPages;
    }
  } catch (error) {
    console.warn('⚠️ pdfjs-dist failed:', error);
    return null;
  }
}

async function getPageCountGeminiVision(buffer: Buffer): Promise<number> {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('⚠️ No Gemini API key, using fallback 1');
      return 1;
    }
    const base64Data = buffer.toString('base64');
    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash-lite',
      contents: [
        {
          role: 'user',
          parts: [
            { text: 'How many pages does this PDF have? Reply only with a number, nothing else.' },
            { inlineData: { data: base64Data, mimeType: 'application/pdf' } },
          ],
        },
      ],
      config: {
        maxOutputTokens: 10,
        temperature: 0.0,
      },
    });

    const count = parseInt(response.text || '1', 10);
    return count > 0 ? count : 1;
  } catch (error) {
    console.warn('⚠️ Gemini Vision fallback failed:', error);
    return 1;
  }
}

async function getPDFPageCount(buffer: Buffer): Promise<number> {
  const count1 = await getPageCountPdfParse(buffer);
  if (count1 !== null && count1 > 0) {
    console.log(`📄 pdf-parse: ${count1} pages`);
    return count1;
  }

  const count2 = await getPageCountPdfJs(buffer);
  if (count2 !== null && count2 > 0) {
    console.log(`📄 pdfjs-dist: ${count2} pages`);
    return count2;
  }

  console.log('⚠️ pdf-parse and pdfjs-dist failed. Using Gemini Vision fallback.');
  const count3 = await getPageCountGeminiVision(buffer);
  console.log(`📄 Gemini Vision: ${count3} pages`);
  return count3;
}

async function generateWithFallback(ai: GoogleGenAI, requestPayload: any) {
  let lastError: any = null;
  for (const modelName of GEMINI_MODELS) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          ...requestPayload,
          model: modelName,
        });
        return { response, modelUsed: modelName };
      } catch (error: any) {
        lastError = error;
        const isHighDemandOrRateLimit =
          error?.status === 429 ||
          error?.status === 503 ||
          String(error).includes('high demand') ||
          String(error).includes('RESOURCE_EXHAUSTED');
        if (isHighDemandOrRateLimit && attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, 1200));
        } else {
          break;
        }
      }
    }
  }
  throw lastError || new Error('All Gemini model endpoints failed.');
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is missing from .env.local.' },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'File size exceeds 10MB limit.' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const rawBuffer = Buffer.from(bytes);

    let processedBuffer = rawBuffer;
    let mimeType = file.type || '';
    let pageCount = 1;

    if (!mimeType) {
      if (file.name.endsWith('.pdf')) mimeType = 'application/pdf';
      else if (file.name.endsWith('.png')) mimeType = 'image/png';
      else mimeType = 'image/jpeg';
    }

    if (mimeType === 'application/pdf') {
      pageCount = await getPDFPageCount(rawBuffer);
      console.log(`📄 Final page count: ${pageCount}`);
    }

    if (mimeType.startsWith('image/')) {
      processedBuffer = await sharp(rawBuffer)
        .rotate()
        .resize({ width: 1200, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 75 })
        .toBuffer();
      mimeType = 'image/jpeg';
    }

    const base64Data = processedBuffer.toString('base64');
    const ai = new GoogleGenAI({ apiKey });

    // ============================================================
    // 🔥 ULTIMATE PROMPT – FORCES CORRECT BALANCE EXTRACTION
    // ============================================================
    const prompt = `You are a financial document parser. Extract ALL transactions from this bank statement.

CRITICAL RULES FOR THE "balance" FIELD:
1. EVERY transaction MUST include a "balance" field.
2. The "balance" is the RUNNING ACCOUNT BALANCE shown AFTER each transaction.
3. The balance is ALWAYS on the RIGHT side of the transaction row.
4. The balance is ALWAYS a POSITIVE number (no parentheses, no minus sign).
5. The balance MUST include the currency symbol ($, £, €, etc.).
6. DO NOT calculate the balance. USE the balance EXACTLY as shown on the statement.
7. If the statement shows "194,862.29" as the balance, output "$194,862.29".

CRITICAL RULES FOR THE "amount" FIELD:
1. If the PDF shows parentheses like "(1,476.44)", it's a DEBIT → output "-$1,476.44"
2. If the PDF shows a minus sign like "-1,476.44", it's a DEBIT → output "-$1,476.44"
3. If the PDF shows a positive number like "1,476.44", it's a CREDIT → output "$1,476.44"
4. Look at the description to know if it's money in or money out.

THE EXACT SCHEMA:
{
  "transactions": [
    {
      "id": 1,
      "date": "01/01/2026",
      "type": "Card Payment | Direct Debit | Bank Credit | Cashpoint | Standing Order | Wire | ACH | POS | Check | Fee",
      "description": "Full transaction description",
      "amount": "$1,234.56",
      "balance": "$157,100.00"
    }
  ]
}

EXAMPLES OF CORRECT EXTRACTION:
- PDF shows: "PURCHASE ... $1,156.94 $144,073.91"
  → amount: "$1,156.94", balance: "$144,073.91"
  
- PDF shows: "PAYROLL ... $5,021.23 $155,356.46"
  → amount: "$5,021.23", balance: "$155,356.46"
  
- PDF shows: "(8,166.82) 189,136.05"
  → amount: "-$8,166.82", balance: "$189,136.05"

OUTPUT ONLY VALID JSON. NO MARKDOWN. NO EXPLANATION.`;

    const { response, modelUsed } = await generateWithFallback(ai, {
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            { inlineData: { data: base64Data, mimeType: mimeType } },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
        maxOutputTokens: 8192,
        temperature: 0.0,
      },
    });

    const responseText = response.text || '{}';
    const parsedData = cleanAndParseJSON(responseText);

    const transactions = Array.isArray(parsedData)
      ? parsedData
      : parsedData.transactions || parsedData.rows || Object.values(parsedData)[0] || [];

    console.log(`✅ Returning ${transactions.length} transactions, page_count: ${pageCount}`);

    return NextResponse.json({
      success: true,
      filename: file.name,
      engine_used: `Gemini (${modelUsed})`,
      total_transactions: transactions.length,
      page_count: pageCount,
      rows: transactions,
    });
  } catch (error: any) {
    console.error('Parsing Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Parsing failed',
        details: String(error),
      },
      { status: 500 }
    );
  }
}