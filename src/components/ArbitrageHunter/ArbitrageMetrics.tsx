import { ArbitrageMetrics } from '../../types/arbitrage';
import { TrendingUp, Target, Award, DollarSign } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ArbitrageMetricsProps {
  metrics: ArbitrageMetrics;
  profitHistory: { time: string; profit: number }[];
}

export default function ArbitrageMetricsPanel({ metrics, profitHistory }: ArbitrageMetricsProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg p-4 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-medium text-blue-100">Total Trades</h3>
            <Target className="w-4 h-4 text-blue-200" />
          </div>
          <p className="text-2xl font-bold text-white">{metrics.totalTrades}</p>
        </div>

        <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-lg p-4 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-medium text-green-100">Win Rate</h3>
            <Award className="w-4 h-4 text-green-200" />
          </div>
          <p className="text-2xl font-bold text-white">{metrics.winRate.toFixed(1)}%</p>
        </div>

        <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-lg p-4 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-medium text-purple-100">Avg Profit</h3>
            <DollarSign className="w-4 h-4 text-purple-200" />
          </div>
          <p className="text-2xl font-bold text-white">${metrics.avgProfitPerTrade.toFixed(2)}</p>
        </div>

        <div className={`bg-gradient-to-br rounded-lg p-4 shadow-lg ${
          metrics.totalPnL >= 0
            ? 'from-green-600 to-green-700'
            : 'from-red-600 to-red-700'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <h3 className={`text-xs font-medium ${
              metrics.totalPnL >= 0 ? 'text-green-100' : 'text-red-100'
            }`}>
              Total P&L
            </h3>
            <TrendingUp className={`w-4 h-4 ${
              metrics.totalPnL >= 0 ? 'text-green-200' : 'text-red-200'
            }`} />
          </div>
          <p className="text-2xl font-bold text-white">
            {metrics.totalPnL >= 0 ? '+' : ''}${metrics.totalPnL.toFixed(2)}
          </p>
        </div>
      </div>

      {profitHistory.length > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Cumulative Profit</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={profitHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="time"
                stroke="#9CA3AF"
                style={{ fontSize: '12px' }}
              />
              <YAxis
                stroke="#9CA3AF"
                style={{ fontSize: '12px' }}
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '0.5rem',
                  color: '#fff'
                }}
                formatter={(value: number) => [`$${value.toFixed(2)}`, 'Profit']}
              />
              <Line
                type="monotone"
                dataKey="profit"
                stroke={metrics.totalPnL >= 0 ? '#10B981' : '#EF4444'}
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-400 mb-2">Best Trade</h4>
          <p className="text-xl font-bold text-green-400">
            +${metrics.bestTrade.toFixed(2)}
          </p>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-400 mb-2">Worst Trade</h4>
          <p className="text-xl font-bold text-red-400">
            ${metrics.worstTrade.toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  );
}
