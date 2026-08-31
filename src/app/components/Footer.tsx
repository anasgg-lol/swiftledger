'use client';

import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="w-full bg-slate-900/40 border-t border-slate-800/50 py-12 px-6 mt-16">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl font-bold text-white tracking-tight">
                Swift<span className="text-emerald-400">Ledger</span>
              </span>
            </div>
            <p className="text-slate-400 text-sm max-w-xs leading-relaxed">
              Bank statement parsing, automated. Built for accountants, freelancers, and finance professionals.
            </p>
            <div className="flex items-center gap-4 mt-4">
              <span className="text-[10px] text-slate-500">© {new Date().getFullYear()} SwiftLedger</span>
              <span className="text-slate-700">|</span>
              <span className="text-[10px] text-slate-500">Privacy First</span>
              <span className="text-slate-700">|</span>
              <span className="text-[10px] text-slate-500">99% Accuracy</span>
            </div>
          </div>

          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 mb-4">Product</h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="/features" className="text-slate-400 hover:text-emerald-400 transition-colors">Features</Link></li>
              <li><Link href="/pricing" className="text-slate-400 hover:text-emerald-400 transition-colors">Pricing</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 mb-4">Legal</h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="/terms" className="text-slate-400 hover:text-emerald-400 transition-colors">Terms of Service</Link></li>
              <li><Link href="/privacy" className="text-slate-400 hover:text-emerald-400 transition-colors">Privacy Policy</Link></li>
              <li><Link href="/contact" className="text-slate-400 hover:text-emerald-400 transition-colors">Contact</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800/50 mt-8 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-[10px] text-slate-500">Bank statement parsing, automated.</p>
          <div className="flex items-center gap-4 text-[10px] text-slate-500">
            <span>Made with ❤️</span>
          </div>
        </div>
      </div>
    </footer>
  );
}