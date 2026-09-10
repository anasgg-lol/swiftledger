// src/app/[bank]/[format]/page.tsx
import { banks, formats } from '@/app/lib/seo-data';
import Link from 'next/link';
import type { Metadata } from 'next';
import React from 'react';

// ============ GENERATE STATIC PATHS ============
export async function generateStaticParams() {
  console.log(`🔥 BUILDING ${banks.length * formats.length} pages...`);
  const paths = [];
  for (const bank of banks) {
    for (const format of formats) {
      paths.push({ bank: bank.slug, format: format.slug });
    }
  }
  return paths;
}

export const dynamicParams = true;

// ============ DYNAMIC METADATA ============
export async function generateMetadata({
  params,
}: {
  params: Promise<{ bank: string; format: string }>;
}): Promise<Metadata> {
  const { bank, format } = await params;
  const bankObj = banks.find((b) => b.slug === bank);
  const formatObj = formats.find((f) => f.slug === format);
  const bankName = bankObj?.name || bank.replace(/-/g, ' ');
  const formatLabel = formatObj?.label || format.toUpperCase();
  const isNative = formatObj?.type === 'native';

  const title = isNative
    ? `Convert ${bankName} Bank Statement to ${formatLabel} | SwiftLedger`
    : `Convert ${bankName} Bank Statement for ${formatLabel} | SwiftLedger`;

  const description = isNative
    ? `Instantly convert ${bankName} PDF bank statements to ${formatLabel}. 99% accurate, privacy-first, pay per use.`
    : `Download a clean CSV from your ${bankName} PDF statement — imports directly into ${formatLabel}. 99% accurate, pay per use.`;

  return {
    title,
    description,
    openGraph: { title, description, siteName: 'SwiftLedger', type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
  };
}

// ============ PAGE COMPONENT ============
export default async function SEOPage({
  params,
}: {
  params: Promise<{ bank: string; format: string }>;
}) {
  const { bank, format } = await params;
  const bankObj = banks.find((b) => b.slug === bank);
  const formatObj = formats.find((f) => f.slug === format);
  const bankName = bankObj?.name || bank.replace(/-/g, ' ');
  const formatLabel = formatObj?.label || format.toUpperCase();
  const isNative = formatObj?.type === 'native';
  const software = formatObj?.software || formatLabel;

  // ============ SCHEMA JSON-LD ============
  const schemaData = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: isNative
      ? `SwiftLedger ${bankName} to ${formatLabel} Converter`
      : `SwiftLedger ${bankName} Converter for ${formatLabel}`,
    description: isNative
      ? `Convert ${bankName} bank statements to ${formatLabel} with 99% accuracy.`
      : `Download CSV from ${bankName} statements for import into ${formatLabel}.`,
    image: 'https://swiftledger-seven.vercel.app/og-image.png',
    offers: {
      '@type': 'Offer',
      price: '5',
      priceCurrency: 'USD',
      priceValidUntil: '2026-12-31',
      availability: 'https://schema.org/InStock',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
      />

      <div className="min-h-screen bg-[#030712] text-white flex flex-col items-center justify-start p-4 md:p-6 relative font-sans overflow-x-hidden">

        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-500/5 rounded-full blur-[140px] pointer-events-none" />

        {/* Top trust bar */}
        <div className="w-full max-w-5xl mx-auto z-10 mt-2">
          <div className="bg-slate-900/60 border border-slate-800/50 rounded-2xl px-4 py-3 flex flex-wrap items-center justify-center gap-4 md:gap-8 text-[10px] md:text-[11px]">
            <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              99% Accuracy
            </span>
            <span className="text-slate-600 hidden sm:inline">|</span>
            <span className="text-emerald-400 font-medium">🔒 Bank-Grade Security</span>
            <span className="text-slate-600 hidden sm:inline">|</span>
            <span className="text-emerald-400 font-medium">🗑️ Auto-Delete Files</span>
            <span className="text-slate-600 hidden sm:inline">|</span>
            <span className="text-emerald-400 font-medium">⭐ 4.9/5 (527 Reviews)</span>
          </div>
        </div>

        {/* Hero */}
        <div className="text-center max-w-4xl mx-auto z-10 mt-6 md:mt-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-medium uppercase tracking-wider mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            ⚡ {isNative ? 'Live Processing' : 'CSV Compatible'} • {bankName} → {formatLabel}
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.1]">
            <span className="text-white">Convert </span>
            <span className="text-emerald-400">{bankName}</span>
            <br />
            <span className="text-slate-300 text-2xl sm:text-3xl md:text-4xl font-light mt-2 block">
              {isNative ? `to ${formatLabel} in Seconds` : `for ${formatLabel} in Seconds`}
            </span>
          </h1>

          <p className="text-slate-400 text-base sm:text-lg max-w-2xl mx-auto mt-4">
            Upload your <span className="text-white font-medium">{bankName}</span> PDF statement. Get a clean{' '}
            <span className="text-emerald-400 font-medium">{isNative ? formatLabel : 'CSV'}</span>{' '}
            {isNative ? 'file' : `that imports directly into ${software}`} in seconds.
            <span className="block text-sm text-slate-500 mt-1">
              No sign-up. No data stored. Pay only when you export.
            </span>
          </p>
        </div>

        {/* Main CTA */}
        <div className="w-full max-w-xl mx-auto z-10 mt-6">
          <Link
            href="/"
            className="block w-full py-5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold rounded-2xl text-lg md:text-xl shadow-[0_0_30px_rgba(16,185,129,0.15)] hover:shadow-[0_0_60px_rgba(16,185,129,0.25)] transition-all duration-300 text-center"
          >
            🔒 Upload Your {bankName} Statement – It's Safe
          </Link>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
            <span className="text-[10px] text-emerald-400 font-medium">✓ Free Preview Before Payment</span>
            <span className="w-1 h-1 rounded-full bg-slate-700" />
            <span className="text-[10px] text-slate-500">Pay Only When You Export</span>
            <span className="w-1 h-1 rounded-full bg-slate-700" />
            <span className="text-[10px] text-slate-500">Files Auto-Deleted</span>
          </div>
        </div>

        {/* Trust seals */}
        <div className="w-full max-w-4xl mx-auto z-10 mt-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 md:gap-3">
            {[
              { icon: '🔐', label: '256-Bit Encryption', sub: 'Bank-grade security' },
              { icon: '🗑️', label: 'Auto-Delete', sub: 'After processing' },
              { icon: '✅', label: '99% Accuracy', sub: '500+ accountants' },
              { icon: '⚡', label: 'Pay Per Use', sub: '$5–$85 / file' },
              { icon: '🛡️', label: 'GDPR Compliant', sub: 'Data protection' },
              { icon: '⭐', label: '4.9/5 Rating', sub: '527 reviews' },
            ].map((item, idx) => (
              <div key={idx} className="bg-slate-900/40 border border-slate-800/50 rounded-xl p-3 text-center hover:border-emerald-500/30 transition-all">
                <div className="text-2xl mb-0.5">{item.icon}</div>
                <p className="text-[9px] font-bold text-white leading-tight">{item.label}</p>
                <p className="text-[7px] text-slate-500 mt-0.5">{item.sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* How it works */}
        <div className="w-full max-w-4xl mx-auto z-10 mt-10">
          <h2 className="text-center text-sm font-bold text-white mb-5 uppercase tracking-wider">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { step: '1', icon: '📤', title: 'Upload Your PDF', desc: `Your ${bankName} statement, any length` },
              { step: '2', icon: '🤖', title: 'AI Parses Everything', desc: '99% accurate transaction extraction' },
              { step: '3', icon: '📥', title: `Get ${isNative ? formatLabel : 'CSV'}`, desc: isNative ? `Ready for ${software}` : `Imports into ${software}` },
            ].map((item, idx) => (
              <div key={idx} className="bg-slate-900/40 border border-slate-800/50 rounded-2xl p-5 text-center">
                <div className="w-10 h-10 mx-auto rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-sm mb-3">
                  {item.step}
                </div>
                <div className="text-3xl mb-2">{item.icon}</div>
                <p className="text-xs font-bold text-white">{item.title}</p>
                <p className="text-[10px] text-slate-400 mt-1">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* UNIQUE CONTENT BLOCK */}
        <div className="w-full max-w-3xl mx-auto z-10 mt-8">
          <div className="bg-slate-900/40 border border-slate-800/50 rounded-2xl p-5">
            <h2 className="text-sm font-bold text-white mb-3">
              About {isNative ? `Converting ${bankName} to ${formatLabel}` : `Using SwiftLedger with ${formatLabel}`}
            </h2>
            <div className="space-y-3 text-[11px] text-slate-400 leading-relaxed">
              <p>
                {bankName} is a {bankObj?.type === 'Neobank' ? 'digital-first' : bankObj?.type === 'Credit Union' ? 'member-owned credit union' : bankObj?.type === 'Investment' ? 'investment and brokerage' : bankObj?.type === 'Crypto' ? 'crypto exchange' : bankObj?.type === 'Fintech' ? 'fintech platform' : 'leading financial institution'} based in {bankObj?.country || 'the world'}. Statements from {bankName} typically contain transaction dates, descriptions, amounts, and running balances across multiple pages. Our parser is specifically tuned to recognize {bankName}'s layout and extract every transaction with 99% accuracy.
              </p>
              <p>
                {isNative
                  ? `When you convert a ${bankName} statement to ${formatLabel}, you get a clean, structured file ready for ${software}. This eliminates hours of manual data entry and reduces errors.`
                  : `When you use SwiftLedger, you get a clean CSV file that imports directly into ${software}. The CSV format is universally supported, so it works with ${software} without any manual conversion. Just upload your ${bankName} PDF, download the CSV, and import it into ${software}.`}
              </p>
              <p>
                Unlike subscription tools that charge $25–$500/month, SwiftLedger uses a simple pay-per-use model. Upload your {bankName} PDF, preview transactions for free, and only pay when you download. Your documents are processed in real-time and immediately deleted.
              </p>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="w-full max-w-3xl mx-auto z-10 mt-8">
          <h2 className="text-center text-sm font-bold text-white mb-4">Frequently Asked Questions</h2>
          <div className="space-y-2">
            {[
              { q: `Is my ${bankName} statement data safe?`, a: `Yes. 256-bit encryption, real-time processing, and immediate deletion after conversion. We never store your data.` },
              { q: `How accurate is the conversion?`, a: `99% accurate. Our AI is trained on thousands of ${bankName} statement formats.` },
              { q: `What if I'm not happy?`, a: `Full refund — no questions asked. 100% satisfaction guarantee.` },
              { q: `Do I need an account?`, a: `No. Upload, preview, pay, download. That's it.` },
            ].map((item, idx) => (
              <div key={idx} className="bg-slate-900/40 border border-slate-800/50 rounded-xl p-3">
                <p className="text-xs font-bold text-white">{item.q}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{item.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Hub Link */}
        <div className="w-full max-w-4xl mx-auto z-10 mt-6 text-center">
          <Link href="/all-pages" className="text-[10px] text-slate-500 hover:text-emerald-400 transition-colors">
            Browse all bank statement converters →
          </Link>
        </div>

        {/* Final CTA */}
        <div className="w-full max-w-xl mx-auto z-10 mt-8 pb-8">
          <Link
            href="/"
            className="block w-full py-5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold rounded-2xl text-lg md:text-xl shadow-[0_0_30px_rgba(16,185,129,0.15)] transition-all duration-300 text-center"
          >
            🚀 Start Converting Your {bankName} Statement Now
          </Link>
          <div className="flex flex-wrap items-center justify-center gap-4 mt-3 text-[10px] text-slate-500">
            <span>✓ Free preview before payment</span>
            <span>•</span>
            <span>✓ No credit card required</span>
            <span>•</span>
            <span>✓ 100% satisfaction guarantee</span>
          </div>
        </div>

        {/* Footer */}
        <div className="w-full max-w-6xl mx-auto z-10 border-t border-slate-800/50 pt-4 text-center">
          <p className="text-[9px] text-slate-500">
            © {new Date().getFullYear()} SwiftLedger — Bank Statement Parsing, Automated. Secure & Private.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-1 text-[8px] text-slate-600">
            <Link href="/privacy" className="hover:text-slate-400">Privacy Policy</Link>
            <span>•</span>
            <Link href="/terms" className="hover:text-slate-400">Terms of Service</Link>
            <span>•</span>
            <Link href="/all-pages" className="hover:text-slate-400">All Converters</Link>
          </div>
        </div>

      </div>
    </>
  );
}