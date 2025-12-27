import { ModulePerformance } from '../../types/analytics';
import { BarChart, TrendingUp, TrendingDown, Activity } from 'lucide-react';

interface PerformanceComparisonProps {
  performance: ModulePerformance[];
}

export default function PerformanceComparison({ performance }: PerformanceComparisonProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value);
  };

  const getModuleColor = (module: string) => {
    const colors: Record<string, string> = {
      arbitrage: 'bg-blue-500',
      trend: 'bg-green-500',
      snipe: 'bg-yellow-500',
      whale: 'bg-purple-500',
      value: 'bg-orange-500'
    };
    return colors[module] || 'bg-gray-500';
  };

  const getModuleLabel = (module: string) => {
    const labels: Record<string, string> = {
      arbitrage: 'Arbitrage Hunter',
      trend: 'Trend Rider',
      snipe: 'Snipe Master',
      whale: 'Whale Watcher',
      value: 'Value Miner'
    };
    return labels[module] || module;
  };

  const maxPnL = Math.max(...performance.map((p) => Math.abs(p.totalPnL)), 1);

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Module Performance Comparison</h2>
        <BarChart className="w-5 h-5 text-blue-400" />
      </div>

      <div className="space-y-4">
        {performance.map((module) => (
          <div key={module.moduleName} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${getModuleColor(module.moduleName)}`} />
                <span className="text-white font-medium">{getModuleLabel(module.moduleName)}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className={`text-sm font-bold ${module.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {module.totalPnL >= 0 ? '+' : ''}{formatCurrency(module.totalPnL)}
                </span>
                {module.totalPnL >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-green-400" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-400" />
                )}
              </div>
            </div>

            <div className="relative h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`absolute left-0 top-0 h-full ${getModuleColor(module.moduleName)}`}
                style={{ width: `${(Math.abs(module.totalPnL) / maxPnL) * 100}%` }}
              />
            </div>

            <div className="grid grid-cols-4 gap-4 text-xs">
              <div>
                <div className="text-gray-400">Trades</div>
                <div className="text-white font-medium">{module.totalTrades}</div>
              </div>
              <div>
                <div className="text-gray-400">Win Rate</div>
                <div className="text-white font-medium">{module.winRate.toFixed(1)}%</div>
              </div>
              <div>
                <div className="text-gray-400">ROI</div>
                <div className={`font-medium ${module.roi >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {module.roi.toFixed(1)}%
                </div>
              </div>
              <div>
                <div className="text-gray-400">Sharpe</div>
                <div className="text-white font-medium">
                  {module.sharpeRatio !== null ? module.sharpeRatio.toFixed(2) : 'N/A'}
                </div>
              </div>
            </div>
          </div>
        ))}

        {performance.length === 0 && (
          <div className="text-center py-12">
            <Activity className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">No trading activity yet</p>
            <p className="text-sm text-gray-500 mt-1">Start using modules to see performance data</p>
          </div>
        )}
      </div>
    </div>
  );
}
