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
// 🔥 FIXED: pdf-parse with proper type handling
// ============================================================
async function getPageCountPdfParse(buffer: Buffer): Promise<number | null> {
  try {
    // Using require instead of import to avoid TypeScript issues
    // @ts-ignore
    const pdfParse = require('pdf-parse');
    const data = await pdfParse(buffer);
    return data.numpages || 1;
  } catch (error) {
    console.warn('⚠️ pdf-parse failed:', error);
    return null;
  }
}

// ============================================================
// 🔥 FIXED: pdfjs-dist with proper import
// ============================================================
async function getPageCountPdfJs(buffer: Buffer): Promise<number | null> {
  try {
    // Try legacy build first
    try {
      const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
      const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
      return pdf.numPages;
    } catch {
      // Fallback to regular import
      const pdfjsLib = await import('pdfjs-dist');
      const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
      return pdf.numPages;
    }
  } catch (error) {
    console.warn('⚠️ pdfjs-dist failed:', error);
    return null;
  }
}

// ============================================================
// 🔥 Gemini Vision Fallback (for scanned/corrupted PDFs)
// ============================================================
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

// ============================================================
// 🔥 MASTER PAGE COUNT FUNCTION
// ============================================================
async function getPDFPageCount(buffer: Buffer): Promise<number> {
  // Try pdf-parse first (fastest)
  const count1 = await getPageCountPdfParse(buffer);
  if (count1 !== null && count1 > 0) {
    console.log(`📄 pdf-parse: ${count1} pages`);
    return count1;
  }

  // Fallback to pdfjs-dist
  const count2 = await getPageCountPdfJs(buffer);
  if (count2 !== null && count2 > 0) {
    console.log(`📄 pdfjs-dist: ${count2} pages`);
    return count2;
  }

  // Final fallback: Gemini Vision (SLOW - only for scanned PDFs)
  console.log('⚠️ pdf-parse and pdfjs-dist failed. Using Gemini Vision fallback.');
  const count3 = await getPageCountGeminiVision(buffer);
  console.log(`📄 Gemini Vision: ${count3} pages`);
  return count3;
}

// ============================================================
// 🔥 GEMINI GENERATION WITH FALLBACK
// ============================================================
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

// ============================================================
// 🔥 POST HANDLER
// ============================================================
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
        maxOutputTokens: 4096,
        temperature: 0.1,
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