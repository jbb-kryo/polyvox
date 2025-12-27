import { TrendRiderMetrics } from '../../types/trendrider';
import { TrendingUp, Target, Shield, Clock } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface TrendMetricsProps {
  metrics: TrendRiderMetrics;
  profitHistory: { time: string; profit: number }[];
}

export default function TrendMetrics({ metrics, profitHistory }: TrendMetricsProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-400">Total P&L</p>
            <TrendingUp className="w-4 h-4 text-gray-400" />
          </div>
          <p className={`text-2xl font-bold ${metrics.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {metrics.totalPnL >= 0 ? '+' : ''}${metrics.totalPnL.toFixed(2)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {metrics.totalTrades} trades
          </p>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-400">Win Rate</p>
            <Target className="w-4 h-4 text-gray-400" />
          </div>
          <p className="text-2xl font-bold text-white">{metrics.winRate.toFixed(1)}%</p>
          <p className="text-xs text-gray-500 mt-1">
            {metrics.profitTargetHits} profit targets
          </p>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-400">Avg Profit</p>
            <Shield className="w-4 h-4 text-gray-400" />
          </div>
          <p className={`text-2xl font-bold ${metrics.avgProfitPerTrade >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            ${metrics.avgProfitPerTrade.toFixed(2)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {metrics.stopLossHits} stop losses
          </p>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-400">Avg Hold Time</p>
            <Clock className="w-4 h-4 text-gray-400" />
          </div>
          <p className="text-2xl font-bold text-white">
            {(metrics.avgHoldTime / (1000 * 60)).toFixed(0)}m
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Best: ${metrics.bestTrade.toFixed(2)}
          </p>
        </div>
      </div>

      {profitHistory.length > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-4">Cumulative P&L</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={profitHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="time" stroke="#9CA3AF" style={{ fontSize: '12px' }} />
              <YAxis stroke="#9CA3AF" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '8px'
                }}
                labelStyle={{ color: '#F3F4F6' }}
              />
              <Line
                type="monotone"
                dataKey="profit"
                stroke="#10B981"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
