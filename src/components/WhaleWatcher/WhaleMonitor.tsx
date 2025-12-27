import { Clock, TrendingUp, TrendingDown, Copy, X, Waves } from 'lucide-react';
import { WhaleOrder } from '../../types/whalewatcher';
import { formatDistanceToNow } from '../../utils/dateFormat';

interface WhaleMonitorProps {
  orders: WhaleOrder[];
  onCopyWhale: (order: WhaleOrder) => void;
  onIgnoreWhale: (orderId: string) => void;
  realTradingMode: boolean;
}

export default function WhaleMonitor({
  orders,
  onCopyWhale,
  onIgnoreWhale,
  realTradingMode
}: WhaleMonitorProps) {
  if (orders.length === 0) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-8">
        <div className="text-center">
          <Waves className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-400 mb-2">No Whale Activity</h3>
          <p className="text-sm text-gray-500">
            Scanning for large orders... Refresh to check for new whales.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Waves className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg font-semibold text-white">Live Whale Feed</h3>
          <span className="ml-auto text-xs text-gray-500">{orders.length} detected</span>
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto">
        <div className="divide-y divide-gray-700">
          {orders.map((order) => (
            <div
              key={order.id}
              className={`p-4 hover:bg-gray-750 transition-colors ${
                order.status === 'copied' ? 'bg-green-900 bg-opacity-10' :
                order.status === 'ignored' ? 'bg-gray-900 bg-opacity-50' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    <span className="text-xs text-gray-500">
                      {formatDistanceToNow(order.timestamp)}
                    </span>
                    {order.walletLabel && (
                      <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded">
                        {order.walletLabel}
                      </span>
                    )}
                    {order.status === 'copied' && (
                      <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded">
                        Copied
                      </span>
                    )}
                  </div>

                  <h4 className="text-sm font-medium text-white mb-1 truncate">
                    {order.market}
                  </h4>

                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span className="font-mono">
                      {order.walletAddress.slice(0, 6)}...{order.walletAddress.slice(-4)}
                    </span>
                    <span className="text-gray-600">•</span>
                    <div className={`flex items-center gap-1 ${
                      order.side === 'YES' ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {order.side === 'YES' ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      <span className="font-medium">{order.side}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <div className="text-lg font-bold text-white mb-1">
                    ${order.size.toFixed(0)}
                  </div>
                  <div className="text-xs text-gray-500">
                    @ ${order.price.toFixed(2)}
                  </div>
                  {order.priceImpact > 0 && (
                    <div className="text-xs text-orange-400 mt-1">
                      {order.priceImpact.toFixed(1)}% impact
                    </div>
                  )}
                </div>

                {order.status === 'detected' && (
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => onCopyWhale(order)}
                      disabled={realTradingMode}
                      className="px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded text-xs font-medium transition-colors flex items-center gap-1"
                      title={realTradingMode ? 'Disable real trading mode to copy' : 'Copy this whale'}
                    >
                      <Copy className="w-3 h-3" />
                      Copy
                    </button>
                    <button
                      onClick={() => onIgnoreWhale(order.id)}
                      className="px-2 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs transition-colors"
                      title="Ignore this order"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
