'use client';

import Link from 'next/link';
import Footer from '../components/Footer';

export default function PricingPage() {
  const tiers = [
    { range: '1–5 pages', price: '$5', label: 'Freelancer Impulse', badge: '🎟️', desc: 'Perfect for personal statements.' },
    { range: '6–20 pages', price: '$25', label: 'Standard Business', badge: '📁', desc: 'Most common for SMEs.' },
    { range: '21–50 pages', price: '$45', label: 'Premium Corporate', badge: '💼', desc: 'Heavy month-end statements.' },
    { range: '51+ pages', price: '$85', label: 'Enterprise Year-End', badge: '🏢', desc: 'Annual reports, audits.' },
  ];

  return (
    <main className="min-h-screen bg-[#030712] text-white flex flex-col">
      <section className="pt-24 pb-12 px-6 text-center border-b border-slate-800/50">
        <div className="max-w-4xl mx-auto animate-fade-up">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-medium uppercase tracking-wider mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Fair & Transparent
          </div>
          <h1 className="text-5xl font-bold tracking-tight">
            <span className="text-white">Pay Per Use,</span>
            <br />
            <span className="text-emerald-400">No Subscription</span>
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto mt-4">
            You only pay when you need to parse a statement. No monthly fees, no commitments.
          </p>
        </div>
      </section>

      <section className="py-16 px-6 flex-1">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {tiers.map((tier, i) => (
              <div
                key={i}
                className="bg-slate-900/60 border border-slate-800/60 rounded-2xl p-6 text-center hover:border-emerald-500/30 hover:bg-slate-900/80 transition-all duration-300 hover:translate-y-[-2px]"
              >
                <div className="text-3xl mb-2">{tier.badge}</div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">{tier.range}</p>
                <p className="text-3xl font-bold text-white mt-1">{tier.price}</p>
                <p className="text-sm font-semibold text-emerald-400">{tier.label}</p>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">{tier.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <p className="text-xs text-slate-500 max-w-xl mx-auto">
              No free pages. No hidden fees. Start with a free preview, then pay only when you export.
            </p>
            <Link
              href="/"
              className="inline-block mt-5 px-8 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold rounded-xl text-sm shadow-[0_0_30px_rgba(16,185,129,0.15)] hover:shadow-[0_0_50px_rgba(16,185,129,0.25)] transition-all duration-300"
            >
              Try It Now
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}