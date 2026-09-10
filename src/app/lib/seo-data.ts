// src/app/lib/seo-data.ts

export interface Bank {
  name: string;
  slug: string;
  country?: string;
  type?: string;
}

export interface Format {
  label: string;
  slug: string;
  type: 'native' | 'compatible';
  description: string;
  software?: string;
}

// ============================================================
// 🏦 200+ BANKS — ALL CONTINENTS
// ============================================================
export const banks: Bank[] = [
  // ==================== USA (35) ====================
  { name: 'Chase', slug: 'chase', country: 'USA', type: 'National' },
  { name: 'Bank of America', slug: 'bank-of-america', country: 'USA', type: 'National' },
  { name: 'Wells Fargo', slug: 'wells-fargo', country: 'USA', type: 'National' },
  { name: 'Citibank', slug: 'citibank', country: 'USA', type: 'National' },
  { name: 'Capital One', slug: 'capital-one', country: 'USA', type: 'National' },
  { name: 'PNC Bank', slug: 'pnc', country: 'USA', type: 'National' },
  { name: 'TD Bank', slug: 'td-bank', country: 'USA', type: 'National' },
  { name: 'US Bank', slug: 'us-bank', country: 'USA', type: 'National' },
  { name: 'Truist', slug: 'truist', country: 'USA', type: 'National' },
  { name: 'Fifth Third Bank', slug: 'fifth-third', country: 'USA', type: 'Regional' },
  { name: 'Regions Bank', slug: 'regions', country: 'USA', type: 'Regional' },
  { name: 'KeyBank', slug: 'keybank', country: 'USA', type: 'Regional' },
  { name: 'M&T Bank', slug: 'mt-bank', country: 'USA', type: 'Regional' },
  { name: 'Huntington Bank', slug: 'huntington', country: 'USA', type: 'Regional' },
  { name: 'BMO Harris', slug: 'bmo-harris', country: 'USA', type: 'Regional' },
  { name: 'Navy Federal Credit Union', slug: 'navy-federal', country: 'USA', type: 'Credit Union' },
  { name: 'PenFed Credit Union', slug: 'penfed', country: 'USA', type: 'Credit Union' },
  { name: 'Ally Bank', slug: 'ally', country: 'USA', type: 'Online' },
  { name: 'Discover Bank', slug: 'discover', country: 'USA', type: 'Online' },
  { name: 'Synchrony Bank', slug: 'synchrony', country: 'USA', type: 'Online' },
  { name: 'SoFi', slug: 'sofi', country: 'USA', type: 'Neobank' },
  { name: 'Chime', slug: 'chime', country: 'USA', type: 'Neobank' },
  { name: 'Varo Bank', slug: 'varo', country: 'USA', type: 'Neobank' },
  { name: 'Current', slug: 'current', country: 'USA', type: 'Neobank' },
  { name: 'Goldman Sachs', slug: 'goldman-sachs', country: 'USA', type: 'Investment' },
  { name: 'Morgan Stanley', slug: 'morgan-stanley', country: 'USA', type: 'Investment' },
  { name: 'Charles Schwab', slug: 'schwab', country: 'USA', type: 'Investment' },
  { name: 'Fidelity', slug: 'fidelity', country: 'USA', type: 'Investment' },
  { name: 'Robinhood', slug: 'robinhood', country: 'USA', type: 'Investment' },
  { name: 'Wealthfront', slug: 'wealthfront', country: 'USA', type: 'Investment' },
  { name: 'Betterment', slug: 'betterment', country: 'USA', type: 'Investment' },
  { name: 'American Express', slug: 'amex', country: 'USA', type: 'Credit Card' },
  { name: 'Discover Card', slug: 'discover-card', country: 'USA', type: 'Credit Card' },
  { name: 'Visa', slug: 'visa', country: 'USA', type: 'Credit Card' },
  { name: 'Mastercard', slug: 'mastercard', country: 'USA', type: 'Credit Card' },

  // ==================== UK (20) ====================
  { name: 'Barclays', slug: 'barclays', country: 'UK', type: 'National' },
  { name: 'HSBC UK', slug: 'hsbc', country: 'UK', type: 'International' },
  { name: 'Lloyds Bank', slug: 'lloyds', country: 'UK', type: 'National' },
  { name: 'NatWest', slug: 'natwest', country: 'UK', type: 'National' },
  { name: 'Halifax', slug: 'halifax', country: 'UK', type: 'National' },
  { name: 'Nationwide', slug: 'nationwide', country: 'UK', type: 'Building Society' },
  { name: 'Santander UK', slug: 'santander-uk', country: 'UK', type: 'National' },
  { name: 'Royal Bank of Scotland', slug: 'rbs', country: 'UK', type: 'National' },
  { name: 'Ulster Bank', slug: 'ulster', country: 'UK', type: 'Regional' },
  { name: 'Metro Bank', slug: 'metro-bank', country: 'UK', type: 'National' },
  { name: 'TSB Bank', slug: 'tsb', country: 'UK', type: 'National' },
  { name: 'Co-operative Bank', slug: 'coop-bank', country: 'UK', type: 'National' },
  { name: 'Monzo', slug: 'monzo', country: 'UK', type: 'Neobank' },
  { name: 'Starling Bank', slug: 'starling', country: 'UK', type: 'Neobank' },
  { name: 'Revolut', slug: 'revolut', country: 'UK', type: 'Neobank' },
  { name: 'Wise', slug: 'wise', country: 'UK', type: 'Neobank' },
  { name: 'Monese', slug: 'monese', country: 'UK', type: 'Neobank' },
  { name: 'Zopa', slug: 'zopa', country: 'UK', type: 'Fintech' },
  { name: 'Atom Bank', slug: 'atom-bank', country: 'UK', type: 'Neobank' },
  { name: 'Tandem Bank', slug: 'tandem', country: 'UK', type: 'Neobank' },

  // ==================== CANADA (8) ====================
  { name: 'RBC Royal Bank', slug: 'rbc', country: 'Canada', type: 'National' },
  { name: 'TD Canada Trust', slug: 'td-canada', country: 'Canada', type: 'National' },
  { name: 'Scotiabank', slug: 'scotiabank', country: 'Canada', type: 'National' },
  { name: 'BMO Canada', slug: 'bmo-canada', country: 'Canada', type: 'National' },
  { name: 'CIBC', slug: 'cibc', country: 'Canada', type: 'National' },
  { name: 'National Bank of Canada', slug: 'national-bank-canada', country: 'Canada', type: 'National' },
  { name: 'Desjardins', slug: 'desjardins', country: 'Canada', type: 'Credit Union' },
  { name: 'Tangerine', slug: 'tangerine', country: 'Canada', type: 'Online' },

  // ==================== AUSTRALIA / NZ (8) ====================
  { name: 'Commonwealth Bank', slug: 'commonwealth-bank', country: 'Australia', type: 'National' },
  { name: 'Westpac', slug: 'westpac', country: 'Australia', type: 'National' },
  { name: 'ANZ', slug: 'anz', country: 'Australia', type: 'National' },
  { name: 'NAB', slug: 'nab', country: 'Australia', type: 'National' },
  { name: 'Macquarie Bank', slug: 'macquarie', country: 'Australia', type: 'Investment' },
  { name: 'ASB Bank', slug: 'asb', country: 'New Zealand', type: 'National' },
  { name: 'BNZ', slug: 'bnz', country: 'New Zealand', type: 'National' },
  { name: 'Kiwibank', slug: 'kiwibank', country: 'New Zealand', type: 'National' },

  // ==================== EUROPE (30) ====================
  { name: 'BNP Paribas', slug: 'bnp-paribas', country: 'France', type: 'International' },
  { name: 'Crédit Agricole', slug: 'credit-agricole', country: 'France', type: 'National' },
  { name: 'Société Générale', slug: 'societe-generale', country: 'France', type: 'National' },
  { name: 'Deutsche Bank', slug: 'deutsche-bank', country: 'Germany', type: 'International' },
  { name: 'Commerzbank', slug: 'commerzbank', country: 'Germany', type: 'National' },
  { name: 'N26', slug: 'n26', country: 'Germany', type: 'Neobank' },
  { name: 'ING', slug: 'ing', country: 'Netherlands', type: 'International' },
  { name: 'ABN AMRO', slug: 'abn-amro', country: 'Netherlands', type: 'National' },
  { name: 'Rabobank', slug: 'rabobank', country: 'Netherlands', type: 'National' },
  { name: 'Bunq', slug: 'bunq', country: 'Netherlands', type: 'Neobank' },
  { name: 'BBVA', slug: 'bbva', country: 'Spain', type: 'International' },
  { name: 'Santander', slug: 'santander', country: 'Spain', type: 'International' },
  { name: 'CaixaBank', slug: 'caixabank', country: 'Spain', type: 'National' },
  { name: 'UniCredit', slug: 'unicredit', country: 'Italy', type: 'International' },
  { name: 'Intesa Sanpaolo', slug: 'intesa', country: 'Italy', type: 'National' },
  { name: 'Nordea', slug: 'nordea', country: 'Sweden', type: 'International' },
  { name: 'Swedbank', slug: 'swedbank', country: 'Sweden', type: 'National' },
  { name: 'SEB', slug: 'seb', country: 'Sweden', type: 'National' },
  { name: 'Danske Bank', slug: 'danske', country: 'Denmark', type: 'International' },
  { name: 'UBS', slug: 'ubs', country: 'Switzerland', type: 'International' },
  { name: 'Credit Suisse', slug: 'credit-suisse', country: 'Switzerland', type: 'International' },
  { name: 'Raiffeisen Bank', slug: 'raiffeisen', country: 'Austria', type: 'National' },
  { name: 'Erste Bank', slug: 'erste', country: 'Austria', type: 'National' },
  { name: 'Millennium BCP', slug: 'millennium-bcp', country: 'Portugal', type: 'National' },
  { name: 'Novo Banco', slug: 'novo-banco', country: 'Portugal', type: 'National' },
  { name: 'Bank of Ireland', slug: 'bank-of-ireland', country: 'Ireland', type: 'National' },
  { name: 'AIB', slug: 'aib', country: 'Ireland', type: 'National' },
  { name: 'Permanent TSB', slug: 'permanent-tsb', country: 'Ireland', type: 'National' },
  { name: 'KBC Bank', slug: 'kbc', country: 'Belgium', type: 'National' },
  { name: 'Belfius', slug: 'belfius', country: 'Belgium', type: 'National' },

  // ==================== ASIA (30) ====================
  { name: 'DBS Bank', slug: 'dbs', country: 'Singapore', type: 'International' },
  { name: 'OCBC Bank', slug: 'ocbc', country: 'Singapore', type: 'National' },
  { name: 'UOB', slug: 'uob', country: 'Singapore', type: 'National' },
  { name: 'Standard Chartered', slug: 'standard-chartered', country: 'Singapore', type: 'International' },
  { name: 'Mizuho Bank', slug: 'mizuho', country: 'Japan', type: 'International' },
  { name: 'SMBC', slug: 'smbc', country: 'Japan', type: 'International' },
  { name: 'MUFG', slug: 'mufg', country: 'Japan', type: 'International' },
  { name: 'Japan Post Bank', slug: 'japan-post', country: 'Japan', type: 'National' },
  { name: 'ICBC', slug: 'icbc', country: 'China', type: 'International' },
  { name: 'China Construction Bank', slug: 'ccb', country: 'China', type: 'International' },
  { name: 'Bank of China', slug: 'bank-of-china', country: 'China', type: 'International' },
  { name: 'Agricultural Bank of China', slug: 'abc-china', country: 'China', type: 'International' },
  { name: 'HDFC Bank', slug: 'hdfc', country: 'India', type: 'National' },
  { name: 'ICICI Bank', slug: 'icici', country: 'India', type: 'National' },
  { name: 'State Bank of India', slug: 'sbi', country: 'India', type: 'National' },
  { name: 'Axis Bank', slug: 'axis', country: 'India', type: 'National' },
  { name: 'Kotak Mahindra', slug: 'kotak', country: 'India', type: 'National' },
  { name: 'KB Kookmin Bank', slug: 'kb-kookmin', country: 'South Korea', type: 'National' },
  { name: 'Shinhan Bank', slug: 'shinhan', country: 'South Korea', type: 'National' },
  { name: 'Hana Bank', slug: 'hana', country: 'South Korea', type: 'National' },
  { name: 'Bangkok Bank', slug: 'bangkok-bank', country: 'Thailand', type: 'National' },
  { name: 'Kasikornbank', slug: 'kasikornbank', country: 'Thailand', type: 'National' },
  { name: 'Maybank', slug: 'maybank', country: 'Malaysia', type: 'National' },
  { name: 'CIMB Bank', slug: 'cimb', country: 'Malaysia', type: 'National' },
  { name: 'Public Bank', slug: 'public-bank', country: 'Malaysia', type: 'National' },
  { name: 'Bank Central Asia', slug: 'bca', country: 'Indonesia', type: 'National' },
  { name: 'Bank Mandiri', slug: 'mandiri', country: 'Indonesia', type: 'National' },
  { name: 'BDO Unibank', slug: 'bdo', country: 'Philippines', type: 'National' },
  { name: 'Metrobank', slug: 'metrobank', country: 'Philippines', type: 'National' },
  { name: 'Vietcombank', slug: 'vietcombank', country: 'Vietnam', type: 'National' },

  // ==================== MIDDLE EAST (15) ====================
  { name: 'Emirates NBD', slug: 'emirates-nbd', country: 'UAE', type: 'National' },
  { name: 'ADCB', slug: 'adcb', country: 'UAE', type: 'National' },
  { name: 'Mashreq Bank', slug: 'mashreq', country: 'UAE', type: 'National' },
  { name: 'First Abu Dhabi Bank', slug: 'fab', country: 'UAE', type: 'National' },
  { name: 'QNB', slug: 'qnb', country: 'Qatar', type: 'National' },
  { name: 'Al Rajhi Bank', slug: 'al-rajhi', country: 'Saudi Arabia', type: 'National' },
  { name: 'Saudi National Bank', slug: 'snb', country: 'Saudi Arabia', type: 'National' },
  { name: 'Riyad Bank', slug: 'riyad', country: 'Saudi Arabia', type: 'National' },
  { name: 'Kuwait Finance House', slug: 'kfh', country: 'Kuwait', type: 'National' },
  { name: 'Bank Muscat', slug: 'bank-muscat', country: 'Oman', type: 'National' },
  { name: 'Bank Hapoalim', slug: 'hapoalim', country: 'Israel', type: 'National' },
  { name: 'Bank Leumi', slug: 'leumi', country: 'Israel', type: 'National' },
  { name: 'Ziraat Bank', slug: 'ziraat', country: 'Turkey', type: 'National' },
  { name: 'Isbank', slug: 'isbank', country: 'Turkey', type: 'National' },
  { name: 'Garanti BBVA', slug: 'garanti', country: 'Turkey', type: 'National' },

  // ==================== AFRICA (12) ====================
  { name: 'Standard Bank', slug: 'standard-bank', country: 'South Africa', type: 'International' },
  { name: 'First National Bank', slug: 'fnb', country: 'South Africa', type: 'National' },
  { name: 'ABSA', slug: 'absa', country: 'South Africa', type: 'National' },
  { name: 'Nedbank', slug: 'nedbank', country: 'South Africa', type: 'National' },
  { name: 'Capitec Bank', slug: 'capitec', country: 'South Africa', type: 'National' },
  { name: 'Commercial International Bank', slug: 'cib-egypt', country: 'Egypt', type: 'National' },
  { name: 'Banque Misr', slug: 'banque-misr', country: 'Egypt', type: 'National' },
  { name: 'GTBank', slug: 'gtbank', country: 'Nigeria', type: 'National' },
  { name: 'Zenith Bank', slug: 'zenith', country: 'Nigeria', type: 'National' },
  { name: 'Access Bank', slug: 'access-bank', country: 'Nigeria', type: 'National' },
  { name: 'Equity Bank', slug: 'equity-bank', country: 'Kenya', type: 'National' },
  { name: 'KCB Bank', slug: 'kcb', country: 'Kenya', type: 'National' },

  // ==================== LATIN AMERICA (12) ====================
  { name: 'Itaú', slug: 'itau', country: 'Brazil', type: 'International' },
  { name: 'Banco do Brasil', slug: 'banco-do-brasil', country: 'Brazil', type: 'National' },
  { name: 'Bradesco', slug: 'bradesco', country: 'Brazil', type: 'National' },
  { name: 'Santander Brasil', slug: 'santander-brasil', country: 'Brazil', type: 'International' },
  { name: 'Nubank', slug: 'nubank', country: 'Brazil', type: 'Neobank' },
  { name: 'Banco de Chile', slug: 'banco-de-chile', country: 'Chile', type: 'National' },
  { name: 'BancoEstado', slug: 'bancoestado', country: 'Chile', type: 'National' },
  { name: 'Bancolombia', slug: 'bancolombia', country: 'Colombia', type: 'National' },
  { name: 'BBVA México', slug: 'bbva-mexico', country: 'Mexico', type: 'International' },
  { name: 'Banorte', slug: 'banorte', country: 'Mexico', type: 'National' },
  { name: 'Banco de México', slug: 'banco-de-mexico', country: 'Mexico', type: 'National' },
  { name: 'Banco Galicia', slug: 'galicia', country: 'Argentina', type: 'National' },

  // ==================== FINTECH / NEOBANKS (15) ====================
  { name: 'PayPal', slug: 'paypal', country: 'Global', type: 'Fintech' },
  { name: 'Stripe', slug: 'stripe', country: 'Global', type: 'Fintech' },
  { name: 'Square', slug: 'square', country: 'Global', type: 'Fintech' },
  { name: 'Venmo', slug: 'venmo', country: 'USA', type: 'Fintech' },
  { name: 'Payoneer', slug: 'payoneer', country: 'Global', type: 'Fintech' },
  { name: 'Klarna', slug: 'klarna', country: 'Sweden', type: 'Fintech' },
  { name: 'Affirm', slug: 'affirm', country: 'USA', type: 'Fintech' },
  { name: 'Afterpay', slug: 'afterpay', country: 'Australia', type: 'Fintech' },
  { name: 'Clearpay', slug: 'clearpay', country: 'UK', type: 'Fintech' },
  { name: 'Coinbase', slug: 'coinbase', country: 'USA', type: 'Crypto' },
  { name: 'Binance', slug: 'binance', country: 'Global', type: 'Crypto' },
  { name: 'Kraken', slug: 'kraken', country: 'USA', type: 'Crypto' },
  { name: 'Gemini', slug: 'gemini', country: 'USA', type: 'Crypto' },
  { name: 'Crypto.com', slug: 'crypto-com', country: 'Singapore', type: 'Crypto' },
  { name: 'Bitpanda', slug: 'bitpanda', country: 'Austria', type: 'Crypto' },
];

// ============================================================
// 📄 20 FORMATS — 4 NATIVE + 16 COMPATIBLE
// ============================================================
export const formats: Format[] = [
  // ===== NATIVE (Real files your tool exports) =====
  { label: 'CSV', slug: 'csv', type: 'native', description: 'Universal CSV format', software: 'Any spreadsheet' },
  { label: 'Xero CSV', slug: 'xero', type: 'native', description: 'Xero bank feed import', software: 'Xero' },
  { label: 'QBO', slug: 'qbo', type: 'native', description: 'QuickBooks format', software: 'QuickBooks' },
  { label: 'OFX', slug: 'ofx', type: 'native', description: 'Open Financial Exchange', software: 'Quicken' },

  // ===== COMPATIBLE (CSV that imports into these tools) =====
  { label: 'Excel', slug: 'excel', type: 'compatible', description: 'Opens directly in Microsoft Excel', software: 'Microsoft Excel' },
  { label: 'Google Sheets', slug: 'google-sheets', type: 'compatible', description: 'Imports into Google Sheets', software: 'Google Sheets' },
  { label: 'QuickBooks Online', slug: 'quickbooks-online', type: 'compatible', description: 'CSV for QBO import', software: 'QuickBooks Online' },
  { label: 'Sage', slug: 'sage', type: 'compatible', description: 'CSV for Sage import', software: 'Sage' },
  { label: 'Wave', slug: 'wave', type: 'compatible', description: 'CSV for Wave import', software: 'Wave Accounting' },
  { label: 'FreshBooks', slug: 'freshbooks', type: 'compatible', description: 'CSV for FreshBooks import', software: 'FreshBooks' },
  { label: 'Zoho Books', slug: 'zoho', type: 'compatible', description: 'CSV for Zoho Books import', software: 'Zoho Books' },
  { label: 'FreeAgent', slug: 'freeagent', type: 'compatible', description: 'CSV for FreeAgent import', software: 'FreeAgent' },
  { label: 'KashFlow', slug: 'kashflow', type: 'compatible', description: 'CSV for KashFlow import', software: 'KashFlow' },
  { label: 'Crunch', slug: 'crunch', type: 'compatible', description: 'CSV for Crunch import', software: 'Crunch' },
  { label: 'Pandle', slug: 'pandle', type: 'compatible', description: 'CSV for Pandle import', software: 'Pandle' },
  { label: 'Clear Books', slug: 'clear-books', type: 'compatible', description: 'CSV for Clear Books import', software: 'Clear Books' },
  { label: 'Odoo', slug: 'odoo', type: 'compatible', description: 'CSV for Odoo import', software: 'Odoo' },
  { label: 'Akaunting', slug: 'akaunting', type: 'compatible', description: 'CSV for Akaunting import', software: 'Akaunting' },
  { label: 'Manager', slug: 'manager', type: 'compatible', description: 'CSV for Manager import', software: 'Manager.io' },
  { label: 'Tally', slug: 'tally', type: 'compatible', description: 'CSV for Tally import', software: 'Tally ERP' },
];

// ============================================================
// 🚀 HELPERS
// ============================================================
export function getAllPagePaths() {
  const paths: { bank: string; format: string }[] = [];
  for (const bank of banks) {
    for (const format of formats) {
      paths.push({ bank: bank.slug, format: format.slug });
    }
  }
  return paths;
}

export function getBank(slug: string): Bank | undefined {
  return banks.find(b => b.slug === slug);
}

export function getFormat(slug: string): Format | undefined {
  return formats.find(f => f.slug === slug);
}

export function getTotalPages(): number {
  return banks.length * formats.length;
}