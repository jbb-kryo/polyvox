import { Copy, TrendingUp, TrendingDown, X, DollarSign, Activity } from 'lucide-react';
import { CopiedPosition } from '../../types/whalewatcher';
import { formatDistanceToNow } from '../../utils/dateFormat';

interface CopiedPositionsProps {
  positions: CopiedPosition[];
  onClosePosition: (positionId: string) => void;
}

export default function CopiedPositions({ positions, onClosePosition }: CopiedPositionsProps) {
  const openPositions = positions.filter(p => p.status === 'open');
  const closedPositions = positions.filter(p => p.status === 'closed').slice(0, 10);

  return (
    <div className="space-y-4">
      <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-green-400" />
            <h3 className="text-lg font-semibold text-white">Active Copies</h3>
            <span className="ml-auto text-xs text-gray-500">{openPositions.length} open</span>
          </div>
        </div>

        {openPositions.length === 0 ? (
          <div className="p-8 text-center">
            <Copy className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <h4 className="text-sm font-medium text-gray-400 mb-1">No Active Copies</h4>
            <p className="text-xs text-gray-500">
              Copy whale orders to see them here
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900 border-b border-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Market
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Whale
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Side
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Position
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Entry
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Current
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    P&L
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {openPositions.map((position) => (
                  <tr key={position.id} className="hover:bg-gray-750 transition-colors">
                    <td className="px-4 py-3">
                      <div className="max-w-xs">
                        <div className="text-sm font-medium text-white truncate">
                          {position.market}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatDistanceToNow(position.entryTime)}
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-xs font-mono text-gray-400">
                        {position.whaleWallet.slice(0, 6)}...{position.whaleWallet.slice(-4)}
                      </div>
                      <div className="text-xs text-gray-600">
                        ${position.whaleOrderSize.toFixed(0)} order
                      </div>
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded ${
                        position.side === 'YES' ? 'bg-green-900 bg-opacity-30 text-green-400' : 'bg-red-900 bg-opacity-30 text-red-400'
                      }`}>
                        {position.side === 'YES' ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        <span className="text-xs font-medium">{position.side}</span>
                      </div>
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <span className="text-sm font-medium text-white">
                        ${position.positionSize.toFixed(2)}
                      </span>
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <span className="text-sm text-gray-300">
                        ${position.entryPrice.toFixed(2)}
                      </span>
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <span className="text-sm text-gray-300">
                        ${position.currentPrice.toFixed(2)}
                      </span>
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <div>
                        <div className={`text-sm font-medium ${
                          position.pnl >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          ${position.pnl >= 0 ? '+' : ''}{position.pnl.toFixed(2)}
                        </div>
                        <div className={`text-xs ${
                          position.pnlPercent >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {position.pnlPercent >= 0 ? '+' : ''}{position.pnlPercent.toFixed(1)}%
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <button
                        onClick={() => onClosePosition(position.id)}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-medium transition-colors inline-flex items-center gap-1"
                      >
                        <X className="w-3 h-3" />
                        Close
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {closedPositions.length > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
          <div className="p-4 border-b border-gray-700">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-gray-400" />
              <h3 className="text-lg font-semibold text-white">Recent Closed Positions</h3>
              <span className="ml-auto text-xs text-gray-500">Last 10</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900 border-b border-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Market
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Side
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Entry / Exit
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    P&L
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Exit Reason
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {closedPositions.map((position) => (
                  <tr key={position.id} className="hover:bg-gray-750 transition-colors">
                    <td className="px-4 py-3">
                      <div className="max-w-xs">
                        <div className="text-sm text-white truncate">
                          {position.market}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatDistanceToNow(position.exitTime!)}
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded ${
                        position.side === 'YES' ? 'bg-green-900 bg-opacity-30 text-green-400' : 'bg-red-900 bg-opacity-30 text-red-400'
                      }`}>
                        {position.side === 'YES' ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        <span className="text-xs font-medium">{position.side}</span>
                      </div>
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <div className="text-sm text-gray-300">
                        ${position.entryPrice.toFixed(2)} → ${position.exitPrice?.toFixed(2)}
                      </div>
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <div>
                        <div className={`text-sm font-medium ${
                          position.pnl >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          ${position.pnl >= 0 ? '+' : ''}{position.pnl.toFixed(2)}
                        </div>
                        <div className={`text-xs ${
                          position.pnlPercent >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {position.pnlPercent >= 0 ? '+' : ''}{position.pnlPercent.toFixed(1)}%
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-xs text-gray-400">
                        {position.exitReason === 'whale_exit' && 'Whale exited'}
                        {position.exitReason === 'take_profit' && 'Take profit'}
                        {position.exitReason === 'stop_loss' && 'Stop loss'}
                        {position.exitReason === 'timeout' && 'Timeout'}
                        {position.exitReason === 'manual' && 'Manual close'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
