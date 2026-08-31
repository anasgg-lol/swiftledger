'use client';

import { Suspense } from 'react';
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

// ============================================================
// 🔥 INNER COMPONENT – Uses useSearchParams
// ============================================================
function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [countdown, setCountdown] = useState(5);

  const pageCount = searchParams.get('pageCount');
  const txCount = searchParams.get('txCount');
  const file = searchParams.get('file');

  // Auto-redirect to home after 5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push('/');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router]);

  return (
    <main className="min-h-screen bg-[#030712] text-white flex flex-col items-center justify-center p-6">
      <div className="max-w-md text-center">
        {/* Success Icon */}
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center animate-fade-up">
          <svg className="w-10 h-10 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <h1 className="text-3xl font-bold text-white animate-fade-up">✅ Payment Successful!</h1>
        <p className="text-slate-400 mt-3 animate-fade-up-delay-1">
          Your payment was successful. You can now download your CSV.
        </p>

        <div className="mt-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl animate-fade-up-delay-2">
          <p className="text-emerald-400 font-medium">
            📄 {file || 'Your statement'} – {txCount || 0} transactions
          </p>
        </div>

        <Link
          href="/"
          className="inline-block mt-6 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-white font-medium rounded-xl text-sm transition-colors animate-fade-up-delay-3"
        >
          ← Back to SwiftLedger
        </Link>

        <p className="text-xs text-slate-500 mt-4 animate-fade-up-delay-4">
          Redirecting in {countdown}s
        </p>
      </div>
    </main>
  );
}

// ============================================================
// 🔥 OUTER COMPONENT – Wraps with Suspense
// ============================================================
export default function PaymentSuccess() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#030712] text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Loading...</p>
        </div>
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  );
}