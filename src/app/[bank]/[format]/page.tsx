// src/app/[bank]/[format]/page.tsx
import { banks, formats, Bank, Format } from '../../lib/seo-data';

// ---------- Generate all 1,500 pages at build time ----------
export async function generateStaticParams() {
  const paths: { bank: string; format: string }[] = [];
  for (const bank of banks) {
    for (const format of formats) {
      paths.push({ bank: bank.slug, format: format.slug });
    }
  }
  return paths;
}

// ---------- Page component ----------
interface PageParams {
  params: {
    bank: string;
    format: string;
  };
}

export default function SEOPage({ params }: PageParams) {
  // Find the bank and format objects
  const bank = banks.find((b: Bank) => b.slug === params.bank);
  const format = formats.find((f: Format) => f.slug === params.format);

  // Fallback if slug not found (should never happen, but for safety)
  const bankName = bank?.name || params.bank.replace(/-/g, ' ');
  const formatLabel = format?.label || params.format.toUpperCase();

  const title = `Convert ${bankName} Statement to ${formatLabel} | SwiftLedger`;
  const desc = `Instantly convert ${bankName} PDF bank statements to ${formatLabel} (CSV, QBO, OFX). 99% accuracy, pay per use.`;

  return (
    <div className="min-h-screen bg-[#030712] text-white flex flex-col items-center justify-center p-6">
      <h1 className="text-4xl font-bold text-emerald-400">
        Convert {bankName} to {formatLabel}
      </h1>
      <p className="text-slate-400 mt-4 max-w-xl text-center">{desc}</p>
      <a href="/" className="mt-8 px-6 py-3 bg-emerald-500 rounded-xl font-bold hover:bg-emerald-400 transition">
        Try It Free Now
      </a>
    </div>
  );
}