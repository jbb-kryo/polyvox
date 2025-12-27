import { X, AlertTriangle, Settings, Play, Wallet, Key, ToggleLeft, BookOpen, Info } from 'lucide-react';
import { useState, useEffect } from 'react';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
  onOpenDocumentation: () => void;
}

export default function WelcomeModal({ isOpen, onClose, onOpenSettings, onOpenDocumentation }: WelcomeModalProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => setIsVisible(true), 10);
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleContinueDemo = () => {
    localStorage.setItem('polymarket_welcome_seen', 'true');
    onClose();
  };

  const handleGoToSettings = () => {
    localStorage.setItem('polymarket_welcome_seen', 'true');
    onOpenSettings();
    onClose();
  };

  const handleGoToDocumentation = () => {
    localStorage.setItem('polymarket_welcome_seen', 'true');
    onOpenDocumentation();
    onClose();
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)' }}
    >
      <div
        className={`bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-700/50 transition-all duration-300 ${
          isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
      >
        <div className="relative p-6 sm:p-8">
          <button
            onClick={handleContinueDemo}
            className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="flex items-center justify-center mb-6">
            <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 p-4 rounded-2xl border border-blue-500/30">
              <AlertTriangle className="w-12 h-12 text-blue-400" />
            </div>
          </div>

          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-3 bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400 text-transparent bg-clip-text">
            Welcome to PolyVOX
          </h2>

          <p className="text-center text-slate-300 text-lg mb-6">
            You're currently viewing in <span className="font-semibold text-yellow-400">Demo Mode</span>
          </p>

          <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-4 mb-6">
            <div className="flex gap-3">
              <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-blue-400 mb-1 text-sm sm:text-base">New to PolyVOX?</h4>
                <p className="text-blue-200/90 text-xs sm:text-sm">
                  Check out our comprehensive Getting Started guide in the Documentation section.
                  Learn about wallet setup, trading strategies, and how to grow your capital from $10 to $10,000+.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-xl p-6 mb-6 border border-slate-700/50">
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5 text-blue-400" />
              Enable Live Trading
            </h3>

            <p className="text-slate-300 mb-4 text-sm sm:text-base">
              To start trading with real funds on Polymarket, you'll need to configure your wallet:
            </p>

            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="flex-shrink-0 mt-1">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                    <Wallet className="w-4 h-4 text-blue-400" />
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-white text-sm sm:text-base">1. Connect Your Wallet</h4>
                  <p className="text-slate-400 text-xs sm:text-sm">Add your wallet address in Global Settings</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 mt-1">
                  <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
                    <Key className="w-4 h-4 text-cyan-400" />
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-white text-sm sm:text-base">2. Add Private Key (Optional)</h4>
                  <p className="text-slate-400 text-xs sm:text-sm">Enable automated trading by adding your wallet's private key</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 mt-1">
                  <div className="w-8 h-8 rounded-full bg-teal-500/20 border border-teal-500/30 flex items-center justify-center">
                    <ToggleLeft className="w-4 h-4 text-teal-400" />
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-white text-sm sm:text-base">3. Disable Demo Mode</h4>
                  <p className="text-slate-400 text-xs sm:text-sm">Toggle off demo mode in settings to enable live trading</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4 mb-6">
            <div className="flex gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-red-400 mb-2 text-sm sm:text-base">Important Disclaimer</h4>
                <p className="text-red-200/90 text-xs sm:text-sm leading-relaxed">
                  Trading cryptocurrencies and prediction markets involves substantial risk of loss.
                  This software is provided "as is" without warranty. You are solely responsible for
                  the security of your private keys and any trading decisions made. Never share your
                  private key with anyone. Only use funds you can afford to lose. Past performance
                  does not guarantee future results.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={handleGoToDocumentation}
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
            >
              <BookOpen className="w-5 h-5" />
              <span>View Getting Started Guide</span>
            </button>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleGoToSettings}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
              >
                <Settings className="w-5 h-5" />
                <span>Go to Settings</span>
              </button>

              <button
                onClick={handleContinueDemo}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
              >
                <Play className="w-5 h-5" />
                <span>Continue in Demo Mode</span>
              </button>
            </div>
          </div>

          <p className="text-center text-slate-500 text-xs mt-4">
            You can access settings and documentation anytime from the navigation menu
          </p>
        </div>
      </div>
    </div>
  );
}
