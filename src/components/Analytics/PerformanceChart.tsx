import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { PerformanceChart as PerformanceChartType } from '../../types/analytics';
import { TrendingUp } from 'lucide-react';

interface PerformanceChartProps {
  data: PerformanceChartType[];
}

export default function PerformanceChart({ data }: PerformanceChartProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-lg">
          <p className="text-white font-medium mb-2">{formatDate(payload[0].payload.date)}</p>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full" />
              <span className="text-sm text-gray-400">Cumulative P&L:</span>
              <span className="text-sm font-bold text-blue-400">
                {formatCurrency(payload[0].value)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full" />
              <span className="text-sm text-gray-400">Daily P&L:</span>
              <span className={`text-sm font-bold ${payload[1].value >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatCurrency(payload[1].value)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gray-500 rounded-full" />
              <span className="text-sm text-gray-400">Trades:</span>
              <span className="text-sm font-bold text-white">{payload[0].payload.trades}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const finalPnL = data.length > 0 ? data[data.length - 1].cumulative_pnl : 0;
  const totalTrades = data.reduce((sum, d) => sum + d.trades, 0);

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white mb-1">Performance Over Time</h2>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-gray-400">
              Total P&L: <span className={`font-bold ${finalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {finalPnL >= 0 ? '+' : ''}{formatCurrency(finalPnL)}
              </span>
            </span>
            <span className="text-gray-400">
              Total Trades: <span className="font-bold text-white">{totalTrades}</span>
            </span>
          </div>
        </div>
        <TrendingUp className="w-5 h-5 text-blue-400" />
      </div>

      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              stroke="#9ca3af"
              style={{ fontSize: '12px' }}
            />
            <YAxis
              tickFormatter={formatCurrency}
              stroke="#9ca3af"
              style={{ fontSize: '12px' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }}
              iconType="circle"
            />
            <Line
              type="monotone"
              dataKey="cumulative_pnl"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              name="Cumulative P&L"
            />
            <Line
              type="monotone"
              dataKey="daily_pnl"
              stroke="#10b981"
              strokeWidth={2}
              dot={false}
              name="Daily P&L"
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-64 flex items-center justify-center">
          <div className="text-center">
            <TrendingUp className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">No performance data yet</p>
            <p className="text-sm text-gray-500 mt-1">Start trading to see your performance chart</p>
          </div>
        </div>
      )}
    </div>
  );
}
