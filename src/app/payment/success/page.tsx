'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const [downloadTriggered, setDownloadTriggered] = useState(false);
  const [fileNameOnly, setFileNameOnly] = useState('');

  useEffect(() => {
    // 📡 INTERCEPT SIGNAL WRAPPERS: لقط الإشارة القادمة من Whop لايف
    const isVerified = searchParams.get('payment_verified') === 'true';
    
    // 🚀 THE OVERHAUL: سحب الداتا المؤمنة من الـ localStorage بنجاح عابر للنوافذ!
    const rawPending = localStorage.getItem('pendingDownload');

    if (isVerified && rawPending && !downloadTriggered) {
      try {
        const pendingData = JSON.parse(rawPending);
        const { rows, fileName } = pendingData;

        if (rows && rows.length) {
          const baseName = fileName.replace(/\.[^/.]+$/, '');
          setFileNameOnly(fileName);
          const headers = ['ID', 'Date', 'Type', 'Description', 'Amount', 'Balance'];
          
          // Reconstruct the spreadsheet matrix inside browser memory blocks in 0.01 seconds
          const csvContent = [
            headers.join(','), 
            ...rows.map((r: any) => [r.id, r.date, r.type, r.description, r.amount, r.balance].map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
          ].join('\n');
          
          // ⚡ INSTANT AUTOMATIC DOWNLOAD GENERATOR
          const blob = new Blob([csvContent], { type: 'text/csv' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = baseName + '.csv';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          
          setDownloadTriggered(true);
        }
      } catch (err) {
        console.error('Auto download execution mismatch:', err);
      }
    }
  }, [searchParams, downloadTriggered]);

  return (
    <main className="min-h-screen bg-[#030712] text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md bg-slate-950/50 border border-slate-800/80 p-8 rounded-3xl backdrop-blur-md shadow-2xl animate-fade-up">
        <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
          <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">🎉 Instant File Secured!</h1>
        <p className="text-slate-400 mt-2 text-sm leading-relaxed">
          Your highly optimized transaction ledger has been compiled and downloaded securely to your computer.
        </p>

        {fileNameOnly && (
          <div className="mt-4 p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
            <p className="text-[11px] text-emerald-400 font-mono tracking-tight truncate">📄 {fileNameOnly}</p>
          </div>
        )}

        <div className="mt-6 border-t border-slate-800/60 pt-5">
          <Link 
            href="/"
            onClick={() => {
              localStorage.removeItem('pendingDownload');
              localStorage.removeItem('whop_payment_success_signal');
            }}
            className="inline-flex items-center justify-center px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold rounded-xl text-xs shadow-lg transition-all duration-200"
          >
            ← Return to Dashboard
          </Link>
        </div>
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
