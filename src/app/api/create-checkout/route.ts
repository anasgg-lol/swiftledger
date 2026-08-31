// src/app/api/create-checkout/route.ts
import { NextResponse } from 'next/server';

// The correct base URL for Whop's API v1
const WHOP_API_URL = 'https://api.whop.com/v1';

export async function POST(req: Request) {
  try {
    const { price, pageCount, transactionCount, fileName } = await req.json();

    // Map the price to the corresponding Whop Product ID
    // IMPORTANT: Replace these placeholder IDs with your actual Whop Product IDs!
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

    console.log(`🔍 Creating Whop checkout for product ID: ${productId} (${pageCount} pages, $${price})`);

    // --- THE CORRECT WHOP API CALL ---
    // Endpoint: POST /v1/checkout/links
    const response = await fetch(`${WHOP_API_URL}/checkout/links`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.WHOP_API_KEY}`,
      },
      body: JSON.stringify({
        product_id: productId,
        // These URLs are where the user is sent after payment
        success_url: `${appUrl}/payment/success?pageCount=${pageCount}&txCount=${transactionCount}&file=${encodeURIComponent(fileName)}`,
        cancel_url: `${appUrl}/payment/cancel`,
        // Pass metadata to identify the purchase
        metadata: {
          page_count: pageCount,
          transaction_count: transactionCount,
          file_name: fileName,
        },
      }),
    });

    const data = await response.json();

    // Log the full response for debugging
    console.log('📥 Whop API Response Status:', response.status);
    console.log('📥 Whop API Response Body:', JSON.stringify(data, null, 2));

    if (!response.ok) {
      // The error message from Whop will be in data.message or data.error.message
      const errorMessage = data?.error?.message || data?.message || 'Failed to create checkout link';
      console.error('❌ Whop API Error:', errorMessage);
      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      );
    }

    // The checkout URL is typically in data.data.url
    const checkoutUrl = data?.data?.url;

    if (!checkoutUrl) {
      console.error('❌ No checkout URL in Whop response:', data);
      return NextResponse.json(
        { error: 'No checkout URL returned from Whop' },
        { status: 500 }
      );
    }

    console.log(`✅ Whop checkout link created successfully: ${checkoutUrl}`);

    return NextResponse.json({
      checkoutUrl: checkoutUrl,
      success: true,
    });
  } catch (error) {
    console.error('❌ Checkout creation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create checkout' },
      { status: 500 }
    );
  }
}