import { ProfitAttribution as ProfitAttributionType } from '../../types/analytics';
import { PieChart, TrendingUp } from 'lucide-react';

interface ProfitAttributionProps {
  data: ProfitAttributionType[];
}

export default function ProfitAttribution({ data }: ProfitAttributionProps) {
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

  const getBorderColor = (module: string) => {
    const colors: Record<string, string> = {
      arbitrage: 'border-blue-500',
      trend: 'border-green-500',
      snipe: 'border-yellow-500',
      whale: 'border-purple-500',
      value: 'border-orange-500'
    };
    return colors[module] || 'border-gray-500';
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

  const totalProfit = data.reduce((sum, item) => sum + item.profit, 0);
  const profitableModules = data.filter((item) => item.profit > 0);

  let accumulatedAngle = 0;

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Profit Attribution by Module</h2>
        <PieChart className="w-5 h-5 text-blue-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="flex items-center justify-center">
          <div className="relative w-64 h-64">
            <svg viewBox="0 0 100 100" className="transform -rotate-90">
              {profitableModules.map((item, index) => {
                const percentage = totalProfit > 0 ? (item.profit / totalProfit) * 100 : 0;
                const angle = (percentage / 100) * 360;
                const startAngle = accumulatedAngle;
                accumulatedAngle += angle;

                const startX = 50 + 40 * Math.cos((startAngle * Math.PI) / 180);
                const startY = 50 + 40 * Math.sin((startAngle * Math.PI) / 180);
                const endX = 50 + 40 * Math.cos(((startAngle + angle) * Math.PI) / 180);
                const endY = 50 + 40 * Math.sin(((startAngle + angle) * Math.PI) / 180);

                const largeArcFlag = angle > 180 ? 1 : 0;

                const pathData = [
                  `M 50 50`,
                  `L ${startX} ${startY}`,
                  `A 40 40 0 ${largeArcFlag} 1 ${endX} ${endY}`,
                  `Z`
                ].join(' ');

                const colors: Record<string, string> = {
                  arbitrage: '#3b82f6',
                  trend: '#10b981',
                  snipe: '#eab308',
                  whale: '#a855f7',
                  value: '#f97316'
                };

                return (
                  <path
                    key={index}
                    d={pathData}
                    fill={colors[item.module] || '#6b7280'}
                    className="hover:opacity-80 transition-opacity cursor-pointer"
                  >
                    <title>{`${getModuleLabel(item.module)}: ${formatCurrency(item.profit)} (${percentage.toFixed(1)}%)`}</title>
                  </path>
                );
              })}
              <circle cx="50" cy="50" r="25" fill="#1f2937" />
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-sm text-gray-400">Total Profit</div>
              <div className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatCurrency(totalProfit)}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {data.map((item) => (
            <div
              key={item.module}
              className={`bg-gray-900 rounded-lg p-4 border-l-4 ${getBorderColor(item.module)}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${getModuleColor(item.module)}`} />
                  <span className="text-white font-medium">{getModuleLabel(item.module)}</span>
                </div>
                <span className={`font-bold ${item.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {item.profit >= 0 ? '+' : ''}{formatCurrency(item.profit)}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <div className="text-gray-400">Contribution</div>
                  <div className="text-white font-medium">{item.contribution.toFixed(1)}%</div>
                </div>
                <div>
                  <div className="text-gray-400">Trades</div>
                  <div className="text-white font-medium">{item.trades}</div>
                </div>
                <div>
                  <div className="text-gray-400">Avg Profit</div>
                  <div className={`font-medium ${item.avgProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatCurrency(item.avgProfit)}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {data.length === 0 && (
            <div className="text-center py-12">
              <TrendingUp className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No profit data yet</p>
              <p className="text-sm text-gray-500 mt-1">Start trading to see attribution</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
