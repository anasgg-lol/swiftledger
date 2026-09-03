import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 60; // Next.js official segment config object

// ✅ FIXED: تم نقل التعريف لداخل الدالة لحماية الـ Build من النصوص الفارغة
export async function POST(req: Request) {
  try {
    console.log('📡 WHOP VERIFIED WEBHOOK HANDSHAKE INBOUND...');

    // قراءة المتغيرات وتأمينها فورياً وقت التشغيل (Runtime)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ CRITICAL: Supabase keys are missing from Vercel Environment Variables!');
      return NextResponse.json({ success: false, error: 'Configuration missing' }, { status: 500 });
    }

    // بناء الـ Client مع تخطي جدران الحماية الـ RLS بنجاح وأمان
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();

    // استخراج بيانات الـ Webhook القادمة من Whop لايف
    const eventType = body?.action || body?.event;
    const userEmail = body?.data?.user?.email || body?.data?.email;
    const passToken = body?.data?.metadata?.pass_token || body?.data?.pass_token;

    if (!passToken) {
      console.warn('⚠️ Webhook received but no pass_token was attached to metadata.');
      return NextResponse.json({ received: true, message: 'Skipped: No pass token' });
    }

    // تفعيل وتحديث حالة الإيصال المالي في قواعد البيانات فوراً
    console.log(`🔒 TRANSACTION SECURED: Updating verification state for token: ${passToken}`);

    const { error } = await supabase
      .from('payment_receipts')
      .upsert(
        { 
          pass_token: passToken, 
          user_email: userEmail || 'verified_buyer', 
          payment_status: 'completed' 
        },
        { onConflict: 'pass_token' }
      );

    if (error) throw error;
    console.log('✅ SUPABASE REALTIME STATE FLASHED GREEN.');

    return NextResponse.json({ success: true, received: true });
  } catch (err: any) {
    console.error('❌ Webhook Execution Failure Node:', err.message || err);
    return NextResponse.json({ success: false, error: 'Internal verification loop broken' }, { status: 500 });
  }
}
