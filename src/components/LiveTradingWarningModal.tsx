import { AlertTriangle, X } from 'lucide-react';

interface LiveTradingWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function LiveTradingWarningModal({
  isOpen,
  onClose,
  onConfirm
}: LiveTradingWarningModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-2xl w-full border border-red-500/30 shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-400" />
            </div>
            <h2 className="text-2xl font-bold text-white">Enable Live Trading?</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <h3 className="font-bold text-red-400 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              WARNING: Real Money Trading
            </h3>
            <p className="text-red-300 text-sm">
              You are about to enable live trading mode. This will execute real blockchain transactions using your wallet funds.
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold text-white text-lg">Before enabling live trading:</h4>
            <ul className="space-y-2 text-gray-300 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-red-400 font-bold mt-0.5">•</span>
                <span>
                  <strong className="text-white">You will spend real money</strong> - All trades will execute on the Polygon blockchain using USDC
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400 font-bold mt-0.5">•</span>
                <span>
                  <strong className="text-white">Gas fees apply</strong> - Every transaction incurs blockchain gas costs
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400 font-bold mt-0.5">•</span>
                <span>
                  <strong className="text-white">Losses are real</strong> - You can lose your deposited capital
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400 font-bold mt-0.5">•</span>
                <span>
                  <strong className="text-white">No reversal</strong> - Blockchain transactions cannot be reversed
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400 font-bold mt-0.5">•</span>
                <span>
                  <strong className="text-white">Start small</strong> - Test with minimal amounts first
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400 font-bold mt-0.5">•</span>
                <span>
                  <strong className="text-white">Monitor closely</strong> - Always supervise automated trading bots
                </span>
              </li>
            </ul>
          </div>

          <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
            <p className="text-gray-300 text-sm">
              <strong className="text-white">Recommendation:</strong> Use paper trading mode to thoroughly test your strategies before risking real capital. Paper trading uses live market data without executing actual transactions.
            </p>
          </div>
        </div>

        <div className="flex gap-3 p-6 border-t border-gray-700">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition-colors"
          >
            Keep Paper Trading
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
          >
            I Understand, Enable Live Trading
          </button>
        </div>
      </div>
    </div>
  );
}
