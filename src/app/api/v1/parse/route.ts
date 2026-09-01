import { NextResponse } from 'next/server';
import { PDFDocument } from 'pdf-lib';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const WORKING_MODEL = 'gemini-flash-lite-latest';

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
    const objectMatches = clean.match(/\{[^{}]*\}/g);
    if (objectMatches && objectMatches.length > 0) {
      try {
        return objectMatches.map(m => JSON.parse(m));
      } catch {}
    }
    return [];
  }
}

// ============ SPLIT PDF INTO CHUNKS ============
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

    console.log(`📄 Split into ${chunks.length} chunks`);
    return chunks;
  } catch (error) {
    console.warn('⚠️ Failed to split PDF:', error);
    return [buffer];
  }
}

// ============ MAIN POST ============
export async function POST(req: Request) {
  try {
    console.log('🚀 API called');

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'GEMINI_API_KEY missing' },
        { status: 500 }
      );
    }

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

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    console.log('📁 File:', file.name, file.size);

    // Get page count using pdf-lib
    let pageCount = 1;
    try {
      const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      pageCount = pdfDoc.getPageCount();
    } catch {
      pageCount = 1;
    }
    console.log(`📄 Detected ${pageCount} pages`);

    const CHUNK_SIZE = 5;
    let allTransactions: any[] = [];

    if (pageCount > CHUNK_SIZE) {
      console.log(`🔄 Processing ${pageCount} pages in chunks...`);
      const chunks = await splitPDFIntoChunks(buffer, CHUNK_SIZE);
      
      let chunkIndex = 0;
      for (const chunkBuffer of chunks) {
        chunkIndex++;
        const base64Data = chunkBuffer.toString('base64');
        console.log(`📄 Processing chunk ${chunkIndex}/${chunks.length}`);

        const prompt = `Extract ALL financial transactions from this document. Return ONLY a JSON array. Each object: {"id":1,"date":"date","type":"type","description":"desc","amount":"$10.00","balance":"$500.00"}`;

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${WORKING_MODEL}:generateContent?key=${apiKey}`;

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [
                  { text: prompt },
                  {
                    inlineData: {
                      mimeType: 'application/pdf',
                      data: base64Data,
                    },
                  },
                ],
              },
            ],
            generationConfig: {
              responseMimeType: 'application/json',
              maxOutputTokens: 4096,
              temperature: 0,
            },
          }),
        });

        if (!response.ok) {
          console.error(`❌ Chunk ${chunkIndex} failed:`, response.status);
          continue;
        }

        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
        const transactions = parseGeminiResponse(text);
        console.log(`📊 Chunk ${chunkIndex}: ${transactions.length} transactions`);
        allTransactions = allTransactions.concat(transactions);
      }
    } else {
      // Single request for small PDFs
      const base64Data = buffer.toString('base64');
      const prompt = `Extract ALL financial transactions. Return ONLY a JSON array. Each object: {"id":1,"date":"date","type":"type","description":"desc","amount":"$10.00","balance":"$500.00"}`;
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${WORKING_MODEL}:generateContent?key=${apiKey}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType: file.type || 'application/pdf',
                    data: base64Data,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            maxOutputTokens: 4096,
            temperature: 0,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Gemini API error:', errorText);
        return NextResponse.json(
          { success: false, error: `Gemini API: ${response.status}` },
          { status: response.status }
        );
      }

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
      allTransactions = parseGeminiResponse(text);
    }

    console.log(`✅ Extracted ${allTransactions.length} total transactions`);

    return NextResponse.json({
      success: true,
      filename: file.name,
      total_transactions: allTransactions.length,
      page_count: pageCount,
      rows: allTransactions,
    });
  } catch (error: any) {
    console.error('❌ Error:', error.message || error);
    return NextResponse.json(
      { success: false, error: error.message || 'Parsing failed' },
      { status: 500 }
    );
  }
}