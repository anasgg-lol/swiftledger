// src/app/lib/seo-data.ts

export interface Bank {
  name: string;
  slug: string;
}

export interface Format {
  label: string;
  slug: string;
}

// ==================== 50 BANKS ====================
export const banks: Bank[] = [
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
  { name: 'Sberbank', slug: 'sberbank' }, // and many more... feel free to add yours
];

// ==================== 30 FORMATS ====================
export const formats: Format[] = [
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