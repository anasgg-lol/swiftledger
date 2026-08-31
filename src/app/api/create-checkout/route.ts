import { NextResponse } from 'next/server';

const WHOP_API_URL = 'https://api.whop.com/v2';

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

    // Create Whop checkout link
    const response = await fetch(`${WHOP_API_URL}/products/${productId}/checkout-links`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.WHOP_API_KEY}`,
      },
      body: JSON.stringify({
        metadata: {
          page_count: pageCount,
          transaction_count: transactionCount,
          file_name: fileName,
        },
        success_url: `${appUrl}/payment/success?pageCount=${pageCount}&txCount=${transactionCount}&file=${encodeURIComponent(fileName)}`,
        cancel_url: `${appUrl}/payment/cancel`,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Whop API error:', data);
      return NextResponse.json(
        { error: data?.error?.message || 'Failed to create checkout' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      checkoutUrl: data.data.url,
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