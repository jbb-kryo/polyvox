import { TrendingDown, Target, DollarSign, CheckCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { SnipeMetrics as SnipeMetricsType } from '../../types/snipemaster';

interface SnipeMetricsProps {
  metrics: SnipeMetricsType;
  profitHistory: { time: string; profit: number }[];
}

export default function SnipeMetrics({ metrics, profitHistory }: SnipeMetricsProps) {
  const fillRate = metrics.totalOrders > 0
    ? ((metrics.filledOrders / metrics.totalOrders) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Active Orders</span>
            <Target className="w-5 h-5 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-white">{metrics.totalOrders}</p>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Fill Rate</span>
            <CheckCircle className="w-5 h-5 text-green-400" />
          </div>
          <p className="text-2xl font-bold text-white">{fillRate}%</p>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Avg Discount</span>
            <TrendingDown className="w-5 h-5 text-orange-400" />
          </div>
          <p className="text-2xl font-bold text-white">{metrics.avgDiscount.toFixed(1)}%</p>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Total P&L</span>
            <DollarSign className={`w-5 h-5 ${metrics.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`} />
          </div>
          <p className={`text-2xl font-bold ${metrics.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            ${metrics.totalPnL.toFixed(2)}
          </p>
        </div>
      </div>

      {profitHistory.length > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Cumulative Profit</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={profitHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="time" stroke="#9CA3AF" style={{ fontSize: '12px' }} />
              <YAxis stroke="#9CA3AF" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#fff'
                }}
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
