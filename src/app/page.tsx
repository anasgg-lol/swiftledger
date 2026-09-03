'use client';

import React, { useState, useRef, useEffect } from 'react';
import Footer from './components/Footer';

interface Transaction {
  id: number;
  date: string;
  type: string;
  description: string;
  amount: string;
  balance: string;
}

const SAMPLE_DEMO_DATA: Transaction[] = [
  { id: 1, date: '1st November 2026', type: 'Cashpoint', description: 'ATM in Central Station, 11:22am', amount: '-£10.00', balance: '£500.00' },
  { id: 2, date: '3rd November 2026', type: 'Direct Debit', description: 'Fiber Broadband Provider', amount: '-£95.00', balance: '£405.00' },
  { id: 3, date: '3rd November 2026', type: 'Card Payment', description: 'Cinema & Concessions', amount: '-£6.50', balance: '£398.50' },
  { id: 4, date: '3rd November 2026', type: 'Bank Credit', description: 'Transfer for Shared Expenses', amount: '£12.50', balance: '£411.00' },
  { id: 5, date: '4th November 2026', type: 'Card Payment', description: 'EV Charging Station', amount: '-£10.00', balance: '£401.00' },
  { id: 6, date: '5th November 2026', type: 'Direct Debit', description: 'Fitness Club Membership', amount: '-£32.50', balance: '£368.50' },
];

// ============ HARDENED CURRENCY PARSER ============
function parseCurrency(value: string): number {
  if (!value) return 0;
  const trimmed = value.trim();
  const isParenthesisNegative = trimmed.startsWith('(') && trimmed.endsWith(')');
  const hasMinusSign = trimmed.includes('-');
  
  let cleaned = trimmed.replace(/[^0-9.]/g, ''); 
  let numericValue = parseFloat(cleaned) || 0;
  
  if (isParenthesisNegative || hasMinusSign) {
    numericValue = -Math.abs(numericValue);
  }
  return numericValue;
}

function getSignedAmount(row: Transaction): number {
  const amount = parseCurrency(row.amount);
  const debitTypes = ['Card Payment', 'Direct Debit', 'Cashpoint', 'Standing Order', 'Fee', 'POS WD', 'WIRE TRANSFER OUTGOING', 'ACH WD', 'DEBITS', 'WIRE OUT'];
  
  if (amount > 0 && debitTypes.some(type => row.type.toUpperCase().includes(type.toUpperCase()) || row.description.toUpperCase().includes(type.toUpperCase()))) {
    return -amount;
  }
  return amount;
}

// ============ FORMAT GENERATORS ============
function generateCSV(rows: Transaction[]): string {
  if (!rows.length) return '';
  const headers = ['ID', 'Date', 'Type', 'Description', 'Amount', 'Balance'];
  const csvRows = rows.map((r) => [
    r.id.toString(),
    r.date,
    r.type,
    r.description,
    r.amount,
    r.balance,
  ]);
  return [headers.join(','), ...csvRows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))].join('\n');
}

function generateXeroCSV(rows: Transaction[], bank: string = ''): string {
  if (!rows.length) return '';
  const headers = ['Date', 'Description', 'Amount', 'Balance', 'Bank'];
  const csvRows = rows.map((r) => {
    const isNegative = r.amount.startsWith('-');
    const numericAmount = Math.abs(parseCurrency(r.amount));
    const signedAmount = isNegative ? -numericAmount : numericAmount;
    return [
      r.date,
      `${r.description} (${r.type})`,
      signedAmount.toFixed(2),
      parseCurrency(r.balance).toFixed(2),
      bank || 'General',
    ];
  });
  return [headers.join(','), ...csvRows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))].join('\n');
}

function generateOFX(rows: Transaction[], bank: string = ''): string {
  if (!rows.length) return '';
  const ofxHeader = `OFXHEADER:100
VERSION:102
SECURITY:NONE
ENCODING:USASCII
CHARSET:1252
COMPRESSION:NONE
OLDFILEUID:NONE
NEWFILEUID:NONE

<OFX>
<SIGNONMSGSRSV1>
<SONRS>
<STATUS>
<CODE>0
<SEVERITY>INFO
</STATUS>
<DTSERVER>${new Date().toISOString().replace(/[-:.]/g, '')}
<LANGUAGE>ENG
</SONRS>
</SIGNONMSGSRSV1>
<BANKMSGSRSV1>
<STMTTRNRS>
<TRNUID>1
<STATUS>
<CODE>0
<SEVERITY>INFO
</STATUS>
<STMTRS>
<CURDEF>USD
<BANKACCTFROM>
<ACCTID>${bank || '123456789'}
<ACCTTYPE>CHECKING
</BANKACCTFROM>
<BANKTRANLIST>
<DTSTART>${new Date(rows[0]?.date || Date.now()).toISOString().split('T')[0]}
<DTEND>${new Date(rows[rows.length - 1]?.date || Date.now()).toISOString().split('T')[0]}
`;
  let ofxBody = '';
  rows.forEach((r, i) => {
    const amount = parseCurrency(r.amount);
    const isCredit = amount >= 0;
    const type = isCredit ? 'CREDIT' : 'DEBIT';
    const amtStr = Math.abs(amount).toFixed(2);
    const date = new Date(r.date);
    const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
    const timeStr = '000000';
    ofxBody += `
<STMTTRN>
<TRNTYPE>${type}
<DTPOSTED>${dateStr}${timeStr}
<TRNAMT>${isCredit ? '' : '-'}${amtStr}
<FITID>${i + 1}
<NAME>${r.description.substring(0, 60)}
</STMTTRN>`;
  });
  const ofxFooter = `
</BANKTRANLIST>
<LEDGERBAL>
<BALAMT>${parseCurrency(rows[rows.length - 1]?.balance || '0').toFixed(2)}
<DTASOF>${new Date().toISOString().split('T')[0].replace(/-/g, '')}000000
</LEDGERBAL>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>`;
  return ofxHeader + ofxBody + ofxFooter;
}

function generateQBO(rows: Transaction[], bank: string = ''): string {
  if (!rows.length) return '';
  let qbo = `!Type:Bank
Dated\tDescription\tWithdrawal\tDeposit\tBalance
`;
  rows.forEach((r) => {
    const amount = parseCurrency(r.amount);
    const isCredit = amount >= 0;
    const amtStr = Math.abs(amount).toFixed(2);
    const date = new Date(r.date);
    const dateStr = date.toISOString().split('T')[0];
    qbo += `${dateStr}\t${r.description}\t${isCredit ? '' : amtStr}\t${isCredit ? amtStr : ''}\t${parseCurrency(r.balance).toFixed(2)}\n`;
  });
  return qbo;
}

function downloadFile(content: string, filename: string, mimeType: string) {
  if (!content) return;
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function downloadAllFormats(rows: Transaction[], filename: string, selectedFormats: string[], bank: string = '') {
  if (!rows.length) return;
  const baseName = filename.replace(/\.[^/.]+$/, '');
  const formatMap: Record<string, { ext: string; generator: (rows: Transaction[], bank: string) => string; mime: string }> = {
    csv: { ext: '.csv', generator: generateCSV, mime: 'text/csv' },
    xero: { ext: '_xero.csv', generator: generateXeroCSV, mime: 'text/csv' },
    ofx: { ext: '.ofx', generator: generateOFX, mime: 'application/x-ofx' },
    qbo: { ext: '.qbo', generator: generateQBO, mime: 'text/plain' },
  };
  selectedFormats.forEach((format) => {
    const config = formatMap[format];
    if (!config) return;
    try {
      const content = config.generator(rows, bank);
      if (content && content.length > 0) {
        downloadFile(content, baseName + config.ext, config.mime);
      }
    } catch (error) {
      console.error(`Failed to generate ${format}:`, error);
    }
  });
}

function getPrice(pageCount: number): { price: number; label: string; tier: string; badge: string } {
  if (pageCount <= 5) return { price: 5, label: 'Freelancer', tier: '1–5 pages', badge: '🎟️' };
  if (pageCount <= 20) return { price: 25, label: 'Business', tier: '6–20 pages', badge: '📁' };
  if (pageCount <= 50) return { price: 45, label: 'Corporate', tier: '21–50 pages', badge: '💼' };
  return { price: 85, label: 'Enterprise', tier: '51+ pages', badge: '🏢' };
}

// ============ MAIN COMPONENT ============
export default function Home() {
  const [parsedData, setParsedData] = useState<Transaction[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentPageCount, setCurrentPageCount] = useState<number>(1);
  const [loadingTime, setLoadingTime] = useState<number>(0);
  const [showStats, setShowStats] = useState(false);
  const [selectedBank, setSelectedBank] = useState<string>('');
  const [stats, setStats] = useState<any>(null);
  const [progressMessage, setProgressMessage] = useState<string>('Analyzing your statement...');
  const [selectedFormats, setSelectedFormats] = useState<Record<string, boolean>>({
    csv: true,
    xero: true,
    ofx: true,
    qbo: true,
  });
  const [pendingDownload, setPendingDownload] = useState<any>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const loadingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const formatLabels: Record<string, { label: string; desc: string; color: string }> = {
    csv: { label: '📊 Standard CSV', desc: 'Excel, Google Sheets', color: 'text-blue-400' },
    xero: { label: '📁 Xero Bank Feed', desc: 'Xero import ready', color: 'text-cyan-400' },
    ofx: { label: '🏦 .OFX', desc: 'Microsoft Money, Quicken', color: 'text-amber-400' },
    qbo: { label: '📈 .QBO', desc: 'QuickBooks direct import', color: 'text-purple-400' },
  };
  useEffect(() => {
    // 📡 فتح رادار الاستقبال اللاسلكي بين التابات
    const channel = new BroadcastChannel('swiftledger_payment_channel');
    
    channel.onmessage = (event) => {
      if (event.data?.status === 'RELEASE_FILES_NOW') {
        console.log('🚀 INSTANT SIGNAL DETECTED! RELEASING FILES DIRECTLY...');
        
        const rawPending = sessionStorage.getItem('pendingDownload');
        if (rawPending) {
          try {
            const pendingData = JSON.parse(rawPending);
            const baseName = (pendingData.fileName || 'statement').replace(/\.[^/.]+$/, '');
            const headers = ['ID', 'Date', 'Type', 'Description', 'Amount', 'Balance'];
            const csvContent = [headers.join(','), ...pendingData.rows.map((r: any) => [r.id, r.date, r.type, r.description, r.amount, r.balance].map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
            
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const downloadUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = baseName + '.csv';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(downloadUrl);

            sessionStorage.removeItem('pendingDownload');
            localStorage.removeItem('whop_payment_success_signal');
          } catch (err) {
            console.error('Download extraction error:', err);
          }
        }
      }
    };

    return () => channel.close();
  }, [parsedData, fileName]);
  // ============ FILE UPLOAD ============
  const handleFileUpload = async (file: File) => {
    setLoading(true);
    setFileName(file.name);
    setParsedData([]);
    setShowStats(false);
    setLoadingTime(0);
    setProgressMessage('⚡ Connecting to SwiftLedger high-speed processing array...');

    if (loadingIntervalRef.current) clearInterval(loadingIntervalRef.current);
    loadingIntervalRef.current = setInterval(() => {
      setLoadingTime(prev => prev + 1);
    }, 1000);

    try {
      const formData = new FormData();
      formData.append('file', file); // Streams pristine digital text layer signatures to backend safely

      const res = await fetch('/api/v1/parse', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || `Server processing failure status: ${res.status}`);
      }

      const data = await res.json();
      
      if (data.success) {
        const rows = data.rows || [];
        setParsedData(rows);
        setCurrentPageCount(data.page_count || 1);

        const priceInfo = getPrice(data.page_count || 1);
        const lastRow = rows.length > 0 ? rows[rows.length - 1] : null;
        
        let totalCredits = 0, totalDebits = 0;
        rows.forEach((tx: any) => {
          const cleanedAmt = parseCurrency(tx.amount);
          if (cleanedAmt < 0) totalDebits += Math.abs(cleanedAmt);
          else totalCredits += cleanedAmt;
        });

        // Inform the customer exactly which performance cluster processed their file ledger
        const engineLabel = data.engine_used || 'SwiftLedger Hyper-Speed Core';

        setStats({
          fileName: file.name,
          pageCount: data.page_count || 1,
          transactionCount: data.total_transactions || rows.length,
          price: priceInfo.price,
          priceLabel: priceInfo.label,
          tier: priceInfo.tier,
          badge: priceInfo.badge,
          totalCredits,
          totalDebits,
          netBalance: parseCurrency(lastRow?.balance || '0'),
          firstDate: rows[0]?.date || '—',
          lastDate: lastRow?.date || '—',
          processing_time_ms: data.processing_time_ms || 0,
          engineUsedLabel: engineLabel
        });

        setShowStats(true);
        setLoading(false);
        if (loadingIntervalRef.current) {
          clearInterval(loadingIntervalRef.current);
          loadingIntervalRef.current = null;
        }
      } else {
        throw new Error(data.error || 'Parsing exception occurred.');
      }
    } catch (error: any) {
      console.error('❌ Upload execution failure:', error);
      alert(error?.message || 'Handshake failed. Restoring secure connection channel gates.');
      setLoading(false);
      if (loadingIntervalRef.current) {
        clearInterval(loadingIntervalRef.current);
        loadingIntervalRef.current = null;
      }
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const loadDemo = () => {
    setFileName('sample_statement_demo.pdf');
    setParsedData(SAMPLE_DEMO_DATA);
    setCurrentPageCount(6);
    const priceInfo = getPrice(6);
    let totalCredits = 0, totalDebits = 0;
    SAMPLE_DEMO_DATA.forEach((tx) => {
      const amt = parseCurrency(tx.amount);
      if (amt < 0) totalDebits += Math.abs(amt);
      else totalCredits += amt;
    });
    const lastRow = SAMPLE_DEMO_DATA[SAMPLE_DEMO_DATA.length - 1];
    setStats({
      fileName: 'sample_statement_demo.pdf',
      pageCount: 6,
      transactionCount: SAMPLE_DEMO_DATA.length,
      price: priceInfo.price,
      priceLabel: priceInfo.label,
      tier: priceInfo.tier,
      badge: priceInfo.badge,
      totalCredits,
      totalDebits,
      netBalance: parseCurrency(lastRow.balance),
      firstDate: '1st November 2026',
      lastDate: '5th November 2026',
    });
    setShowStats(true);
  };

  // ============ WHOP PAYMENT URLS ============
  const whopUrls: Record<string, string> = {
    '5': 'https://whop.com/vercel-3f41/swiftledger-starter-1-5-pages/',
    '25': 'https://whop.com/vercel-3f41/swiftledger-business-6-20-pages/',
    '45': 'https://whop.com/vercel-3f41/swiftledger-corporate-21-50-pages/',
    '85': 'https://whop.com/vercel-3f41/swiftledger-enterprise-51-pages/',
  };

  const handlePayAndDownload = async () => {
    if (!stats) return;

    const formats = Object.keys(selectedFormats).filter((key) => selectedFormats[key]);
    if (formats.length === 0) {
      alert('Please select at least one format to export.');
      return;
    }

    const baseCheckoutUrl = whopUrls[stats.price.toString()];
    // نزيدو الـ Timestamp مع الـ Random Token لفرض فاتورة مستقلة ومجردة في كل رفعة ملف! [pdf_XZdc6j.pdf]
    
    
    if (!baseCheckoutUrl) {
      alert(`No checkout URL found for price $${stats.price}. Please contact support.`);
      return;
    }

    sessionStorage.setItem('pendingDownload', JSON.stringify({
      rows: parsedData,
      fileName: fileName || 'statement',
      formats: formats,
      bank: selectedBank,
    }));
    const checkoutUrl = `${baseCheckoutUrl}?pass_token=${Date.now()}_${Math.random().toString(36).substring(7)}`;
    window.location.href = checkoutUrl;
    alert('🛒 Opening Whop checkout in a new tab. Complete payment there, then come back and click "Download" to get your CSV.');
  };

  const handleDownloadAfterPayment = () => {
    if (!pendingDownload) return;
    
    const { rows, fileName, formats, bank } = pendingDownload;
    downloadAllFormats(rows, fileName, formats, bank);
    
    sessionStorage.removeItem('pendingDownload');
    setPendingDownload(null);
  };

  const toggleFormat = (format: string) => {
    setSelectedFormats((prev) => ({
      ...prev,
      [format]: !prev[format],
    }));
  };

  const getSelectedCount = () => {
    return Object.values(selectedFormats).filter(Boolean).length;
  };

  // ============ RENDER ============
  return (
    <main className="min-h-screen bg-[#030712] text-white flex flex-col items-center justify-start p-6 relative font-sans overflow-x-hidden">
      
      {/* Ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-500/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="text-center max-w-4xl mx-auto z-10 mt-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-medium uppercase tracking-wider mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          99% Accuracy • Bank Statement Parser
        </div>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.1]">
          <span className="text-white">Swift</span>
          <span className="text-emerald-400">Ledger</span>
          <br />
          <span className="text-slate-300 text-3xl md:text-4xl font-light mt-2 block">Bank Statements to CSV in Seconds</span>
        </h1>
        <p className="text-slate-400 text-lg max-w-2xl mx-auto mt-4 flex flex-wrap items-center justify-center gap-2">
          <span className="text-emerald-400 font-medium">Better & faster than Adobe</span>
          <span className="text-slate-600">•</span>
          <span className="text-amber-400 font-medium">99% accuracy</span>
          <span className="text-slate-600">•</span>
          <span className="text-slate-300 font-medium">Pay per use</span>
        </p>
      </div>

      {/* Competitor Comparison */}
      <div className="w-full max-w-2xl mx-auto z-10 mt-6">
        <div className="bg-slate-900/60 border border-slate-800/50 rounded-2xl p-3.5 flex flex-wrap items-center justify-center gap-3 md:gap-5">
          {[
            { name: 'Adobe', price: '$25/mo' },
            { name: 'Docsumo', price: '$100/mo' },
            { name: 'Nanonets', price: '$500/mo' },
          ].map((item, i) => (
            <React.Fragment key={i}>
              <span className="text-slate-400 text-[11px] font-medium">{item.name} <span className="text-rose-400/60 line-through">{item.price}</span></span>
              {i < 2 && <span className="text-emerald-400 font-bold text-xs">VS</span>}
            </React.Fragment>
          ))}
          <span className="text-white font-bold text-sm ml-1">$5–$85/file</span>
        </div>
      </div>

      {/* Trust Section */}
      <div className="w-full max-w-4xl mx-auto z-10 mt-8">
        <p className="text-center text-[9px] text-slate-500 uppercase tracking-[0.2em] mb-4">Trusted by finance teams at</p>
        <div className="flex flex-wrap items-center justify-center gap-8 md:gap-10">
          {['QuickBooks', 'Xero', 'Sage', 'Wave', 'FreshBooks'].map((name) => (
            <span key={name} className="text-[11px] font-medium text-slate-500 hover:text-slate-300 transition-colors cursor-default">{name}</span>
          ))}
        </div>
      </div>

      {/* Upload Zone */}
      <div className="w-full max-w-xl mx-auto z-10 mt-8">
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleFileDrop}
          className={`relative cursor-pointer rounded-3xl p-10 text-center border-2 border-dashed transition-all duration-300 ${
            isDragging
              ? 'border-emerald-400/60 bg-emerald-500/5 shadow-[0_0_60px_rgba(16,185,129,0.08)] scale-[1.01]'
              : 'border-slate-800 bg-slate-900/40 hover:border-emerald-500/30 hover:bg-slate-900/60'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) {
                handleFileUpload(e.target.files[0]);
              }
            }}
          />
          <div className="w-16 h-16 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-center mx-auto mb-4 text-emerald-400">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="12" y1="18" x2="12" y2="12" />
              <line x1="9" y1="15" x2="15" y2="15" />
            </svg>
          </div>
          <p className="text-white font-semibold text-lg">{isDragging ? 'Drop your PDF here' : 'Drop your statement here, or browse'}</p>
          <p className="text-slate-500 text-sm mt-1">PDF, PNG, JPG – any bank statement</p>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); loadDemo(); }}
            className="text-xs text-slate-400 hover:text-emerald-400 transition-colors underline font-medium mt-3"
          >
            Try sample demo
          </button>
        </div>
      </div>

      {/* Loading Indicator */}
      {loading && (
        <div className="w-full max-w-2xl mx-auto z-10 mt-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-4">
                <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin-slow" />
                <span className="text-sm text-slate-300 font-medium">{progressMessage}</span>
              </div>
              <div className="w-full max-w-md">
                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-emerald-500 to-teal-400 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, (loadingTime / 14) * 100)}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1.5">
                  <span className="text-[9px] text-slate-500">Processing</span>
                  <span className="text-[9px] text-slate-500">{Math.min(100, Math.round((loadingTime / 14) * 100))}%</span>
                </div>
              </div>
              <span className="text-[10px] text-slate-500">{loadingTime}s elapsed</span>
            </div>
          </div>
        </div>
      )}

      {/* Pending Download Notification */}
      {pendingDownload && (
        <div className="w-full max-w-4xl mx-auto z-10 mt-4">
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-emerald-400 font-medium">✅ Payment detected!</p>
              <p className="text-slate-400 text-sm">Your files are ready to download.</p>
            </div>
            <button
              onClick={handleDownloadAfterPayment}
              className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold rounded-xl text-sm shadow-[0_0_30px_rgba(16,185,129,0.15)] transition-all duration-300"
            >
              📥 Download {pendingDownload.formats?.length || 0} Formats
            </button>
          </div>
        </div>
      )}

      {/* Stats Card */}
      {showStats && stats && parsedData.length > 0 && !loading && (
        <div className="w-full max-w-4xl mx-auto z-10 mt-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                  <svg className="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                  <span className="text-emerald-400 font-semibold text-[10px] uppercase tracking-wider">99% Accuracy</span>
                </div>
                <span className="text-sm text-slate-400">{stats.fileName}</span>
                {stats.processing_time_ms && (
                  <span className="text-[10px] text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">
                    {stats.processing_time_ms}ms
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700 text-slate-400">Pages <span className="font-bold text-white ml-1">{stats.pageCount}</span></span>
                <span className="bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700 text-slate-400">Transactions <span className="font-bold text-white ml-1">{stats.transactionCount}</span></span>
                <span className="bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700 text-slate-400">Balance <span className="font-bold text-emerald-400 ml-1">${stats.netBalance?.toFixed(2)}</span></span>
              </div>
            </div>

            {/* Format Selection */}
            <div className="mt-4">
              <label className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block mb-2">
                Select Export Formats ({getSelectedCount()} selected)
              </label>
              <div className="flex flex-wrap gap-3">
                {Object.entries(formatLabels).map(([key, { label, desc, color }]) => (
                  <label
                    key={key}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-200 cursor-pointer ${
                      selectedFormats[key]
                        ? 'border-emerald-500/50 bg-emerald-500/10'
                        : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedFormats[key]}
                      onChange={() => toggleFormat(key)}
                      className="w-3.5 h-3.5 rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0 cursor-pointer"
                    />
                    <span className={`text-[11px] font-medium ${color}`}>{label}</span>
                    <span className="text-[9px] text-slate-500 hidden sm:inline">({desc})</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Bank Selection */}
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <div className="bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 flex items-center gap-2">
                <label className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Bank:</label>
                <select
                  value={selectedBank}
                  onChange={(e) => setSelectedBank(e.target.value)}
                  className="bg-transparent text-white text-xs font-medium rounded-md px-2 py-1 border-slate-700 focus:border-emerald-500 transition-colors"
                >
                  <option value="" className="bg-slate-900 text-white">🏦 Auto-detect</option>
                  <option value="chase" className="bg-slate-900 text-white">Chase</option>
                  <option value="bofa" className="bg-slate-900 text-white">Bank of America</option>
                  <option value="hsbc" className="bg-slate-900 text-white">HSBC</option>
                  <option value="barclays" className="bg-slate-900 text-white">Barclays</option>
                  <option value="credit-agricole" className="bg-slate-900 text-white">Crédit Agricole</option>
                  <option value="wells-fargo" className="bg-slate-900 text-white">Wells Fargo</option>
                  <option value="citibank" className="bg-slate-900 text-white">Citibank</option>
                </select>
              </div>
            </div>

            {/* Pay & Download */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4">
              <div>
                <span className="text-xs text-slate-400">{stats.tier}</span>
                <span className="text-2xl font-bold text-white ml-2">${stats.price}</span>
                <span className="text-xs text-slate-500 ml-1">/ file</span>
              </div>
              <button
                onClick={handlePayAndDownload}
                disabled={getSelectedCount() === 0}
                className={`px-7 py-2.5 font-bold rounded-xl text-sm transition-all duration-300 active:scale-[0.97] ${
                  getSelectedCount() === 0
                    ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white shadow-[0_0_30px_rgba(16,185,129,0.15)] hover:shadow-[0_0_50px_rgba(16,185,129,0.25)]'
                }`}
              >
                Unlock & Export {getSelectedCount()} {getSelectedCount() === 1 ? 'Format' : 'Formats'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Table */}
      {parsedData.length > 0 && !loading && (
        <div className="w-full max-w-4xl mx-auto z-10 mt-4">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                {fileName || 'statement'} – {parsedData.length} rows
              </span>
              <span className="text-[10px] text-slate-500 font-medium">Preview (5 rows)</span>
            </div>
            <div className="relative rounded-xl border border-slate-800 overflow-hidden">
              <table className="w-full text-left text-[10px]">
                <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="p-2.5 font-medium">Date</th>
                    <th className="p-2.5 font-medium">Type</th>
                    <th className="p-2.5 font-medium">Description</th>
                    <th className="p-2.5 text-right font-medium">Amount</th>
                    <th className="p-2.5 text-right font-medium">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
  
                  {parsedData.slice(0, 5).map((row) => (
                    <tr key={row.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-2.5 font-medium text-white/90">{row.date}</td>
                      <td className="p-2.5 text-slate-400/70">{row.type}</td>
                      <td className="p-2.5 text-slate-300/80">{row.description}</td>
                      <td className={`p-2.5 text-right font-bold ${row.amount.startsWith('-') ? 'text-rose-400/80' : 'text-emerald-400/80'}`}>{row.amount}</td>
                      <td className="p-2.5 text-right text-slate-400/60">{row.balance}</td>
                    </tr>
                  ))}
  
  
                  {parsedData.slice(5, 7).map((row) => (
                    <tr key={row.id} className="select-none blur-[3px] opacity-25 pointer-events-none">
                      <td className="p-2.5 font-medium text-white/60">{row.date}</td>
                      <td className="p-2.5 text-slate-400/40">{row.type}</td>
                      <td className="p-2.5 text-slate-300/50">{row.description}</td>
                      <td className="p-2.5 text-right font-bold text-emerald-400/50">{row.amount}</td>
                      <td className="p-2.5 text-right text-slate-400/40">{row.balance}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="absolute inset-x-0 bottom-0 top-1/3 bg-gradient-to-t from-[#030712] via-[#030712]/90 to-transparent flex items-center justify-center pb-3">
                <p className="text-[10px] font-bold text-slate-400 flex items-center gap-2">
                  <svg className="w-3 h-3 text-slate-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
                  Unlock all {parsedData.length} transactions
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="w-full max-w-6xl mx-auto mt-16 z-10">
        <Footer />
      </div>
    </main>
  );
}