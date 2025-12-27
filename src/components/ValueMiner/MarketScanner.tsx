import { TrendingUp, Filter, BarChart3 } from 'lucide-react';
import { ValueMarket } from '../../types/valueminer';

interface MarketScannerProps {
  markets: ValueMarket[];
  onTakePosition: (market: ValueMarket) => void;
}

export default function MarketScanner({ markets, onTakePosition }: MarketScannerProps) {
  const formatPercent = (val: number) => `${val >= 0 ? '+' : ''}${val.toFixed(2)}%`;
  const formatOdds = (odds: number) => `${(odds * 100).toFixed(1)}%`;

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg">
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-5 h-5 text-green-400" />
            <h3 className="text-lg font-semibold text-white">Market Scanner</h3>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-400">{markets.length} markets</span>
          </div>
        </div>
      </div>

      <div className="overflow-auto max-h-96">
        <table className="w-full">
          <thead className="bg-gray-900 sticky top-0">
            <tr>
              <th className="text-left p-3 text-xs font-medium text-gray-400">Market</th>
              <th className="text-left p-3 text-xs font-medium text-gray-400">Category</th>
              <th className="text-right p-3 text-xs font-medium text-gray-400">PM Odds</th>
              <th className="text-right p-3 text-xs font-medium text-gray-400">True Prob</th>
              <th className="text-right p-3 text-xs font-medium text-gray-400">Edge</th>
              <th className="text-right p-3 text-xs font-medium text-gray-400">Side</th>
              <th className="text-right p-3 text-xs font-medium text-gray-400">Volume</th>
              <th className="text-left p-3 text-xs font-medium text-gray-400">Source</th>
              <th className="text-right p-3 text-xs font-medium text-gray-400">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {markets.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center p-8 text-gray-500">
                  No markets found. Adjust filters or wait for data refresh.
                </td>
              </tr>
            ) : (
              markets.map((market) => (
                <tr key={market.id} className="hover:bg-gray-750 transition-colors">
                  <td className="p-3 text-sm text-gray-300 max-w-xs truncate">
                    {market.market_question}
                  </td>
                  <td className="p-3">
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-900 bg-opacity-30 text-blue-400">
                      {market.category}
                    </span>
                  </td>
                  <td className="p-3 text-right text-sm text-gray-300">
                    {market.best_side === 'YES' ? formatOdds(market.pm_yes_odds) : formatOdds(market.pm_no_odds)}
                  </td>
                  <td className="p-3 text-right text-sm text-gray-300">
                    {market.true_probability ? formatOdds(market.true_probability) : '-'}
                  </td>
                  <td className="p-3 text-right">
                    {market.best_edge !== null ? (
                      <span className={`font-bold text-sm ${
                        market.best_edge > 10 ? 'text-green-400' :
                        market.best_edge > 5 ? 'text-yellow-400' :
                        'text-orange-400'
                      }`}>
                        {formatPercent(market.best_edge)}
                      </span>
                    ) : (
                      <span className="text-gray-500 text-sm">-</span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                      market.best_side === 'YES'
                        ? 'bg-green-900 bg-opacity-30 text-green-400'
                        : 'bg-red-900 bg-opacity-30 text-red-400'
                    }`}>
                      {market.best_side || '-'}
                    </span>
                  </td>
                  <td className="p-3 text-right text-sm text-gray-400">
                    ${(market.volume_24h / 1000).toFixed(0)}k
                  </td>
                  <td className="p-3 text-xs text-gray-500">
                    {market.data_source || '-'}
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => onTakePosition(market)}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded transition-colors"
                    >
                      <TrendingUp className="w-3 h-3" />
                      Take
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
