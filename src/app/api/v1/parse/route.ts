import { NextResponse } from 'next/server';
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
    if (clean.startsWith('[') && !clean.endsWith(']')) {
      try { return JSON.parse(clean + ']'); } catch {}
    }
    if (clean.startsWith('{') && !clean.endsWith('}')) {
      try { return JSON.parse(clean + '}'); } catch {}
    }
    const matches = clean.match(/\{[^{}]*\}/g);
    if (matches && matches.length > 0) {
      try { return matches.map(m => JSON.parse(m)); } catch {}
    }
    return [];
  }
}

// ============ MAIN POST ============
export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ success: false, error: 'File exceeds 10MB' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const rawBuffer = Buffer.from(bytes);
    const base64Data = rawBuffer.toString('base64');

    let pageCount = 1;
    if (file.name.endsWith('.pdf')) {
      pageCount = await getPDFPageCount(rawBuffer);
    }

    const prompt = `Extract ALL financial transactions into JSON array: [{"id":1,"date":"date","type":"Card Payment|Direct Debit|Bank Credit|Cashpoint|Standing Order","description":"desc","amount":"$10.00","balance":"$500.00"}]`;

    let transactions: any[] = [];
    let engineUsed = '';

    // ============ TRY GROQ FIRST ============
    const groqApiKey = process.env.GROQ_API_KEY;
    if (groqApiKey) {
      try {
        const Groq = (await import('groq-sdk')).default;
        const groq = new Groq({ apiKey: groqApiKey });

        const completion = await groq.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Data}` } },
              ],
            },
          ],
          temperature: 0,
          max_tokens: 2048,
        });

        const text = completion.choices[0]?.message?.content || '[]';
        const rows = cleanAndParseJSON(text);
        transactions = Array.isArray(rows) ? rows : rows.transactions || rows.rows || [];
        engineUsed = 'Groq (LLaMA 3.3 70B)';
        console.log(`✅ Groq: ${transactions.length} transactions`);
      } catch (groqError: any) {
        console.warn('⚠️ Groq failed:', groqError.message || groqError);
        // Fall through to Gemini
      }
    }

    // ============ FALLBACK TO GEMINI ============
    if (transactions.length === 0) {
      try {
        const { GoogleGenAI } = await import('@google/genai');
        const geminiApiKey = process.env.GEMINI_API_KEY;
        if (geminiApiKey) {
          const ai = new GoogleGenAI({ apiKey: geminiApiKey });
          const result = await ai.models.generateContent({
            model: 'gemini-3.5-flash-lite',
            contents: [
              {
                role: 'user',
                parts: [
                  { text: prompt },
                  { inlineData: { data: base64Data, mimeType: 'application/pdf' } },
                ],
              },
            ],
            config: { responseMimeType: 'application/json', maxOutputTokens: 2048, temperature: 0 },
          });

          const text = result.text || '[]';
          const rows = cleanAndParseJSON(text);
          transactions = Array.isArray(rows) ? rows : rows.transactions || rows.rows || [];
          engineUsed = 'Gemini (3.5 Flash Lite)';
          console.log(`✅ Gemini: ${transactions.length} transactions`);
        }
      } catch (geminiError: any) {
        console.error('❌ Gemini also failed:', geminiError.message || geminiError);
      }
    }

    // ============ IF ALL FAILS ============
    if (transactions.length === 0) {
      return NextResponse.json(
        { success: false, error: 'All AI engines failed. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      filename: file.name,
      engine_used: engineUsed,
      total_transactions: transactions.length,
      page_count: pageCount,
      rows: transactions,
    });
  } catch (error: any) {
    console.error('❌ Error:', error?.message || error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Parsing failed' },
      { status: 500 }
    );
  }
}