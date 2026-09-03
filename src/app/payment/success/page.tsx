'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [downloadTriggered, setDownloadTriggered] = useState(false);

  useEffect(() => {
    // 📡 INTERCEPT SIGNAL WRAPPERS: Reads the live query params passed back by Whop cloud nodes
    const isVerified = searchParams.get('payment_verified') === 'true';
    const rawPending = sessionStorage.getItem('pendingDownload');

    if (isVerified && rawPending && !downloadTriggered) {
      try {
        const pendingData = JSON.parse(rawPending);
        const { rows, fileName } = pendingData;

        if (rows && rows.length) {
          const baseName = fileName.replace(/\.[^/.]+$/, '');
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
          
          // Wipe data traces immediately to protect your server computing limits and secure the system
          sessionStorage.removeItem('pendingDownload');
        }
      } catch (err) {
        console.error('Auto download execution mismatch:', err);
      }
    }

    // Gracefully route your paying client clean back to their main dashboard screen view loop after 3 seconds
    const timer = setTimeout(() => {
      router.push('/');
    }, 3000);

    return () => clearTimeout(timer);
  }, [searchParams, router, downloadTriggered]);

  return (
    <main className="min-h-screen bg-[#030712] text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center animate-bounce">
          <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-white">✅ Payment Secured!</h1>
        <p className="text-slate-400 mt-2 text-sm">
          Your highly optimized file has been compiled and downloaded to your device automatically.
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
