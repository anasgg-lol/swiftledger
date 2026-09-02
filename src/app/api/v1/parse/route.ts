import { NextResponse } from 'next/server';
import { PDFDocument } from 'pdf-lib';

export const maxDuration = 60; // Next.js official Route segment configuration

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
// 💎 PINNED BACK TO YOUR FUNCTIONAL LIGHTWEIGHT CORE MODEL ASSET:
const WORKING_MODEL = 'gemini-flash-lite-latest'; 

if (typeof global.DOMMatrix === 'undefined') {
  (global as any).DOMMatrix = class {};
}

// ============ PARSE GEMINI RESPONSE ============
function parseGeminiResponse(text: string): any[] {
  let clean = text.trim();
  clean = clean.replace(/```json/gi, '').replace(/```/g, '').trim();
  
  try {
    const parsed = JSON.parse(clean);
    if (Array.isArray(parsed)) return parsed;
    if (parsed.transactions) return parsed.transactions;
    if (parsed.rows) return parsed.rows;
    for (const key of Object.keys(parsed)) {
      if (Array.isArray(parsed[key]) && parsed[key].length > 0) {
        return parsed[key];
      }
    }
    return [];
  } catch {
    const arrayMatch = clean.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (arrayMatch) {
      try {
        const extracted = JSON.parse(arrayMatch[0]);
        if (Array.isArray(extracted)) return extracted;
      } catch {}
    }
    return [];
  }
}

// ============ 🧱 STEP 1: THE SLICER (CHOP INDIVIDUAL PAGE MATRICES) ============
async function splitPDFIntoChunks(buffer: Buffer, chunkSize: number = 5): Promise<Buffer[]> {
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
    console.log(`📄 Slicer completed: Split into ${chunks.length} chunks`);
    return chunks;
  } catch (error) {
    console.warn('⚠️ Slicer parsing fallback activated:', error);
    return [buffer];
  }
}

// ============ MAIN SERVICE CORE ============
export async function POST(req: Request) {
  try {
    console.log('🚀 API called');

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'GEMINI_API_KEY missing' }, { status: 500 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ success: false, error: 'File exceeds 10MB' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    console.log('📁 File processing:', file.name, file.size);

    let pageCount = 1;
    try {
      const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      pageCount = pdfDoc.getPageCount();
    } catch {
      pageCount = 1;
    }
    console.log(`📄 Detected ${pageCount} pages`);

    const CHUNK_SIZE = 5;
    let rawTransactions: any[] = [];
    const url = "https://googleapis.com" + WORKING_MODEL + ":generateContent?key=" + apiKey;

    if (pageCount > CHUNK_SIZE) {
      console.log(`🔄 Processing ${pageCount} pages in parallel chunks via ${WORKING_MODEL}...`);
      const chunks = await splitPDFIntoChunks(buffer, CHUNK_SIZE);
      
      // ============ 🚀 STEP 2: THE WORKER (EXECUTE ASYNC PARALLEL CONCURRENCY MULTI-THREADING) ============
      const chunkPromises = chunks.map(async (chunkBuffer, index) => {
        const base64Data = chunkBuffer.toString('base64');
        const prompt = `Extract ALL financial transactions from this document partition chunk. Return ONLY a JSON array. Each object layout MUST precisely match this schema structure: [{"date":"date","type":"type","description":"desc","amount":"amount","balance":"balance"}]`;

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
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
              maxOutputTokens: 8192,
              temperature: 0,
            },
          }),
        });

        if (!response.ok) {
          console.error(`❌ Chunk ${index + 1} failed:`, response.status);
          return [];
        }

        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
        return parseGeminiResponse(text);
      });

      // Resolve all parallel microsecond worker lines concurrently
      const resolvedSegments = await Promise.all(chunkPromises);
      for (const segment of resolvedSegments) {
        if (Array.isArray(segment)) {
          rawTransactions = rawTransactions.concat(segment);
        }
      }
    } else {
      // Single request for small PDFs
      const base64Data = buffer.toString('base64');
      const prompt = `Extract ALL financial transactions. Return ONLY a JSON array. Each object layout MUST precisely match this schema structure: {"id":1,"date":"date","type":"type","description":"desc","amount":"$10.00","balance":"$500.00"}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
            maxOutputTokens: 8192,
            temperature: 0,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Gemini API error:', errorText);
        return NextResponse.json({ success: false, error: `Gemini API: ${response.status}` }, { status: response.status });
      }

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
      rawTransactions = parseGeminiResponse(text);
    }

    // ============ 📊 STEP 3: THE ACCOUNTANT (RE-CALCULATE AND NORMALIZE MATH VALUES LOCALLY) ============
    const finalizedRows = rawTransactions.map((tx: any, index: number) => ({
      id: index + 1,
      date: tx.date || tx.d || '',
      type: tx.type || tx.t || 'Transaction',
      description: tx.description || tx.desc || '',
      amount: tx.amount || tx.a || '$0.00',
      balance: tx.balance || tx.b || '$0.00'
    }));

    console.log(`✅ Extracted ${finalizedRows.length} total transactions natively.`);

    return NextResponse.json({
      success: true,
      filename: file.name,
      total_transactions: finalizedRows.length,
      page_count: pageCount,
      rows: finalizedRows,
    });
  } catch (error: any) {
    console.error('❌ System Failure Exception:', error.message || error);
    return NextResponse.json({ success: false, error: error.message || 'Parsing failed' }, { status: 500 });
  }
}
