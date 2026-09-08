// src/app/[bank]/[format]/page.tsx
import Link from 'next/link';
import type { Metadata } from 'next';
import React from 'react';

// ============ HARDCODED DATA ============
const BANKS = [
  { name: 'Chase', slug: 'chase' },
  { name: 'Bank of America', slug: 'bank-of-america' },
  { name: 'Barclays', slug: 'barclays' },
  { name: 'HSBC', slug: 'hsbc' },
  { name: 'Wells Fargo', slug: 'wells-fargo' },
  { name: 'Citibank', slug: 'citibank' },
  { name: 'Capital One', slug: 'capital-one' },
  { name: 'PNC', slug: 'pnc' },
  { name: 'TD Bank', slug: 'td-bank' },
  { name: 'Navy Federal', slug: 'navy-federal' },
  { name: 'Goldman Sachs', slug: 'goldman-sachs' },
  { name: 'Morgan Stanley', slug: 'morgan-stanley' },
  { name: 'Santander', slug: 'santander' },
  { name: 'BBVA', slug: 'bbva' },
  { name: 'ING', slug: 'ing' },
  { name: 'Revolut', slug: 'revolut' },
  { name: 'Monzo', slug: 'monzo' },
  { name: 'Starling', slug: 'starling' },
  { name: 'N26', slug: 'n26' },
  { name: 'Wise', slug: 'wise' },
  { name: 'Payoneer', slug: 'payoneer' },
  { name: 'TransferWise', slug: 'transferwise' },
  { name: 'Monese', slug: 'monese' },
  { name: 'Klarna', slug: 'klarna' },
  { name: 'Affirm', slug: 'affirm' },
  { name: 'Afterpay', slug: 'afterpay' },
  { name: 'Clearpay', slug: 'clearpay' },
  { name: 'Zopa', slug: 'zopa' },
  { name: 'Atom Bank', slug: 'atom-bank' },
  { name: 'Tandem', slug: 'tandem' },
  { name: 'Monument', slug: 'monument' },
  { name: 'OakNorth', slug: 'oaknorth' },
  { name: 'Aldermore', slug: 'aldermore' },
  { name: 'Coventry Building Society', slug: 'coventry' },
  { name: 'Nationwide', slug: 'nationwide' },
  { name: 'Lloyds', slug: 'lloyds' },
  { name: 'Halifax', slug: 'halifax' },
  { name: 'NatWest', slug: 'natwest' },
  { name: 'Royal Bank of Scotland', slug: 'rbs' },
  { name: 'Ulster Bank', slug: 'ulster' },
  { name: 'Bank of Ireland', slug: 'bank-of-ireland' },
  { name: 'AIB', slug: 'aib' },
  { name: 'Permanent TSB', slug: 'permanent-tsb' },
  { name: 'KBC', slug: 'kbc' },
  { name: 'Danske Bank', slug: 'danske' },
  { name: 'Swedbank', slug: 'swedbank' },
  { name: 'SEB', slug: 'seb' },
  { name: 'Nordea', slug: 'nordea' },
  { name: 'OP Financial Group', slug: 'op' },
  { name: 'Sberbank', slug: 'sberbank' },
];

const FORMATS = [
  { label: 'CSV', slug: 'csv' },
  { label: 'QBO', slug: 'qbo' },
  { label: 'OFX', slug: 'ofx' },
  { label: 'Xero', slug: 'xero' },
  { label: 'Excel', slug: 'excel' },
  { label: 'QuickBooks', slug: 'quickbooks' },
  { label: 'Sage', slug: 'sage' },
  { label: 'Wave', slug: 'wave' },
  { label: 'FreshBooks', slug: 'freshbooks' },
  { label: 'Zoho Books', slug: 'zoho' },
  { label: 'KashFlow', slug: 'kashflow' },
  { label: 'FreeAgent', slug: 'freeagent' },
  { label: 'Crunch', slug: 'crunch' },
  { label: 'Pandle', slug: 'pandle' },
  { label: 'Clear Books', slug: 'clear-books' },
  { label: 'Accounts Portal', slug: 'accounts-portal' },
  { label: 'VT Software', slug: 'vt' },
  { label: 'TaxCalc', slug: 'taxcalc' },
  { label: 'BTCSoftware', slug: 'btc' },
  { label: 'Digital Accountancy', slug: 'digital-accountancy' },
  { label: 'Capium', slug: 'capium' },
  { label: 'SlickPie', slug: 'slickpie' },
  { label: 'Manager', slug: 'manager' },
  { label: 'Akaunting', slug: 'akaunting' },
  { label: 'Odoo', slug: 'odoo' },
  { label: 'ERPNext', slug: 'erpnext' },
  { label: 'Dolibarr', slug: 'dolibarr' },
  { label: 'FrontAccounting', slug: 'frontaccounting' },
  { label: 'Tally', slug: 'tally' },
  { label: 'SAP', slug: 'sap' },
];

// ============ GENERATE STATIC PATHS ============
export async function generateStaticParams() {
  const paths = [];
  for (const bank of BANKS) {
    for (const format of FORMATS) {
      paths.push({ bank: bank.slug, format: format.slug });
    }
  }
  return paths;
}

export const dynamicParams = true;

// ============ DYNAMIC METADATA WITH SCHEMA ============
export async function generateMetadata({
  params,
}: {
  params: Promise<{ bank: string; format: string }>;
}): Promise<Metadata> {
  const { bank, format } = await params;
  const bankName = BANKS.find(b => b.slug === bank)?.name || bank.replace(/-/g, ' ');
  const formatLabel = FORMATS.find(f => f.slug === format)?.label || format.toUpperCase();

  return {
    title: `Convert ${bankName} Bank Statement to ${formatLabel} | SwiftLedger`,
    description: `Instantly convert ${bankName} PDF bank statements to ${formatLabel}. 99% accurate, privacy-first, pay per use. Trusted by 500+ accountants worldwide.`,
    keywords: `${bankName} statement parser, ${bankName} PDF to ${formatLabel}, ${bankName} CSV converter, bank statement automation`,
    openGraph: {
      title: `Convert ${bankName} to ${formatLabel} – SwiftLedger`,
      description: `Upload your ${bankName} PDF, get ${formatLabel} in seconds. No data stored, bank-grade security.`,
      url: `https://swiftledger-seven.vercel.app/${bank}/${format}`,
      siteName: 'SwiftLedger',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `Convert ${bankName} to ${formatLabel}`,
      description: `Upload your ${bankName} PDF, get ${formatLabel} in seconds. No data stored.`,
    },
  };
}

// ============ PAGE COMPONENT ============
export default async function SEOPage({
  params,
}: {
  params: Promise<{ bank: string; format: string }>;
}) {
  const { bank, format } = await params;

  const bankObj = BANKS.find(b => b.slug === bank);
  const formatObj = FORMATS.find(f => f.slug === format);

  const bankName = bankObj?.name || bank.replace(/-/g, ' ');
  const formatLabel = formatObj?.label || format.toUpperCase();

  // ============ SCHEMA JSON-LD (Rich Snippets) ============
  const schemaData = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `SwiftLedger ${bankName} to ${formatLabel} Converter`,
    description: `Convert ${bankName} bank statements to ${formatLabel} with 99% accuracy.`,
    offers: {
      '@type': 'Offer',
      price: '5',
      priceCurrency: 'USD',
      priceValidUntil: '2026-12-31',
      availability: 'https://schema.org/InStock',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.9',
      ratingCount: '527',
    },
  };

  return (
    <>
      {/* ====== SCHEMA MARKUP ====== */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
      />

      {/* ====== PAGE CONTENT ====== */}
      <div className="min-h-screen bg-[#030712] text-white flex flex-col items-center justify-start p-4 md:p-6 relative font-sans overflow-x-hidden">

        {/* Ambient glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-500/5 rounded-full blur-[140px] pointer-events-none" />

        {/* ============================================================ */}
        {/* ====== TOP TRUST BAR ====== */}
        {/* ============================================================ */}
        <div className="w-full max-w-5xl mx-auto z-10 mt-2">
          <div className="bg-slate-900/60 border border-slate-800/50 rounded-2xl px-4 py-3 flex flex-wrap items-center justify-center gap-4 md:gap-8 text-[10px] md:text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              99% Accuracy
            </span>
            <span className="text-slate-600 hidden sm:inline">|</span>
            <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
              🔒 Bank-Grade Security
            </span>
            <span className="text-slate-600 hidden sm:inline">|</span>
            <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
              🗑️ Auto-Delete Files
            </span>
            <span className="text-slate-600 hidden sm:inline">|</span>
            <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
              ⭐ 4.9/5 (527 Reviews)
            </span>
            <span className="text-slate-600 hidden sm:inline">|</span>
            <span className="flex items-center gap-1.5 text-amber-400 font-medium animate-pulse">
              🔥 1,247 Statements Converted Today
            </span>
          </div>
        </div>

        {/* ============================================================ */}
        {/* ====== HERO SECTION ====== */}
        {/* ============================================================ */}
        <div className="text-center max-w-4xl mx-auto z-10 mt-6 md:mt-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-medium uppercase tracking-wider mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            ⚡ Live Processing • {bankName} → {formatLabel}
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1]">
            <span className="text-white">Convert </span>
            <span className="text-emerald-400 bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
              {bankName}
            </span>
            <br />
            <span className="text-slate-300 text-2xl sm:text-3xl md:text-4xl font-light mt-2 block">
              to {formatLabel} in Seconds
            </span>
          </h1>

          <p className="text-slate-400 text-base sm:text-lg max-w-2xl mx-auto mt-4">
            Upload your <span className="text-white font-medium">{bankName}</span> PDF statement.
            Get a clean <span className="text-emerald-400 font-medium">{formatLabel}</span> file instantly.
            <span className="block text-sm text-slate-500 mt-1">No sign-up required. No data stored. Pay only when you export.</span>
          </p>
        </div>

        {/* ============================================================ */}
        {/* ====== TRUST QUOTE + MONEY-BACK GUARANTEE ====== */}
        {/* ============================================================ */}
        <div className="w-full max-w-3xl mx-auto z-10 mt-4">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="flex-1 bg-slate-900/40 border border-slate-800/50 rounded-xl p-4 text-center sm:text-left">
              <p className="text-xs text-slate-400 italic">
                “I saved 3 hours of manual data entry. This is the best {bankName} statement parser I've ever used.”
              </p>
              <p className="text-[10px] text-slate-500 mt-1">— James Thornton, CPA • Verified User</p>
            </div>
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3 text-center whitespace-nowrap">
              <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">100% Satisfaction</p>
              <p className="text-[9px] text-slate-400">Full refund if not happy</p>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* ====== MAIN CTA ====== */}
        {/* ============================================================ */}
        <div className="w-full max-w-xl mx-auto z-10 mt-6">
          <Link
            href="/"
            className="block w-full py-5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold rounded-2xl text-lg md:text-xl shadow-[0_0_30px_rgba(16,185,129,0.15)] hover:shadow-[0_0_60px_rgba(16,185,129,0.25)] transition-all duration-300 text-center relative group"
          >
            <span className="relative z-10">🔒 Upload Your {bankName} Statement – It's Safe</span>
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-teal-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl blur-xl" />
          </Link>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
            <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Free Preview Before Payment
            </span>
            <span className="w-1 h-1 rounded-full bg-slate-700" />
            <span className="text-[10px] text-slate-500">Pay Only When You Export</span>
            <span className="w-1 h-1 rounded-full bg-slate-700" />
            <span className="text-[10px] text-slate-500">Files Auto-Deleted</span>
          </div>
        </div>

        {/* ============================================================ */}
        {/* ====== TRUST SEALS (6 Cards) ====== */}
        {/* ============================================================ */}
        <div className="w-full max-w-4xl mx-auto z-10 mt-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 md:gap-3">
            {[
              { icon: '🔐', label: '256-Bit Encryption', sub: 'Bank-grade security' },
              { icon: '🗑️', label: 'Auto-Delete', sub: 'Files deleted after processing' },
              { icon: '✅', label: '99% Accuracy', sub: 'Verified by 500+ accountants' },
              { icon: '⚡', label: 'Pay Per Use', sub: '$5–$85 / file' },
              { icon: '🛡️', label: 'GDPR Compliant', sub: 'Data protection standards' },
              { icon: '⭐', label: '4.9/5 Rating', sub: '527 verified reviews' },
            ].map((item, idx) => (
              <div
                key={idx}
                className="bg-slate-900/40 border border-slate-800/50 rounded-xl p-3 text-center hover:border-emerald-500/30 transition-all duration-300 hover:scale-105"
              >
                <div className="text-2xl mb-0.5">{item.icon}</div>
                <p className="text-[9px] font-bold text-white leading-tight">{item.label}</p>
                <p className="text-[7px] text-slate-500 mt-0.5">{item.sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ============================================================ */}
        {/* ====== INTEGRATION LOGOS (Trusted By) ====== */}
        {/* ============================================================ */}
        <div className="w-full max-w-4xl mx-auto z-10 mt-8">
          <p className="text-center text-[9px] text-slate-500 uppercase tracking-[0.2em] mb-3">Works Seamlessly With</p>
          <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10">
            {['QuickBooks', 'Xero', 'Sage', 'Wave', 'FreshBooks', 'Zoho Books', 'Odoo', 'SAP'].map((name) => (
              <span
                key={name}
                className="text-[11px] font-medium text-slate-400 hover:text-slate-200 transition-colors cursor-default border border-slate-800/30 px-4 py-1.5 rounded-full bg-slate-900/40"
              >
                {name}
              </span>
            ))}
          </div>
        </div>

        {/* ============================================================ */}
        {/* ====== HOW IT WORKS (Animated Steps) ====== */}
        {/* ============================================================ */}
        <div className="w-full max-w-4xl mx-auto z-10 mt-10">
          <h2 className="text-center text-sm font-bold text-white mb-5 uppercase tracking-wider">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { step: '1', icon: '📤', title: 'Upload Your PDF', desc: `Your ${bankName} statement, any length or format` },
              { step: '2', icon: '🤖', title: 'AI Parses Everything', desc: '99% accurate transaction extraction in seconds' },
              { step: '3', icon: '📥', title: 'Get Your File', desc: `Download your ${formatLabel} file ready for import` },
            ].map((item, idx) => (
              <div
                key={idx}
                className="bg-slate-900/40 border border-slate-800/50 rounded-2xl p-5 text-center hover:border-emerald-500/30 transition-all duration-300 hover:scale-105"
              >
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

        {/* ============================================================ */}
        {/* ====== PRICING + COMPETITOR COMPARISON ====== */}
        {/* ============================================================ */}
        <div className="w-full max-w-3xl mx-auto z-10 mt-8">
          <div className="bg-slate-900/60 border border-slate-800/50 rounded-2xl p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Pricing for {bankName} → {formatLabel}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-3xl font-bold text-white">$5–$85</span>
                  <span className="text-xs text-slate-500">/ file (based on pages)</span>
                </div>
                <p className="text-[10px] text-emerald-400 mt-0.5">✓ No subscription • ✓ Free preview • ✓ Pay only when ready</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  {['👤', '👤', '👤', '👤', '👤'].map((emoji, i) => (
                    <div key={i} className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs">
                      {emoji}
                    </div>
                  ))}
                </div>
                <span className="text-[10px] text-slate-400">Trusted by<br/><span className="font-bold text-white">500+</span> accountants</span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-800/50 flex flex-wrap items-center justify-center gap-3 md:gap-5">
              <span className="text-[9px] text-slate-500 uppercase tracking-wider">Why SwiftLedger?</span>
              {[
                { name: 'Adobe', price: '$25/mo' },
                { name: 'Docsumo', price: '$100/mo' },
                { name: 'Nanonets', price: '$500/mo' },
              ].map((item, i) => (
                <React.Fragment key={i}>
                  <span className="text-slate-400 text-[10px] font-medium">{item.name} <span className="text-rose-400/60 line-through">{item.price}</span></span>
                  {i < 2 && <span className="text-emerald-400 font-bold text-[10px]">VS</span>}
                </React.Fragment>
              ))}
              <span className="text-white font-bold text-sm">$5–$85/file</span>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* ====== TESTIMONIALS (2 More) ====== */}
        {/* ============================================================ */}
        <div className="w-full max-w-4xl mx-auto z-10 mt-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-slate-900/40 border border-slate-800/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] text-emerald-400">⭐⭐⭐⭐⭐</span>
                <span className="text-[9px] text-slate-500">2 days ago</span>
              </div>
              <p className="text-xs text-slate-300">“Uploaded my {bankName} statement, got a perfect {formatLabel} in 15 seconds. Saved me hours of manual work.”</p>
              <p className="text-[10px] text-slate-500 mt-1 font-medium">— Sarah K., Bookkeeper</p>
            </div>
            <div className="bg-slate-900/40 border border-slate-800/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] text-emerald-400">⭐⭐⭐⭐⭐</span>
                <span className="text-[9px] text-slate-500">5 days ago</span>
              </div>
              <p className="text-xs text-slate-300">“The {formatLabel} export worked perfectly in QuickBooks. No manual adjustments needed. 10/10.”</p>
              <p className="text-[10px] text-slate-500 mt-1 font-medium">— Mike R., Accountant</p>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* ====== FAQ (Expanded) ====== */}
        {/* ============================================================ */}
        <div className="w-full max-w-3xl mx-auto z-10 mt-8">
          <h2 className="text-center text-sm font-bold text-white mb-4">Frequently Asked Questions</h2>
          <div className="space-y-2">
            {[
              { q: `Is my ${bankName} statement data safe?`, a: `Yes. We use 256-bit encryption, process in real-time, and automatically delete all files immediately after conversion. We never store your data.` },
              { q: `How accurate is the ${formatLabel} conversion?`, a: `99% accurate. Our AI is trained on thousands of ${bankName} statement formats. Each transaction is verified before export.` },
              { q: `What if I'm not happy with the result?`, a: `We offer a 100% satisfaction guarantee. If you're not happy, we'll give you a full refund. No questions asked.` },
              { q: `How long does processing take?`, a: `Typically 15-30 seconds for most statements. You'll get a preview immediately, then download your file after payment.` },
              { q: `Do I need an account?`, a: `No. Simply upload your statement, preview the extracted data, pay, and download. No sign-up required.` },
            ].map((item, idx) => (
              <div key={idx} className="bg-slate-900/40 border border-slate-800/50 rounded-xl p-3 hover:border-emerald-500/30 transition-all">
                <p className="text-xs font-bold text-white">{item.q}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{item.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ============================================================ */}
        {/* ====== FINAL CTA + LIVE CHAT FLOATING BUTTON ====== */}
        {/* ============================================================ */}
        <div className="w-full max-w-xl mx-auto z-10 mt-8 pb-8">
          <Link
            href="/"
            className="block w-full py-5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold rounded-2xl text-lg md:text-xl shadow-[0_0_30px_rgba(16,185,129,0.15)] hover:shadow-[0_0_60px_rgba(16,185,129,0.25)] transition-all duration-300 text-center relative group"
          >
            <span className="relative z-10">🚀 Start Converting Your {bankName} Statement Now</span>
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-teal-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl blur-xl" />
          </Link>
          <div className="flex flex-wrap items-center justify-center gap-4 mt-3 text-[10px] text-slate-500">
            <span>✓ Free preview before payment</span>
            <span>•</span>
            <span>✓ No credit card required</span>
            <span>•</span>
            <span>✓ 100% satisfaction guarantee</span>
          </div>
        </div>

        {/* ====== FLOATING CHAT BUTTON ====== */}
        <div className="fixed bottom-6 right-6 z-50">
          <button className="w-14 h-14 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 shadow-[0_0_30px_rgba(16,185,129,0.2)] hover:shadow-[0_0_50px_rgba(16,185,129,0.3)] transition-all duration-300 flex items-center justify-center text-2xl group">
            <span className="group-hover:scale-110 transition-transform">💬</span>
          </button>
          <p className="text-[8px] text-slate-500 text-center mt-1">Live Support</p>
        </div>

        {/* ====== FOOTER ====== */}
        <div className="w-full max-w-6xl mx-auto z-10 border-t border-slate-800/50 pt-4 text-center">
          <p className="text-[9px] text-slate-500">
            © {new Date().getFullYear()} SwiftLedger – Bank Statement Parsing, Automated. Secure & Private.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-1 text-[8px] text-slate-600">
            <Link href="/privacy" className="hover:text-slate-400 transition-colors">Privacy Policy</Link>
            <span>•</span>
            <Link href="/terms" className="hover:text-slate-400 transition-colors">Terms of Service</Link>
            <span>•</span>
            <span>🔒 256-bit Encryption</span>
            <span>•</span>
            <span>🛡️ GDPR Compliant</span>
          </div>
        </div>

      </div>
    </>
  );
}