import { NextResponse } from 'next/server';
import { PDFDocument } from 'pdf-lib';

export const maxDuration = 60; // Next.js official Route segment configuration

if (typeof global.DOMMatrix === 'undefined') {
  (global as any).DOMMatrix = class {};
}

interface TransactionRow {
  id: number;
  date: string;
  type: string;
  description: string;
  amount: string;
  balance: string;
}

const DATE_REGEX = /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},\s+\d{4}/i;
const MONEY_REGEX = /\$\d{1,3}(?:,\d{3})*(?:\.\d{2})/g;

function formatMoney(value: number): string {
  const sign = value < 0 ? '-' : '';
  return `${sign}$${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const rawBuffer = Buffer.from(bytes);

    // ⚡ INSTANT LOCAL EXTRACTOR: Rips out structural string tokens in milliseconds
    const dynamicPdfParse = require('pdf-parse');
    const parsedPdf = await dynamicPdfParse(rawBuffer);
    const rawText = parsedPdf.text || '';
    const totalPages = parsedPdf.numpages || 1;

    const masterTransactions: TransactionRow[] = [];
    const lines = rawText.split('\n').map((l: string) => l.trim()).filter(Boolean);
    let currentId = 1;

    // 🚀 SEMANTIC MAPPER: Fast chronological token compilation loop
    for (const line of lines) {
      const dateMatch = line.match(DATE_REGEX);
      if (!dateMatch) continue;

      const moneyMatches = line.match(MONEY_REGEX);
      if (!moneyMatches || moneyMatches.length < 1) continue;

      const dateStr = dateMatch[0];
      const dateEndIndex = line.indexOf(dateStr) + dateStr.length;

      // Extract transaction descriptions by isolating date tokens from currency metrics
      let firstMoneyIndex = line.length;
      for (const match of moneyMatches) {
        const idx = line.indexOf(match);
        if (idx > dateEndIndex && idx < firstMoneyIndex) {
          firstMoneyIndex = idx;
        }
      }

      const description = line.slice(dateEndIndex, firstMoneyIndex).replace(/^[/\s•\-–—]+|[/\s•\-–—]+$/g, '').trim();
      
      // Determine if transaction is a debit or credit based on structural type columns
      const isDebit = line.toUpperCase().includes('WIRE OUT') || 
                      line.toUpperCase().includes('DIRECT DEBIT') || 
                      line.toUpperCase().includes('FEE') || 
                      line.toUpperCase().includes('WD') ||
                      line.toUpperCase().includes('DEBITS');

      const amountStr = moneyMatches[0].replace(/[^0-9.]/g, '');
      const amountVal = parseFloat(amountStr) || 0;
      const signedAmount = isDebit ? -amountVal : amountVal;

      const balanceStr = moneyMatches[moneyMatches.length - 1].replace(/[^0-9.]/g, '');
      const balanceVal = parseFloat(balanceStr) || 0;

      masterTransactions.push({
        id: currentId++,
        date: dateStr,
        type: isDebit ? 'Debit' : 'Credit',
        description: description || 'Commercial Transaction Ledger',
        amount: formatMoney(signedAmount),
        balance: formatMoney(balanceVal)
      });
    }

    console.log(`✅ OVERHAUL COMPLETE: Extracted ${masterTransactions.length} rows natively in milliseconds!`);

    return NextResponse.json({
      success: true,
      filename: file.name,
      engine_used: 'SwiftLedger Hyper-Speed Local Core',
      total_transactions: masterTransactions.length,
      page_count: totalPages,
      rows: masterTransactions,
    });
  } catch (error: any) {
    console.error('System Overhaul Crash:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Parsing failed' }, { status: 500 });
  }
}
