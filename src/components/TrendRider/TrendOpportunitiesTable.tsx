import { MomentumOpportunity } from '../../types/trendrider';
import { TrendingUp, TrendingDown, Play } from 'lucide-react';

interface TrendOpportunitiesTableProps {
  opportunities: MomentumOpportunity[];
  onExecute: (opportunity: MomentumOpportunity) => void;
  isSimulation: boolean;
}

export default function TrendOpportunitiesTable({
  opportunities,
  onExecute,
  isSimulation
}: TrendOpportunitiesTableProps) {
  if (opportunities.length === 0) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 text-center">
        <TrendingUp className="w-12 h-12 text-gray-600 mx-auto mb-3" />
        <p className="text-gray-400">No momentum opportunities found</p>
        <p className="text-gray-500 text-sm mt-2">
          Adjust minimum momentum threshold or wait for market movements
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
                Current Price
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Price Change
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Momentum
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {opportunities.map((opp) => (
              <tr key={opp.id} className="hover:bg-gray-750 transition-colors">
                <td className="px-4 py-4">
                  <p className="text-sm text-white font-medium max-w-xs truncate">
                    {opp.market.question}
                  </p>
                  {opp.market.volume && (
                    <p className="text-xs text-gray-500 mt-1">
                      Volume: ${(opp.market.volume / 1000000).toFixed(2)}M
                    </p>
                  )}
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    {opp.direction === 'bullish' ? (
                      <TrendingUp className="w-4 h-4 text-green-400" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-400" />
                    )}
                    <span className={`text-sm font-medium ${
                      opp.direction === 'bullish' ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {opp.direction === 'bullish' ? 'Bullish' : 'Bearish'}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <p className="text-sm text-white font-mono">
                    ${opp.market.currentPrice.toFixed(4)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Was: ${opp.market.previousPrice.toFixed(4)}
                  </p>
                </td>
                <td className="px-4 py-4">
                  <p className={`text-sm font-medium ${
                    opp.market.priceChangePercent >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {opp.market.priceChangePercent >= 0 ? '+' : ''}
                    {opp.market.priceChangePercent.toFixed(2)}%
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {opp.market.priceChange >= 0 ? '+' : ''}${opp.market.priceChange.toFixed(4)}
                  </p>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-700 rounded-full h-2 max-w-[100px]">
                      <div
                        className={`h-2 rounded-full ${
                          opp.direction === 'bullish' ? 'bg-green-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.min(100, opp.strength * 10)}%` }}
                      />
                    </div>
                    <span className="text-sm text-white font-medium">
                      {opp.strength.toFixed(1)}%
                    </span>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <button
                    onClick={() => onExecute(opp)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isSimulation
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : 'bg-yellow-600 hover:bg-yellow-700 text-white'
                    }`}
                  >
                    <Play className="w-4 h-4" />
                    {isSimulation ? 'Simulate' : 'Execute'}
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
