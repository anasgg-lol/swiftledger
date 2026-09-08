// src/app/[bank]/[format]/page.tsx
import Link from 'next/link';
import type { Metadata } from 'next';

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

export const dynamicParams = true; // fallback for any missing combos

// ============ DYNAMIC METADATA FOR SEO ============
export async function generateMetadata({
  params,
}: {
  params: Promise<{ bank: string; format: string }>;
}): Promise<Metadata> {
  const { bank, format } = await params;
  const bankName = BANKS.find(b => b.slug === bank)?.name || bank.replace(/-/g, ' ');
  const formatLabel = FORMATS.find(f => f.slug === format)?.label || format.toUpperCase();

  const title = `Convert ${bankName} Bank Statement to ${formatLabel} | SwiftLedger`;
  const description = `Instantly convert ${bankName} PDF bank statements to ${formatLabel} (CSV, QBO, OFX). 99% accuracy, pay per use. Free trial available.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://swiftledger-seven.vercel.app/${bank}/${format}`,
      siteName: 'SwiftLedger',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

// ============ PAGE COMPONENT (Next.js 15 async params) ============
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

  // Build a nice feature list based on the format
  const formatFeatures = {
    csv: 'Clean CSV ready for Excel, Google Sheets, or any spreadsheet.',
    qbo: 'Direct QuickBooks import – no manual data entry.',
    ofx: 'OFX format for Microsoft Money, Quicken, and more.',
    xero: 'Xero Bank Feed ready – reconcile in seconds.',
    excel: 'Full Excel workbook with formulas and pivot tables.',
    quickbooks: 'QuickBooks compatible file with all transactions.',
    sage: 'Sage 50/200 compatible CSV import.',
    wave: 'Wave accounting import format.',
    freshbooks: 'FreshBooks ready transaction list.',
    zoho: 'Zoho Books compatible CSV.',
    kashflow: 'KashFlow import format.',
    freeagent: 'FreeAgent bank feed format.',
    crunch: 'Crunch accounting import.',
    pandle: 'Pandle compatible CSV.',
    'clear-books': 'Clear Books import format.',
    'accounts-portal': 'Accounts Portal ready.',
    vt: 'VT Software import.',
    taxcalc: 'TaxCalc compatible.',
    btc: 'BTCSoftware import.',
    'digital-accountancy': 'Digital Accountancy format.',
    capium: 'Capium import.',
    slickpie: 'SlickPie CSV.',
    manager: 'Manager.io compatible.',
    akaunting: 'Akaunting import.',
    odoo: 'Odoo bank statement format.',
    erpnext: 'ERPNext import.',
    dolibarr: 'Dolibarr compatible.',
    frontaccounting: 'FrontAccounting import.',
    tally: 'Tally ERP import.',
    sap: 'SAP bank statement format.',
  };

  const featureDesc = formatFeatures[format as keyof typeof formatFeatures] || `Convert your ${bankName} statements to ${formatLabel} with one click.`;

  return (
    <div className="min-h-screen bg-[#030712] text-white flex flex-col items-center justify-start p-6 relative font-sans overflow-x-hidden">

      {/* Ambient glow – same as main page */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-500/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="text-center max-w-4xl mx-auto z-10 mt-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-medium uppercase tracking-wider mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          99% Accuracy • {bankName} to {formatLabel}
        </div>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.1]">
          <span className="text-white">Convert </span>
          <span className="text-emerald-400">{bankName}</span>
          <br />
          <span className="text-slate-300 text-3xl md:text-4xl font-light mt-2 block">
            to {formatLabel} in Seconds
          </span>
        </h1>
        <p className="text-slate-400 text-lg max-w-2xl mx-auto mt-4 flex flex-wrap items-center justify-center gap-2">
          <span className="text-emerald-400 font-medium">Better & faster than Adobe</span>
          <span className="text-slate-600">•</span>
          <span className="text-amber-400 font-medium">99% accuracy</span>
          <span className="text-slate-600">•</span>
          <span className="text-slate-300 font-medium">Pay per use</span>
        </p>
      </div>

      {/* Competitor Comparison (same as main) */}
      <div className="w-full max-w-2xl mx-auto z-10 mt-6">
        <div className="bg-slate-900/60 border border-slate-800/50 rounded-2xl p-3.5 flex flex-wrap items-center justify-center gap-3 md:gap-5">
          {[
            { name: 'Adobe', price: '$25/mo' },
            { name: 'Docsumo', price: '$100/mo' },
            { name: 'Nanonets', price: '$500/mo' },
          ].map((item, i) => (
            <React.Fragment key={i}>
              <span className="text-slate-400 text-[11px] font-medium">{item.name} <span className="text-rose-400/60 line-through">{item.price}</span></span>
              {i < 2 && <span className="text-emerald-400 font-bold text-xs">VS</span>}
            </React.Fragment>
          ))}
          <span className="text-white font-bold text-sm ml-1">$5–$85/file</span>
        </div>
      </div>

      {/* Trust Section */}
      <div className="w-full max-w-4xl mx-auto z-10 mt-8">
        <p className="text-center text-[9px] text-slate-500 uppercase tracking-[0.2em] mb-4">Trusted by finance teams at</p>
        <div className="flex flex-wrap items-center justify-center gap-8 md:gap-10">
          {['QuickBooks', 'Xero', 'Sage', 'Wave', 'FreshBooks'].map((name) => (
            <span key={name} className="text-[11px] font-medium text-slate-500 hover:text-slate-300 transition-colors cursor-default">{name}</span>
          ))}
        </div>
      </div>

      {/* Main CTA – big upload button leading to home */}
      <div className="w-full max-w-xl mx-auto z-10 mt-8">
        <Link
          href="/"
          className="block w-full py-6 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold rounded-2xl text-lg shadow-[0_0_30px_rgba(16,185,129,0.15)] hover:shadow-[0_0_50px_rgba(16,185,129,0.25)] transition-all duration-300 text-center"
        >
          🚀 Upload Your {bankName} Statement Now
        </Link>
        <p className="text-xs text-slate-500 text-center mt-3">
          No sign-up required. Pay only when you export.
        </p>
      </div>

      {/* Feature Cards – 3 key benefits tailored to this format */}
      <div className="w-full max-w-4xl mx-auto z-10 mt-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-900/60 border border-slate-800/60 rounded-2xl p-5 text-center hover:border-emerald-500/30 transition-all">
            <div className="text-emerald-400 text-3xl mb-2">📄</div>
            <h3 className="text-sm font-bold text-white">Accurate Extraction</h3>
            <p className="text-xs text-slate-400 mt-1">All transactions from your {bankName} PDF, correctly parsed.</p>
          </div>
          <div className="bg-slate-900/60 border border-slate-800/60 rounded-2xl p-5 text-center hover:border-emerald-500/30 transition-all">
            <div className="text-emerald-400 text-3xl mb-2">⚡</div>
            <h3 className="text-sm font-bold text-white">{formatLabel} in Seconds</h3>
            <p className="text-xs text-slate-400 mt-1">{featureDesc}</p>
          </div>
          <div className="bg-slate-900/60 border border-slate-800/60 rounded-2xl p-5 text-center hover:border-emerald-500/30 transition-all">
            <div className="text-emerald-400 text-3xl mb-2">🔒</div>
            <h3 className="text-sm font-bold text-white">Privacy First</h3>
            <p className="text-xs text-slate-400 mt-1">Your files are processed and immediately discarded. We never store data.</p>
          </div>
        </div>
      </div>

      {/* Small footer note – same style as main */}
      <div className="w-full max-w-6xl mx-auto mt-16 z-10 border-t border-slate-800/50 pt-6 text-center">
        <p className="text-[10px] text-slate-500">© {new Date().getFullYear()} SwiftLedger – Bank Statement Parsing, Automated.</p>
      </div>
    </div>
  );
}

// Need to import React for fragments
import React from 'react';