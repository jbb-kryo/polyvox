import { useState } from 'react';
import { ArrowLeft, FileText, Shield, ExternalLink } from 'lucide-react';

interface LegalDocumentsProps {
  initialDocument?: 'terms' | 'privacy';
  onBack?: () => void;
}

export default function LegalDocuments({ initialDocument = 'terms', onBack }: LegalDocumentsProps) {
  const [currentDoc, setCurrentDoc] = useState<'terms' | 'privacy'>(initialDocument);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900/20 to-slate-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        )}

        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <div className="border-b border-slate-700">
            <div className="flex">
              <button
                onClick={() => setCurrentDoc('terms')}
                className={`flex-1 px-6 py-4 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                  currentDoc === 'terms'
                    ? 'text-blue-400 border-b-2 border-blue-400 bg-slate-800/50'
                    : 'text-slate-400 hover:text-slate-300 hover:bg-slate-700/50'
                }`}
              >
                <FileText className="w-4 h-4" />
                Terms of Service
              </button>
              <button
                onClick={() => setCurrentDoc('privacy')}
                className={`flex-1 px-6 py-4 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                  currentDoc === 'privacy'
                    ? 'text-blue-400 border-b-2 border-blue-400 bg-slate-800/50'
                    : 'text-slate-400 hover:text-slate-300 hover:bg-slate-700/50'
                }`}
              >
                <Shield className="w-4 h-4" />
                Privacy Policy
              </button>
            </div>
          </div>

          <div className="p-8">
            {currentDoc === 'terms' ? <TermsOfService /> : <PrivacyPolicy />}
          </div>

          <div className="border-t border-slate-700 bg-slate-800/50 p-6">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Last Updated: December 30, 2024</span>
              <a
                href={`https://github.com/jbb-kryo/polyvox/blob/main/${currentDoc === 'terms' ? 'TERMS_OF_SERVICE' : 'PRIVACY_POLICY'}.md`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors"
              >
                View on GitHub
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center text-sm text-slate-500">
          <p>
            Questions? Contact us via{' '}
            <a
              href="https://github.com/jbb-kryo/polyvox/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300"
            >
              GitHub Issues
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

function TermsOfService() {
  return (
    <div className="prose prose-invert prose-slate max-w-none">
      <h1 className="text-3xl font-bold text-white mb-2">Terms of Service</h1>
      <p className="text-slate-400 mb-8">Effective Date: December 30, 2024</p>

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-4">Agreement to Terms</h2>
        <p className="text-slate-300 leading-relaxed">
          By accessing or using PolyVOX, you agree to be bound by these Terms of Service. If you disagree with any part of these Terms,
          you may not access the Platform.
        </p>
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 my-4">
          <p className="text-sm text-slate-300">
            <span className="font-semibold text-amber-400">IMPORTANT:</span> READ THESE TERMS CAREFULLY. THEY CONTAIN IMPORTANT
            INFORMATION ABOUT YOUR LEGAL RIGHTS, REMEDIES, AND OBLIGATIONS, INCLUDING VARIOUS LIMITATIONS AND EXCLUSIONS.
          </p>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-4">1. Platform Description</h2>
        <p className="text-slate-300 leading-relaxed mb-4">
          PolyVOX is an automated trading platform for Polymarket prediction markets. The Platform provides tools for market analysis,
          automated trading execution, risk management, and portfolio tracking.
        </p>
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <p className="text-sm text-red-400 font-semibold">
            THE PLATFORM DOES NOT PROVIDE INVESTMENT, FINANCIAL, LEGAL, OR TAX ADVICE. ALL CONTENT IS FOR INFORMATIONAL PURPOSES ONLY.
          </p>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-4">2. Risk Disclosure</h2>
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 mb-4">
          <p className="text-red-400 font-bold mb-2">WARNING: TRADING INVOLVES SUBSTANTIAL RISK OF LOSS</p>
          <p className="text-slate-300 text-sm">You may lose some or all of your invested capital. Key risks include:</p>
        </div>
        <ul className="space-y-2 text-slate-300">
          <li className="flex gap-2"><span className="text-red-400">•</span> Loss of Capital</li>
          <li className="flex gap-2"><span className="text-red-400">•</span> Market Volatility</li>
          <li className="flex gap-2"><span className="text-red-400">•</span> Automated Trading Risks</li>
          <li className="flex gap-2"><span className="text-red-400">•</span> Security Risks (private key loss)</li>
          <li className="flex gap-2"><span className="text-red-400">•</span> Technical Risks (platform outages)</li>
          <li className="flex gap-2"><span className="text-red-400">•</span> Regulatory Risks</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-4">3. User Responsibilities</h2>
        <div className="space-y-3 text-slate-300">
          <div>
            <h3 className="font-semibold text-white mb-2">Account Security</h3>
            <p className="text-sm">
              You are responsible for maintaining account security, safeguarding private keys, and monitoring for unauthorized activity.
              We are not responsible for losses from unauthorized access.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-white mb-2">Trading Responsibility</h3>
            <p className="text-sm">
              You are solely responsible for your trading decisions. Conduct your own research and only trade with funds you can afford to lose.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-white mb-2">Prohibited Activities</h3>
            <p className="text-sm">
              Market manipulation, unauthorized access, reverse engineering, and illegal use are strictly prohibited.
            </p>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-4">4. Disclaimers and Warranties</h2>
        <div className="bg-slate-700/50 rounded-lg p-6">
          <p className="text-slate-300 font-semibold mb-3">THE PLATFORM IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND.</p>
          <p className="text-sm text-slate-400">
            We do not warrant that the Platform will be uninterrupted, error-free, secure, or that results will be accurate.
            Use at your own risk.
          </p>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-4">5. Limitation of Liability</h2>
        <div className="bg-slate-700/50 rounded-lg p-6">
          <p className="text-slate-300 font-semibold mb-3">
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE ARE NOT LIABLE FOR:
          </p>
          <ul className="space-y-1 text-sm text-slate-400">
            <li>• Any indirect, incidental, or consequential damages</li>
            <li>• Trading losses or loss of profits</li>
            <li>• Unauthorized access to your account</li>
            <li>• Platform interruptions or outages</li>
            <li>• Third-party service failures</li>
          </ul>
          <p className="text-sm text-slate-400 mt-3">
            Our total liability shall not exceed $100 USD.
          </p>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-4">6. Key Provisions</h2>
        <div className="grid gap-4">
          <div className="border border-slate-700 rounded-lg p-4">
            <h3 className="font-semibold text-white mb-2">Indemnification</h3>
            <p className="text-sm text-slate-400">
              You agree to indemnify us from claims arising from your use of the Platform, violations of these Terms, or trading activities.
            </p>
          </div>
          <div className="border border-slate-700 rounded-lg p-4">
            <h3 className="font-semibold text-white mb-2">Dispute Resolution</h3>
            <p className="text-sm text-slate-400">
              Disputes are resolved through binding arbitration on an individual basis. Class action waiver applies.
            </p>
          </div>
          <div className="border border-slate-700 rounded-lg p-4">
            <h3 className="font-semibold text-white mb-2">Governing Law</h3>
            <p className="text-sm text-slate-400">
              These Terms are governed by the laws of the State of Delaware, United States.
            </p>
          </div>
        </div>
      </section>

      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-6 text-center">
        <p className="text-slate-300 text-sm">
          For the complete Terms of Service, please visit our{' '}
          <a
            href="https://github.com/jbb-kryo/polyvox/blob/main/TERMS_OF_SERVICE.md"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 underline"
          >
            GitHub repository
          </a>
        </p>
      </div>
    </div>
  );
}

function PrivacyPolicy() {
  return (
    <div className="prose prose-invert prose-slate max-w-none">
      <h1 className="text-3xl font-bold text-white mb-2">Privacy Policy</h1>
      <p className="text-slate-400 mb-8">Effective Date: December 30, 2024</p>

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-4">Introduction</h2>
        <p className="text-slate-300 leading-relaxed">
          PolyVOX respects your privacy and is committed to protecting your personal data. This Privacy Policy explains how we collect,
          use, disclose, and safeguard your information when you use our Platform.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-4">1. Information We Collect</h2>
        <div className="grid gap-4">
          <div className="bg-slate-700/50 rounded-lg p-4">
            <h3 className="font-semibold text-white mb-2">Account Information</h3>
            <ul className="text-sm text-slate-400 space-y-1">
              <li>• Email address</li>
              <li>• Account preferences and settings</li>
              <li>• Risk management preferences</li>
            </ul>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-4">
            <h3 className="font-semibold text-white mb-2">Wallet Information</h3>
            <ul className="text-sm text-slate-400 space-y-1">
              <li>• Wallet addresses (public keys)</li>
              <li>• Encrypted private keys (local browser storage only)</li>
              <li>• Transaction history</li>
            </ul>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-4">
            <h3 className="font-semibold text-white mb-2">Usage Data</h3>
            <ul className="text-sm text-slate-400 space-y-1">
              <li>• Trading activity and history</li>
              <li>• Feature usage statistics</li>
              <li>• Performance metrics</li>
            </ul>
          </div>
        </div>
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 mt-4">
          <p className="text-sm text-green-400 font-semibold mb-2">What We DON'T Collect:</p>
          <p className="text-sm text-slate-400">
            Private keys (unencrypted), master passwords, credit card info, biometric data, precise geolocation.
          </p>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-4">2. How We Use Your Information</h2>
        <div className="space-y-3 text-slate-300">
          <div className="flex gap-3">
            <span className="text-blue-400 font-bold">•</span>
            <div>
              <span className="font-semibold text-white">Provide the Platform:</span> Enable trading, analytics, and account management
            </div>
          </div>
          <div className="flex gap-3">
            <span className="text-blue-400 font-bold">•</span>
            <div>
              <span className="font-semibold text-white">Communication:</span> Send service updates and respond to support requests
            </div>
          </div>
          <div className="flex gap-3">
            <span className="text-blue-400 font-bold">•</span>
            <div>
              <span className="font-semibold text-white">Improvement:</span> Analyze anonymized data to improve features
            </div>
          </div>
          <div className="flex gap-3">
            <span className="text-blue-400 font-bold">•</span>
            <div>
              <span className="font-semibold text-white">Security:</span> Detect fraud and protect user safety
            </div>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-4">3. How We Share Your Information</h2>
        <div className="space-y-4">
          <div className="border border-slate-700 rounded-lg p-4">
            <h3 className="font-semibold text-white mb-2">Third-Party Service Providers</h3>
            <div className="text-sm text-slate-400 space-y-2">
              <p><span className="text-white">Supabase:</span> Data storage and authentication</p>
              <p><span className="text-white">Polymarket:</span> Trading execution</p>
              <p><span className="text-white">Blockchain Networks:</span> Transaction processing (public data)</p>
            </div>
          </div>
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
            <p className="text-sm text-green-400 font-semibold mb-2">What We DON'T Share:</p>
            <ul className="text-sm text-slate-400 space-y-1">
              <li>• We never sell your personal information</li>
              <li>• We never share your private keys</li>
              <li>• We never share data with advertisers or data brokers</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-4">4. Data Security</h2>
        <div className="bg-slate-700/50 rounded-lg p-6">
          <p className="text-slate-300 mb-4">We implement industry-standard security measures:</p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-semibold text-white mb-1">Encryption</p>
              <p className="text-slate-400">Private keys encrypted with AES-256-GCM</p>
            </div>
            <div>
              <p className="font-semibold text-white mb-1">Transmission</p>
              <p className="text-slate-400">HTTPS/TLS for all data</p>
            </div>
            <div>
              <p className="font-semibold text-white mb-1">Access Control</p>
              <p className="text-slate-400">Row-level security on databases</p>
            </div>
            <div>
              <p className="font-semibold text-white mb-1">Monitoring</p>
              <p className="text-slate-400">Security event logging and audits</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-4">5. Your Privacy Rights</h2>
        <div className="grid gap-3">
          <div className="flex gap-3 items-start">
            <span className="text-blue-400 font-bold">✓</span>
            <div className="text-sm">
              <span className="font-semibold text-white">Access:</span>
              <span className="text-slate-400"> Request a copy of your data</span>
            </div>
          </div>
          <div className="flex gap-3 items-start">
            <span className="text-blue-400 font-bold">✓</span>
            <div className="text-sm">
              <span className="font-semibold text-white">Correction:</span>
              <span className="text-slate-400"> Update inaccurate information</span>
            </div>
          </div>
          <div className="flex gap-3 items-start">
            <span className="text-blue-400 font-bold">✓</span>
            <div className="text-sm">
              <span className="font-semibold text-white">Deletion:</span>
              <span className="text-slate-400"> Request deletion of your data</span>
            </div>
          </div>
          <div className="flex gap-3 items-start">
            <span className="text-blue-400 font-bold">✓</span>
            <div className="text-sm">
              <span className="font-semibold text-white">Portability:</span>
              <span className="text-slate-400"> Export your data</span>
            </div>
          </div>
          <div className="flex gap-3 items-start">
            <span className="text-blue-400 font-bold">✓</span>
            <div className="text-sm">
              <span className="font-semibold text-white">Objection:</span>
              <span className="text-slate-400"> Opt out of analytics</span>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-4">6. Cookies and Tracking</h2>
        <div className="space-y-3 text-sm text-slate-300">
          <p><span className="font-semibold text-white">Essential Cookies:</span> Session management, authentication, security</p>
          <p><span className="font-semibold text-white">Analytics (Optional):</span> Usage statistics, performance monitoring</p>
          <p className="text-slate-400">We do NOT use advertising cookies, third-party tracking, or cross-site tracking. You can opt out of analytics in Settings.</p>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-4">7. Regional Rights</h2>
        <div className="grid gap-4">
          <div className="border border-slate-700 rounded-lg p-4">
            <h3 className="font-semibold text-white mb-2">California Residents (CCPA)</h3>
            <p className="text-sm text-slate-400">
              Right to know, delete, opt-out (we don't sell data), and non-discrimination
            </p>
          </div>
          <div className="border border-slate-700 rounded-lg p-4">
            <h3 className="font-semibold text-white mb-2">European Residents (GDPR)</h3>
            <p className="text-sm text-slate-400">
              Access, rectification, erasure, portability, objection, and complaint rights
            </p>
          </div>
        </div>
      </section>

      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-6 text-center">
        <p className="text-slate-300 text-sm">
          For the complete Privacy Policy, please visit our{' '}
          <a
            href="https://github.com/jbb-kryo/polyvox/blob/main/PRIVACY_POLICY.md"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 underline"
          >
            GitHub repository
          </a>
        </p>
      </div>
    </div>
  );
}