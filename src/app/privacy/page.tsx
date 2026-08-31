import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#030712] text-slate-100 py-16 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-12">
          <Link href="/" className="text-emerald-400 hover:text-emerald-300 text-sm font-medium transition-colors">
            ← Back to LedgerFlow
          </Link>
        </div>

        <div className="prose prose-invert prose-emerald max-w-none">
          <h1 className="text-4xl font-black text-white tracking-tight mb-6">Privacy Policy</h1>
          <p className="text-slate-400 text-sm mb-8">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>

          <div className="space-y-8 text-slate-300">
            <section>
              <h2 className="text-xl font-bold text-white">1. Introduction</h2>
              <p className="text-slate-400 leading-relaxed">
                LedgerFlow values your privacy. This Privacy Policy explains how we collect, use, and protect your personal information when you use our Service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white">2. What We Collect</h2>
              <ul className="list-disc list-inside text-slate-400 space-y-2">
                <li><strong>Account Information:</strong> Name, email address, and payment details (processed by Lemon Squeezy).</li>
                <li><strong>Documents:</strong> Bank statements and PDFs you upload for parsing.</li>
                <li><strong>Usage Data:</strong> Pages processed, plan tier, and feature usage.</li>
                <li><strong>Technical Data:</strong> IP address, browser type, and device information (for analytics).</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white">3. How We Use Your Data</h2>
              <ul className="list-disc list-inside text-slate-400 space-y-2">
                <li><strong>To Provide the Service:</strong> Process your documents and generate CSV exports.</li>
                <li><strong>To Improve:</strong> Analyze usage patterns to enhance the Service.</li>
                <li><strong>To Communicate:</strong> Send important updates, billing info, and promotional content (opt-out anytime).</li>
                <li><strong>To Protect:</strong> Monitor for fraud or abuse.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white">4. Document Processing</h2>
              <p className="text-slate-400 leading-relaxed">
                Uploaded documents are processed in real-time using our OCR engine. After parsing, files are immediately discarded. We do not store or share your financial documents with third parties.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white">5. Third-Party Services</h2>
              <p className="text-slate-400 leading-relaxed">
                We use trusted third-party services to operate our platform:
              </p>
              <ul className="list-disc list-inside text-slate-400 space-y-2 mt-2">
                <li><strong>Supabase:</strong> Authentication and user data storage</li>
                <li><strong>Google Gemini:</strong> OCR and data extraction</li>
                <li><strong>Lemon Squeezy:</strong> Payment processing</li>
                <li><strong>Vercel:</strong> Hosting and deployment</li>
              </ul>
              <p className="text-slate-400 text-sm mt-2">
                These providers may access your data only to perform their specific functions and are bound by strict confidentiality agreements.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white">6. Data Retention</h2>
              <p className="text-slate-400 leading-relaxed">
                We retain your account information as long as your account is active. You may request deletion of your account and associated data at any time.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white">7. Data Security</h2>
              <p className="text-slate-400 leading-relaxed">
                We implement industry-standard security measures, including encryption and secure server infrastructure, to protect your data from unauthorized access.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white">8. Your Rights</h2>
              <ul className="list-disc list-inside text-slate-400 space-y-2">
                <li><strong>Access:</strong> Request a copy of your personal data.</li>
                <li><strong>Correction:</strong> Update inaccurate information.</li>
                <li><strong>Deletion:</strong> Request deletion of your account and data.</li>
                <li><strong>Opt-out:</strong> Unsubscribe from marketing emails.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white">9. Cookies</h2>
              <p className="text-slate-400 leading-relaxed">
                We use essential cookies for authentication and session management. No third-party tracking cookies are used.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white">10. Changes to This Policy</h2>
              <p className="text-slate-400 leading-relaxed">
                We may update this Privacy Policy occasionally. We'll notify users of significant changes via email or through the Service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white">11. Contact</h2>
              <p className="text-slate-400 leading-relaxed">
                For privacy-related questions, contact us at <a href="mailto:privacy@ledgerflow.com" className="text-emerald-400 hover:underline">privacy@ledgerflow.com</a>.
              </p>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}