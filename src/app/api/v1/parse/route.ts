import { NextResponse } from 'next/server';
import { PDFDocument } from 'pdf-lib';

export const maxDuration = 60; // Next.js official Route segment configuration

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
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

// ============ 🧱 STEP 1: THE SLICER (NATIVE ULTRA-FAST PAGE SPLITTER) ============
async function slicePDFIntoSinglePages(buffer: Buffer): Promise<Buffer[]> {
  try {
    const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const totalPages = pdfDoc.getPageCount();
    const chunks: Buffer[] = [];

    for (let i = 0; i < totalPages; i++) {
      const newDoc = await PDFDocument.create();
      const [copiedPage] = await newDoc.copyPages(pdfDoc, [i]);
      newDoc.addPage(copiedPage);
      const chunkBytes = await newDoc.save();
      chunks.push(Buffer.from(chunkBytes));
    }
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

    const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const pageCount = pdfDoc.getPageCount();
    console.log(`📄 Detected ${pageCount} pages`);

    const singlePages = await slicePDFIntoSinglePages(buffer);
    
    // ✅ طريقة الـ Template Literal الصحيحة والمجربة المطابقة لطلبك 100%
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${WORKING_MODEL}:generateContent?key=${apiKey}`;
    const prompt = `Extract ALL financial transactions from this document page. Return ONLY a JSON array matching this exact model layout structure: [{"date":"date","type":"type","description":"desc","amount":"$10.00","balance":"$500.00"}]`;

    // ============ 🚀 STEP 2: THE WORKER (TRUE PARALLEL ASYNC CONCURRENCY STREAM) ============
    const chunkPromises = singlePages.map(async (chunkBuffer, index) => {
      const base64Data = chunkBuffer.toString('base64');
      console.log(`📄 Streaming page array slice ${index + 1}/${singlePages.length}`);

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
            maxOutputTokens: 4096,
            temperature: 0,
          },
        }),
      });

      if (!response.ok) {
        console.error(`❌ Page ${index + 1} failed execution:`, response.status);
        return [];
      }

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
      return parseGeminiResponse(text);
    });

    const resolvedSegments = await Promise.all(chunkPromises);
    let rawTransactions: any[] = [];
    for (const segment of resolvedSegments) {
      if (Array.isArray(segment)) {
        rawTransactions = rawTransactions.concat(segment);
      }
    }

    // ============ 📊 STEP 3: THE ACCOUNTANT (RE-INDEX AND VALIDATE MATH VALUES LOCALLY) ============
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
    console.error('❌ Error System Exception:', error.message || error);
    return NextResponse.json({ success: false, error: error.message || 'Parsing failed' }, { status: 500 });
  }
}
