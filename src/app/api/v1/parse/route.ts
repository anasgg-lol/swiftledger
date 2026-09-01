import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { PDFDocument } from 'pdf-lib';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || '',
});

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

// ============ GET PAGE COUNT (LIGHTNING FAST) ============
async function getPDFPageCount(buffer: Buffer): Promise<number> {
  try {
    const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    return pdfDoc.getPageCount();
  } catch {
    return 1;
  }
}

// ============ PARSE JSON (SIMPLE & RELIABLE) ============
function cleanAndParseJSON(rawResponse: string): any {
  let clean = rawResponse.trim();
  clean = clean.replace(/```json/gi, '').replace(/```/g, '').trim();
  try {
    return JSON.parse(clean);
  } catch {
    // If it's an array that got cut off, close it
    if (clean.startsWith('[') && !clean.endsWith(']')) {
      try { return JSON.parse(clean + ']'); } catch {}
    }
    // If it's an object that got cut off, close it
    if (clean.startsWith('{') && !clean.endsWith('}')) {
      try { return JSON.parse(clean + '}'); } catch {}
    }
    // Try to extract individual objects
    const matches = clean.match(/\{[^{}]*\}/g);
    if (matches && matches.length > 0) {
      try { return matches.map(m => JSON.parse(m)); } catch {}
    }
    return [];
  }
}

// ============ MAIN POST HANDLER ============
export async function POST(req: Request) {
  try {
    // 1. Check API key
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'GROQ_API_KEY missing' },
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
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { success: false, error: 'File exceeds 10MB' },
        { status: 400 }
      );
    }

    // 3. Read file
    const bytes = await file.arrayBuffer();
    const rawBuffer = Buffer.from(bytes);
    const base64Data = rawBuffer.toString('base64');

    // 4. Get page count (PDF only)
    let pageCount = 1;
    if (file.name.endsWith('.pdf')) {
      pageCount = await getPDFPageCount(rawBuffer);
    }

    // 5. ULTRA-SHORT PROMPT
    const prompt = `Extract ALL financial transactions into JSON array. Each object: {"id":1,"date":"date","type":"Card Payment|Direct Debit|Bank Credit|Cashpoint|Standing Order","description":"desc","amount":"$10.00","balance":"$500.00"}`;

    // 6. Call Groq (1-2 seconds)
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${base64Data}`,
              },
            },
          ],
        },
      ],
      temperature: 0,
      max_tokens: 2048,
    });

    // 7. Parse response
    const text = completion.choices[0]?.message?.content || '[]';
    const rows = cleanAndParseJSON(text);
    const transactions = Array.isArray(rows) ? rows : rows.transactions || rows.rows || [];

    // 8. Return response
    return NextResponse.json({
      success: true,
      filename: file.name,
      total_transactions: transactions.length,
      page_count: pageCount,
      rows: transactions,
    });
  } catch (error: any) {
    console.error('❌ Groq error:', error?.message || error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Parsing failed' },
      { status: 500 }
    );
  }
}