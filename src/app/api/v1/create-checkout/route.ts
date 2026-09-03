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
      console.error('WHOP_API_KEY not set');
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
    }

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

    // Attempt 1: checkout_links
    const simpleBody = {
      product_id: productId,
      redirect_url: 'https://swiftledger-seven.vercel.app/payment/success',
      metadata: {
        fileName: fileName || 'statement',
        formats: (formats || []).join(','),
        bank: bank || '',
      },
    };

    console.log('🚀 Attempt 1: POST /v2/checkout_links', JSON.stringify(simpleBody, null, 2));

    let response = await fetch('https://api.whop.com/api/v2/checkout_links', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${whopSecret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(simpleBody),
    });

    let data = await response.json();

    if (response.ok) {
      return NextResponse.json({ url: data.url });
    }

    console.log('❌ Attempt 1 failed:', data);

    // Attempt 2: checkout_configurations with plan
    const planBody = {
      plan: {
        product_id: productId,
        price: price * 100,
        interval: 'one_time',
        currency: 'usd',
      },
      redirect_url: 'https://swiftledger-seven.vercel.app/payment/success',
      metadata: {
        fileName: fileName || 'statement',
        formats: (formats || []).join(','),
        bank: bank || '',
      },
    };

    console.log('🔄 Attempt 2: POST /v2/checkout_configurations', JSON.stringify(planBody, null, 2));

    response = await fetch('https://api.whop.com/api/v2/checkout_configurations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${whopSecret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(planBody),
    });

    data = await response.json();

    if (response.ok) {
      const checkoutUrl = `https://whop.com/checkout/${data.id}`;
      return NextResponse.json({ url: checkoutUrl });
    }

    console.error('❌ Both attempts failed. Last error:', data);
    const errorMessage = data.message || data.error || JSON.stringify(data);
    return NextResponse.json(
      { error: `Whop API error: ${errorMessage}` },
      { status: response.status }
    );
  } catch (error: any) {
    console.error('🔥 Unhandled exception:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}