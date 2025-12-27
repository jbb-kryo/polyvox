import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Award, Clock, Target } from 'lucide-react';
import { WhaleAnalytics as WhaleAnalyticsType } from '../../types/whalewatcher';

interface WhaleAnalyticsProps {
  analytics: WhaleAnalyticsType;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function WhaleAnalytics({ analytics }: WhaleAnalyticsProps) {
  const hourlyData = analytics.hourlyActivity.map(h => ({
    hour: `${h.hour}:00`,
    orders: h.orderCount,
    avgSize: h.avgSize
  }));

  const categoryData = analytics.performanceByCategory.map((cat, idx) => ({
    name: cat.category,
    value: cat.copied,
    winRate: cat.winRate,
    pnl: cat.pnl
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-5 h-5 text-blue-400" />
            <h4 className="text-sm font-medium text-gray-300">Overall Performance</h4>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Total Copied</span>
              <span className="text-sm font-medium text-white">{analytics.totalCopied}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Successful</span>
              <span className="text-sm font-medium text-green-400">{analytics.successfulCopies}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Win Rate</span>
              <span className={`text-sm font-medium ${
                analytics.winRate >= 0.6 ? 'text-green-400' : 'text-yellow-400'
              }`}>
                {(analytics.winRate * 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Avg P&L</span>
              <span className={`text-sm font-medium ${
                analytics.avgPnL >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                ${analytics.avgPnL >= 0 ? '+' : ''}{analytics.avgPnL.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Award className="w-5 h-5 text-yellow-400" />
            <h4 className="text-sm font-medium text-gray-300">Best Whale</h4>
          </div>
          <div className="space-y-2">
            <div className="text-xs font-mono text-gray-400 mb-2">
              {analytics.bestWhale.wallet.slice(0, 8)}...{analytics.bestWhale.wallet.slice(-6)}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Win Rate</span>
              <span className="text-sm font-medium text-green-400">
                {(analytics.bestWhale.winRate * 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Total P&L</span>
              <span className={`text-sm font-medium ${
                analytics.bestWhale.pnl >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                ${analytics.bestWhale.pnl >= 0 ? '+' : ''}{analytics.bestWhale.pnl.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-5 h-5 text-green-400" />
            <h4 className="text-sm font-medium text-gray-300">Best Category</h4>
          </div>
          <div className="space-y-2">
            <div className="text-sm font-medium text-white mb-2">
              {analytics.bestCategory.category}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Win Rate</span>
              <span className="text-sm font-medium text-green-400">
                {(analytics.bestCategory.winRate * 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Total P&L</span>
              <span className={`text-sm font-medium ${
                analytics.bestCategory.pnl >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                ${analytics.bestCategory.pnl >= 0 ? '+' : ''}{analytics.bestCategory.pnl.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-purple-400" />
          <h4 className="text-sm font-medium text-gray-300">Whale Activity by Hour</h4>
        </div>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={hourlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="hour" stroke="#9ca3af" style={{ fontSize: '12px' }} />
            <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#fff'
              }}
            />
            <Bar dataKey="orders" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <p className="text-xs text-gray-500 mt-2 text-center">
          Best times: Most whale activity occurs during market hours
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-300 mb-4">Performance by Whale</h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {analytics.performanceByWhale.slice(0, 8).map((whale, idx) => (
              <div key={whale.wallet} className="flex items-center justify-between p-2 bg-gray-900 rounded">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-xs font-bold text-gray-500">#{idx + 1}</span>
                  <span className="text-xs font-mono text-gray-400 truncate">
                    {whale.wallet.slice(0, 6)}...{whale.wallet.slice(-4)}
                  </span>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-xs text-gray-500">{whale.copied} copies</span>
                  <span className={`text-xs font-medium ${
                    whale.winRate >= 0.6 ? 'text-green-400' : 'text-yellow-400'
                  }`}>
                    {(whale.winRate * 100).toFixed(0)}%
                  </span>
                  <span className={`text-xs font-medium ${
                    whale.pnl >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    ${whale.pnl >= 0 ? '+' : ''}{whale.pnl.toFixed(0)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-300 mb-4">Copies by Category</h4>
          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {categoryData.map((cat, idx) => (
              <div key={cat.name} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded"
                  style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                />
                <span className="text-xs text-gray-400">{cat.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-300 mb-4">Performance by Category</h4>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-700">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Category</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-400 uppercase">Copied</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-400 uppercase">Win Rate</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-400 uppercase">Total P&L</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {analytics.performanceByCategory.map((cat) => (
                <tr key={cat.category} className="hover:bg-gray-750">
                  <td className="px-4 py-2 text-sm text-white">{cat.category}</td>
                  <td className="px-4 py-2 text-sm text-gray-300 text-right">{cat.copied}</td>
                  <td className="px-4 py-2 text-sm text-right">
                    <span className={`font-medium ${
                      cat.winRate >= 0.6 ? 'text-green-400' : 'text-yellow-400'
                    }`}>
                      {(cat.winRate * 100).toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-4 py-2 text-sm text-right">
                    <span className={`font-medium ${
                      cat.pnl >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      ${cat.pnl >= 0 ? '+' : ''}{cat.pnl.toFixed(2)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
