import { ArbitragePosition } from '../../types/arbitrage';
import { TrendingUp, TrendingDown, X } from 'lucide-react';

interface ArbitragePositionsTableProps {
  positions: ArbitragePosition[];
  onClose: (positionId: string) => void;
}

export default function ArbitragePositionsTable({
  positions,
  onClose
}: ArbitragePositionsTableProps) {
  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  if (positions.length === 0) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 text-center">
        <p className="text-gray-400">No active positions</p>
        <p className="text-gray-500 text-sm mt-1">Execute a trade to see it here</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-900">
            <tr>
              <th className="text-left py-3 px-4 text-xs font-medium text-gray-400">Market Pair</th>
              <th className="text-right py-3 px-4 text-xs font-medium text-gray-400">Entry</th>
              <th className="text-right py-3 px-4 text-xs font-medium text-gray-400">Current</th>
              <th className="text-right py-3 px-4 text-xs font-medium text-gray-400">P&L</th>
              <th className="text-right py-3 px-4 text-xs font-medium text-gray-400">Time</th>
              <th className="text-center py-3 px-4 text-xs font-medium text-gray-400">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {positions.map((position) => (
              <tr key={position.id} className="hover:bg-gray-750">
                <td className="py-4 px-4">
                  <p className="text-white text-sm font-medium">{position.marketPair}</p>
                  <p className="text-xs text-gray-400">${position.positionSize.toFixed(2)} position</p>
                </td>
                <td className="py-4 px-4 text-right">
                  <div className="text-xs text-gray-300">
                    <div>${position.entryPrices.market1.toFixed(2)}</div>
                    <div>${position.entryPrices.market2.toFixed(2)}</div>
                  </div>
                </td>
                <td className="py-4 px-4 text-right">
                  <div className="text-xs text-gray-300">
                    <div>${position.currentPrices.market1.toFixed(2)}</div>
                    <div>${position.currentPrices.market2.toFixed(2)}</div>
                  </div>
                </td>
                <td className="py-4 px-4 text-right">
                  <div className={`font-bold ${
                    position.currentPnL >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {position.currentPnL >= 0 ? '+' : ''}${position.currentPnL.toFixed(2)}
                  </div>
                  <div className={`text-xs ${
                    position.pnLPercent >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {position.pnLPercent >= 0 ? '+' : ''}{position.pnLPercent.toFixed(2)}%
                  </div>
                </td>
                <td className="py-4 px-4 text-right">
                  <span className="text-xs text-gray-400">
                    {formatDuration(Date.now() - position.entryTime)}
                  </span>
                </td>
                <td className="py-4 px-4 text-center">
                  <button
                    onClick={() => onClose(position.id)}
                    className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                    title="Close Position"
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
