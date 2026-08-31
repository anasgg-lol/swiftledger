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

// ============================================================
// 🔥 PDF PAGE COUNT MODULES
// ============================================================
async function getPageCountPdfParse(buffer: Buffer): Promise<number | null> {
  try {
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
    if (!apiKey) return 1;
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
      config: { maxOutputTokens: 10, temperature: 0.0 },
    });

    const count = parseInt(response.text || '1', 10);
    return count > 0 ? count : 1;
  } catch (error) {
    return 1;
  }
}

async function getPDFPageCount(buffer: Buffer): Promise<number> {
  const count1 = await getPageCountPdfParse(buffer);
  if (count1 !== null && count1 > 0) return count1;

  const count2 = await getPageCountPdfJs(buffer);
  if (count2 !== null && count2 > 0) return count2;

  const count3 = await getPageCountGeminiVision(buffer);
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
        if (error?.status === 429 && attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, 1200));
        } else {
          break;
        }
      }
    }
  }
  throw lastError || new Error('All Gemini model endpoints failed.');
}

// ============================================================
// 🔥 POST HANDLER
// ============================================================
export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is missing.' }, { status: 500 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: 'File size exceeds 10MB limit.' }, { status: 400 });
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

    const prompt = `You are a financial document parser. Extract ALL transactions from this bank statement.

CRITICAL RULES:
1. Extract EVERY transaction row. DO NOT skip any.
2. EVERY transaction MUST include a "balance" field.
3. The "balance" is the RUNNING ACCOUNT BALANCE shown AFTER each transaction.
4. The balance is ALWAYS on the RIGHT side of the transaction row.
5. DO NOT calculate the balance. USE the balance EXACTLY as shown on the statement.
6. Continue extracting ALL transactions until you reach the end of the statement.

THE SCHEMA:
{
  "transactions": [
    {
      "id": 1,
      "date": "01/01/2026",
      "type": "Card Payment | Direct Debit | Bank Credit | Cashpoint | Standing Order | Wire | ACH | POS | Check | Fee",
      "description": "Full description",
      "amount": "$1,234.56",
      "balance": "$157,100.00"
    }
  ]
}

RULES FOR AMOUNTS:
- Parentheses "(1,476.44)" → "-$1,476.44"
- Minus sign "-1,476.44" → "-$1,476.44"  
- Positive "1,476.44" → "$1,476.44"

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
        maxOutputTokens: 16384,
        temperature: 0.0,
      },
    });

    const responseText = response.text || '{}';
    const parsedData = cleanAndParseJSON(responseText);

    const transactions = parsedData.transactions || parsedData.rows || parsedData || [];

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
    return NextResponse.json({ success: false, error: error?.message || 'Parsing failed' }, { status: 500 });
  }
}
