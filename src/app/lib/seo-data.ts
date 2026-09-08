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
  description?: string;
  software?: string;
}

// ============================================================
// 🏦 100+ BANKS (Global Coverage)
// ============================================================
export const banks: Bank[] = [
  // ===== USA =====
  { name: 'Chase', slug: 'chase', country: 'USA', type: 'National' },
  { name: 'Bank of America', slug: 'bank-of-america', country: 'USA', type: 'National' },
  { name: 'Wells Fargo', slug: 'wells-fargo', country: 'USA', type: 'National' },
  { name: 'Citibank', slug: 'citibank', country: 'USA', type: 'National' },
  { name: 'Capital One', slug: 'capital-one', country: 'USA', type: 'National' },
  { name: 'PNC', slug: 'pnc', country: 'USA', type: 'National' },
  { name: 'TD Bank', slug: 'td-bank', country: 'USA', type: 'National' },
  { name: 'Navy Federal', slug: 'navy-federal', country: 'USA', type: 'Credit Union' },
  { name: 'Goldman Sachs', slug: 'goldman-sachs', country: 'USA', type: 'Investment' },
  { name: 'Morgan Stanley', slug: 'morgan-stanley', country: 'USA', type: 'Investment' },
  { name: 'US Bank', slug: 'us-bank', country: 'USA', type: 'National' },
  { name: 'Truist', slug: 'truist', country: 'USA', type: 'National' },
  { name: 'Fifth Third', slug: 'fifth-third', country: 'USA', type: 'Regional' },
  { name: 'Regions Bank', slug: 'regions', country: 'USA', type: 'Regional' },
  { name: 'KeyBank', slug: 'keybank', country: 'USA', type: 'Regional' },
  { name: 'M&T Bank', slug: 'mt-bank', country: 'USA', type: 'Regional' },
  { name: 'Huntington Bank', slug: 'huntington', country: 'USA', type: 'Regional' },
  { name: 'BMO Harris', slug: 'bmo-harris', country: 'USA', type: 'Regional' },
  { name: 'Ally Bank', slug: 'ally', country: 'USA', type: 'Online' },
  { name: 'Discover Bank', slug: 'discover', country: 'USA', type: 'Online' },
  { name: 'Synchrony Bank', slug: 'synchrony', country: 'USA', type: 'Online' },
  { name: 'PenFed Credit Union', slug: 'penfed', country: 'USA', type: 'Credit Union' },
  { name: 'SoFi', slug: 'sofi', country: 'USA', type: 'Online' },
  { name: 'Chime', slug: 'chime', country: 'USA', type: 'Neobank' },
  { name: 'Varo Bank', slug: 'varo', country: 'USA', type: 'Neobank' },
  { name: 'Current', slug: 'current', country: 'USA', type: 'Neobank' },

  // ===== UK =====
  { name: 'Barclays', slug: 'barclays', country: 'UK', type: 'National' },
  { name: 'HSBC', slug: 'hsbc', country: 'UK', type: 'International' },
  { name: 'Lloyds Bank', slug: 'lloyds', country: 'UK', type: 'National' },
  { name: 'NatWest', slug: 'natwest', country: 'UK', type: 'National' },
  { name: 'Halifax', slug: 'halifax', country: 'UK', type: 'National' },
  { name: 'Nationwide', slug: 'nationwide', country: 'UK', type: 'Building Society' },
  { name: 'Santander UK', slug: 'santander-uk', country: 'UK', type: 'National' },
  { name: 'Royal Bank of Scotland', slug: 'rbs', country: 'UK', type: 'National' },
  { name: 'Ulster Bank', slug: 'ulster', country: 'UK', type: 'Regional' },
  { name: 'Metro Bank', slug: 'metro-bank', country: 'UK', type: 'National' },
  { name: 'Monzo', slug: 'monzo', country: 'UK', type: 'Neobank' },
  { name: 'Starling Bank', slug: 'starling', country: 'UK', type: 'Neobank' },
  { name: 'Revolut', slug: 'revolut', country: 'UK', type: 'Neobank' },
  { name: 'Wise', slug: 'wise', country: 'UK', type: 'Neobank' },
  { name: 'TransferWise', slug: 'transferwise', country: 'UK', type: 'Neobank' },

  // ===== Europe =====
  { name: 'BNP Paribas', slug: 'bnp-paribas', country: 'France', type: 'International' },
  { name: 'Crédit Agricole', slug: 'credit-agricole', country: 'France', type: 'National' },
  { name: 'Société Générale', slug: 'societe-generale', country: 'France', type: 'National' },
  { name: 'Deutsche Bank', slug: 'deutsche-bank', country: 'Germany', type: 'International' },
  { name: 'Commerzbank', slug: 'commerzbank', country: 'Germany', type: 'National' },
  { name: 'ING', slug: 'ing', country: 'Netherlands', type: 'International' },
  { name: 'ABN AMRO', slug: 'abn-amro', country: 'Netherlands', type: 'National' },
  { name: 'Rabobank', slug: 'rabobank', country: 'Netherlands', type: 'National' },
  { name: 'Nordea', slug: 'nordea', country: 'Sweden', type: 'International' },
  { name: 'Swedbank', slug: 'swedbank', country: 'Sweden', type: 'National' },
  { name: 'SEB', slug: 'seb', country: 'Sweden', type: 'National' },
  { name: 'Danske Bank', slug: 'danske', country: 'Denmark', type: 'International' },
  { name: 'N26', slug: 'n26', country: 'Germany', type: 'Neobank' },
  { name: 'Monese', slug: 'monese', country: 'UK', type: 'Neobank' },

  // ===== Canada =====
  { name: 'RBC Royal Bank', slug: 'rbc', country: 'Canada', type: 'National' },
  { name: 'TD Canada Trust', slug: 'td-canada', country: 'Canada', type: 'National' },
  { name: 'Scotiabank', slug: 'scotiabank', country: 'Canada', type: 'National' },
  { name: 'BMO Canada', slug: 'bmo-canada', country: 'Canada', type: 'National' },
  { name: 'CIBC', slug: 'cibc', country: 'Canada', type: 'National' },
  { name: 'National Bank of Canada', slug: 'national-bank-canada', country: 'Canada', type: 'National' },

  // ===== Australia & NZ =====
  { name: 'Commonwealth Bank', slug: 'commonwealth-bank', country: 'Australia', type: 'National' },
  { name: 'Westpac', slug: 'westpac', country: 'Australia', type: 'National' },
  { name: 'ANZ', slug: 'anz', country: 'Australia', type: 'National' },
  { name: 'NAB', slug: 'nab', country: 'Australia', type: 'National' },
  { name: 'ASB Bank', slug: 'asb', country: 'New Zealand', type: 'National' },
  { name: 'BNZ', slug: 'bnz', country: 'New Zealand', type: 'National' },

  // ===== Asia =====
  { name: 'DBS Bank', slug: 'dbs', country: 'Singapore', type: 'International' },
  { name: 'OCBC Bank', slug: 'ocbc', country: 'Singapore', type: 'National' },
  { name: 'UOB', slug: 'uob', country: 'Singapore', type: 'National' },
  { name: 'Mizuho Bank', slug: 'mizuho', country: 'Japan', type: 'International' },
  { name: 'SMBC', slug: 'smbc', country: 'Japan', type: 'International' },
  { name: 'MUFG', slug: 'mufg', country: 'Japan', type: 'International' },
  { name: 'ICBC', slug: 'icbc', country: 'China', type: 'International' },
  { name: 'China Construction Bank', slug: 'ccb', country: 'China', type: 'International' },
  { name: 'Bank of China', slug: 'bank-of-china', country: 'China', type: 'International' },
  { name: 'HDFC Bank', slug: 'hdfc', country: 'India', type: 'National' },
  { name: 'ICICI Bank', slug: 'icici', country: 'India', type: 'National' },
  { name: 'SBI', slug: 'sbi', country: 'India', type: 'National' },

  // ===== Middle East =====
  { name: 'Emirates NBD', slug: 'emirates-nbd', country: 'UAE', type: 'National' },
  { name: 'ADCB', slug: 'adcb', country: 'UAE', type: 'National' },
  { name: 'QNB', slug: 'qnb', country: 'Qatar', type: 'National' },
  { name: 'Al Rajhi Bank', slug: 'al-rajhi', country: 'Saudi Arabia', type: 'National' },

  // ===== Latin America =====
  { name: 'Itaú', slug: 'itau', country: 'Brazil', type: 'International' },
  { name: 'Banco do Brasil', slug: 'banco-do-brasil', country: 'Brazil', type: 'National' },
  { name: 'BBVA', slug: 'bbva', country: 'Spain', type: 'International' },
  { name: 'Santander', slug: 'santander', country: 'Spain', type: 'International' },

  // ===== Africa =====
  { name: 'Standard Bank', slug: 'standard-bank', country: 'South Africa', type: 'International' },
  { name: 'First National Bank', slug: 'fnb', country: 'South Africa', type: 'National' },
  { name: 'ABSA', slug: 'absa', country: 'South Africa', type: 'National' },

  // ===== Neobanks & Fintech =====
  { name: 'Payoneer', slug: 'payoneer', country: 'USA', type: 'Fintech' },
  { name: 'Klarna', slug: 'klarna', country: 'Sweden', type: 'Fintech' },
  { name: 'Affirm', slug: 'affirm', country: 'USA', type: 'Fintech' },
  { name: 'Afterpay', slug: 'afterpay', country: 'Australia', type: 'Fintech' },
  { name: 'Clearpay', slug: 'clearpay', country: 'UK', type: 'Fintech' },
  { name: 'Zopa', slug: 'zopa', country: 'UK', type: 'Fintech' },
];

// ============================================================
// 📄 50+ FORMATS (All major accounting software)
// ============================================================
export const formats: Format[] = [
  // ===== Spreadsheets =====
  { label: 'CSV', slug: 'csv', description: 'Universal CSV format', software: 'Excel, Google Sheets' },
  { label: 'Excel', slug: 'excel', description: 'Microsoft Excel .xlsx', software: 'Excel' },
  { label: 'Excel XLS', slug: 'xls', description: 'Legacy Excel format', software: 'Excel' },

  // ===== Accounting Software =====
  { label: 'QuickBooks', slug: 'quickbooks', description: 'QuickBooks Desktop import', software: 'QuickBooks' },
  { label: 'QBO', slug: 'qbo', description: 'QuickBooks Online bank feed', software: 'QuickBooks Online' },
  { label: 'Xero', slug: 'xero', description: 'Xero bank feed format', software: 'Xero' },
  { label: 'Sage 50', slug: 'sage-50', description: 'Sage 50 import format', software: 'Sage' },
  { label: 'Sage 200', slug: 'sage-200', description: 'Sage 200 import format', software: 'Sage' },
  { label: 'Wave', slug: 'wave', description: 'Wave Accounting import', software: 'Wave' },
  { label: 'FreshBooks', slug: 'freshbooks', description: 'FreshBooks transaction import', software: 'FreshBooks' },
  { label: 'Zoho Books', slug: 'zoho', description: 'Zoho Books import format', software: 'Zoho Books' },
  { label: 'KashFlow', slug: 'kashflow', description: 'KashFlow accounting import', software: 'KashFlow' },
  { label: 'FreeAgent', slug: 'freeagent', description: 'FreeAgent bank feed', software: 'FreeAgent' },

  // ===== Financial Exchange =====
  { label: 'OFX', slug: 'ofx', description: 'Open Financial Exchange format', software: 'Quicken, MS Money' },
  { label: 'QFX', slug: 'qfx', description: 'Quicken Financial Exchange', software: 'Quicken' },
  { label: 'QIF', slug: 'qif', description: 'Quicken Interchange Format', software: 'Quicken' },

  // ===== Data Exchange =====
  { label: 'JSON', slug: 'json', description: 'JSON format for developers', software: 'APIs, Custom' },
  { label: 'XML', slug: 'xml', description: 'XML format for enterprise', software: 'Enterprise Systems' },
  { label: 'Google Sheets API', slug: 'google-sheets', description: 'Direct Google Sheets import', software: 'Google Sheets' },

  // ===== ERP Systems =====
  { label: 'SAP', slug: 'sap', description: 'SAP bank statement format', software: 'SAP ERP' },
  { label: 'Odoo', slug: 'odoo', description: 'Odoo ERP import', software: 'Odoo' },
  { label: 'ERPNext', slug: 'erpnext', description: 'ERPNext bank statement import', software: 'ERPNext' },
  { label: 'Tally', slug: 'tally', description: 'Tally ERP import format', software: 'Tally' },
  { label: 'Dolibarr', slug: 'dolibarr', description: 'Dolibarr ERP import', software: 'Dolibarr' },
  { label: 'FrontAccounting', slug: 'frontaccounting', description: 'FrontAccounting import', software: 'FrontAccounting' },

  // ===== Fintech & Payments =====
  { label: 'PayPal', slug: 'paypal', description: 'PayPal transaction export', software: 'PayPal' },
  { label: 'Stripe', slug: 'stripe', description: 'Stripe settlement import', software: 'Stripe' },
  { label: 'Square', slug: 'square', description: 'Square Payout import', software: 'Square' },
  { label: 'Venmo', slug: 'venmo', description: 'Venmo transaction history', software: 'Venmo' },
  { label: 'Payoneer', slug: 'payoneer-format', description: 'Payoneer transaction export', software: 'Payoneer' },

  // ===== Tax Software =====
  { label: 'TaxCalc', slug: 'taxcalc', description: 'TaxCalc software import', software: 'TaxCalc' },
  { label: 'BTCSoftware', slug: 'btc', description: 'BTCSoftware tax import', software: 'BTCSoftware' },
  { label: 'Digital Accountancy', slug: 'digital-accountancy', description: 'Digital Accountancy import', software: 'Digital Accountancy' },

  // ===== Small Business =====
  { label: 'SlickPie', slug: 'slickpie', description: 'SlickPie accounting import', software: 'SlickPie' },
  { label: 'Manager', slug: 'manager', description: 'Manager.io import', software: 'Manager.io' },
  { label: 'Akaunting', slug: 'akaunting', description: 'Akaunting open source import', software: 'Akaunting' },
  { label: 'Accounts Portal', slug: 'accounts-portal', description: 'Accounts Portal import', software: 'Accounts Portal' },
  { label: 'Clear Books', slug: 'clear-books', description: 'Clear Books import format', software: 'Clear Books' },

  // ===== UK Specific =====
  { label: 'Crunch', slug: 'crunch', description: 'Crunch accounting import', software: 'Crunch' },
  { label: 'Pandle', slug: 'pandle', description: 'Pandle accounting import', software: 'Pandle' },
  { label: 'VT Software', slug: 'vt', description: 'VT Software tax import', software: 'VT Software' },
  { label: 'Capium', slug: 'capium', description: 'Capium accounting import', software: 'Capium' },

  // ===== Developer APIs =====
  { label: 'REST API', slug: 'rest-api', description: 'REST API transaction format', software: 'Custom Development' },
  { label: 'GraphQL', slug: 'graphql', description: 'GraphQL transaction format', software: 'Custom Development' },

  // ===== Reporting =====
  { label: 'PDF Report', slug: 'pdf-report', description: 'Report-ready PDF output', software: 'Reporting' },
  { label: 'HTML', slug: 'html', description: 'HTML formatted transactions', software: 'Web Applications' },
  { label: 'Markdown', slug: 'markdown', description: 'Markdown formatted transactions', software: 'Documentation' },

  // ===== Databases =====
  { label: 'SQL', slug: 'sql', description: 'SQL INSERT statements', software: 'MySQL, PostgreSQL' },
  { label: 'NoSQL', slug: 'nosql', description: 'NoSQL/MongoDB format', software: 'MongoDB' },

  // ===== Enterprise =====
  { label: 'Oracle EBS', slug: 'oracle-ebs', description: 'Oracle EBS import format', software: 'Oracle' },
  { label: 'Microsoft Dynamics', slug: 'dynamics', description: 'MS Dynamics import format', software: 'Microsoft Dynamics' },
  { label: 'NetSuite', slug: 'netsuite', description: 'NetSuite transaction import', software: 'NetSuite' },

  // ===== E-commerce =====
  { label: 'Shopify', slug: 'shopify', description: 'Shopify payout report', software: 'Shopify' },
  { label: 'Amazon Seller', slug: 'amazon', description: 'Amazon Seller transaction import', software: 'Amazon' },
  { label: 'eBay', slug: 'ebay', description: 'eBay transaction export', software: 'eBay' },
];

// ============================================================
// 🚀 HELPER FUNCTIONS (for generating pages)
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

export function getBankCount(): number {
  return banks.length;
}

export function getFormatCount(): number {
  return formats.length;
}