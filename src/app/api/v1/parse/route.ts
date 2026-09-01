import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export async function POST(req: Request) {
  try {
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
    const base64Data = buffer.toString('base64');

    const ai = new GoogleGenAI({ apiKey });

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

    const result = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
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

    const text = result.text || '{}';
    const parsedData = JSON.parse(text);
    const transactions = parsedData.transactions || parsedData.rows || [];

    return NextResponse.json({
      success: true,
      filename: file.name,
      total_transactions: transactions.length,
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