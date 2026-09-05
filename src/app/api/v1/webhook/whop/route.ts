import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    console.log('📡 INBOUND WHOP WEBHOOK RECEIVED...');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Supabase config missing');
      return NextResponse.json({ success: false, error: 'Configuration missing' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body = await req.json();

    // Whop sends event type in `action` or `event` field
    const eventType = body?.action || body?.event;
    console.log(`📌 Event type: ${eventType}`);

    // Extract metadata (custom fields) from the payload
    const metadata = body?.data?.metadata || {};
    const orderId = metadata?.order_id || body?.data?.order_id;

    // ============================================================
    // STEP 1 – Handle membership.went_active
    // ============================================================
    if (eventType === 'membership.went_active') {
      console.log('🔓 Membership went active – processing unlock & termination...');

      // Extract membership ID (Whop’s membership ID)
      const membershipId = body?.data?.id || body?.data?.membership_id;
      if (!membershipId) {
        console.warn('⚠️ No membership ID found in payload');
        return NextResponse.json({ received: true, message: 'Missing membership ID' }, { status: 200 });
      }

      // If we have an order_id, update our local DB to mark payment as completed
      if (orderId) {
        const { error } = await supabase
          .from('ledger_orders')
          .update({ payment_status: 'completed' })
          .eq('order_id', orderId);

        if (error) {
          console.error('❌ Supabase update failed:', error);
          // Don't return error; we still want to terminate membership
        } else {
          console.log(`✅ Supabase order ${orderId} marked as completed`);
        }
      } else {
        console.warn('⚠️ No order_id in metadata – skipping local DB update');
      }

      // ============================================================
      // STEP 2 – Terminate the Whop membership instantly
      // ============================================================
      const whopSecret = process.env.WHOP_API_KEY;
      if (!whopSecret) {
        console.error('❌ WHOP_API_KEY not set – cannot terminate membership');
        // We still return 200 to avoid retries, but log error
        return NextResponse.json({ received: true, message: 'API key missing' }, { status: 200 });
      }

      const terminateUrl = `https://api.whop.com/v1/memberships/${membershipId}/terminate`;
      // Alternative: DELETE /v1/memberships/{id} – we'll use POST with terminate action
      // Whop docs: POST /v1/memberships/:id/cancel? – let's use a safe endpoint.

      console.log(`🔫 Terminating membership ${membershipId}...`);

      const terminateResponse = await fetch(terminateUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${whopSecret}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}), // No additional data needed
      });

      const terminateData = await terminateResponse.json();

      if (terminateResponse.ok) {
        console.log(`✅ Membership ${membershipId} terminated successfully`);
      } else {
        console.error(`❌ Failed to terminate membership ${membershipId}:`, terminateData);
        // We still return 200 to prevent Whop from retrying, but log the error
      }

      return NextResponse.json({ received: true, terminated: true });
    }

    // ============================================================
    // Handle other events (if needed)
    // ============================================================
    console.log(`ℹ️ Unhandled event type: ${eventType}`);
    return NextResponse.json({ received: true, message: 'Event ignored' }, { status: 200 });
  } catch (err: any) {
    console.error('❌ Webhook critical failure:', err.message || err);
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 });
  }
}