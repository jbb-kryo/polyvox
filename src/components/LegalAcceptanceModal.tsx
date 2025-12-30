import { useState } from 'react';
import { X, AlertTriangle, FileText, Shield, ScrollText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface LegalAcceptanceModalProps {
  isOpen: boolean;
  onAccept: () => void;
  userId: string;
}

const CURRENT_TERMS_VERSION = '1.0.0';
const CURRENT_PRIVACY_VERSION = '1.0.0';

export default function LegalAcceptanceModal({ isOpen, onAccept, userId }: LegalAcceptanceModalProps) {
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [acceptedRisks, setAcceptedRisks] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentTab, setCurrentTab] = useState<'overview' | 'terms' | 'privacy' | 'risks'>('overview');

  if (!isOpen) return null;

  const canProceed = acceptedTerms && acceptedPrivacy && acceptedRisks;

  const handleAccept = async () => {
    if (!canProceed) {
      toast.error('Please review and accept all agreements to continue');
      return;
    }

    setIsSubmitting(true);

    try {
      const userAgent = navigator.userAgent;

      await supabase.rpc('record_legal_agreement', {
        p_user_id: userId,
        p_agreement_type: 'terms',
        p_version: CURRENT_TERMS_VERSION,
        p_user_agent: userAgent
      });

      await supabase.rpc('record_legal_agreement', {
        p_user_id: userId,
        p_agreement_type: 'privacy',
        p_version: CURRENT_PRIVACY_VERSION,
        p_user_agent: userAgent
      });

      await supabase.rpc('record_legal_agreement', {
        p_user_id: userId,
        p_agreement_type: 'risk_disclaimer',
        p_version: CURRENT_TERMS_VERSION,
        p_user_agent: userAgent
      });

      toast.success('Thank you for accepting our terms');
      onAccept();
    } catch (error) {
      console.error('Error recording legal acceptance:', error);
      toast.error('Failed to record acceptance. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDocument = (doc: 'terms' | 'privacy') => {
    const url = doc === 'terms'
      ? 'https://github.com/jbb-kryo/polyvox/blob/main/TERMS_OF_SERVICE.md'
      : 'https://github.com/jbb-kryo/polyvox/blob/main/PRIVACY_POLICY.md';
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
      <div className="bg-slate-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col border border-slate-700">
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <ScrollText className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Welcome to PolyVOX</h2>
                <p className="text-sm text-slate-400 mt-1">Please review and accept our terms to continue</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex border-b border-slate-700">
          <button
            onClick={() => setCurrentTab('overview')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              currentTab === 'overview'
                ? 'text-blue-400 border-b-2 border-blue-400 bg-slate-800/50'
                : 'text-slate-400 hover:text-slate-300 hover:bg-slate-700/50'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setCurrentTab('risks')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              currentTab === 'risks'
                ? 'text-red-400 border-b-2 border-red-400 bg-slate-800/50'
                : 'text-slate-400 hover:text-slate-300 hover:bg-slate-700/50'
            }`}
          >
            Risk Disclaimer
          </button>
          <button
            onClick={() => setCurrentTab('terms')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              currentTab === 'terms'
                ? 'text-blue-400 border-b-2 border-blue-400 bg-slate-800/50'
                : 'text-slate-400 hover:text-slate-300 hover:bg-slate-700/50'
            }`}
          >
            Terms of Service
          </button>
          <button
            onClick={() => setCurrentTab('privacy')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              currentTab === 'privacy'
                ? 'text-blue-400 border-b-2 border-blue-400 bg-slate-800/50'
                : 'text-slate-400 hover:text-slate-300 hover:bg-slate-700/50'
            }`}
          >
            Privacy Policy
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {currentTab === 'overview' && (
            <div className="space-y-6">
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-6">
                <div className="flex items-start gap-4">
                  <FileText className="w-8 h-8 text-blue-400 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">Welcome to Automated Trading</h3>
                    <p className="text-slate-300 leading-relaxed">
                      PolyVOX is an automated trading platform for Polymarket prediction markets. Before you begin,
                      please carefully review our legal documents and risk disclosures.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="border border-slate-700 rounded-lg p-5 hover:border-slate-600 transition-colors">
                  <div className="flex items-start gap-3">
                    <ScrollText className="w-5 h-5 text-blue-400 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-white mb-1">Terms of Service</h4>
                      <p className="text-sm text-slate-400 mb-3">
                        Governs your use of PolyVOX, including account terms, user responsibilities, and liability limitations.
                      </p>
                      <button
                        onClick={() => openDocument('terms')}
                        className="text-sm text-blue-400 hover:text-blue-300 font-medium"
                      >
                        Read Full Document →
                      </button>
                    </div>
                  </div>
                </div>

                <div className="border border-slate-700 rounded-lg p-5 hover:border-slate-600 transition-colors">
                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-blue-400 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-white mb-1">Privacy Policy</h4>
                      <p className="text-sm text-slate-400 mb-3">
                        Explains how we collect, use, and protect your personal information. Your privacy is important to us.
                      </p>
                      <button
                        onClick={() => openDocument('privacy')}
                        className="text-sm text-blue-400 hover:text-blue-300 font-medium"
                      >
                        Read Full Document →
                      </button>
                    </div>
                  </div>
                </div>

                <div className="border border-red-500/30 bg-red-500/5 rounded-lg p-5">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-white mb-1">Risk Disclaimer</h4>
                      <p className="text-sm text-slate-400 mb-3">
                        Trading involves substantial risk of loss. You must understand and accept these risks before using the platform.
                      </p>
                      <button
                        onClick={() => setCurrentTab('risks')}
                        className="text-sm text-red-400 hover:text-red-300 font-medium"
                      >
                        View Risk Disclosure →
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                <div className="flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-slate-300">
                    <p className="font-medium text-white mb-1">Important Notice</p>
                    <p>
                      By clicking "I Accept", you acknowledge that you have read, understood, and agree to be bound by our
                      Terms of Service and Privacy Policy, and that you understand the risks associated with trading.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentTab === 'risks' && (
            <div className="space-y-4">
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                  <h3 className="text-xl font-bold text-white">Risk Disclosure</h3>
                </div>
                <p className="text-slate-300 font-medium">
                  WARNING: Trading prediction markets involves substantial risk of loss. Please read carefully.
                </p>
              </div>

              <div className="space-y-3 text-slate-300">
                <div className="border-l-4 border-red-500 pl-4 py-2">
                  <h4 className="font-semibold text-white mb-1">Loss of Capital</h4>
                  <p className="text-sm">You may lose some or all of your invested capital. Never invest more than you can afford to lose.</p>
                </div>

                <div className="border-l-4 border-red-500 pl-4 py-2">
                  <h4 className="font-semibold text-white mb-1">Market Volatility</h4>
                  <p className="text-sm">Prediction market prices can fluctuate rapidly and unpredictably based on events and news.</p>
                </div>

                <div className="border-l-4 border-red-500 pl-4 py-2">
                  <h4 className="font-semibold text-white mb-1">Automated Trading Risks</h4>
                  <p className="text-sm">Automated strategies may execute trades at unintended prices or times. Always monitor your positions.</p>
                </div>

                <div className="border-l-4 border-red-500 pl-4 py-2">
                  <h4 className="font-semibold text-white mb-1">Technical Risks</h4>
                  <p className="text-sm">Platform outages, bugs, or blockchain issues may impact your ability to trade or manage positions.</p>
                </div>

                <div className="border-l-4 border-red-500 pl-4 py-2">
                  <h4 className="font-semibold text-white mb-1">Security Risks</h4>
                  <p className="text-sm">Loss of private keys or master password results in permanent loss of funds. We cannot recover lost keys.</p>
                </div>

                <div className="border-l-4 border-red-500 pl-4 py-2">
                  <h4 className="font-semibold text-white mb-1">No Guarantee of Profits</h4>
                  <p className="text-sm">Past performance is not indicative of future results. No trading strategy guarantees profits.</p>
                </div>

                <div className="border-l-4 border-red-500 pl-4 py-2">
                  <h4 className="font-semibold text-white mb-1">Regulatory Risk</h4>
                  <p className="text-sm">Regulatory changes may affect the availability or legality of prediction markets in your jurisdiction.</p>
                </div>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                <p className="text-sm text-slate-300">
                  <span className="font-semibold text-white">Recommendation:</span> Start with paper trading mode to familiarize
                  yourself with the platform before risking real funds. Set appropriate risk limits and never trade with funds
                  you cannot afford to lose.
                </p>
              </div>
            </div>
          )}

          {currentTab === 'terms' && (
            <div className="space-y-4">
              <div className="bg-slate-700/50 rounded-lg p-6">
                <h3 className="text-xl font-bold text-white mb-4">Terms of Service Summary</h3>
                <div className="space-y-3 text-sm text-slate-300">
                  <p><span className="font-semibold text-white">Account Responsibility:</span> You are responsible for maintaining account security and safeguarding your private keys.</p>
                  <p><span className="font-semibold text-white">Trading Responsibility:</span> All trading decisions are yours alone. We provide no investment advice.</p>
                  <p><span className="font-semibold text-white">Prohibited Activities:</span> Market manipulation, unauthorized access, and illegal use are strictly prohibited.</p>
                  <p><span className="font-semibold text-white">Limitation of Liability:</span> We are not liable for trading losses, platform outages, or third-party service issues.</p>
                  <p><span className="font-semibold text-white">No Warranty:</span> The platform is provided "as is" without warranties of any kind.</p>
                  <p><span className="font-semibold text-white">Termination:</span> We may suspend or terminate your account for violations of these terms.</p>
                  <p><span className="font-semibold text-white">Dispute Resolution:</span> Disputes are resolved through binding arbitration on an individual basis.</p>
                </div>
              </div>

              <div className="flex justify-center">
                <button
                  onClick={() => openDocument('terms')}
                  className="px-6 py-3 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg font-medium transition-colors"
                >
                  Read Full Terms of Service →
                </button>
              </div>
            </div>
          )}

          {currentTab === 'privacy' && (
            <div className="space-y-4">
              <div className="bg-slate-700/50 rounded-lg p-6">
                <h3 className="text-xl font-bold text-white mb-4">Privacy Policy Summary</h3>
                <div className="space-y-3 text-sm text-slate-300">
                  <p><span className="font-semibold text-white">Data Collection:</span> We collect email, wallet addresses, trading history, and usage data.</p>
                  <p><span className="font-semibold text-white">Private Keys:</span> Private keys are encrypted locally in your browser. We never access them in unencrypted form.</p>
                  <p><span className="font-semibold text-white">Data Usage:</span> We use your data to provide the platform, improve features, and ensure security.</p>
                  <p><span className="font-semibold text-white">Third Parties:</span> We share data with Supabase (hosting) and Polymarket (trading). We never sell your data.</p>
                  <p><span className="font-semibold text-white">Your Rights:</span> You can access, correct, delete, and export your data at any time.</p>
                  <p><span className="font-semibold text-white">Cookies:</span> We use essential cookies for authentication. You can opt out of optional analytics.</p>
                  <p><span className="font-semibold text-white">Security:</span> We use encryption, secure storage, and regular security audits to protect your data.</p>
                </div>
              </div>

              <div className="flex justify-center">
                <button
                  onClick={() => openDocument('privacy')}
                  className="px-6 py-3 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg font-medium transition-colors"
                >
                  Read Full Privacy Policy →
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-slate-700 p-6 space-y-4 bg-slate-800/50">
          <div className="space-y-3">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-slate-600 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-800"
              />
              <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
                I have read and agree to the{' '}
                <button
                  onClick={() => openDocument('terms')}
                  className="text-blue-400 hover:text-blue-300 underline"
                >
                  Terms of Service
                </button>
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={acceptedPrivacy}
                onChange={(e) => setAcceptedPrivacy(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-slate-600 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-800"
              />
              <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
                I have read and agree to the{' '}
                <button
                  onClick={() => openDocument('privacy')}
                  className="text-blue-400 hover:text-blue-300 underline"
                >
                  Privacy Policy
                </button>
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={acceptedRisks}
                onChange={(e) => setAcceptedRisks(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-slate-600 text-red-500 focus:ring-red-500 focus:ring-offset-slate-800"
              />
              <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
                I understand and accept the risks associated with trading, including the possibility of losing my entire investment
              </span>
            </label>
          </div>

          <button
            onClick={handleAccept}
            disabled={!canProceed || isSubmitting}
            className={`w-full py-3 px-4 rounded-lg font-semibold transition-all ${
              canProceed && !isSubmitting
                ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
            }`}
          >
            {isSubmitting ? 'Processing...' : 'I Accept - Continue to PolyVOX'}
          </button>

          <p className="text-xs text-center text-slate-500">
            By continuing, you confirm that you are at least 18 years old and have the legal capacity to enter into this agreement.
          </p>
        </div>
      </div>
    </div>
  );
}