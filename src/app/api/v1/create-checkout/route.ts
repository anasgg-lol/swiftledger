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

    // Use Whop's REST API directly – no SDK issues
    const response = await fetch('https://api.whop.com/api/v2/checkout_configurations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${whopSecret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        product_id: productId,
        redirect_url: 'https://swiftledger-seven.vercel.app/payment/success',
        metadata: {
          fileName: fileName || 'statement',
          formats: (formats || []).join(','),
          bank: bank || '',
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Whop API error:', data);
      return NextResponse.json({ error: data.message || 'Checkout creation failed' }, { status: response.status });
    }

    // The checkout URL is `https://whop.com/checkout/` + the checkout ID
    const checkoutUrl = `https://whop.com/checkout/${data.id}`;

    return NextResponse.json({ url: checkoutUrl });
  } catch (error: any) {
    console.error('Whop checkout creation error:', error);
    return NextResponse.json({ error: error.message || 'Checkout creation failed' }, { status: 500 });
  }
}