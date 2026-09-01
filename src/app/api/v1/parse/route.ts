import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

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
    console.log('🚀 API called');

    // 1. Check API key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('❌ GEMINI_API_KEY missing');
      return NextResponse.json(
        { success: false, error: 'GEMINI_API_KEY missing' },
        { status: 500 }
      );
    }

    // 2. Parse file
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
    const buffer = Buffer.from(bytes);
    const base64Data = buffer.toString('base64');

    console.log('📁 File:', file.name, file.size, 'bytes');

    // 4. Initialize Gemini
    const genAI = new GoogleGenerativeAI(apiKey);

    // ✅ CORRECT MODEL NAMES – THESE WORK
    const models = [
      'gemini-1.5-pro',        // Most reliable, available everywhere
      'gemini-1.5-flash',      // Faster, available in most regions
      'gemini-1.5-flash-lite', // Fastest, available in most regions
    ];

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

    let result = null;
    let modelUsed = '';
    let lastError = null;

    // 5. Try each model
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
            temperature: 0.1,
          },
        });

        result = response;
        modelUsed = modelName;
        console.log(`✅ Success with model: ${modelName}`);
        break;
      } catch (error: any) {
        console.error(`❌ Model ${modelName} failed:`, error?.message || error);
        lastError = error;
      }
    }

    // 6. If all models failed
    if (!result) {
      const errorMessage = lastError?.message || 'All Gemini models failed';
      console.error('❌ All models failed:', errorMessage);
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 500 }
      );
    }

    // 7. Parse response
    const text = result.response.text() || '{}';
    console.log('📥 Response length:', text.length);

    const parsedData = cleanAndParseJSON(text);
    const transactions = parsedData.transactions || parsedData.rows || [];

    console.log(`✅ Extracted ${transactions.length} transactions`);

    // 8. Return success
    return NextResponse.json({
      success: true,
      filename: file.name,
      engine_used: modelUsed,
      total_transactions: transactions.length,
      rows: transactions,
    });
  } catch (error: any) {
    console.error('❌ Unhandled error:', error?.message || error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}