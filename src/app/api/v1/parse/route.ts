import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { PDFDocument } from 'pdf-lib';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

// ============ GET PAGE COUNT ============
async function getPDFPageCount(buffer: Buffer): Promise<number> {
  try {
    const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    return pdfDoc.getPageCount();
  } catch {
    return 1;
  }
}

// ============ PARSE JSON ============
function cleanAndParseJSON(rawResponse: string): any {
  let clean = rawResponse.trim();
  clean = clean.replace(/```json/gi, '').replace(/```/g, '').trim();
  
  try {
    return JSON.parse(clean);
  } catch {
    // Try to salvage truncated response
    if (clean.startsWith('[') && !clean.endsWith(']')) {
      try {
        return JSON.parse(clean + ']');
      } catch {}
    }
    if (clean.startsWith('{') && !clean.endsWith('}')) {
      try {
        return JSON.parse(clean + '}');
      } catch {}
    }
    // If all fails, try to extract individual objects
    const matches = clean.match(/\{[^{}]*\}/g);
    if (matches && matches.length > 0) {
      try {
        return matches.map(m => JSON.parse(m));
      } catch {}
    }
    return [];
  }
}

// ============ MAIN POST HANDLER ============
export async function POST(req: Request) {
  const startTime = Date.now();
  
  try {
    // 1. Check API key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'GEMINI_API_KEY missing' },
        { status: 500 }
      );
    }

    // 2. Parse form data
    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file uploaded' },
        { status: 400 }
      );
    }

    // 3. Check file size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { success: false, error: 'File exceeds 10MB limit' },
        { status: 400 }
      );
    }

    // 4. Read file
    const bytes = await file.arrayBuffer();
    const rawBuffer = Buffer.from(bytes);
    let mimeType = file.type || '';

    // 5. Detect MIME type
    if (!mimeType) {
      if (file.name.endsWith('.pdf')) mimeType = 'application/pdf';
      else if (file.name.endsWith('.png')) mimeType = 'image/png';
      else mimeType = 'image/jpeg';
    }

    // 6. Get page count for PDFs
    let pageCount = 1;
    if (mimeType === 'application/pdf') {
      pageCount = await getPDFPageCount(rawBuffer);
    }

    // 7. Initialize Gemini with the FASTEST model
    const ai = new GoogleGenAI({ apiKey });
    const FAST_MODEL = 'gemini-3.5-flash-lite';
    
    // 8. Ultra-short prompt
    const prompt = 'Extract ALL financial transactions into JSON array: [{"id":1,"date":"date","type":"type","description":"desc","amount":"$10.00","balance":"$500.00"}]';

    // 9. Convert to base64
    const base64Data = rawBuffer.toString('base64');

    // 10. Determine token limit based on page count
    let maxTokens = 1024;
    if (pageCount > 5) maxTokens = 2048;
    if (pageCount > 20) maxTokens = 4096;

    console.log(`📄 Processing: ${pageCount} pages, ${maxTokens} tokens`);

    // 11. Call Gemini
    const result = await ai.models.generateContent({
      model: FAST_MODEL,
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
        maxOutputTokens: maxTokens,
        temperature: 0,
      },
    });

    // 12. Parse response
    const text = result.text || '[]';
    const rows = cleanAndParseJSON(text);
    const transactions = Array.isArray(rows) ? rows : rows.transactions || rows.rows || [];

    const elapsed = Date.now() - startTime;
    console.log(`✅ Parsed ${transactions.length} transactions in ${elapsed}ms`);

    // 13. Return response
    return NextResponse.json({
      success: true,
      filename: file.name,
      total_transactions: transactions.length,
      page_count: pageCount,
      processing_time_ms: elapsed,
      rows: transactions,
    });

  } catch (error: any) {
    const elapsed = Date.now() - startTime;
    console.error(`❌ Error after ${elapsed}ms:`, error?.message || error);
    
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Parsing failed',
        processing_time_ms: elapsed,
      },
      { status: 500 }
    );
  }
}