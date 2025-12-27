import { TrendTrade } from '../../types/trendrider';
import { TrendingUp, TrendingDown, Target, Shield, Clock, ExternalLink } from 'lucide-react';

interface TrendTradeHistoryProps {
  trades: TrendTrade[];
}

export default function TrendTradeHistory({ trades }: TrendTradeHistoryProps) {
  if (trades.length === 0) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 text-center">
        <p className="text-gray-400">No trade history</p>
        <p className="text-gray-500 text-sm mt-2">
          Your closed positions will appear here
        </p>
      </div>
    );
  }

  const getExitReasonBadge = (reason: TrendTrade['exitReason']) => {
    const badges = {
      profit_target: { icon: Target, color: 'bg-green-600', text: 'Profit Target' },
      stop_loss: { icon: Shield, color: 'bg-red-600', text: 'Stop Loss' },
      trailing_stop: { icon: Shield, color: 'bg-yellow-600', text: 'Trailing Stop' },
      time_limit: { icon: Clock, color: 'bg-blue-600', text: 'Time Limit' },
      manual: { icon: Clock, color: 'bg-gray-600', text: 'Manual' }
    };

    const badge = badges[reason];
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 ${badge.color} text-white text-xs rounded`}>
        <Icon className="w-3 h-3" />
        {badge.text}
      </span>
    );
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-900 border-b border-gray-700">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Market
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Direction
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Entry / Exit
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Size
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Profit
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Exit Reason
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Duration
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {trades.map((trade) => {
              const durationMinutes = Math.floor(trade.duration / (1000 * 60));
              const netProfit = trade.netProfit !== undefined ? trade.netProfit : trade.profit;

              return (
                <tr key={trade.id} className="hover:bg-gray-750 transition-colors">
                  <td className="px-4 py-4">
                    <p className="text-sm text-white font-medium max-w-xs truncate">
                      {trade.marketQuestion}
                    </p>
                    {trade.isReal && (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="inline-block px-2 py-0.5 bg-red-600 text-white text-xs rounded">
                          REAL
                        </span>
                        {trade.txHashes && trade.txHashes.length > 0 && (
                          <a
                            href={`https://polygonscan.com/tx/${trade.txHashes[0]}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 transition-colors"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      {trade.direction === 'long' ? (
                        <TrendingUp className="w-4 h-4 text-green-400" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-400" />
                      )}
                      <span className={`text-sm font-medium ${
                        trade.direction === 'long' ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {trade.direction.toUpperCase()}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-sm text-white font-mono">
                      ${trade.entryPrice.toFixed(4)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      → ${trade.exitPrice.toFixed(4)}
                    </p>
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-sm text-white font-medium">
                      ${trade.positionSize.toFixed(2)}
                    </p>
                  </td>
                  <td className="px-4 py-4">
                    <p className={`text-sm font-bold ${
                      netProfit >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {netProfit >= 0 ? '+' : ''}${netProfit.toFixed(2)}
                    </p>
                    <p className={`text-xs ${
                      trade.profitPercent >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {trade.profitPercent >= 0 ? '+' : ''}{trade.profitPercent.toFixed(2)}%
                    </p>
                    {trade.isReal && (trade.fees || trade.gasCosts) && (
                      <p className="text-xs text-gray-500 mt-1">
                        Fees: ${((trade.fees || 0) + (trade.gasCosts || 0)).toFixed(4)}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    {getExitReasonBadge(trade.exitReason)}
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-sm text-white">
                      {durationMinutes}m
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(trade.exitTime).toLocaleTimeString()}
                    </p>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
