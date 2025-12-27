import { TrendPosition } from '../../types/trendrider';
import { TrendingUp, TrendingDown, X } from 'lucide-react';

interface TrendPositionsTableProps {
  positions: TrendPosition[];
  onClose: (positionId: string) => void;
}

export default function TrendPositionsTable({ positions, onClose }: TrendPositionsTableProps) {
  if (positions.length === 0) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 text-center">
        <p className="text-gray-400">No open positions</p>
        <p className="text-gray-500 text-sm mt-2">
          Execute trades to see your active positions here
        </p>
      </div>
    );
  }

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
                Entry Price
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Current Price
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Position Size
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                P&L
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Targets
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {positions.map((position) => {
              const holdTime = Date.now() - position.entryTime;
              const holdMinutes = Math.floor(holdTime / (1000 * 60));

              return (
                <tr key={position.id} className="hover:bg-gray-750 transition-colors">
                  <td className="px-4 py-4">
                    <p className="text-sm text-white font-medium max-w-xs truncate">
                      {position.marketQuestion}
                    </p>
                    {position.isReal && (
                      <span className="inline-block px-2 py-0.5 bg-red-600 text-white text-xs rounded mt-1">
                        REAL
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      {position.direction === 'long' ? (
                        <TrendingUp className="w-4 h-4 text-green-400" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-400" />
                      )}
                      <span className={`text-sm font-medium ${
                        position.direction === 'long' ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {position.direction.toUpperCase()}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-sm text-white font-mono">
                      ${position.entryPrice.toFixed(4)}
                    </p>
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-sm text-white font-mono">
                      ${position.currentPrice.toFixed(4)}
                    </p>
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-sm text-white font-medium">
                      ${position.positionSize.toFixed(2)}
                    </p>
                  </td>
                  <td className="px-4 py-4">
                    <p className={`text-sm font-bold ${
                      position.currentPnL >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {position.currentPnL >= 0 ? '+' : ''}${position.currentPnL.toFixed(2)}
                    </p>
                    <p className={`text-xs ${
                      position.pnLPercent >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {position.pnLPercent >= 0 ? '+' : ''}{position.pnLPercent.toFixed(2)}%
                    </p>
                  </td>
                  <td className="px-4 py-4">
                    <div className="space-y-1">
                      <p className="text-xs text-gray-400">
                        Target: <span className="text-green-400">{position.profitTarget.toFixed(1)}%</span>
                      </p>
                      <p className="text-xs text-gray-400">
                        Stop: <span className="text-red-400">-{position.stopLoss.toFixed(1)}%</span>
                      </p>
                      <p className="text-xs text-gray-500">
                        Hold: {holdMinutes}m
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <button
                      onClick={() => onClose(position.id)}
                      className="flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      <X className="w-4 h-4" />
                      Close
                    </button>
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
