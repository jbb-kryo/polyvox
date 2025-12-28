import { useState } from 'react';
import { Module, PolymarketMarket } from '../types';
import { TrendingUp, TrendingDown, Target, Award, Activity as ActivityIcon, BarChart3, ExternalLink, RefreshCw, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import ModuleCard from './ModuleCard';
import { RecentActivityFeed } from './RecentActivityFeed';
import { useRealtimeDashboard } from '../hooks/useRealtimeDashboard';
import { formatVolume, formatSpread } from '../services/polymarket';

interface DashboardHomeProps {
  modules: Module[];
  topMarkets: PolymarketMarket[];
  onViewAllMarkets: () => void;
  onModuleClick: (moduleId: string) => void;
}

export default function DashboardHome({ modules, topMarkets, onViewAllMarkets, onModuleClick }: DashboardHomeProps) {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(15000);

  const { metrics, isLoading, lastRefresh, error, refresh } = useRealtimeDashboard({
    autoRefresh,
    refreshInterval,
  });
  const avgSpread = topMarkets.length > 0
    ? topMarkets.reduce((acc, m) => acc + m.spread, 0) / topMarkets.length
    : 0;

  const truncateQuestion = (question: string, maxLength = 50) => {
    if (question.length <= maxLength) return question;
    return question.substring(0, maxLength) + '...';
  };

  const formatLastRefresh = () => {
    if (!lastRefresh) return 'Never';
    const now = new Date();
    const diffSeconds = Math.floor((now.getTime() - lastRefresh.getTime()) / 1000);
    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    const diffMinutes = Math.floor(diffSeconds / 60);
    return `${diffMinutes}m ago`;
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400" />
              <span className="text-xs sm:text-sm text-gray-400">
                Last: {formatLastRefresh()}
              </span>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-400">
                <XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="text-xs sm:text-sm">{error}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <label className="flex items-center gap-2 cursor-pointer touch-manipulation">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-gray-800"
              />
              <span className="text-xs sm:text-sm text-gray-300">Auto</span>
            </label>

            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              disabled={!autoRefresh}
              className="text-xs sm:text-sm bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-white disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation min-h-[36px]"
            >
              <option value={10000}>10s</option>
              <option value={15000}>15s</option>
              <option value={30000}>30s</option>
              <option value={60000}>60s</option>
            </select>

            <button
              onClick={refresh}
              disabled={isLoading}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-xs sm:text-sm rounded transition-colors touch-manipulation min-h-[36px]"
            >
              {isLoading ? (
                <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              )}
              <span className="hidden xs:inline">Refresh</span>
            </button>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg p-6 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-blue-100">Total P&L</h3>
            <Target className="w-5 h-5 text-blue-200" />
          </div>
          <p className="text-3xl font-bold text-white">
            {metrics.totalPnL >= 0 ? '+' : ''}${metrics.totalPnL.toFixed(2)}
          </p>
          <div className="text-xs text-blue-200 mt-2">
            Weekly: {metrics.weeklyPnL >= 0 ? '+' : ''}${metrics.weeklyPnL.toFixed(2)}
          </div>
          {isLoading && (
            <div className="absolute inset-0 bg-blue-700 bg-opacity-30 flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-white animate-spin" />
            </div>
          )}
        </div>

        <div className={`bg-gradient-to-br rounded-lg p-6 shadow-lg relative overflow-hidden ${
          metrics.dailyPnL >= 0
            ? 'from-green-600 to-green-700'
            : 'from-red-600 to-red-700'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <h3 className={`text-sm font-medium ${
              metrics.dailyPnL >= 0 ? 'text-green-100' : 'text-red-100'
            }`}>
              Today's P&L
            </h3>
            {metrics.dailyPnL >= 0 ? (
              <TrendingUp className="w-5 h-5 text-green-200" />
            ) : (
              <TrendingDown className="w-5 h-5 text-red-200" />
            )}
          </div>
          <p className="text-3xl font-bold text-white">
            {metrics.dailyPnL >= 0 ? '+' : ''}${metrics.dailyPnL.toFixed(2)}
          </p>
          <div className={`text-xs mt-2 ${metrics.dailyPnL >= 0 ? 'text-green-200' : 'text-red-200'}`}>
            {metrics.totalTrades} trades today
          </div>
          {isLoading && (
            <div className={`absolute inset-0 bg-opacity-30 flex items-center justify-center ${
              metrics.dailyPnL >= 0 ? 'bg-green-700' : 'bg-red-700'
            }`}>
              <Loader2 className="w-5 h-5 text-white animate-spin" />
            </div>
          )}
        </div>

        <div className="bg-gradient-to-br from-cyan-600 to-cyan-700 rounded-lg p-6 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-cyan-100">Active Positions</h3>
            <ActivityIcon className="w-5 h-5 text-cyan-200" />
          </div>
          <p className="text-3xl font-bold text-white">{metrics.activePositions}</p>
          <div className="text-xs text-cyan-200 mt-2">
            {metrics.totalPositions} total positions
          </div>
          {isLoading && (
            <div className="absolute inset-0 bg-cyan-700 bg-opacity-30 flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-white animate-spin" />
            </div>
          )}
        </div>

        <div className="bg-gradient-to-br from-orange-600 to-orange-700 rounded-lg p-6 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-orange-100">Win Rate</h3>
            <Award className="w-5 h-5 text-orange-200" />
          </div>
          <p className="text-3xl font-bold text-white">{metrics.winRate.toFixed(1)}%</p>
          <div className="text-xs text-orange-200 mt-2">
            {metrics.totalTrades} total trades
          </div>
          {isLoading && (
            <div className="absolute inset-0 bg-orange-700 bg-opacity-30 flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-white animate-spin" />
            </div>
          )}
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
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Trading Modules</h2>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Module Status:</span>
            <div className="flex items-center gap-3">
              {metrics.moduleStatuses.arbitrage && (
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-xs text-gray-300">Arbitrage</span>
                </div>
              )}
              {metrics.moduleStatuses.snipe && (
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-xs text-gray-300">Snipe</span>
                </div>
              )}
              {metrics.moduleStatuses.trend && (
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-xs text-gray-300">Trend</span>
                </div>
              )}
              {metrics.moduleStatuses.value && (
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-xs text-gray-300">Value</span>
                </div>
              )}
              {metrics.moduleStatuses.whale && (
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-xs text-gray-300">Whale</span>
                </div>
              )}
              {!Object.values(metrics.moduleStatuses).some(status => status) && (
                <span className="text-xs text-gray-500">No active modules</span>
              )}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map((module) => {
            const moduleKey = module.id as keyof typeof metrics.moduleStatuses;
            const isActive = metrics.moduleStatuses[moduleKey] || false;

            return (
              <div key={module.id} className="relative">
                {isActive && (
                  <div className="absolute -top-1 -right-1 z-10">
                    <div className="flex items-center gap-1 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                      <CheckCircle className="w-3 h-3" />
                      Active
                    </div>
                  </div>
                )}
                <ModuleCard
                  module={module}
                  onClick={() => onModuleClick(module.id)}
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Recent Activity</h2>
          {metrics.recentActivity.length > 0 && (
            <span className="text-xs text-gray-400">
              Showing last {metrics.recentActivity.length} items
            </span>
          )}
        </div>
        <RecentActivityFeed activities={metrics.recentActivity} maxItems={10} />
      </div>
    </div>
  );
}
