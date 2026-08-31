import Link from 'next/link';
import Footer from '../components/Footer';

export default function FeaturesPage() {
  const features = [
    {
      icon: ( <svg className="w-8 h-8 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/><circle cx="12" cy="12" r="3"/><path d="M12 9v3l2 1"/></svg> ),
      title: 'AI-Powered Extraction',
      description: 'Our proprietary OCR engine accurately extracts every transaction from your bank statements, even from scanned PDFs and images.',
    },
    {
      icon: ( <svg className="w-8 h-8 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M8 13h8"/><path d="M8 17h6"/><path d="M8 9h2"/></svg> ),
      title: 'Clean CSV Export',
      description: 'Get a perfectly formatted CSV file ready for Excel, Google Sheets, QuickBooks, Xero, or any accounting software.',
    },
    {
      icon: ( <svg className="w-8 h-8 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/><circle cx="12" cy="16" r="1.5" fill="currentColor"/></svg> ),
      title: 'Privacy First',
      description: 'Your documents are processed in real-time and immediately discarded. We never store your financial data.',
    },
    {
      icon: ( <svg className="w-8 h-8 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M12 18v-4"/><path d="M8 18v-2"/><path d="M16 18v-6"/><rect x="9" y="14" width="6" height="4" rx="0.5"/></svg> ),
      title: 'Multi-Page Support',
      description: 'Upload statements of any length. We accurately detect page counts and handle large PDFs with ease.',
    },
    {
      icon: ( <svg className="w-8 h-8 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg> ),
      title: 'Transaction Categorization',
      description: 'Automatically identifies transaction types: Card Payments, Direct Debits, Bank Credits, Cashpoints, and Standing Orders.',
    },
    {
      icon: ( <svg className="w-8 h-8 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/><circle cx="12" cy="12" r="2" fill="currentColor"/></svg> ),
      title: 'Blazing Fast',
      description: 'Get your CSV in seconds. No waiting, no manual data entry, no errors.',
    },
    {
      icon: ( <svg className="w-8 h-8 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M8 12h8"/><path d="M8 8h4"/><path d="M8 16h6"/><circle cx="18" cy="10" r="1" fill="currentColor"/><circle cx="18" cy="14" r="1" fill="currentColor"/></svg> ),
      title: 'Multiple Formats',
      description: 'Support for PDF, PNG, and JPG files. Works with any bank statement, from any bank.',
    },
    {
      icon: ( <svg className="w-8 h-8 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 12v-2a5 5 0 00-5-5H8a5 5 0 00-5 5v2"/><circle cx="12" cy="16" r="5"/><path d="M12 11v5"/><path d="M9 14l3-3 3 3"/><circle cx="12" cy="13" r="1" fill="currentColor"/></svg> ),
      title: 'Accounting Ready',
      description: 'Clean, structured data that imports directly into QuickBooks, Xero, and other accounting platforms.',
    },
    {
      icon: ( <svg className="w-8 h-8 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l-.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg> ),
      title: 'Works Everywhere',
      description: '100% browser-based. No installation required. Access your parsed statements from any device.',
    },
  ];

  return (
    <main className="min-h-screen bg-[#030712] text-white flex flex-col">
      <section className="pt-24 pb-16 px-6 text-center border-b border-slate-800/50">
        <div className="max-w-4xl mx-auto animate-fade-up">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-medium uppercase tracking-wider mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Features
          </div>
          <h1 className="text-5xl font-bold tracking-tight">
            <span className="text-white">Everything You Need to</span>
            <br />
            <span className="text-emerald-400">Automate Statement Parsing</span>
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto mt-4">
            SwiftLedger turns messy bank statements into clean, actionable data. Built for accountants, freelancers, and finance teams.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link href="/" className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold rounded-xl text-sm shadow-[0_0_30px_rgba(16,185,129,0.15)] hover:shadow-[0_0_50px_rgba(16,185,129,0.25)] transition-all duration-300">
              Get Started
            </Link>
            <Link href="/pricing" className="px-6 py-3 bg-slate-800/80 border border-slate-700 text-slate-300 font-bold rounded-xl text-sm hover:border-emerald-500/30 hover:text-white transition-all duration-300">
              View Pricing
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16 px-6 flex-1">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-slate-900/60 border border-slate-800/60 rounded-2xl p-6 hover:border-emerald-500/30 hover:bg-slate-900/80 transition-all duration-300 hover:translate-y-[-2px]"
              >
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-6 border-t border-slate-800/50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to <span className="text-emerald-400">Simplify</span> Your Statement Processing?
          </h2>
          <p className="text-slate-400 mb-8">Start parsing your bank statements today. No free credits needed – just pure value.</p>
          <Link href="/" className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold rounded-xl text-sm shadow-[0_0_30px_rgba(16,185,129,0.15)] hover:shadow-[0_0_50px_rgba(16,185,129,0.25)] transition-all duration-300">
            Try It Now
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}