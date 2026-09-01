import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import sharp from 'sharp';
import { PDFDocument } from 'pdf-lib';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_OUTPUT_TOKENS = 8192; // ✅ Increased from 4096 to 8192
const CHUNK_PAGES = 10; // ✅ Process 10 pages at a time for large PDFs

const GEMINI_MODELS = [
  'gemini-3.5-flash-lite',  // ✅ Fastest
  'gemini-3.6-flash',       // ✅ Balanced
  'gemini-3.7-flash',       // ✅ Most capable (slower)
];

// ============ JSON SALVAGE (IMPROVED) ============
function cleanAndParseJSON(rawResponse: string): any {
  let clean = rawResponse.trim();
  clean = clean.replace(/```json/gi, '').replace(/```/g, '').trim();
  
  // Try direct parse first
  try {
    return JSON.parse(clean);
  } catch {
    // If it's an array that got cut off, try to close it
    if (clean.startsWith('[') && !clean.endsWith(']')) {
      // Try to find the last valid object
      const lastValidBracket = clean.lastIndexOf('{');
      if (lastValidBracket !== -1) {
        const salvaged = clean.substring(0, lastValidBracket) + '}]';
        try {
          return JSON.parse(salvaged);
        } catch {}
      }
    }
    
    // If it's an object that got cut off, try to close it
    if (clean.startsWith('{') && !clean.endsWith('}')) {
      const lastValidBrace = clean.lastIndexOf('}');
      if (lastValidBrace !== -1) {
        const salvaged = clean.substring(0, lastValidBrace + 1) + '}';
        try {
          return JSON.parse(salvaged);
        } catch {}
      }
    }
    
    // Fallback: try to extract any complete objects
    const matches = clean.match(/\{[^{}]*\}/g);
    if (matches && matches.length > 0) {
      try {
        const combined = '[' + matches.join(',') + ']';
        return JSON.parse(combined);
      } catch {}
    }
    
    throw new Error('Could not parse or salvage JSON output.');
  }
}

// ============ TRIPLE-ENGINE PAGE COUNT ============
async function getPDFPageCount(buffer: Buffer): Promise<number> {
  try {
    const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const count = pdfDoc.getPageCount();
    console.log(`📄 pdf-lib page count: ${count}`);
    if (count > 0) return count;
  } catch (error) {
    console.warn('⚠️ pdf-lib failed:', error);
  }

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

  try {
    const pdfjsLib = await import('pdfjs-dist');
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
    const count = pdf.numPages;
    console.log(`📄 pdfjs-dist page count: ${count}`);
    if (count > 0) return count;
  } catch (error) {
    console.warn('⚠️ pdfjs-dist failed:', error);
  }

  const estimatedPages = Math.max(1, Math.floor(buffer.length / 10000));
  console.log(`📄 Estimated page count: ${estimatedPages}`);
  return estimatedPages;
}

// ============ SPLIT PDF INTO CHUNKS ============
async function splitPDFIntoChunks(buffer: Buffer, chunkSize: number = CHUNK_PAGES): Promise<Buffer[]> {
  try {
    const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const totalPages = pdfDoc.getPageCount();
    const chunks: Buffer[] = [];

    for (let i = 0; i < totalPages; i += chunkSize) {
      const newDoc = await PDFDocument.create();
      const end = Math.min(i + chunkSize, totalPages);
      const pageIndices = Array.from({ length: end - i }, (_, idx) => i + idx);
      const copiedPages = await newDoc.copyPages(pdfDoc, pageIndices);
      copiedPages.forEach(page => newDoc.addPage(page));
      const chunkBytes = await newDoc.save();
      chunks.push(Buffer.from(chunkBytes));
    }

    console.log(`📄 Split PDF into ${chunks.length} chunks`);
    return chunks;
  } catch (error) {
    console.warn('⚠️ Failed to split PDF:', error);
    return [buffer];
  }
}

// ============ GEMINI FALLBACK WITH TIMEOUT ============
async function generateWithFallback(ai: GoogleGenAI, requestPayload: any, timeoutMs: number = 30000) {
  let lastError: any = null;
  
  for (const modelName of GEMINI_MODELS) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        
        const response = await ai.models.generateContent({
          ...requestPayload,
          model: modelName,
        });
        
        clearTimeout(timeoutId);
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

    // 1. Validate API Key
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

    // 7. If PDF is large (>20 pages), split into chunks and process sequentially
    let allTransactions: any[] = [];
    let chunks: Buffer[] = [];

    if (mimeType === 'application/pdf' && pageCount > 20) {
      console.log(`📄 Large PDF detected (${pageCount} pages). Splitting into chunks...`);
      chunks = await splitPDFIntoChunks(rawBuffer, CHUNK_PAGES);
    } else {
      chunks = [processedBuffer];
    }

    // 8. Process each chunk
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `Extract ALL financial transactions from this document into a JSON array. Each object: { "id": number, "date": "string", "type": "Card Payment | Direct Debit | Bank Credit | Cashpoint | Standing Order", "description": "string", "amount": "string", "balance": "string" }. Return only valid JSON.`;

    let chunkIndex = 0;
    for (const chunkBuffer of chunks) {
      chunkIndex++;
      const base64Data = chunkBuffer.toString('base64');
      console.log(`📤 Processing chunk ${chunkIndex}/${chunks.length} (${base64Data.length} chars)`);

      try {
        const { response, modelUsed } = await generateWithFallback(ai, {
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
            maxOutputTokens: MAX_OUTPUT_TOKENS,
            temperature: 0.1,
          },
        });

        const responseText = response.text || '{}';
        console.log(`📥 Chunk ${chunkIndex} response length: ${responseText.length}`);

        let parsedData;
        try {
          parsedData = cleanAndParseJSON(responseText);
        } catch (parseError: any) {
          console.error(`❌ Failed to parse chunk ${chunkIndex}:`, parseError);
          // If chunk fails, try to salvage what we can
          const matches = responseText.match(/\{[^{}]*\}/g);
          if (matches && matches.length > 0) {
            parsedData = matches.map(m => {
              try { return JSON.parse(m); } catch { return null; }
            }).filter(Boolean);
          } else {
            continue;
          }
        }

        const transactions = Array.isArray(parsedData)
          ? parsedData
          : parsedData.transactions || parsedData.rows || Object.values(parsedData)[0] || [];

        allTransactions = allTransactions.concat(transactions);
        console.log(`✅ Chunk ${chunkIndex}: ${transactions.length} transactions extracted`);

        // Small delay between chunks to avoid rate limits
        if (chunks.length > 1 && chunkIndex < chunks.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (chunkError) {
        console.error(`❌ Chunk ${chunkIndex} failed:`, chunkError);
        // Continue with next chunk
      }
    }

    console.log(`✅ Total transactions extracted: ${allTransactions.length}`);

    // 9. If no transactions were extracted, try the old way (one-shot)
    if (allTransactions.length === 0 && chunks.length > 1) {
      console.warn('⚠️ Chunking failed, trying one-shot with fallback...');
      const base64Data = processedBuffer.toString('base64');
      try {
        const { response, modelUsed } = await generateWithFallback(ai, {
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
            maxOutputTokens: MAX_OUTPUT_TOKENS,
            temperature: 0.1,
          },
        });
        const parsedData = cleanAndParseJSON(response.text || '{}');
        const transactions = Array.isArray(parsedData)
          ? parsedData
          : parsedData.transactions || parsedData.rows || Object.values(parsedData)[0] || [];
        allTransactions = transactions;
      } catch (fallbackError) {
        console.error('❌ Fallback also failed:', fallbackError);
      }
    }

    // 10. Return Response
    return NextResponse.json({
      success: true,
      filename: file.name,
      engine_used: `Gemini (${GEMINI_MODELS[0]})`,
      total_transactions: allTransactions.length,
      page_count: pageCount,
      rows: allTransactions,
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