'use client';

import { Suspense } from 'react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// ============================================================
// 🔥 INNER COMPONENT
// ============================================================
function PaymentCancelContent() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/');
    }, 5000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <main className="min-h-screen bg-[#030712] text-white flex flex-col items-center justify-center p-6">
      <div className="max-w-md text-center">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center animate-fade-up">
          <svg className="w-10 h-10 text-amber-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-white animate-fade-up">Payment Cancelled</h1>
        <p className="text-slate-400 mt-3 animate-fade-up-delay-1">
          Your payment was cancelled. No charges were made.
        </p>
        <Link
          href="/"
          className="inline-block mt-6 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-white font-medium rounded-xl text-sm transition-colors animate-fade-up-delay-2"
        >
          ← Back to SwiftLedger
        </Link>
        <p className="text-xs text-slate-500 mt-4 animate-fade-up-delay-3">
          Redirecting in 5 seconds...
        </p>
      </div>
    </main>
  );
}

// ============================================================
// 🔥 OUTER COMPONENT – Wraps with Suspense
// ============================================================
export default function PaymentCancel() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#030712] text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Loading...</p>
        </div>
      </div>
    }>
      <PaymentCancelContent />
    </Suspense>
  );
}