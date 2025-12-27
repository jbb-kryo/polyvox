import { ArbitrageTrade } from '../../types/arbitrage';
import { History } from 'lucide-react';

interface ArbitrageTradeHistoryProps {
  trades: ArbitrageTrade[];
}

export default function ArbitrageTradeHistory({ trades }: ArbitrageTradeHistoryProps) {
  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m`;
  };

  if (trades.length === 0) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 text-center">
        <History className="w-12 h-12 text-gray-600 mx-auto mb-3" />
        <p className="text-gray-400">No trade history yet</p>
        <p className="text-gray-500 text-sm mt-1">Completed trades will appear here</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-900">
            <tr>
              <th className="text-left py-3 px-4 text-xs font-medium text-gray-400">Date</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-gray-400">Market Pair</th>
              <th className="text-right py-3 px-4 text-xs font-medium text-gray-400">Entry</th>
              <th className="text-right py-3 px-4 text-xs font-medium text-gray-400">Exit</th>
              <th className="text-right py-3 px-4 text-xs font-medium text-gray-400">Profit</th>
              <th className="text-right py-3 px-4 text-xs font-medium text-gray-400">Duration</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {trades.slice().reverse().map((trade) => (
              <tr key={trade.id} className="hover:bg-gray-750">
                <td className="py-3 px-4">
                  <div className="text-xs text-gray-300">
                    {new Date(trade.exitTime).toLocaleDateString()}
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(trade.exitTime).toLocaleTimeString()}
                  </div>
                </td>
                <td className="py-3 px-4">
                  <p className="text-sm text-white">{trade.marketPair}</p>
                  <p className="text-xs text-gray-400">${trade.positionSize.toFixed(2)}</p>
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="text-xs text-gray-300">
                    <div>${trade.entryPrices.market1.toFixed(2)}</div>
                    <div>${trade.entryPrices.market2.toFixed(2)}</div>
                  </div>
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="text-xs text-gray-300">
                    <div>${trade.exitPrices.market1.toFixed(2)}</div>
                    <div>${trade.exitPrices.market2.toFixed(2)}</div>
                  </div>
                </td>
                <td className="py-3 px-4 text-right">
                  <div className={`font-bold text-sm ${
                    trade.profit >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {trade.profit >= 0 ? '+' : ''}${trade.profit.toFixed(2)}
                  </div>
                  <div className={`text-xs ${
                    trade.profitPercent >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {trade.profitPercent >= 0 ? '+' : ''}{trade.profitPercent.toFixed(2)}%
                  </div>
                </td>
                <td className="py-3 px-4 text-right">
                  <span className="text-xs text-gray-400">
                    {formatDuration(trade.duration)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
