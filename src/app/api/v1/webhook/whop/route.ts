import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export const maxDuration = 60;

// ---------- Standard Webhooks signature check (Whop's current webhook format) ----------
// Whop signs: `${webhook-id}.${webhook-timestamp}.${raw body}` with HMAC-SHA256,
// using your `ws_...` secret. Header is `webhook-signature: v1,<base64 sig>`.
// If you haven't set WHOP_WEBHOOK_SECRET yet, this just logs a warning and continues
// (so you don't get locked out) — but you should set it ASAP so randoms can't fake events.
function verifyWhopSignature(rawBody: string, headers: Headers): boolean {
  const secret = process.env.WHOP_WEBHOOK_SECRET;
  if (!secret) {
    console.warn('⚠️ WHOP_WEBHOOK_SECRET not set — skipping signature check (set this ASAP)');
    return true;
  }

  const id = headers.get('webhook-id');
  const timestamp = headers.get('webhook-timestamp');
  const signatureHeader = headers.get('webhook-signature');

  if (!id || !timestamp || !signatureHeader) {
    console.error('❌ Missing webhook-id/webhook-timestamp/webhook-signature headers');
    return false;
  }

  // Reject anything older than 5 minutes (replay protection)
  const ts = parseInt(timestamp, 10);
  if (!ts || Math.abs(Date.now() / 1000 - ts) > 300) {
    console.error('❌ Webhook timestamp outside allowed window');
    return false;
  }

  const signedContent = `${id}.${timestamp}.${rawBody}`;
  const expected = crypto
    .createHmac('sha256', secret.replace(/^ws_/, ''))
    .update(signedContent)
    .digest('base64');

  // signatureHeader looks like: "v1,<sig>" (sometimes multiple space-separated "v1,<sig>" entries)
  const candidates = signatureHeader
    .split(' ')
    .map((part) => part.split(',')[1])
    .filter(Boolean);

  return candidates.some((sig) =>
    crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
  );
}

export async function POST(req: Request) {
  try {
    console.log('📡 INBOUND WHOP WEBHOOK RECEIVED...');

    // ----- 0. Read RAW body first (needed for signature check; parsing first breaks it) -----
    const rawBody = await req.text();

    if (!verifyWhopSignature(rawBody, req.headers)) {
      console.error('❌ Webhook signature verification failed — rejecting');
      return NextResponse.json({ received: false, error: 'Invalid signature' }, { status: 401 });
    }

    const body = JSON.parse(rawBody);

    // ----- 1. Init Supabase -----
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Supabase config missing');
      return NextResponse.json({ success: false, error: 'Configuration missing' }, { status: 500 });
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ----- 2. Parse and validate event -----
    // Supports both the current Whop envelope (`type`) and the legacy one (`action`/`event`)
    // in case your dashboard webhook is still on the older format.
    const eventType = body?.type || body?.action || body?.event;
    console.log(`📌 Event type: ${eventType}`);

    const MEMBERSHIP_ACTIVE_EVENTS = ['membership.activated', 'membership.went_active'];
    if (!MEMBERSHIP_ACTIVE_EVENTS.includes(eventType)) {
      console.log(`ℹ️ Unhandled event: ${eventType} – ignoring`);
      return NextResponse.json({ received: true, message: 'Event ignored' }, { status: 200 });
    }

    // ----- 3. Extract membership and metadata -----
    const membershipId = body?.data?.id;
    if (!membershipId) {
      console.warn('⚠️ No membership ID found in payload');
      return NextResponse.json({ received: true, message: 'Missing membership ID' }, { status: 200 });
    }

    // Metadata can live in a few different places depending on API version — check them all.
    const metadata =
      body?.data?.metadata ||
      body?.data?.plan?.metadata ||
      body?.data?.product?.metadata ||
      body?.metadata ||
      {};
    const orderId = metadata?.order_id || body?.data?.order_id;
    const sessionId = metadata?.session_id || metadata?.api_key;

    console.log(`🔍 Membership ID: ${membershipId}, Order ID: ${orderId}, Session: ${sessionId}`);
    if (!orderId) {
      console.warn('⚠️ No order_id present in metadata — make sure create-checkout is actually sending one if you rely on this for DB updates.');
    }

    // ----- 4. Action A: Update local database (deliver asset) -----
    if (orderId) {
      const { error } = await supabase
        .from('ledger_orders')
        .update({
          payment_status: 'completed',
          whop_membership_id: membershipId,
          updated_at: new Date().toISOString(),
        })
        .eq('order_id', orderId);

      if (error) {
        console.error('❌ Supabase update failed:', error);
      } else {
        console.log(`✅ Supabase order ${orderId} marked as completed`);
      }
    } else {
      console.warn('⚠️ No order_id in metadata – skipping DB update');
    }

    // ----- 5. Action B: Immediately revoke the Whop membership -----
    // This is the part that was broken. Two fixes vs the old code:
    //   1. URL now includes /api/ ( https://api.whop.com/api/v1/... not https://api.whop.com/v1/... )
    //   2. Body now sends `cancellation_mode: "immediate"` (the real param), not `cancel_at_period_end`
    const whopSecret = process.env.WHOP_API_KEY;
    if (!whopSecret) {
      console.error('❌ WHOP_API_KEY not set – cannot revoke membership');
      return NextResponse.json({ received: true, message: 'API key missing' }, { status: 200 });
    }

    const cancelUrl = `https://api.whop.com/api/v1/memberships/${membershipId}/cancel`;
    console.log(`🔫 Revoking membership ${membershipId} immediately...`);

    const cancelResponse = await fetch(cancelUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${whopSecret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cancellation_mode: 'immediate', // <-- correct param name/value, immediate = revoke access now
      }),
    });

    const cancelData = await cancelResponse.json();

    if (cancelResponse.ok) {
      console.log(`✅ Membership ${membershipId} revoked successfully. Status: ${cancelData?.status}, valid: ${cancelData?.valid}`);
    } else {
      console.error(`❌ Failed to revoke membership ${membershipId} (status ${cancelResponse.status}):`, JSON.stringify(cancelData));
      // Still return 200 so Whop doesn't hammer retries — but this error will now actually
      // show up clearly in your logs instead of silently doing nothing.
    }

    // ----- 6. Return success to Whop -----
    return NextResponse.json(
      {
        received: true,
        membership_id: membershipId,
        revoked: cancelResponse.ok,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error('❌ Webhook critical failure:', err.message || err);
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 200 });
  }
}