import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Clock, CheckCircle, XCircle } from 'lucide-react';
import { positionManager, PositionHistory, PerformanceMetrics } from '../services/positionManager';
import { useAuth } from '../contexts/AuthContext';

export default function PositionHistoryView() {
  const { user } = useAuth();
  const [history, setHistory] = useState<PositionHistory[]>([]);
  const [metrics, setMetrics] = useState<PerformanceMetrics[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    if (user) {
      loadHistory();
    }
  }, [user]);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const [positionHistory, performanceMetrics] = await Promise.all([
        positionManager.getPositionHistory(100),
        positionManager.getPerformanceMetrics(30)
      ]);

      setHistory(positionHistory);
      setMetrics(performanceMetrics);
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredHistory = history.filter(h => {
    if (filter === 'all') return true;
    if (filter === 'winners') return h.realizedPnl > 0;
    if (filter === 'losers') return h.realizedPnl < 0;
    return h.moduleType === filter;
  });

  const getPnlColor = (pnl: number) => {
    if (pnl > 0) return 'text-green-400';
    if (pnl < 0) return 'text-red-400';
    return 'text-gray-400';
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

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const totalStats = {
    totalTrades: history.length,
    winners: history.filter(h => h.realizedPnl > 0).length,
    losers: history.filter(h => h.realizedPnl < 0).length,
    totalPnl: history.reduce((sum, h) => sum + h.realizedPnl, 0),
    avgPnl: history.length > 0 ? history.reduce((sum, h) => sum + h.realizedPnl, 0) / history.length : 0,
    winRate: history.length > 0 ? (history.filter(h => h.realizedPnl > 0).length / history.length) * 100 : 0,
    avgHoldTime: history.length > 0 ? history.reduce((sum, h) => sum + h.holdDurationSeconds, 0) / history.length : 0
  };

  if (!user) return null;

  if (isLoading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="text-center py-8">
          <Clock className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-2" />
          <p className="text-gray-400">Loading history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Total Trades</span>
            <Clock className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white">{totalStats.totalTrades}</div>
          <div className="text-xs text-gray-500 mt-1">
            {totalStats.winners}W / {totalStats.losers}L
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Total P&L</span>
            {totalStats.totalPnl >= 0 ? (
              <TrendingUp className="w-4 h-4 text-green-400" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-400" />
            )}
          </div>
          <div className={`text-2xl font-bold ${getPnlColor(totalStats.totalPnl)}`}>
            {formatCurrency(totalStats.totalPnl)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Avg: {formatCurrency(totalStats.avgPnl)}
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Win Rate</span>
            <CheckCircle className="w-4 h-4 text-green-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {totalStats.winRate.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Success rate
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Avg Hold Time</span>
            <Clock className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {formatDuration(totalStats.avgHoldTime)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Per trade
          </div>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-white">Trade History</h3>

          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Trades</option>
            <option value="winners">Winners</option>
            <option value="losers">Losers</option>
            <option value="valueminer">ValueMiner</option>
            <option value="arbitrage">ArbitrageHunter</option>
            <option value="snipe">SnipeMaster</option>
            <option value="trend">TrendRider</option>
            <option value="whale">WhaleWatcher</option>
          </select>
        </div>

        {filteredHistory.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400">No trade history found</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {filteredHistory.map((trade) => (
              <div
                key={trade.id}
                className="bg-gray-750 rounded-lg p-4 border border-gray-700"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {trade.realizedPnl > 0 ? (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-400" />
                      )}
                      <span className="text-xs text-gray-400 uppercase font-medium">
                        {trade.moduleType}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        trade.side === 'YES' ? 'bg-green-900 text-green-400' : 'bg-red-900 text-red-400'
                      }`}>
                        {trade.side}
                      </span>
                    </div>
                    <h4 className="text-sm font-medium text-white line-clamp-2">
                      {trade.marketQuestion}
                    </h4>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Entry</div>
                    <div className="text-sm font-medium text-white">
                      ${trade.entryPrice.toFixed(4)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Exit</div>
                    <div className="text-sm font-medium text-white">
                      ${trade.exitPrice?.toFixed(4) || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Size</div>
                    <div className="text-sm font-medium text-white">
                      {formatCurrency(trade.positionSize)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Duration</div>
                    <div className="text-sm font-medium text-white">
                      {formatDuration(trade.holdDurationSeconds)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-800 rounded">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Realized P&L</div>
                    <div className={`text-lg font-bold ${getPnlColor(trade.realizedPnl)}`}>
                      {formatCurrency(trade.realizedPnl)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500 mb-1">ROI</div>
                    <div className={`text-lg font-bold ${getPnlColor(trade.realizedPnl)}`}>
                      {formatPercent(trade.roiPercent)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
                  <span>Closed {new Date(trade.closedAt).toLocaleString()}</span>
                  {trade.exitReason && (
                    <span className="text-gray-400">{trade.exitReason}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
