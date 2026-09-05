import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    console.log('📡 INBOUND WHOP WEBHOOK RECEIVED...');

    // ----- 1. Init Supabase -----
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Supabase config missing');
      return NextResponse.json({ success: false, error: 'Configuration missing' }, { status: 500 });
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ----- 2. Parse and validate event -----
    const body = await req.json();
    const eventType = body?.action || body?.event;
    console.log(`📌 Event type: ${eventType}`);

    // Only handle membership.went_active
    if (eventType !== 'membership.went_active') {
      console.log(`ℹ️ Unhandled event: ${eventType} – ignoring`);
      return NextResponse.json({ received: true, message: 'Event ignored' }, { status: 200 });
    }

    // ----- 3. Extract membership and metadata -----
    const membershipId = body?.data?.id;
    if (!membershipId) {
      console.warn('⚠️ No membership ID found in payload');
      return NextResponse.json({ received: true, message: 'Missing membership ID' }, { status: 200 });
    }

    // Metadata can be nested in body.data.metadata or directly in body.metadata
    const metadata = body?.data?.metadata || body?.metadata || {};
    const orderId = metadata?.order_id || body?.data?.order_id;
    const sessionId = metadata?.session_id || metadata?.api_key; // if you pass any custom identifier

    console.log(`🔍 Membership ID: ${membershipId}, Order ID: ${orderId}, Session: ${sessionId}`);

    // ----- 4. Action A: Update local database (deliver asset) -----
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
        // We still continue to revoke membership, but log error
      } else {
        console.log(`✅ Supabase order ${orderId} marked as completed`);
      }
    } else {
      console.warn('⚠️ No order_id in metadata – skipping DB update');
    }

    // ----- 5. Action B: Instantly cancel/terminate the Whop membership -----
    const whopSecret = process.env.WHOP_API_KEY;
    if (!whopSecret) {
      console.error('❌ WHOP_API_KEY not set – cannot revoke membership');
      // Even if key missing, return 200 to prevent retries
      return NextResponse.json({ received: true, message: 'API key missing' }, { status: 200 });
    }

    // Use the proper Whop API endpoint for cancellation
    const cancelUrl = `https://api.whop.com/v1/memberships/${membershipId}/cancel`;
    console.log(`🔫 Cancelling membership ${membershipId}...`);

    const cancelResponse = await fetch(cancelUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${whopSecret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cancel_at_period_end: false, // immediate termination, no waiting period
      }),
    });

    const cancelData = await cancelResponse.json();

    if (cancelResponse.ok) {
      console.log(`✅ Membership ${membershipId} cancelled successfully`);
    } else {
      console.error(`❌ Failed to cancel membership ${membershipId}:`, cancelData);
      // We still return 200 to avoid retries from Whop
    }

    // ----- 6. Return success to Whop -----
    return NextResponse.json({ 
      received: true, 
      membership_id: membershipId,
      revoked: cancelResponse.ok 
    }, { status: 200 });

  } catch (err: any) {
    console.error('❌ Webhook critical failure:', err.message || err);
    // Always return 200 to prevent Whop retries
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 200 });
  }
}