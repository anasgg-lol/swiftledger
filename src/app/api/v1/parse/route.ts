import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export async function POST(req: Request) {
  try {
    console.log('🚀 API called');

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('❌ No API key');
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
    const base64Data = buffer.toString('base64');

    console.log('📁 File:', file.name, file.size);

    const genAI = new GoogleGenerativeAI(apiKey);

    // 🔥 LIST OF WORKING MODELS
    const models = [
      'gemini-2.0-flash-exp',      // Latest, fastest
      'gemini-1.5-pro',            // Reliable
      'gemini-1.0-pro-vision',     // Fallback
    ];

    let result = null;
    let modelUsed = '';

    const prompt = `Extract ALL financial transactions into JSON array. Each object: {"id":1,"date":"date","type":"Card Payment|Direct Debit|Bank Credit|Cashpoint|Standing Order","description":"desc","amount":"$10.00","balance":"$500.00"}`;

    for (const modelName of models) {
      try {
        console.log(`🔄 Trying model: ${modelName}`);
        const model = genAI.getGenerativeModel({ model: modelName });
        const response = await model.generateContent({
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
            temperature: 0.1,
          },
        });
        result = response;
        modelUsed = modelName;
        console.log(`✅ Success with model: ${modelName}`);
        break;
      } catch (error: any) {
        console.warn(`⚠️ Model ${modelName} failed:`, error.message || error);
      }
    }

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'All Gemini models failed. Check API key and billing.' },
        { status: 500 }
      );
    }

    const text = result.response.text() || '[]';
    console.log('📥 Response length:', text.length);

    let parsedData;
    try {
      parsedData = JSON.parse(text);
    } catch {
      let clean = text.trim();
      if (clean.startsWith('[') && !clean.endsWith(']')) {
        try { parsedData = JSON.parse(clean + ']'); } catch { parsedData = []; }
      } else if (clean.startsWith('{') && !clean.endsWith('}')) {
        try { parsedData = JSON.parse(clean + '}'); } catch { parsedData = []; }
      } else {
        parsedData = [];
      }
    }

    const transactions = Array.isArray(parsedData) ? parsedData : parsedData.transactions || parsedData.rows || [];

    console.log(`✅ Extracted ${transactions.length} transactions using ${modelUsed}`);

    return NextResponse.json({
      success: true,
      filename: file.name,
      total_transactions: transactions.length,
      page_count: 1,
      engine_used: modelUsed,
      rows: transactions,
    });
  } catch (error: any) {
    console.error('❌ Error:', error.message || error);
    return NextResponse.json(
      { success: false, error: error.message || 'Parsing failed' },
      { status: 500 }
    );
  }
}