import { TrendingUp, TrendingDown, Package } from 'lucide-react';
import { SnipePosition } from '../../types/snipemaster';

interface SnipePositionsTableProps {
  positions: SnipePosition[];
}

export default function SnipePositionsTable({ positions }: SnipePositionsTableProps) {
  const formatTime = (date: Date) => {
    return new Date(date).toLocaleString();
  };

  if (positions.length === 0) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 text-center">
        <Package className="w-12 h-12 text-gray-600 mx-auto mb-3" />
        <p className="text-gray-400">No filled positions</p>
        <p className="text-gray-500 text-sm mt-1">Filled positions will appear here</p>
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
                Entry Price
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Current Price
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
                Opened
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {positions.map((position) => (
              <tr key={position.id} className="hover:bg-gray-750 transition-colors">
                <td className="px-4 py-4">
                  <div className="text-sm font-medium text-white max-w-xs truncate">
                    {position.marketTitle}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-1">
                    {position.side === 'yes' ? (
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
                    ${position.entryPrice.toFixed(2)}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <span className="text-sm text-gray-300 font-mono">
                    ${position.currentPrice.toFixed(2)}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <span className="text-sm text-white font-mono">
                    ${position.size.toFixed(2)}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <span className={`text-sm font-semibold ${position.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    ${position.pnl.toFixed(2)}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <span className={`text-sm font-semibold ${position.pnlPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {position.pnlPercent >= 0 ? '+' : ''}{position.pnlPercent.toFixed(2)}%
                  </span>
                </td>
                <td className="px-4 py-4">
                  <span className="text-sm text-gray-400">
                    {formatTime(position.openedAt)}
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
