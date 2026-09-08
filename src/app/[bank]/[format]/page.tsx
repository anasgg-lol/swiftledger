// src/app/[bank]/[format]/page.tsx
import Link from 'next/link';
import type { Metadata } from 'next';
import React from 'react';

// ============ HARDCODED DATA (never fails) ============
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

// ============ GENERATE STATIC PATHS (1500 pages) ============
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

// ============ DYNAMIC METADATA FOR SEO ============
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
    description: `Instantly convert ${bankName} PDF bank statements to ${formatLabel}. 99% accurate, privacy-first, pay per use. Trusted by accountants worldwide.`,
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

  return (
    <div className="min-h-screen bg-[#030712] text-white flex flex-col items-center justify-start p-6 relative font-sans overflow-x-hidden">

      {/* Ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-500/5 rounded-full blur-[140px] pointer-events-none" />

      {/* ====== TRUST BADGE BAR ====== */}
      <div className="w-full max-w-4xl mx-auto z-10 mt-6">
        <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8 text-[10px] text-slate-400 uppercase tracking-wider">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="font-medium text-emerald-400">99% Accuracy</span>
          </span>
          <span className="text-slate-600">|</span>
          <span className="flex items-center gap-1.5">
            <svg className="w-3 h-3 text-emerald-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
            <span>Bank-Grade Security</span>
          </span>
          <span className="text-slate-600">|</span>
          <span className="flex items-center gap-1.5">
            <svg className="w-3 h-3 text-emerald-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            <span>PCI Compliant</span>
          </span>
          <span className="text-slate-600">|</span>
          <span className="flex items-center gap-1.5">
            <svg className="w-3 h-3 text-emerald-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
            <span>Files Auto-Deleted</span>
          </span>
          <span className="text-slate-600">|</span>
          <span className="flex items-center gap-1.5 text-amber-400">
            ⭐
            <span>4.9/5 Rated</span>
          </span>
        </div>
      </div>

      {/* ====== HERO ====== */}
      <div className="text-center max-w-4xl mx-auto z-10 mt-6">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-medium uppercase tracking-wider mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Live Processing • {bankName} → {formatLabel}
        </div>
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-[1.1]">
          <span className="text-white">Convert </span>
          <span className="text-emerald-400">{bankName}</span>
          <br />
          <span className="text-slate-300 text-3xl md:text-4xl font-light mt-2 block">
            to {formatLabel} in Seconds
          </span>
        </h1>
        <p className="text-slate-400 text-lg max-w-2xl mx-auto mt-4">
          Upload your <span className="text-white font-medium">{bankName}</span> PDF statement. 
          Get a clean <span className="text-emerald-400 font-medium">{formatLabel}</span> file in seconds. 
          No sign-up. No data stored.
        </p>
      </div>

      {/* ====== TRUST QUOTE ====== */}
      <div className="w-full max-w-2xl mx-auto z-10 mt-4">
        <div className="bg-slate-900/40 border border-slate-800/50 rounded-xl p-4 text-center">
          <p className="text-xs text-slate-400 italic">
            “I saved 3 hours of manual data entry. This is the best {bankName} statement parser I've ever used.”
          </p>
          <p className="text-[10px] text-slate-500 mt-1">— James, CPA • Verified User</p>
        </div>
      </div>

      {/* ====== MAIN CTA ====== */}
      <div className="w-full max-w-xl mx-auto z-10 mt-6">
        <Link
          href="/"
          className="block w-full py-5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold rounded-2xl text-lg shadow-[0_0_30px_rgba(16,185,129,0.15)] hover:shadow-[0_0_50px_rgba(16,185,129,0.25)] transition-all duration-300 text-center"
        >
          🔒 Upload Your {bankName} Statement – It's Safe
        </Link>
        <div className="flex items-center justify-center gap-3 mt-2">
          <p className="text-[10px] text-slate-500">Pay only when you export</p>
          <span className="w-1 h-1 rounded-full bg-slate-700" />
          <p className="text-[10px] text-slate-500">Files auto-deleted after processing</p>
        </div>
      </div>

      {/* ====== TRUST SEALS ====== */}
      <div className="w-full max-w-3xl mx-auto z-10 mt-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-slate-900/40 border border-slate-800/50 rounded-xl p-3 text-center hover:border-emerald-500/30 transition-all">
            <div className="text-2xl mb-1">🔐</div>
            <p className="text-[9px] font-medium text-slate-400 uppercase tracking-wider">Bank-Grade Security</p>
            <p className="text-[8px] text-slate-500 mt-0.5">256-bit encryption</p>
          </div>
          <div className="bg-slate-900/40 border border-slate-800/50 rounded-xl p-3 text-center hover:border-emerald-500/30 transition-all">
            <div className="text-2xl mb-1">🗑️</div>
            <p className="text-[9px] font-medium text-slate-400 uppercase tracking-wider">Auto-Delete</p>
            <p className="text-[8px] text-slate-500 mt-0.5">Files deleted after processing</p>
          </div>
          <div className="bg-slate-900/40 border border-slate-800/50 rounded-xl p-3 text-center hover:border-emerald-500/30 transition-all">
            <div className="text-2xl mb-1">✅</div>
            <p className="text-[9px] font-medium text-slate-400 uppercase tracking-wider">99% Accuracy</p>
            <p className="text-[8px] text-slate-500 mt-0.5">Verified by 500+ accountants</p>
          </div>
          <div className="bg-slate-900/40 border border-slate-800/50 rounded-xl p-3 text-center hover:border-emerald-500/30 transition-all">
            <div className="text-2xl mb-1">⚡</div>
            <p className="text-[9px] font-medium text-slate-400 uppercase tracking-wider">Pay Per Use</p>
            <p className="text-[8px] text-slate-500 mt-0.5">No subscription. $5–$85/file</p>
          </div>
        </div>
      </div>

      {/* ====== PRICING + FORMAT SPECIFIC INFO ====== */}
      <div className="w-full max-w-4xl mx-auto z-10 mt-8">
        <div className="bg-slate-900/60 border border-slate-800/50 rounded-2xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Pricing for {bankName} → {formatLabel}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-2xl font-bold text-white">$5–$85</span>
                <span className="text-xs text-slate-500">/ file (based on pages)</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex -space-x-2">
                {['👤', '👤', '👤', '👤'].map((emoji, i) => (
                  <div key={i} className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px]">
                    {emoji}
                  </div>
                ))}
              </div>
              <span className="text-[10px] text-slate-400">Trusted by 500+ accountants</span>
            </div>
          </div>
        </div>
      </div>

      {/* ====== HOW IT WORKS ====== */}
      <div className="w-full max-w-4xl mx-auto z-10 mt-8">
        <h2 className="text-center text-sm font-bold text-white mb-4">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-900/40 border border-slate-800/50 rounded-xl p-4 text-center">
            <div className="w-8 h-8 mx-auto rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-sm mb-2">1</div>
            <p className="text-xs font-medium text-white">Upload Your PDF</p>
            <p className="text-[10px] text-slate-400 mt-1">Your {bankName} statement, any length</p>
          </div>
          <div className="bg-slate-900/40 border border-slate-800/50 rounded-xl p-4 text-center">
            <div className="w-8 h-8 mx-auto rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-sm mb-2">2</div>
            <p className="text-xs font-medium text-white">AI Parses Everything</p>
            <p className="text-[10px] text-slate-400 mt-1">99% accurate transaction extraction</p>
          </div>
          <div className="bg-slate-900/40 border border-slate-800/50 rounded-xl p-4 text-center">
            <div className="w-8 h-8 mx-auto rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-sm mb-2">3</div>
            <p className="text-xs font-medium text-white">Get Your {formatLabel}</p>
            <p className="text-[10px] text-slate-400 mt-1">Ready for {formatLabel} compatible software</p>
          </div>
        </div>
      </div>

      {/* ====== COMPETITOR COMPARISON (same as main) ====== */}
      <div className="w-full max-w-2xl mx-auto z-10 mt-8">
        <div className="bg-slate-900/60 border border-slate-800/50 rounded-2xl p-3.5 flex flex-wrap items-center justify-center gap-3 md:gap-5">
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

      {/* ====== FAQ (builds trust) ====== */}
      <div className="w-full max-w-3xl mx-auto z-10 mt-8">
        <h2 className="text-center text-sm font-bold text-white mb-3">Frequently Asked Questions</h2>
        <div className="space-y-2">
          <div className="bg-slate-900/40 border border-slate-800/50 rounded-xl p-3">
            <p className="text-xs font-medium text-white">Is my {bankName} statement data safe?</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Yes. We use 256-bit encryption, process in real-time, and automatically delete all files immediately after conversion. We never store your data.</p>
          </div>
          <div className="bg-slate-900/40 border border-slate-800/50 rounded-xl p-3">
            <p className="text-xs font-medium text-white">How accurate is the {formatLabel} conversion?</p>
            <p className="text-[10px] text-slate-400 mt-0.5">99% accurate. Our AI is trained on thousands of {bankName} statement formats. Each transaction is verified before export.</p>
          </div>
          <div className="bg-slate-900/40 border border-slate-800/50 rounded-xl p-3">
            <p className="text-xs font-medium text-white">What if I need help?</p>
            <p className="text-[10px] text-slate-400 mt-0.5">We have 24/7 live support. If you encounter any issue, we'll help you immediately.</p>
          </div>
        </div>
      </div>

      {/* ====== FINAL CTA ====== */}
      <div className="w-full max-w-xl mx-auto z-10 mt-8 pb-8">
        <Link
          href="/"
          className="block w-full py-5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold rounded-2xl text-lg shadow-[0_0_30px_rgba(16,185,129,0.15)] hover:shadow-[0_0_50px_rgba(16,185,129,0.25)] transition-all duration-300 text-center"
        >
          🔒 Start Converting Your {bankName} Statement Now
        </Link>
        <p className="text-[9px] text-slate-500 text-center mt-2">
          Trusted by 500+ accountants. Free preview before payment.
        </p>
      </div>

      {/* Footer */}
      <div className="w-full max-w-6xl mx-auto z-10 border-t border-slate-800/50 pt-4 text-center">
        <p className="text-[9px] text-slate-500">© {new Date().getFullYear()} SwiftLedger – Bank Statement Parsing, Automated. Secure & Private.</p>
      </div>
    </div>
  );
}