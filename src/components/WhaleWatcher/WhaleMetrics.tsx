import { Eye, Activity, Copy, TrendingUp, Wallet, DollarSign, Target, Users } from 'lucide-react';
import { WhaleWatcherMetrics } from '../../types/whalewatcher';

interface WhaleMetricsProps {
  metrics: WhaleWatcherMetrics;
}

export default function WhaleMetrics({ metrics }: WhaleMetricsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-400" />
            <span className="text-sm text-gray-400">Active Whales</span>
          </div>
        </div>
        <div className="text-2xl font-bold text-white">{metrics.activeWhales}</div>
        <p className="text-xs text-gray-500 mt-1">Whales active today</p>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-purple-400" />
            <span className="text-sm text-gray-400">Orders Detected</span>
          </div>
        </div>
        <div className="text-2xl font-bold text-white">{metrics.ordersToday}</div>
        <p className="text-xs text-gray-500 mt-1">Whale orders today</p>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Copy className="w-5 h-5 text-green-400" />
            <span className="text-sm text-gray-400">Copied Today</span>
          </div>
        </div>
        <div className="text-2xl font-bold text-white">{metrics.copiedToday}</div>
        <div className="flex items-center gap-2 mt-1">
          <Target className="w-3 h-3 text-gray-500" />
          <p className="text-xs text-gray-500">{metrics.activeCopies} active copies</p>
        </div>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <TrendingUp className={`w-5 h-5 ${metrics.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`} />
            <span className="text-sm text-gray-400">Total P&L</span>
          </div>
        </div>
        <div className={`text-2xl font-bold ${metrics.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          ${metrics.totalPnL >= 0 ? '+' : ''}{metrics.totalPnL.toFixed(2)}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <Activity className="w-3 h-3 text-gray-500" />
          <p className="text-xs text-gray-500">
            {metrics.winRate.toFixed(1)}% win rate
          </p>
        </div>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-yellow-400" />
            <span className="text-sm text-gray-400">Avg Whale Size</span>
          </div>
        </div>
        <div className="text-2xl font-bold text-white">${metrics.avgWhaleSize.toFixed(0)}</div>
        <p className="text-xs text-gray-500 mt-1">Average order size</p>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-orange-400" />
            <span className="text-sm text-gray-400">Largest Whale</span>
          </div>
        </div>
        <div className="text-2xl font-bold text-white">${metrics.largestWhaleToday.toFixed(0)}</div>
        <p className="text-xs text-gray-500 mt-1">Largest order today</p>
      </div>
    </div>
  );
}
