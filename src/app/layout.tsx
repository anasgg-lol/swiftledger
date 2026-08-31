import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SwiftLedger – Bank Statements to CSV, Lightning Fast",
  description: "Convert bank statements to CSV instantly with AI-powered OCR. Built for accountants, freelancers, and finance teams.",
  keywords: "bank statement parser, PDF to CSV, financial automation, OCR extraction, accounting tool, SwiftLedger",
  openGraph: {
    title: "SwiftLedger – Bank Statements to CSV",
    description: "Upload any bank statement. Get a clean CSV in seconds.",
    url: "https://swiftledger.com",
    siteName: "SwiftLedger",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SwiftLedger – Bank Statements to CSV",
    description: "Upload any bank statement. Get a clean CSV in seconds.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#030712]">
        <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-sm border-b border-slate-800/50 px-6 py-3.5">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 group">
              <span className="text-xl font-bold text-white tracking-tight">
                Swift<span className="text-emerald-400 group-hover:text-emerald-300 transition-colors">Ledger</span>
              </span>
            </Link>
            <div className="flex items-center gap-7 text-sm">
              <Link href="/features" className="text-slate-400 hover:text-white transition-colors font-medium">Features</Link>
              <Link href="/pricing" className="text-slate-400 hover:text-white transition-colors font-medium">Pricing</Link>
            </div>
          </div>
        </nav>
        <div className="pt-16 flex-1 flex flex-col">{children}</div>
      </body>
    </html>
  );
}