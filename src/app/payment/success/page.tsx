'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

function PaymentSuccessContent() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const isVerified = searchParams.get('payment_verified') === 'true';

    if (isVerified) {
      console.log('📡 BROADCASTING HIGH-SPEED CROSS-TAB TRANSACTION SIGNAL...');
      
      // Fires the synchronized cross-tab state modifier key across active tab instances instantly!
      localStorage.setItem('whop_payment_success_signal', 'true');
      
      // Smooth UX: Give it 500ms to safely flush the cross-tab thread, then kill the checkout window tab!
      setTimeout(() => {
        try {
          window.close();
        } catch (e) {
          console.log('Tab close skipped by browser sandbox permissions. Ready for manual close.');
        }
      }, 500);
    }
  }, [searchParams]);

  return (
    <main className="min-h-screen bg-[#030712] text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center animate-pulse">
          <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-white">Secure Link Authorized</h1>
        <p className="text-slate-400 mt-2 text-xs">
          Syncing transaction hashes with your active dashboard... This window can now be safely closed.
        </p>
      </div>
    </main>
  );
}

export default function PaymentSuccess() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#030712]" />}>
      <PaymentSuccessContent />
    </Suspense>
  );
}
