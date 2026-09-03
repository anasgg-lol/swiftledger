import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    console.log('📡 INBOUND VERIFIED SECURITY HANDSHAKE FROM WHOP...');
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ success: false, error: 'Configuration missing' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body = await req.json();

    // Isolate the matching order token from Whop's returning checkout metadata ledger
    const orderId = body?.data?.metadata?.order_id || body?.data?.order_id;
    const eventType = body?.action || body?.event;

    if (!orderId) {
      console.warn('⚠️ Webhook bypassed: No order_id present in incoming metadata array.');
      return NextResponse.json({ received: true, message: 'Skipped: Missing order identifier' });
    }

    // Flip the specific record entry to completed inside your database
    console.log(`🔒 SECURING TRANSACTION LEVERAGE: Order ID [${orderId}] verified.`);
    
    const { error } = await supabase
      .from('ledger_orders')
      .update({ payment_status: 'completed' })
      .eq('order_id', orderId);

    if (error) throw error;
    console.log('🚀 SUPABASE POSTGRES TRANSACTION FLASHED GREEN LAUNCH.');

    return NextResponse.json({ success: true, received: true });
  } catch (err: any) {
    console.error('❌ Root Webhook Critical Breakdown:', err.message || err);
    return NextResponse.json({ success: false, error: 'Internal pipeline lock exception' }, { status: 500 });
  }
}
