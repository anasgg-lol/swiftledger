import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { price, fileName, formats, bank } = await req.json();

    if (!price) {
      return NextResponse.json({ error: 'Missing price' }, { status: 400 });
    }

    const whopSecret = process.env.WHOP_API_KEY;
    if (!whopSecret) {
      console.error('❌ WHOP_API_KEY not set');
      return NextResponse.json({ error: 'Server misconfigured - missing API key' }, { status: 500 });
    }

    // Log key format (first 15 chars only)
    console.log('🔑 API Key loaded:', whopSecret.substring(0, 15) + '...');

    const productIdMap: Record<number, string> = {
      5: process.env.WHOP_PRODUCT_ID_STARTER || '',
      25: process.env.WHOP_PRODUCT_ID_BUSINESS || '',
      45: process.env.WHOP_PRODUCT_ID_CORPORATE || '',
      85: process.env.WHOP_PRODUCT_ID_ENTERPRISE || '',
    };

    const productId = productIdMap[price];
    if (!productId) {
      return NextResponse.json({ error: `No product found for $${price}` }, { status: 400 });
    }

    // 🎯 Use checkout_configurations with a plan object
    const requestBody = {
      plan: {
        product_id: productId,
        interval: 'one_time',
        currency: 'usd',
        price: price * 100, // $5 → 500 cents
      },
      redirect_url: 'https://swiftledger-seven.vercel.app/payment/success',
      metadata: {
        fileName: fileName || 'statement',
        formats: (formats || []).join(','),
        bank: bank || '',
      },
    };

    console.log('🚀 Sending to Whop (checkout_configurations):', JSON.stringify(requestBody, null, 2));

    const response = await fetch('https://api.whop.com/api/v2/checkout_configurations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${whopSecret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Whop API error:', data);
      
      let errorMsg = 'Checkout creation failed';
      if (data.message) errorMsg = data.message;
      else if (data.error) {
        if (typeof data.error === 'string') errorMsg = data.error;
        else if (data.error.message) errorMsg = data.error.message;
        else errorMsg = JSON.stringify(data.error);
      } else {
        errorMsg = JSON.stringify(data);
      }
      
      return NextResponse.json({ error: errorMsg }, { status: response.status });
    }

    // For checkout_configurations, the URL is https://whop.com/checkout/{data.id}
    const checkoutUrl = `https://whop.com/checkout/${data.id}`;
    console.log('✅ Checkout created:', checkoutUrl);
    
    return NextResponse.json({ url: checkoutUrl });
  } catch (error: any) {
    console.error('🔥 Unhandled exception:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}