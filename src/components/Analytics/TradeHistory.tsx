import { useState, useEffect } from 'react';
import { Download, Filter, Search, X, Calendar as CalendarIcon, TrendingUp, TrendingDown } from 'lucide-react';
import {
  getTradeHistory,
  getTradeStatistics,
  exportToCSV,
  exportToJSON,
  TradeFilters,
  TradeStatistics
} from '../../services/analyticsService';

interface TradeHistoryProps {
  userId: string;
}

export default function TradeHistory({ userId }: TradeHistoryProps) {
  const [trades, setTrades] = useState<any[]>([]);
  const [statistics, setStatistics] = useState<TradeStatistics | null>(null);
  const [filters, setFilters] = useState<TradeFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, [userId, filters]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [tradeHistory, stats] = await Promise.all([
        getTradeHistory(userId, { ...filters, searchQuery }, 100, 0),
        getTradeStatistics(userId, filters.startDate, filters.endDate, filters.moduleType)
      ]);

      setTrades(tradeHistory);
      setStatistics(stats);
    } catch (error) {
      console.error('Error loading trade history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    setFilters({ ...filters, searchQuery });
  };

  const handleExportCSV = () => {
    exportToCSV(trades, 'trade_history');
  };

  const handleExportJSON = () => {
    exportToJSON(trades, 'trade_history');
  };

  const clearFilters = () => {
    setFilters({});
    setSearchQuery('');
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

  const getPnlColor = (pnl: number) => {
    if (pnl > 0) return 'text-green-400';
    if (pnl < 0) return 'text-red-400';
    return 'text-gray-400';
  };

  return (
    <div className="space-y-6">
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="text-sm text-gray-400 mb-1">Total Trades</div>
            <div className="text-2xl font-bold text-white">{statistics.totalTrades}</div>
            <div className="text-xs text-gray-500 mt-1">
              {statistics.winningTrades}W / {statistics.losingTrades}L
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="text-sm text-gray-400 mb-1">Win Rate</div>
            <div className="text-2xl font-bold text-white">{statistics.winRate.toFixed(1)}%</div>
            <div className="text-xs text-gray-500 mt-1">
              Profit Factor: {statistics.profitFactor.toFixed(2)}
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="text-sm text-gray-400 mb-1">Total P&L</div>
            <div className={`text-2xl font-bold ${getPnlColor(statistics.totalPnl)}`}>
              {formatCurrency(statistics.totalPnl)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              EV: {formatCurrency(statistics.expectedValue)}
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="text-sm text-gray-400 mb-1">Avg Duration</div>
            <div className="text-2xl font-bold text-white">
              {formatDuration(statistics.avgTradeDurationHours * 3600)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Fees: {formatCurrency(statistics.totalFees)}
            </div>
          </div>
        </div>
      )}

      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-white">Trade History</h3>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>

            <div className="relative">
              <button
                className="px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
              <div className="absolute right-0 mt-2 w-32 bg-gray-700 rounded-lg shadow-lg hidden group-hover:block z-10">
                <button
                  onClick={handleExportCSV}
                  className="w-full px-4 py-2 text-left text-white hover:bg-gray-600 rounded-t-lg"
                >
                  CSV
                </button>
                <button
                  onClick={handleExportJSON}
                  className="w-full px-4 py-2 text-left text-white hover:bg-gray-600 rounded-b-lg"
                >
                  JSON
                </button>
              </div>
            </div>
          </div>
        </div>

        {showFilters && (
          <div className="mb-6 p-4 bg-gray-750 rounded-lg border border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Start Date</label>
                <input
                  type="date"
                  value={filters.startDate?.toISOString().split('T')[0] || ''}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value ? new Date(e.target.value) : undefined })}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">End Date</label>
                <input
                  type="date"
                  value={filters.endDate?.toISOString().split('T')[0] || ''}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value ? new Date(e.target.value) : undefined })}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Module</label>
                <select
                  value={filters.moduleType || ''}
                  onChange={(e) => setFilters({ ...filters, moduleType: e.target.value || undefined })}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:border-blue-500"
                >
                  <option value="">All Modules</option>
                  <option value="valueminer">ValueMiner</option>
                  <option value="arbitrage">ArbitrageHunter</option>
                  <option value="snipe">SnipeMaster</option>
                  <option value="trend">TrendRider</option>
                  <option value="whale">WhaleWatcher</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Side</label>
                <select
                  value={filters.side || ''}
                  onChange={(e) => setFilters({ ...filters, side: e.target.value as any || undefined })}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:border-blue-500"
                >
                  <option value="">All Sides</option>
                  <option value="YES">YES</option>
                  <option value="NO">NO</option>
                  <option value="BOTH">BOTH</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Search by market question..."
                  className="w-full pl-10 pr-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:border-blue-500"
                />
              </div>
              <button
                onClick={handleSearch}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Search
              </button>
              <button
                onClick={clearFilters}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Clear
              </button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-8">
            <div className="text-gray-400">Loading trade history...</div>
          </div>
        ) : trades.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400">No trades found</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Date</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Module</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Market</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Side</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Entry</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Exit</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">P&L</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">ROI</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Duration</th>
                </tr>
              </thead>
              <tbody>
                {trades.map((trade) => (
                  <tr key={trade.id} className="border-b border-gray-700 hover:bg-gray-750">
                    <td className="py-3 px-4 text-sm text-gray-300">
                      {new Date(trade.closed_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-xs px-2 py-1 rounded bg-gray-700 text-gray-300">
                        {trade.module_type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-300 max-w-xs truncate">
                      {trade.market_question}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-xs px-2 py-1 rounded ${
                        trade.side === 'YES' ? 'bg-green-900 text-green-400' : 'bg-red-900 text-red-400'
                      }`}>
                        {trade.side}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-right text-gray-300">
                      ${trade.entry_price.toFixed(4)}
                    </td>
                    <td className="py-3 px-4 text-sm text-right text-gray-300">
                      ${trade.exit_price?.toFixed(4) || 'N/A'}
                    </td>
                    <td className={`py-3 px-4 text-sm text-right font-medium ${getPnlColor(trade.realized_pnl)}`}>
                      {formatCurrency(trade.realized_pnl)}
                    </td>
                    <td className={`py-3 px-4 text-sm text-right font-medium ${getPnlColor(trade.realized_pnl)}`}>
                      {formatPercent(trade.roi_percent)}
                    </td>
                    <td className="py-3 px-4 text-sm text-right text-gray-300">
                      {formatDuration(trade.hold_duration_seconds)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
