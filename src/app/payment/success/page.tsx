'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function PaymentSuccess() {
  useEffect(() => {
    // Signal the original tab that payment succeeded
    localStorage.setItem('whop_payment_complete', 'true');

    // Close this tab after 4 seconds
    setTimeout(() => {
      window.close();
    }, 4000);
  }, []);

  return (
    <div className="min-h-screen bg-[#030712] text-white flex flex-col items-center justify-center p-6">
      <div className="max-w-md text-center bg-slate-900/60 border border-slate-800 rounded-2xl p-8">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
          <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold">Payment Successful 🎉</h1>
        <p className="text-slate-400 mt-2">Your files will start downloading in the original tab.</p>
        <p className="text-slate-500 text-sm mt-4">This tab will close automatically.</p>
        <Link href="/" className="inline-block mt-6 text-emerald-400 hover:underline">
          ← Back to SwiftLedger
        </Link>
      </div>
    </div>
  );
}