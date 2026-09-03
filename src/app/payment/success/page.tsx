'use client';

import { Suspense, useEffect } from 'react';

function PaymentSuccessContent() {
  useEffect(() => {
    // Smooth user experience: Give the webhook thread 1.5 seconds to flush, then close the checkout tab cleanly
    const timer = setTimeout(() => {
      try {
        window.close();
      } catch {
        window.location.href = 'about:blank';
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <main className="min-h-screen bg-[#030712] text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md bg-slate-950/50 border border-slate-800/80 p-8 rounded-3xl backdrop-blur-md shadow-2xl">
        <div className="w-12 h-16 mx-auto mb-4 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center animate-pulse">
          <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-white">Invoice Validated</h1>
        <p className="text-slate-400 mt-2 text-xs">
          Syncing cryptographic signatures with your dashboard layers... You can now close this tab.
        </p>
      </div>
    </main>
  );
}

export default function PaymentSuccess() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#030712]" />}><PaymentSuccessContent /></Suspense>
  );
}
