// src/app/[bank]/[format]/page.tsx

// ============ HARDCODED FALLBACK DATA (Guaranteed to build) ============
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

// ============ GENERATE 1,500 PAGES AT BUILD TIME ============
export async function generateStaticParams() {
  console.log(`🔥 BUILDING ${BANKS.length * FORMATS.length} pages...`);
  
  const paths = [];
  for (const bank of BANKS) {
    for (const format of FORMATS) {
      paths.push({ bank: bank.slug, format: format.slug });
    }
  }
  return paths;
}

// If someone visits a page we didn't pre-build (shouldn't happen), generate it on the fly
export const dynamicParams = true;

// ============ NEXT.JS 15 COMPATIBLE - PARAMS IS A PROMISE! ============
export default async function SEOPage({ 
  params 
}: { 
  params: Promise<{ bank: string; format: string }> 
}) {
  // 🔥 AWAIT the params (NEXT.JS 15 FIX)
  const { bank, format } = await params;

  // Find the full names
  const bankName = BANKS.find(b => b.slug === bank)?.name || bank.replace(/-/g, ' ');
  const formatLabel = FORMATS.find(f => f.slug === format)?.label || format.toUpperCase();

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
      <p className="text-xs text-slate-500 mt-8">Bank: {bank} | Format: {format}</p>
    </div>
  );
}