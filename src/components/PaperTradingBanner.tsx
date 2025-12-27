import { AlertCircle } from 'lucide-react';

interface PaperTradingBannerProps {
  isPaperTrading: boolean;
}

export default function PaperTradingBanner({ isPaperTrading }: PaperTradingBannerProps) {
  if (!isPaperTrading) return null;

  return (
    <div className="bg-yellow-500/10 border-b border-yellow-500/20 backdrop-blur-sm">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center gap-3 py-2.5">
          <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
          <div className="flex items-center gap-2 flex-wrap justify-center">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-yellow-400/20 text-yellow-300 border border-yellow-400/30">
              PAPER TRADING MODE
            </span>
            <span className="text-sm text-yellow-200">
              Using real market data without executing actual blockchain transactions
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
