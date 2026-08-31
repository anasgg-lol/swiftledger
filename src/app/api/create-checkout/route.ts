import { NextResponse } from 'next/server';

// 🔥 CORRECT WHOP API ENDPOINT
const WHOP_API_URL = 'https://api.whop.com/v1';

export async function POST(req: Request) {
  try {
    const { price, pageCount, transactionCount, fileName } = await req.json();

    // Map price to product ID
    const productMap: Record<string, string> = {
      '5': process.env.WHOP_PRODUCT_ID_STARTER || '',
      '25': process.env.WHOP_PRODUCT_ID_BUSINESS || '',
      '45': process.env.WHOP_PRODUCT_ID_CORPORATE || '',
      '85': process.env.WHOP_PRODUCT_ID_ENTERPRISE || '',
    };

    const productId = productMap[price.toString()];

    if (!productId) {
      console.error('❌ No product ID found for price:', price);
      return NextResponse.json(
        { error: 'Invalid price tier' },
        { status: 400 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    console.log('🔍 Creating Whop checkout with product ID:', productId);

    // 🔥 CORRECT ENDPOINT: /v1/checkout-links
    const response = await fetch(`${WHOP_API_URL}/checkout-links`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.WHOP_API_KEY}`,
      },
      body: JSON.stringify({
        product_id: productId,
        success_url: `${appUrl}/payment/success?pageCount=${pageCount}&txCount=${transactionCount}&file=${encodeURIComponent(fileName)}`,
        cancel_url: `${appUrl}/payment/cancel`,
        metadata: {
          page_count: pageCount,
          transaction_count: transactionCount,
          file_name: fileName,
        },
      }),
    });

    const data = await response.json();

    console.log('📥 Whop response status:', response.status);
    console.log('📥 Whop response data:', JSON.stringify(data, null, 2));

    if (!response.ok) {
      console.error('❌ Whop API error:', data);
      return NextResponse.json(
        { error: data?.error?.message || data?.message || 'Failed to create checkout' },
        { status: 500 }
      );
    }

    // 🔥 The checkout URL is in data.data.url
    const checkoutUrl = data?.data?.url;

    if (!checkoutUrl) {
      console.error('❌ No checkout URL in response:', data);
      return NextResponse.json(
        { error: 'No checkout URL returned' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      checkoutUrl: checkoutUrl,
      success: true,
    });
  } catch (error) {
    console.error('❌ Checkout error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create checkout' },
      { status: 500 }
    );
  }
}