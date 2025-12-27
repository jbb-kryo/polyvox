import { TrendingUp, Target, DollarSign, Percent, BarChart3, Award } from 'lucide-react';
import { ValueMinerMetrics } from '../../types/valueminer';

interface ValueMinerMetricsProps {
  metrics: ValueMinerMetrics;
}

export default function ValueMinerMetricsPanel({ metrics }: ValueMinerMetricsProps) {
  const formatCurrency = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <BarChart3 className="w-5 h-5 text-blue-400" />
          <span className="text-xs text-gray-400">Total</span>
        </div>
        <div className="text-2xl font-bold text-white">
          {metrics.totalSignals}
        </div>
        <p className="text-xs text-gray-500 mt-1">Signals</p>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <TrendingUp className="w-5 h-5 text-green-400" />
          <span className="text-xs text-gray-400">High</span>
        </div>
        <div className="text-2xl font-bold text-white">
          {metrics.highEdgeSignals}
        </div>
        <p className="text-xs text-gray-500 mt-1">Edge &gt;10%</p>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <Target className="w-5 h-5 text-purple-400" />
          <span className="text-xs text-gray-400">Active</span>
        </div>
        <div className="text-2xl font-bold text-white">
          {metrics.openPositions}
        </div>
        <p className="text-xs text-gray-500 mt-1">Positions</p>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <DollarSign className={`w-5 h-5 ${metrics.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`} />
          <span className="text-xs text-gray-400">P&L</span>
        </div>
        <div className={`text-2xl font-bold ${
          metrics.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'
        }`}>
          {formatCurrency(metrics.totalPnL)}
        </div>
        <p className="text-xs text-gray-500 mt-1">Total</p>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <Percent className={`w-5 h-5 ${metrics.roi >= 0 ? 'text-green-400' : 'text-red-400'}`} />
          <span className="text-xs text-gray-400">ROI</span>
        </div>
        <div className={`text-2xl font-bold ${
          metrics.roi >= 0 ? 'text-green-400' : 'text-red-400'
        }`}>
          {metrics.roi.toFixed(1)}%
        </div>
        <p className="text-xs text-gray-500 mt-1">Return</p>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <Award className={`w-5 h-5 ${
            metrics.winRate >= 60 ? 'text-green-400' :
            metrics.winRate >= 50 ? 'text-yellow-400' :
            'text-red-400'
          }`} />
          <span className="text-xs text-gray-400">Win Rate</span>
        </div>
        <div className={`text-2xl font-bold ${
          metrics.winRate >= 60 ? 'text-green-400' :
          metrics.winRate >= 50 ? 'text-yellow-400' :
          'text-red-400'
        }`}>
          {metrics.winRate.toFixed(1)}%
        </div>
        <p className="text-xs text-gray-500 mt-1">Success</p>
      </div>
    </div>
  );
}
