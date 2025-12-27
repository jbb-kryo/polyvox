import { useState } from 'react';
import { DollarSign, AlertTriangle, RefreshCw, Copy, Check, ExternalLink, ChevronDown } from 'lucide-react';
import { useBalance, formatBalance, getBalanceStatus } from '../hooks/useBalance';
import { getDepositInstructions } from '../services/polymarketTrading';

interface BalanceWidgetProps {
  walletAddress: string | null;
  onRefresh?: () => void;
}

export default function BalanceWidget({ walletAddress, onRefresh }: BalanceWidgetProps) {
  const { balance, isLoading, error, lastUpdated, isLowBalance } = useBalance(walletAddress, true, 15000);
  const [copied, setCopied] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const balanceStatus = getBalanceStatus(balance);
  const depositInfo = getDepositInstructions();

  const handleCopyAddress = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
    }
  };

  if (!walletAddress) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg">
        <DollarSign className="w-4 h-4 text-gray-400" />
        <span className="text-sm text-gray-500">Connect wallet to view balance</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        className={`flex items-center gap-3 px-4 py-2 rounded-lg border-2 transition-all cursor-pointer ${
          isLowBalance
            ? 'bg-yellow-50 border-yellow-300 hover:bg-yellow-100'
            : balance === 0
            ? 'bg-red-50 border-red-300 hover:bg-red-100'
            : 'bg-green-50 border-green-300 hover:bg-green-100'
        }`}
        onClick={() => setShowDetails(!showDetails)}
      >
        <div className="flex items-center gap-2">
          {isLowBalance || balance === 0 ? (
            <AlertTriangle className={`w-5 h-5 ${balanceStatus.color}`} />
          ) : (
            <DollarSign className={`w-5 h-5 ${balanceStatus.color}`} />
          )}
          <div className="flex flex-col">
            <span className="text-xs text-gray-600 font-medium">USDC Balance</span>
            <div className="flex items-center gap-2">
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin text-gray-400" />
              ) : error ? (
                <span className="text-sm text-red-600">Error</span>
              ) : (
                <span className={`text-lg font-bold ${balanceStatus.color}`}>
                  ${formatBalance(balance)}
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            handleRefresh();
          }}
          className="p-1 hover:bg-white rounded transition-colors"
          title="Refresh balance"
        >
          <RefreshCw className={`w-4 h-4 text-gray-600 ${isLoading ? 'animate-spin' : ''}`} />
        </button>

        <ChevronDown
          className={`w-4 h-4 text-gray-600 transition-transform ${showDetails ? 'rotate-180' : ''}`}
        />
      </div>

      {showDetails && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border-2 border-gray-200 z-50">
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b">
              <h3 className="font-semibold text-gray-900">Balance Details</h3>
              {lastUpdated && (
                <span className="text-xs text-gray-500">
                  Updated {new Date(lastUpdated).toLocaleTimeString()}
                </span>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Current Balance</span>
                <span className="text-lg font-bold text-gray-900">${formatBalance(balance)}</span>
              </div>

              {balanceStatus.status !== 'good' && (
                <div
                  className={`flex items-start gap-2 p-3 rounded-lg ${
                    balanceStatus.status === 'zero' || balanceStatus.status === 'critical'
                      ? 'bg-red-50'
                      : 'bg-yellow-50'
                  }`}
                >
                  <AlertTriangle
                    className={`w-5 h-5 mt-0.5 ${
                      balanceStatus.status === 'zero' || balanceStatus.status === 'critical'
                        ? 'text-red-600'
                        : 'text-yellow-600'
                    }`}
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {balanceStatus.status === 'zero' ? 'No Balance' : 'Low Balance Warning'}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">{balanceStatus.message}</p>
                  </div>
                </div>
              )}

              <div className="border-t pt-3">
                <h4 className="font-medium text-gray-900 mb-2">{depositInfo.title}</h4>
                <div className="space-y-2 text-sm text-gray-600">
                  {depositInfo.steps.map((step, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <span className="font-medium text-gray-900 min-w-[20px]">{index + 1}.</span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2 pt-3 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">USDC Contract</span>
                  <div className="flex items-center gap-1">
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                      {depositInfo.usdcAddress.slice(0, 6)}...{depositInfo.usdcAddress.slice(-4)}
                    </code>
                    <button
                      onClick={() => handleCopyAddress(depositInfo.usdcAddress)}
                      className="p-1 hover:bg-gray-100 rounded transition-colors"
                      title="Copy address"
                    >
                      {copied ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4 text-gray-600" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Network</span>
                  <span className="text-sm font-medium text-gray-900">{depositInfo.chainName}</span>
                </div>
              </div>

              <a
                href={depositInfo.bridgeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
              >
                Open Bridge
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      )}

      {showDetails && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowDetails(false)}
        />
      )}
    </div>
  );
}
