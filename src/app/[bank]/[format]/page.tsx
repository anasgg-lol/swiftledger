// src/app/[bank]/[format]/page.tsx
import { banks, formats } from '@/app/lib/seo-data';
import Link from 'next/link';
import type { Metadata } from 'next';
import React from 'react';

// ============ GENERATE STATIC PATHS (6,300 pages) ============
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

  return {
    title: `Convert ${bankName} Bank Statement to ${formatLabel} | SwiftLedger`,
    description: `Instantly convert ${bankName} PDF bank statements to ${formatLabel}. 99% accurate, privacy-first, pay per use.`,
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

  return (
    <div className="min-h-screen bg-[#030712] text-white flex flex-col items-center justify-center p-6">
      <div className="text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-medium uppercase tracking-wider mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          ⚡ Live Processing • {bankName} → {formatLabel}
        </div>

        <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
          <span className="text-white">Convert </span>
          <span className="text-emerald-400">{bankName}</span>
          <br />
          <span className="text-slate-300 text-2xl md:text-4xl font-light mt-2 block">
            to {formatLabel} in Seconds
          </span>
        </h1>

        <p className="text-slate-400 text-lg max-w-2xl mx-auto mt-4">
          Upload your <span className="text-white font-medium">{bankName}</span> PDF statement.
          Get a clean <span className="text-emerald-400 font-medium">{formatLabel}</span> file instantly.
        </p>

        <Link
          href="/"
          className="inline-block mt-8 px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold rounded-xl text-lg shadow-[0_0_30px_rgba(16,185,129,0.15)] transition-all"
        >
          🔒 Upload Your {bankName} Statement Now
        </Link>

        <p className="text-xs text-slate-500 mt-4">Free preview • No sign-up • Pay only when you export</p>
      </div>
    </div>
  );
}