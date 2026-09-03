import { NextResponse } from 'next/server';
import { whopClient } from '@/lib/whop-sdk';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // server-only secret, NOT the anon key
);

// Map your tiers to the actual Plan IDs from your Whop dashboard (not the hosted page URLs)
const PLAN_IDS: Record<string, string> = {
  '5': 'plan_XXXXXXXXX',   // Freelancer
  '25': 'plan_XXXXXXXXX',  // Business
  '45': 'plan_XXXXXXXXX',  // Corporate
  '85': 'plan_XXXXXXXXX',  // Enterprise
};

export async function POST(req: Request) {
  try {
    const { tier } = await req.json();
    const planId = PLAN_IDS[tier];
    if (!planId) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
    }

    // Create the pending order row FIRST so we have an order_id to attach
    const { data: order, error: dbError } = await supabaseAdmin
      .from('orders')
      .insert({ tier, status: 'pending' })
      .select()
      .single();

    if (dbError || !order) {
      console.error('Failed to create order row:', dbError);
      return NextResponse.json({ error: 'Could not start checkout' }, { status: 500 });
    }

    const checkoutConfig = await whopClient.checkoutConfigurations.create({
      company_id: process.env.WHOP_COMPANY_ID!,
      plan_id: planId,
      metadata: { order_id: order.order_id },
      redirect_url: `${process.env.NEXT_PUBLIC_SITE_URL}/payment/success?order_id=${order.order_id}`,
    });

    return NextResponse.json({
      checkoutUrl: `https://whop.com/checkout/${checkoutConfig.id}`,
      orderId: order.order_id,
    });
  } catch (error: any) {
    console.error('Checkout creation failed:', error?.message);
    return NextResponse.json({ error: 'Checkout creation failed' }, { status: 500 });
  }
}