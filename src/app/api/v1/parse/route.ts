import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import sharp from 'sharp';
import { PDFDocument } from 'pdf-lib';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

const GEMINI_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.6-flash',
  'gemini-3.7-flash',
];

// ============ JSON SALVAGE ============
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

// ============ TRIPLE-ENGINE PAGE COUNT ============
async function getPDFPageCount(buffer: Buffer): Promise<number> {
  // Try 1: pdf-lib (fastest)
  try {
    const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const count = pdfDoc.getPageCount();
    console.log(`📄 pdf-lib page count: ${count}`);
    if (count > 0) return count;
  } catch (error) {
    console.warn('⚠️ pdf-lib failed:', error);
  }

  // Try 2: pdf-parse (reliable)
  try {
    const pdfParseModule = await import('pdf-parse');
    const pdfParse = (pdfParseModule as any).default || pdfParseModule;
    const data = await pdfParse(buffer);
    const count = data.numpages;
    console.log(`📄 pdf-parse page count: ${count}`);
    if (count > 0) return count;
  } catch (error) {
    console.warn('⚠️ pdf-parse failed:', error);
  }

  // Try 3: pdfjs-dist (fallback)
  try {
    const pdfjsLib = await import('pdfjs-dist');
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
    const count = pdf.numPages;
    console.log(`📄 pdfjs-dist page count: ${count}`);
    if (count > 0) return count;
  } catch (error) {
    console.warn('⚠️ pdfjs-dist failed:', error);
  }

  // Final fallback: estimate from file size
  const estimatedPages = Math.max(1, Math.floor(buffer.length / 10000));
  console.log(`📄 Estimated page count: ${estimatedPages}`);
  return estimatedPages;
}

// ============ GEMINI FALLBACK ============
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

// ============ MAIN POST HANDLER ============
export async function POST(req: Request) {
  try {
    console.log('🚀 API route called');

    // 1. API Key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('❌ GEMINI_API_KEY is missing');
      return NextResponse.json(
        { success: false, error: 'GEMINI_API_KEY is missing from .env.local.' },
        { status: 500 }
      );
    }
    console.log('✅ API key found');

    // 2. Parse FormData
    let formData;
    try {
      formData = await req.formData();
    } catch (formError) {
      console.error('❌ Failed to parse form data:', formError);
      return NextResponse.json(
        { success: false, error: 'Invalid form data' },
        { status: 400 }
      );
    }

    const file = formData.get('file') as File;
    if (!file) {
      console.error('❌ No file uploaded');
      return NextResponse.json(
        { success: false, error: 'No file uploaded' },
        { status: 400 }
      );
    }
    console.log(`📁 File received: ${file.name}, size: ${file.size} bytes`);

    // 3. Validate File Size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      console.error(`❌ File too large: ${file.size}`);
      return NextResponse.json(
        { success: false, error: 'File size exceeds 10MB limit.' },
        { status: 400 }
      );
    }

    // 4. Process File
    const bytes = await file.arrayBuffer();
    const rawBuffer = Buffer.from(bytes);
    console.log(`📦 Buffer created: ${rawBuffer.length} bytes`);

    let processedBuffer = rawBuffer;
    let mimeType = file.type || '';
    let pageCount = 1;

    if (!mimeType) {
      if (file.name.endsWith('.pdf')) mimeType = 'application/pdf';
      else if (file.name.endsWith('.png')) mimeType = 'image/png';
      else mimeType = 'image/jpeg';
    }
    console.log(`📋 MIME type: ${mimeType}`);

    // 5. Get Page Count
    if (mimeType === 'application/pdf') {
      try {
        pageCount = await getPDFPageCount(rawBuffer);
        console.log(`✅ Final page count: ${pageCount}`);
      } catch (pdfError) {
        console.error('❌ PDF page count failed:', pdfError);
        pageCount = 1;
      }
    }

    // 6. Process Images with Sharp
    if (mimeType.startsWith('image/')) {
      try {
        processedBuffer = await sharp(rawBuffer)
          .rotate()
          .resize({ width: 1600, fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 85 })
          .toBuffer();
        mimeType = 'image/jpeg';
        console.log(`✅ Image processed: ${processedBuffer.length} bytes`);
      } catch (sharpError) {
        console.error('❌ Sharp processing failed:', sharpError);
        processedBuffer = rawBuffer;
      }
    }

    // 7. Encode to Base64
    const base64Data = processedBuffer.toString('base64');
    console.log(`📤 Base64 data length: ${base64Data.length}`);

    // 8. Call Gemini
    console.log('🤖 Initializing Gemini...');
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

    let response, modelUsed;
    try {
      const result = await generateWithFallback(ai, {
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              {
                inlineData: {
                  data: base64Data,
                  mimeType: mimeType,
                },
              },
            ],
          },
        ],
        config: {
          responseMimeType: 'application/json',
          maxOutputTokens: 4096,
          temperature: 0.1,
        },
      });
      response = result.response;
      modelUsed = result.modelUsed;
      console.log(`✅ Gemini succeeded with: ${modelUsed}`);
    } catch (geminiError: any) {
      console.error('❌ All Gemini models failed:', geminiError);
      return NextResponse.json(
        {
          success: false,
          error: `Gemini processing failed: ${geminiError?.message || 'Unknown error'}`,
        },
        { status: 500 }
      );
    }

    // 9. Parse Response
    const responseText = response.text || '{}';
    console.log(`📥 Gemini response length: ${responseText.length}`);

    let parsedData;
    try {
      parsedData = cleanAndParseJSON(responseText);
    } catch (parseError: any) {
      console.error('❌ Failed to parse Gemini response:', parseError);
      return NextResponse.json(
        {
          success: false,
          error: `Failed to parse Gemini response: ${parseError?.message || 'Unknown error'}`,
          raw: responseText.substring(0, 500),
        },
        { status: 500 }
      );
    }

    // 10. Extract Transactions
    const transactions = Array.isArray(parsedData)
      ? parsedData
      : parsedData.transactions || parsedData.rows || Object.values(parsedData)[0] || [];

    console.log(`✅ Returning ${transactions.length} transactions, page_count: ${pageCount}`);

    // 11. Return Response
    return NextResponse.json({
      success: true,
      filename: file.name,
      engine_used: `Gemini (${modelUsed})`,
      total_transactions: transactions.length,
      page_count: pageCount,
      rows: transactions,
    });
  } catch (error: any) {
    console.error('❌ UNHANDLED ERROR in API route:', error);
    console.error('❌ Error stack:', error?.stack);
    return NextResponse.json(
      {
        success: false,
        error: `Server error: ${error?.message || 'Unknown error'}`,
        details: error?.stack || 'No stack trace',
      },
      { status: 500 }
    );
  }
}