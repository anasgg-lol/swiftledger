import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Force absolute dynamic execution so it parses raw JSON streams correctly
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    console.log('📡 INBOUND WHOP WEBHOOK RECEIVED...');

    // ----- 1. Parse Request Body Natively -----
    let body;
    try {
      body = await req.json();
    } catch (parseErr) {
      console.error('❌ Failed to parse raw request JSON body stream');
      return NextResponse.json({ success: false, error: 'Malformed JSON payload' }, { status: 200 });
    }

    const eventType = body?.action || body?.event;
    console.log(`📌 Event type received: ${eventType}`);

    // If it's not the membership confirmation event, exit gracefully with clean JSON
    if (eventType !== 'membership.went_active') {
      console.log(`ℹ️ Unhandled event type: ${eventType} – ignoring`);
      return NextResponse.json({ success: true, message: 'Event structure ignored' }, { status: 200 });
    }

    const membershipId = body?.data?.id;
    if (!membershipId) {
      console.warn('⚠️ No membership ID found in the payload block');
      return NextResponse.json({ success: false, error: 'Missing membership ID' }, { status: 200 });
    }

    // Safely look up tracking metadata nodes
    const metadata = body?.data?.metadata || body?.metadata || {};
    const orderId = metadata?.order_id || body?.data?.order_id;
    console.log(`🔍 Extracted Membership ID: ${membershipId}, Order ID: ${orderId}`);

    // ----- 2. Action A: Safe Local Database Sync -----
    // FIX: Only run the database sync if an actual order identifier exists
    if (orderId) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
      
      if (supabaseUrl && supabaseServiceKey) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        console.log(`🗄️ Updating ledger_orders record for order: ${orderId}`);
        
        const { error } = await supabase
          .from('ledger_orders')
          .update({ 
            payment_status: 'completed',
            whop_membership_id: membershipId,
            updated_at: new Date().toISOString()
          })
          .eq('order_id', orderId);

        if (error) console.error('❌ Supabase database synchronization failed:', error);
        else console.log(`✅ Supabase order ${orderId} successfully completed`);
      } else {
        console.warn('⚠️ Supabase environment variables missing – skipping write layer');
      }
    } else {
      console.log('ℹ️ No order_id detected in payment session payload – bypassing database query step');
    }

    // ----- 3. Action B: Instant Email Revocation Loop -----
    const whopSecret = process.env.WHOP_API_KEY;
    if (!whopSecret) {
      console.error('❌ WHOP_API_KEY environment variable missing');
      return NextResponse.json({ success: false, error: 'Authorization setup incomplete' }, { status: 200 });
    }

    // Target the clean cancellation path
    const cancelUrl = `https://whop.com{membershipId}/cancel`;
    console.log(`🔫 Terminating active membership ${membershipId} to release user email history...`);

    const cancelResponse = await fetch(cancelUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${whopSecret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cancel_at_period_end: false, // Wipes the record instantly
      }),
    });

    if (cancelResponse.ok) {
      console.log(`✅ Membership ${membershipId} completely terminated. Email freed.`);
    } else {
      const errorPayload = await cancelResponse.json().catch(() => ({}));
      console.error(`❌ Whop server rejected revocation routine:`, errorPayload);
    }

    // ----- 4. Return Explicit Structured JSON to Whop -----
    return NextResponse.json({ 
      success: true,
      received: true, 
      membership_id: membershipId
    }, { status: 200 });

  } catch (err: any) {
    console.error('🔥 Webhook structural runtime explosion intercepted:', err.message || err);
    // CRITICAL: Prevent blank responses by passing valid JSON structure in the catch window
    return NextResponse.json({ 
      success: false, 
      error: 'Internal runtime fallback recovery executed' 
    }, { status: 200 });
  }
}
