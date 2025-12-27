import { AlertTriangle, ExternalLink, TrendingUp } from 'lucide-react';
import { getDepositInstructions, calculateMinimumBalance } from '../services/polymarketTrading';

interface InsufficientFundsAlertProps {
  currentBalance: number;
  requiredAmount: number;
  shortfall: number;
  averageTradeSize?: number;
  onClose?: () => void;
}

export default function InsufficientFundsAlert({
  currentBalance,
  requiredAmount,
  shortfall,
  averageTradeSize = 50,
  onClose
}: InsufficientFundsAlertProps) {
  const depositInfo = getDepositInstructions();
  const recommendedBalance = calculateMinimumBalance(averageTradeSize);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-100 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Insufficient Funds</h2>
                <p className="text-sm text-gray-600">You need more USDC to complete this trade</p>
              </div>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          <div className="space-y-4 mb-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">Current Balance</p>
                <p className="text-lg font-bold text-gray-900">${currentBalance.toFixed(2)}</p>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">Required Amount</p>
                <p className="text-lg font-bold text-red-600">${requiredAmount.toFixed(2)}</p>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">Shortfall</p>
                <p className="text-lg font-bold text-orange-600">${shortfall.toFixed(2)}</p>
              </div>
            </div>

            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <TrendingUp className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-900 mb-1">Recommended Balance</p>
                  <p className="text-sm text-blue-700">
                    For optimal trading with average position size of ${averageTradeSize}, we recommend maintaining
                    at least <span className="font-bold">${recommendedBalance.toFixed(2)} USDC</span> in your wallet.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="font-semibold text-gray-900 mb-3">{depositInfo.title}</h3>
            <div className="space-y-2 mb-6">
              {depositInfo.steps.map((step, index) => (
                <div key={index} className="flex items-start gap-3 text-sm">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold text-xs">
                    {index + 1}
                  </div>
                  <p className="text-gray-700 pt-0.5">{step}</p>
                </div>
              ))}
            </div>

            <div className="bg-gray-50 rounded-lg p-4 space-y-2 mb-6">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">USDC Contract Address</span>
                <code className="bg-white px-2 py-1 rounded border text-xs">
                  {depositInfo.usdcAddress}
                </code>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Network</span>
                <span className="font-medium text-gray-900">{depositInfo.chainName}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Chain ID</span>
                <span className="font-medium text-gray-900">137</span>
              </div>
            </div>

            <div className="flex gap-3">
              <a
                href={depositInfo.bridgeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
              >
                Open Polygon Bridge
                <ExternalLink className="w-4 h-4" />
              </a>
              {onClose && (
                <button
                  onClick={onClose}
                  className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors font-medium"
                >
                  Close
                </button>
              )}
            </div>

            <p className="text-xs text-gray-500 text-center mt-4">
              After depositing, your balance will update automatically within 1-2 minutes
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
