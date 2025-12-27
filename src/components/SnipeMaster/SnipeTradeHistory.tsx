import { History, TrendingUp, TrendingDown } from 'lucide-react';

interface Trade {
  id: string;
  marketTitle: string;
  side: 'yes' | 'no';
  entryPrice: number;
  exitPrice: number;
  size: number;
  pnl: number;
  pnlPercent: number;
  executedAt: Date;
}

interface SnipeTradeHistoryProps {
  trades: Trade[];
}

export default function SnipeTradeHistory({ trades }: SnipeTradeHistoryProps) {
  const formatTime = (date: Date) => {
    return new Date(date).toLocaleString();
  };

  if (trades.length === 0) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 text-center">
        <History className="w-12 h-12 text-gray-600 mx-auto mb-3" />
        <p className="text-gray-400">No trade history</p>
        <p className="text-gray-500 text-sm mt-1">Completed trades will appear here</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-750">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Market
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Side
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Entry
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Exit
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Size
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                P&L
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                P&L %
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Executed
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {trades.map((trade) => (
              <tr key={trade.id} className="hover:bg-gray-750 transition-colors">
                <td className="px-4 py-4">
                  <div className="text-sm font-medium text-white max-w-xs truncate">
                    {trade.marketTitle}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-1">
                    {trade.side === 'yes' ? (
                      <>
                        <TrendingUp className="w-4 h-4 text-green-400" />
                        <span className="text-sm text-green-400">Yes</span>
                      </>
                    ) : (
                      <>
                        <TrendingDown className="w-4 h-4 text-red-400" />
                        <span className="text-sm text-red-400">No</span>
                      </>
                    )}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <span className="text-sm text-white font-mono">
                    ${trade.entryPrice.toFixed(2)}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <span className="text-sm text-white font-mono">
                    ${trade.exitPrice.toFixed(2)}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <span className="text-sm text-white font-mono">
                    ${trade.size.toFixed(2)}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <span className={`text-sm font-semibold ${trade.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    ${trade.pnl.toFixed(2)}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <span className={`text-sm font-semibold ${trade.pnlPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {trade.pnlPercent >= 0 ? '+' : ''}{trade.pnlPercent.toFixed(2)}%
                  </span>
                </td>
                <td className="px-4 py-4">
                  <span className="text-sm text-gray-400">
                    {formatTime(trade.executedAt)}
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
