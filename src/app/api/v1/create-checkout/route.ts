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

    // 🔥 Simple: just create a checkout link from the product
    const requestBody = {
      product_id: productId,
      redirect_url: 'https://swiftledger-seven.vercel.app/payment/success',
      metadata: {
        fileName: fileName || 'statement',
        formats: (formats || []).join(','),
        bank: bank || '',
      },
    };

    console.log('🚀 Sending to Whop:', JSON.stringify(requestBody, null, 2));

    const response = await fetch('https://api.whop.com/api/v2/checkout_links', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${whopSecret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Whop API error response:', data);
      // Ensure error is a string
      let errorMsg = 'Checkout creation failed';
      if (data.message) errorMsg = data.message;
      else if (data.error) errorMsg = typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
      else errorMsg = JSON.stringify(data);
      return NextResponse.json({ error: errorMsg }, { status: response.status });
    }

    // data.url contains the checkout link
    return NextResponse.json({ url: data.url });
  } catch (error: any) {
    console.error('🔥 Unhandled exception:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}