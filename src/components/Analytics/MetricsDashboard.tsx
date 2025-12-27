import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Activity, AlertTriangle, Target, Clock } from 'lucide-react';
import {
  getTradeStatistics,
  getRiskMetrics,
  getSharpeRatio,
  getSortinoRatio,
  getMaxDrawdown,
  getWinLossStreaks,
  TradeStatistics,
  DrawdownData,
  WinLossStreak
} from '../../services/analyticsService';
import { RiskMetrics } from '../../types/analytics';

interface MetricsDashboardProps {
  userId: string;
  days?: number;
}

export default function MetricsDashboard({ userId, days = 365 }: MetricsDashboardProps) {
  const [statistics, setStatistics] = useState<TradeStatistics | null>(null);
  const [riskMetrics, setRiskMetrics] = useState<RiskMetrics | null>(null);
  const [drawdown, setDrawdown] = useState<DrawdownData | null>(null);
  const [streaks, setStreaks] = useState<WinLossStreak[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
  }, [userId, days]);

  const loadMetrics = async () => {
    setIsLoading(true);
    try {
      const [stats, risk, dd, winLossStreaks] = await Promise.all([
        getTradeStatistics(userId),
        getRiskMetrics(userId, days),
        getMaxDrawdown(userId, days),
        getWinLossStreaks(userId, 5)
      ]);

      setStatistics(stats);
      setRiskMetrics(risk);
      setDrawdown(dd);
      setStreaks(winLossStreaks);
    } catch (error) {
      console.error('Error loading metrics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const formatPercent = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  const getRatioColor = (value: number) => {
    if (value > 1.5) return 'text-green-400';
    if (value > 0.5) return 'text-yellow-400';
    return 'text-red-400';
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <Activity className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-2" />
        <p className="text-gray-400">Loading metrics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {statistics && (
        <>
          <div>
            <h3 className="text-lg font-bold text-white mb-4">Performance Metrics</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-gray-400">Avg Win</span>
                </div>
                <div className="text-2xl font-bold text-green-400">
                  {formatCurrency(statistics.avgWin)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {formatPercent(statistics.avgWinPercent)} avg
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  <span className="text-sm text-gray-400">Avg Loss</span>
                </div>
                <div className="text-2xl font-bold text-red-400">
                  {formatCurrency(statistics.avgLoss)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {formatPercent(statistics.avgLossPercent)} avg
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-blue-400" />
                  <span className="text-sm text-gray-400">Largest Win</span>
                </div>
                <div className="text-2xl font-bold text-green-400">
                  {formatCurrency(statistics.largestWin)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Best trade
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="w-4 h-4 text-red-400" />
                  <span className="text-sm text-gray-400">Largest Loss</span>
                </div>
                <div className="text-2xl font-bold text-red-400">
                  {formatCurrency(statistics.largestLoss)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Worst trade
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-bold text-white mb-4">Advanced Metrics</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="text-sm text-gray-400 mb-2">Profit Factor</div>
                <div className={`text-2xl font-bold ${getRatioColor(statistics.profitFactor)}`}>
                  {statistics.profitFactor.toFixed(2)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {statistics.profitFactor > 1 ? 'Profitable' : 'Unprofitable'}
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="text-sm text-gray-400 mb-2">Expected Value</div>
                <div className="text-2xl font-bold text-white">
                  {formatCurrency(statistics.expectedValue)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Per trade
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-purple-400" />
                  <span className="text-sm text-gray-400">Avg Win Duration</span>
                </div>
                <div className="text-2xl font-bold text-white">
                  {statistics.avgWinningDurationHours.toFixed(1)}h
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Winning trades
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-orange-400" />
                  <span className="text-sm text-gray-400">Avg Loss Duration</span>
                </div>
                <div className="text-2xl font-bold text-white">
                  {statistics.avgLosingDurationHours.toFixed(1)}h
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Losing trades
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {riskMetrics && drawdown && (
        <div>
          <h3 className="text-lg font-bold text-white mb-4">Risk Metrics</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="text-sm text-gray-400 mb-2">Sharpe Ratio</div>
              <div className={`text-2xl font-bold ${getRatioColor(riskMetrics.sharpeRatio)}`}>
                {riskMetrics.sharpeRatio.toFixed(3)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Risk-adjusted return
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="text-sm text-gray-400 mb-2">Sortino Ratio</div>
              <div className={`text-2xl font-bold ${getRatioColor(riskMetrics.sortinoRatio)}`}>
                {riskMetrics.sortinoRatio.toFixed(3)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Downside risk
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="text-sm text-gray-400 mb-2">Max Drawdown</div>
              <div className="text-2xl font-bold text-red-400">
                {drawdown.maxDrawdownPct.toFixed(2)}%
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {formatCurrency(drawdown.maxDrawdownAmount)}
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="text-sm text-gray-400 mb-2">Calmar Ratio</div>
              <div className={`text-2xl font-bold ${getRatioColor(riskMetrics.calmarRatio)}`}>
                {riskMetrics.calmarRatio.toFixed(3)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Return vs drawdown
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="text-sm text-gray-400 mb-2">Volatility</div>
              <div className="text-2xl font-bold text-white">
                {riskMetrics.volatility.toFixed(2)}%
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Annualized
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="text-sm text-gray-400 mb-2">Value at Risk (95%)</div>
              <div className="text-2xl font-bold text-orange-400">
                {riskMetrics.valueAtRisk.toFixed(2)}%
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Daily VaR
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="text-sm text-gray-400 mb-2">Expected Shortfall</div>
              <div className="text-2xl font-bold text-red-400">
                {riskMetrics.expectedShortfall.toFixed(2)}%
              </div>
              <div className="text-xs text-gray-500 mt-1">
                CVaR (95%)
              </div>
            </div>

            {drawdown.peakDate && (
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="text-sm text-gray-400 mb-2">Peak Date</div>
                <div className="text-xl font-bold text-white">
                  {new Date(drawdown.peakDate).toLocaleDateString()}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Equity peak
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {streaks.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-white mb-4">Win/Loss Streaks</h3>
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="space-y-3">
              {streaks.map((streak, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-750 rounded">
                  <div className="flex items-center gap-3">
                    {streak.streakType === 'win' ? (
                      <TrendingUp className="w-5 h-5 text-green-400" />
                    ) : (
                      <TrendingDown className="w-5 h-5 text-red-400" />
                    )}
                    <div>
                      <div className={`font-medium ${streak.streakType === 'win' ? 'text-green-400' : 'text-red-400'}`}>
                        {streak.streakLength} {streak.streakType === 'win' ? 'Wins' : 'Losses'} in a row
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(streak.startDate).toLocaleDateString()} - {new Date(streak.endDate).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className={`text-lg font-bold ${streak.streakType === 'win' ? 'text-green-400' : 'text-red-400'}`}>
                    {formatCurrency(streak.totalPnl)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
