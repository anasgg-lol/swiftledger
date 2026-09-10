// src/app/all-pages/page.tsx
import Link from 'next/link';
import type { Metadata } from 'next';
import { banks, formats } from '@/app/lib/seo-data';

export const metadata: Metadata = {
  title: 'All Bank Statement Converters | SwiftLedger',
  description: `Browse all ${banks.length * formats.length}+ bank statement conversion pages. Convert any bank statement to CSV, QBO, OFX, Xero and more.`,
};

export default function AllPagesHub() {
  const total = banks.length * formats.length;

  return (
    <main className="min-h-screen bg-[#030712] text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-medium uppercase tracking-wider mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Directory
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            All Bank Statement <span className="text-emerald-400">Converters</span>
          </h1>
          <p className="text-slate-400 mt-3">
            {banks.length} banks × {formats.length} formats = <span className="text-emerald-400 font-bold">{total.toLocaleString()}</span> conversion pages
          </p>
          <Link
            href="/"
            className="inline-block mt-6 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold rounded-xl text-sm transition-all"
          >
            ← Back to SwiftLedger
          </Link>
        </div>

        {/* Banks List */}
        <div className="space-y-8">
          {banks.map((bank) => (
            <section key={bank.slug} className="bg-slate-900/40 border border-slate-800/50 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800/50">
                <h2 className="text-lg font-bold text-white">
                  {bank.name}
                  <span className="ml-2 text-[10px] text-slate-500 font-normal">
                    {bank.country} • {bank.type}
                  </span>
                </h2>
                <span className="text-[10px] text-slate-500">{formats.length} formats</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {formats.map((format) => (
                  <Link
                    key={`${bank.slug}-${format.slug}`}
                    href={`/${bank.slug}/${format.slug}`}
                    className="text-[10px] text-slate-400 hover:text-emerald-400 bg-slate-800/60 px-3 py-1.5 rounded-full border border-slate-700/50 hover:border-emerald-500/30 transition-all"
                  >
                    {bank.name} → {format.label}
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-slate-800/50 text-center">
          <p className="text-[10px] text-slate-500">
            © {new Date().getFullYear()} SwiftLedger — Bank Statement Parsing, Automated.
          </p>
        </div>
      </div>
    </main>
  );
}