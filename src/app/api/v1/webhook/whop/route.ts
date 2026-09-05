import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Force Next.js to parse this route dynamically for every webhook hit
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    console.log('📡 INBOUND WHOP WEBHOOK RECEIVED...');

    // ----- 1. Init Supabase -----
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Supabase config missing');
      // Fix: Return clean JSON format even on setup failure so Whop doesn't get a blank response
      return NextResponse.json({ success: false, error: 'Config missing' }, { status: 200 });
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ----- 2. Safely Parse Payload -----
    let body;
    try {
      body = await req.json();
    } catch (parseErr) {
      console.error('❌ Failed to parse raw body JSON');
      return NextResponse.json({ success: false, error: 'Malformed JSON' }, { status: 200 });
    }

    const eventType = body?.action || body?.event;
    console.log(`📌 Event type: ${eventType}`);

    if (eventType !== 'membership.went_active') {
      console.log(`ℹ️ Unhandled event: ${eventType} – ignoring`);
      return NextResponse.json({ received: true, message: 'Event ignored' }, { status: 200 });
    }

    const membershipId = body?.data?.id;
    if (!membershipId) {
      console.warn('⚠️ No membership ID found in payload');
      return NextResponse.json({ received: true, message: 'Missing membership ID' }, { status: 200 });
    }

    const metadata = body?.data?.metadata || body?.metadata || {};
    const orderId = metadata?.order_id || body?.data?.order_id;

    console.log(`🔍 Membership ID: ${membershipId}, Order ID: ${orderId}`);

    // ----- 3. Action A: Local Database Delivery -----
    if (orderId) {
      const { error } = await supabase
        .from('ledger_orders')
        .update({ 
          payment_status: 'completed',
          whop_membership_id: membershipId,
          updated_at: new Date().toISOString()
        })
        .eq('order_id', orderId);

      if (error) {
        console.error('❌ Supabase update failed:', error);
      } else {
        console.log(`✅ Supabase order ${orderId} marked as completed`);
      }
    }

    // ----- 4. Action B: Instant Cancellation Revocation Loop -----
    const whopSecret = process.env.WHOP_API_KEY;
    if (!whopSecret) {
      console.error('❌ WHOP_API_KEY not set – cannot revoke membership');
      return NextResponse.json({ received: true, message: 'API key missing from environment' }, { status: 200 });
    }

    const cancelUrl = `https://whop.com{membershipId}/cancel`;
    console.log(`🔫 Wiping membership ${membershipId} to clear user email history...`);

    const cancelResponse = await fetch(cancelUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${whopSecret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cancel_at_period_end: false, // Forces instant removal
      }),
    });

    if (cancelResponse.ok) {
      console.log(`✅ Membership ${membershipId} completely terminated. Email freed.`);
    } else {
      const cancelData = await cancelResponse.json().catch(() => ({}));
      console.error(`❌ Failed to revoke membership ${membershipId}:`, cancelData);
    }

    // ----- 5. Return Absolute Valid JSON to Whop -----
    return NextResponse.json({ 
      success: true,
      received: true, 
      membership_id: membershipId
    }, { status: 200 });

  } catch (err: any) {
    console.error('❌ Webhook critical execution failure:', err.message || err);
    // CRITICAL FIX: Ensure full JSON structure is passed back during a system crash 
    return NextResponse.json({ success: false, error: 'Internal system fallback triggered' }, { status: 200 });
  }
}
