import { NextResponse } from 'next/server';
import { PDFDocument } from 'pdf-lib';

export const maxDuration = 60; // Next.js official Route segment configuration config object replacement

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
// ✅ To this active, functional endpoint model string:
const WORKING_MODEL = 'gemini-flash-lite-latest';
 // Updated to valid active direct endpoint asset

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

    // ✅ PASTE THIS DIRECT FIX INSTEAD:
    console.log(`📄 Split into ${chunks.length} chunks`); // 💡 Fixed the typo to console.log!

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
      
      // ✅ FIXED: Template literal correctly interpolates variables dynamically now
      // ✅ PASTE THIS EXACT CORRECT TEMPLATE LITERAL IN BOTH PLACES INSTEAD:
      // ✅ PASTE THIS EXACT CONCATENATED RAW ENDPOINT STRUCTURE IN BOTH PLACES INSTEAD:
      // ✅ And replace them with this version in BOTH places:
      // ✅ And replace them with this version in BOTH places:
      const url = "https://googleapis.com" + WORKING_MODEL + ":generateContent?key=" + apiKey;




      
      // 🚀 THE WORKER: Executes chunk requests in parallel concurrency instead of blocking threads
      const chunkPromises = chunks.map(async (chunkBuffer, index) => {
        const base64Data = chunkBuffer.toString('base64');
        const prompt = `Extract ALL financial transactions from this document partition chunk. Withdrawals/debits MUST be outputted explicitly with a minus sign prefixed (e.g. "-$10.00"). Return a clean JSON array matching this exact parameter mapping layout: [{"date":"date","type":"type","description":"desc","amount":"amount","balance":"balance"}]`;

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

        if (!response.ok) return [];
        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
        return parseGeminiResponse(text);
      });

      const resolvedSegments = await Promise.all(chunkPromises);
      for (const segment of resolvedSegments) {
        if (Array.isArray(segment)) {
          allTransactions = allTransactions.concat(segment);
        }
      }
    } else {
      // Single request for small PDFs
      const base64Data = buffer.toString('base64');
      const prompt = `Extract ALL financial transactions. Withdrawals/debits MUST be outputted explicitly with a minus sign prefixed (e.g. "-$10.00"). Return ONLY a JSON array. Each object: {"id":1,"date":"date","type":"type","description":"desc","amount":"$10.00","balance":"$500.00"}`;
      
      // ✅ FIXED: Correctly configured string interpolation
     // ✅ PASTE THIS EXACT CONCATENATED RAW ENDPOINT STRUCTURE IN BOTH PLACES INSTEAD:
      const url = "https://googleapis.com" + WORKING_MODEL + ":generateContent?key=" + apiKey; // 💡 Hardcoding the raw string concatenation guarantees compile accuracy!


      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                { text: prompt },
                { inlineData: { mimeType: file.type || 'application/pdf', data: base64Data } },
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
        return NextResponse.json(
          { success: false, error: `Gemini API: ${response.status}` },
          { status: response.status }
        );
      }

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
      allTransactions = parseGeminiResponse(text);
    }

    // Natively normalize ID sequences to prevent chunk tracking drift
    const finalizedRows = allTransactions.map((tx: any, index: number) => ({
      id: index + 1,
      date: tx.date || tx.d || '',
      type: tx.type || tx.t || 'Transaction',
      description: tx.description || tx.desc || '',
      amount: tx.amount || tx.a || '$0.00',
      balance: tx.balance || tx.b || '$0.00'
    }));

    console.log(`✅ Extracted ${finalizedRows.length} total transactions`);

    return NextResponse.json({
      success: true,
      filename: file.name,
      total_transactions: finalizedRows.length,
      page_count: pageCount,
      rows: finalizedRows,
    });
  } catch (error: any) {
    console.error('❌ Error:', error.message || error);
    return NextResponse.json(
      { success: false, error: error.message || 'Parsing failed' },
      { status: 500 }
    );
  }
}
