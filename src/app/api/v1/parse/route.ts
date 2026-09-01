import { NextResponse } from 'next/server';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

// Fallback models (if discovery fails)
const FALLBACK_MODELS = [
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gemini-1.0-pro',
];

// ============ DISCOVER AVAILABLE MODELS ============
async function discoverModels(apiKey: string): Promise<string[]> {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const response = await fetch(url);
    if (!response.ok) {
      console.warn('⚠️ Failed to list models:', response.status);
      return FALLBACK_MODELS;
    }
    const data = await response.json();
    const models = data.models || [];
    // Filter models that support generateContent and are Gemini models
    const geminiModels = models
      .filter((m: any) => m.name && m.name.startsWith('models/gemini-'))
      .filter((m: any) => {
        const supports = m.supportedGenerationMethods || [];
        return supports.includes('generateContent');
      })
      .map((m: any) => m.name.replace('models/', ''));
    
    console.log('📋 Available Gemini models:', geminiModels);
    return geminiModels.length > 0 ? geminiModels : FALLBACK_MODELS;
  } catch (error) {
    console.warn('⚠️ Model discovery failed:', error);
    return FALLBACK_MODELS;
  }
}

// ============ MAIN POST ============
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

    // Step 1: Discover available models
    const availableModels = await discoverModels(apiKey);
    console.log('🔍 Discovered models:', availableModels);

    const prompt = `Extract ALL financial transactions into JSON array. Each object: {"id":1,"date":"date","type":"Card Payment|Direct Debit|Bank Credit|Cashpoint|Standing Order","description":"desc","amount":"$10.00","balance":"$500.00"}`;

    let result = null;
    let modelUsed = '';
    let lastError = '';

    // Step 2: Try each discovered model
    for (const modelName of availableModels) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
        console.log(`🔄 Trying ${modelName}...`);

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
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
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.warn(`⚠️ ${modelName} failed:`, response.status);
          lastError = errorText;
          continue;
        }

        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
        console.log(`✅ ${modelName} succeeded, response length: ${text.length}`);
        result = text;
        modelUsed = modelName;
        break;
      } catch (error: any) {
        console.warn(`⚠️ ${modelName} error:`, error.message);
        lastError = error.message;
      }
    }

    if (!result) {
      return NextResponse.json(
        { success: false, error: `All models failed. Last error: ${lastError}` },
        { status: 500 }
      );
    }

    let parsedData;
    try {
      parsedData = JSON.parse(result);
    } catch {
      let clean = result.trim();
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