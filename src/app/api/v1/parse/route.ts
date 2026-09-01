import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

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
    return [];
  }
}

// ============ MAIN POST ============
export async function POST(req: Request) {
  try {
    // 1. Check API key
    const apiKey = process.env.GEMINI_API_KEY;
    console.log('🔑 API Key exists?', !!apiKey);
    console.log('🔑 API Key length:', apiKey?.length || 0);
    
    if (!apiKey) {
      console.error('❌ GEMINI_API_KEY is not set');
      return NextResponse.json(
        { success: false, error: 'GEMINI_API_KEY is missing from environment variables' },
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
        { success: false, error: 'File exceeds 10MB limit' },
        { status: 400 }
      );
    }

    // 3. Read file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Data = buffer.toString('base64');

    console.log('📁 File:', file.name, file.size, 'bytes');

    // 4. Initialize Gemini
    const ai = new GoogleGenAI({ apiKey });

    // 5. Models to try
    const models = [
      'gemini-1.5-flash',
      'gemini-1.5-flash-lite',
      'gemini-1.5-pro',
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

    // 6. Try each model
    for (const model of models) {
      try {
        console.log(`🔄 Trying model: ${model}`);
        const response = await ai.models.generateContent({
          model: model,
          contents: [
            {
              role: 'user',
              parts: [
                { text: prompt },
                { inlineData: { data: base64Data, mimeType: 'application/pdf' } }
              ]
            }
          ],
          config: {
            responseMimeType: 'application/json',
            maxOutputTokens: 4096,
            temperature: 0.1,
          },
        });
        result = response;
        modelUsed = model;
        console.log(`✅ Success with model: ${model}`);
        break;
      } catch (error: any) {
        console.error(`❌ Model ${model} failed:`);
        console.error(JSON.stringify(error, null, 2));
        console.error('Error message:', error?.message);
        console.error('Error stack:', error?.stack);
        console.error('Error status:', error?.status);
        if (error?.error) {
          console.error('Error details:', JSON.stringify(error.error, null, 2));
        }
        lastError = error;
      }
    }

    // 7. If all models failed
    if (!result) {
      const errorMessage = lastError?.message || 'All Gemini models failed';
      console.error('❌ All models failed:', errorMessage);
      
      // Return the full error details
      return NextResponse.json(
        { 
          success: false, 
          error: errorMessage,
          details: lastError?.error || lastError,
          stack: lastError?.stack,
        },
        { status: 500 }
      );
    }

    // 8. Parse response
    const text = result.text || '{}';
    let parsedData;
    try {
      parsedData = cleanAndParseJSON(text);
    } catch (parseError: any) {
      console.error('❌ Parse error:', parseError.message);
      return NextResponse.json(
        { success: false, error: 'Failed to parse Gemini response' },
        { status: 500 }
      );
    }

    const transactions = parsedData.transactions || parsedData.rows || [];

    // 9. Return success
    return NextResponse.json({
      success: true,
      filename: file.name,
      engine_used: modelUsed,
      total_transactions: transactions.length,
      rows: transactions,
    });
  } catch (error: any) {
    console.error('❌ Unhandled error:', error?.message || error);
    console.error('Full error:', JSON.stringify(error, null, 2));
    return NextResponse.json(
      { success: false, error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}