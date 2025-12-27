import { DashboardStats, Module, Activity, PolymarketMarket } from '../types';
import { TrendingUp, TrendingDown, Target, Award, Activity as ActivityIcon, BarChart3, ExternalLink } from 'lucide-react';
import ModuleCard from './ModuleCard';
import { formatVolume, formatSpread } from '../services/polymarket';

interface DashboardHomeProps {
  stats: DashboardStats;
  modules: Module[];
  activities: Activity[];
  topMarkets: PolymarketMarket[];
  onViewAllMarkets: () => void;
  onModuleClick: (moduleId: string) => void;
}

export default function DashboardHome({ stats, modules, activities, topMarkets, onViewAllMarkets, onModuleClick }: DashboardHomeProps) {
  const avgSpread = topMarkets.length > 0
    ? topMarkets.reduce((acc, m) => acc + m.spread, 0) / topMarkets.length
    : 0;

  const truncateQuestion = (question: string, maxLength = 50) => {
    if (question.length <= maxLength) return question;
    return question.substring(0, maxLength) + '...';
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg p-6 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-blue-100">Total Capital</h3>
            <Target className="w-5 h-5 text-blue-200" />
          </div>
          <p className="text-3xl font-bold text-white">${stats.totalCapital.toFixed(2)}</p>
        </div>

        <div className={`bg-gradient-to-br rounded-lg p-6 shadow-lg ${
          stats.todayPnL >= 0
            ? 'from-green-600 to-green-700'
            : 'from-red-600 to-red-700'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <h3 className={`text-sm font-medium ${
              stats.todayPnL >= 0 ? 'text-green-100' : 'text-red-100'
            }`}>
              Today's P&L
            </h3>
            {stats.todayPnL >= 0 ? (
              <TrendingUp className="w-5 h-5 text-green-200" />
            ) : (
              <TrendingDown className="w-5 h-5 text-red-200" />
            )}
          </div>
          <p className="text-3xl font-bold text-white">
            {stats.todayPnL >= 0 ? '+' : ''}${stats.todayPnL.toFixed(2)}
          </p>
        </div>

        <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-lg p-6 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-purple-100">Active Positions</h3>
            <ActivityIcon className="w-5 h-5 text-purple-200" />
          </div>
          <p className="text-3xl font-bold text-white">{stats.activePositions}</p>
        </div>

        <div className="bg-gradient-to-br from-orange-600 to-orange-700 rounded-lg p-6 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-orange-100">Win Rate</h3>
            <Award className="w-5 h-5 text-orange-200" />
          </div>
          <p className="text-3xl font-bold text-white">{stats.winRate.toFixed(1)}%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Top Markets by Volume</h2>
            <button
              onClick={onViewAllMarkets}
              className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
              View All <ExternalLink className="w-4 h-4" />
            </button>
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
            {topMarkets.length > 0 ? (
              <div className="divide-y divide-gray-700">
                {topMarkets.slice(0, 5).map((market) => (
                  <div key={market.id} className="p-4 hover:bg-gray-750 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium mb-1">{truncateQuestion(market.question)}</p>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="px-2 py-0.5 bg-gray-700 text-gray-300 rounded">
                            {market.category}
                          </span>
                          <span className="text-gray-400">
                            Vol: {formatVolume(market.volume)}
                          </span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-green-400 font-bold mb-1">
                          ${market.bestBid.toFixed(2)}
                        </div>
                        <div className={`text-xs ${
                          market.spread < 0.03 ? 'text-green-400' :
                          market.spread < 0.05 ? 'text-yellow-400' :
                          'text-red-400'
                        }`}>
                          {formatSpread(market.spread)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <BarChart3 className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">No market data available</p>
                <p className="text-sm text-gray-500 mt-1">Enable demo mode or check API connection</p>
              </div>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-xl font-bold text-white mb-4">Market Stats</h2>
          <div className="space-y-4">
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Total Markets</span>
                <BarChart3 className="w-4 h-4 text-blue-400" />
              </div>
              <p className="text-2xl font-bold text-white">{topMarkets.length}</p>
            </div>
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Avg Spread</span>
                <TrendingUp className="w-4 h-4 text-green-400" />
              </div>
              <p className="text-2xl font-bold text-white">{formatSpread(avgSpread)}</p>
            </div>
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Total Volume</span>
                <Target className="w-4 h-4 text-purple-400" />
              </div>
              <p className="text-2xl font-bold text-white">
                {formatVolume(topMarkets.reduce((acc, m) => acc + m.volume, 0))}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold text-white mb-4">Trading Modules</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map((module) => (
            <ModuleCard
              key={module.id}
              module={module}
              onClick={() => onModuleClick(module.id)}
            />
          ))}
        </div>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <h2 className="text-xl font-bold text-white mb-4">Recent Activity</h2>
        {activities.length === 0 ? (
          <div className="text-center py-12">
            <ActivityIcon className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">No activity yet</p>
            <p className="text-sm text-gray-500 mt-1">Configure a module to start trading</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center justify-between p-3 bg-gray-900 rounded-lg"
              >
                <div>
                  <p className="text-sm text-white font-medium">{activity.action}</p>
                  <p className="text-xs text-gray-400">{activity.module}</p>
                </div>
                <div className="text-right">
                  {activity.amount && (
                    <p className={`text-sm font-bold ${
                      activity.amount >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {activity.amount >= 0 ? '+' : ''}${activity.amount.toFixed(2)}
                    </p>
                  )}
                  <p className="text-xs text-gray-500">
                    {activity.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
