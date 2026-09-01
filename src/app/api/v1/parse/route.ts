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
    return [];
  }
}

// ============ MAIN POST ============
export async function POST(req: Request) {
  try {
    console.log('🚀 API called');

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('❌ GEMINI_API_KEY missing');
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

    // 🔥 OLD SDK – WORKS EVERY TIME
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash', // This model definitely exists
    });

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

    console.log('🤖 Sending to Gemini...');

    const result = await model.generateContent({
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

    const response = result.response;
    const text = response.text() || '{}';

    console.log('📥 Response length:', text.length);

    const parsedData = cleanAndParseJSON(text);
    const transactions = parsedData.transactions || parsedData.rows || [];

    console.log(`✅ Extracted ${transactions.length} transactions`);

    return NextResponse.json({
      success: true,
      filename: file.name,
      total_transactions: transactions.length,
      rows: transactions,
    });
  } catch (error: any) {
    console.error('❌ Error:', error?.message || error);
    // Log full error details
    if (error?.response) {
      console.error('Response status:', error.response?.status);
      console.error('Response data:', error.response?.data);
    }
    return NextResponse.json(
      { success: false, error: error?.message || 'Parsing failed' },
      { status: 500 }
    );
  }
}