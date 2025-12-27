import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, X, ExternalLink, Activity, Shield } from 'lucide-react';
import { positionManager, Position, PortfolioSummary } from '../services/positionManager';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import RiskSettingsModal from './RiskSettingsModal';
import { stopLossManager } from '../services/stopLossManager';

export default function PositionsOverview() {
  const { user } = useAuth();
  const [positions, setPositions] = useState<Position[]>([]);
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [closingPosition, setClosingPosition] = useState<string | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);

  useEffect(() => {
    if (user) {
      positionManager.initialize(user.id);
      loadData();

      const status = stopLossManager.getMonitoringStatus();
      setIsMonitoring(status.isMonitoring);

      const unsubscribe = positionManager.onPortfolioUpdate((newSummary) => {
        setSummary(newSummary);
      });

      return () => {
        unsubscribe();
      };
    }
  }, [user]);

  const toggleMonitoring = async () => {
    if (!user) return;

    if (isMonitoring) {
      stopLossManager.stopMonitoring();
      setIsMonitoring(false);
      toast.success('Risk monitoring stopped');
    } else {
      await stopLossManager.startMonitoring(user.id);
      setIsMonitoring(true);
      toast.success('Risk monitoring started');
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [activePositions, portfolioSummary] = await Promise.all([
        positionManager.getActivePositions(),
        positionManager.getPortfolioSummary()
      ]);

      setPositions(activePositions);
      setSummary(portfolioSummary);
    } catch (error) {
      console.error('Error loading positions:', error);
      toast.error('Failed to load positions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClosePosition = async (position: Position) => {
    if (!window.confirm(`Close position for ${position.marketQuestion}?`)) {
      return;
    }

    setClosingPosition(position.id);

    try {
      await positionManager.closePosition(
        position.id,
        position.currentPrice || position.entryPrice,
        'manual'
      );

      toast.success('Position closed successfully');
      await loadData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to close position');
    } finally {
      setClosingPosition(null);
    }
  };

  const filteredPositions = positions.filter(p => {
    if (filter === 'all') return true;
    if (filter === 'winning') return p.unrealizedPnl > 0;
    if (filter === 'losing') return p.unrealizedPnl < 0;
    return p.moduleType === filter;
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

  if (!user) return null;

  if (isLoading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="text-center py-8">
          <Activity className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-2" />
          <p className="text-gray-400">Loading positions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Total Value</span>
              <DollarSign className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-white">
              {formatCurrency(summary.totalValue)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Cost: {formatCurrency(summary.totalCost)}
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Total P&L</span>
              {summary.totalPnl >= 0 ? (
                <TrendingUp className="w-4 h-4 text-green-400" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-400" />
              )}
            </div>
            <div className={`text-2xl font-bold ${getPnlColor(summary.totalPnl)}`}>
              {formatCurrency(summary.totalPnl)}
            </div>
            <div className={`text-xs mt-1 ${getPnlColor(summary.totalPnl)}`}>
              {formatPercent(summary.totalPnlPercent)}
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Open Positions</span>
              <Activity className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl font-bold text-white">
              {summary.totalPositions}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Active trades
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Win Rate</span>
              <TrendingUp className="w-4 h-4 text-green-400" />
            </div>
            <div className="text-2xl font-bold text-white">
              {summary.totalPositions > 0
                ? ((summary.winningPositions / summary.totalPositions) * 100).toFixed(1)
                : '0.0'}%
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {summary.winningPositions}W / {summary.losingPositions}L
            </div>
          </div>
        </div>
      )}

      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-bold text-white">Active Positions</h3>

            <button
              onClick={toggleMonitoring}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                isMonitoring
                  ? 'bg-green-900/30 text-green-400 border border-green-700'
                  : 'bg-gray-700 text-gray-400 border border-gray-600 hover:border-gray-500'
              }`}
            >
              <Shield className={`w-4 h-4 ${isMonitoring ? 'animate-pulse' : ''}`} />
              {isMonitoring ? 'Monitoring Active' : 'Start Monitoring'}
            </button>
          </div>

          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Positions</option>
            <option value="winning">Winning</option>
            <option value="losing">Losing</option>
            <option value="valueminer">ValueMiner</option>
            <option value="arbitrage">ArbitrageHunter</option>
            <option value="snipe">SnipeMaster</option>
            <option value="trend">TrendRider</option>
            <option value="whale">WhaleWatcher</option>
          </select>
        </div>

        {filteredPositions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400">No positions found</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {filteredPositions.map((position) => (
              <div
                key={position.id}
                className="bg-gray-750 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-gray-400 uppercase font-medium">
                        {position.moduleType}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        position.side === 'YES' ? 'bg-green-900 text-green-400' : 'bg-red-900 text-red-400'
                      }`}>
                        {position.side}
                      </span>
                    </div>
                    <h4 className="text-sm font-medium text-white line-clamp-2">
                      {position.marketQuestion}
                    </h4>
                  </div>

                  <div className="flex items-center gap-2 ml-2">
                    <button
                      onClick={() => setSelectedPosition(position)}
                      className="p-1.5 hover:bg-gray-700 rounded transition-colors"
                      title="Risk settings"
                    >
                      <Shield className="w-4 h-4 text-blue-400" />
                    </button>
                    <button
                      onClick={() => handleClosePosition(position)}
                      disabled={closingPosition === position.id}
                      className="p-1.5 hover:bg-gray-700 rounded transition-colors disabled:opacity-50"
                      title="Close position"
                    >
                      <X className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Position Size</div>
                    <div className="text-sm font-medium text-white">
                      {formatCurrency(position.positionSize)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Entry Price</div>
                    <div className="text-sm font-medium text-white">
                      ${position.entryPrice.toFixed(4)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Current Price</div>
                    <div className="text-sm font-medium text-white">
                      ${(position.currentPrice || position.entryPrice).toFixed(4)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Current Value</div>
                    <div className="text-sm font-medium text-white">
                      {formatCurrency(position.currentValue)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-800 rounded">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Unrealized P&L</div>
                    <div className={`text-lg font-bold ${getPnlColor(position.unrealizedPnl)}`}>
                      {formatCurrency(position.unrealizedPnl)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500 mb-1">Return</div>
                    <div className={`text-lg font-bold ${getPnlColor(position.unrealizedPnl)}`}>
                      {formatPercent(position.unrealizedPnlPercent)}
                    </div>
                  </div>
                </div>

                {position.highestPrice && position.lowestPrice && (
                  <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                    <span>High: ${position.highestPrice.toFixed(4)}</span>
                    <span>Low: ${position.lowestPrice.toFixed(4)}</span>
                    {position.peakUnrealizedPnl > 0 && (
                      <span className="text-green-400">
                        Peak: {formatCurrency(position.peakUnrealizedPnl)}
                      </span>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
                  <span>Opened {new Date(position.openedAt).toLocaleDateString()}</span>
                  {position.lastPriceUpdate && (
                    <span>Updated {new Date(position.lastPriceUpdate).toLocaleTimeString()}</span>
                  )}
                </div>

                <a
                  href={`https://polymarket.com/event/${position.marketId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 mt-2"
                >
                  View on Polymarket
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedPosition && user && (
        <RiskSettingsModal
          isOpen={true}
          onClose={() => {
            setSelectedPosition(null);
            loadData();
          }}
          position={{
            id: selectedPosition.id,
            marketQuestion: selectedPosition.marketQuestion,
            outcome: selectedPosition.outcome,
            entryPrice: selectedPosition.entryPrice,
            currentPrice: selectedPosition.currentPrice || selectedPosition.entryPrice,
            size: selectedPosition.size
          }}
          userId={user.id}
        />
      )}
    </div>
  );
}
