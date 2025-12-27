import { useState, useEffect } from 'react';
import {
  Shield,
  DollarSign,
  TrendingDown,
  AlertTriangle,
  Activity,
  Save,
  PlayCircle,
  PauseCircle,
  RefreshCw,
  Lock,
  Unlock
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import riskLimitsService, { RiskLimits, DailyLossTracking, RiskLimitBreach } from '../services/riskLimits';

export default function RiskLimitsManager() {
  const { user } = useAuth();
  const [limits, setLimits] = useState<RiskLimits | null>(null);
  const [dailyTracking, setDailyTracking] = useState<DailyLossTracking | null>(null);
  const [recentBreaches, setRecentBreaches] = useState<RiskLimitBreach[]>([]);
  const [currentExposure, setCurrentExposure] = useState(0);
  const [openPositions, setOpenPositions] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    maxPositionSize: 1000,
    maxPositionSizeEnabled: true,
    maxPositionsPerMarket: 3,
    maxPositionsPerMarketEnabled: true,
    maxTotalExposure: 10000,
    maxTotalExposureEnabled: true,
    maxOpenPositions: 20,
    maxOpenPositionsEnabled: true,
    maxDailyLoss: 500,
    maxDailyLossEnabled: true,
    enforceLimits: true,
    alertOnBreach: true
  });

  useEffect(() => {
    if (user?.id) {
      loadData();
    }
  }, [user?.id]);

  const loadData = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      const status = await riskLimitsService.getCurrentRiskStatus(user.id);

      if (status.limits) {
        setLimits(status.limits);
        setFormData({
          maxPositionSize: status.limits.maxPositionSize,
          maxPositionSizeEnabled: status.limits.maxPositionSizeEnabled,
          maxPositionsPerMarket: status.limits.maxPositionsPerMarket,
          maxPositionsPerMarketEnabled: status.limits.maxPositionsPerMarketEnabled,
          maxTotalExposure: status.limits.maxTotalExposure,
          maxTotalExposureEnabled: status.limits.maxTotalExposureEnabled,
          maxOpenPositions: status.limits.maxOpenPositions,
          maxOpenPositionsEnabled: status.limits.maxOpenPositionsEnabled,
          maxDailyLoss: status.limits.maxDailyLoss,
          maxDailyLossEnabled: status.limits.maxDailyLossEnabled,
          enforceLimits: status.limits.enforceLimits,
          alertOnBreach: status.limits.alertOnBreach
        });
      }

      setDailyTracking(status.dailyTracking);
      setRecentBreaches(status.recentBreaches);
      setCurrentExposure(status.currentExposure);
      setOpenPositions(status.openPositions);
    } catch (error) {
      console.error('Error loading risk limits:', error);
      toast.error('Failed to load risk limits');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user?.id) return;

    setIsSaving(true);
    try {
      const success = await riskLimitsService.updateRiskLimits(user.id, formData);

      if (success) {
        toast.success('Risk limits updated successfully');
        await loadData();
      } else {
        toast.error('Failed to update risk limits');
      }
    } catch (error) {
      console.error('Error saving risk limits:', error);
      toast.error('Failed to save risk limits');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResumeTrading = async () => {
    if (!user?.id) return;

    const success = await riskLimitsService.resumeTrading(user.id);
    if (success) {
      await loadData();
    }
  };

  const handleHaltTrading = async () => {
    if (!user?.id) return;

    const success = await riskLimitsService.haltTrading(user.id, 'Manual halt by user');
    if (success) {
      await loadData();
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value);
  };

  const getUsagePercent = (current: number, limit: number) => {
    return limit > 0 ? (current / limit) * 100 : 0;
  };

  const getUsageColor = (percent: number) => {
    if (percent >= 90) return 'text-red-400';
    if (percent >= 70) return 'text-yellow-400';
    return 'text-green-400';
  };

  const getProgressColor = (percent: number) => {
    if (percent >= 90) return 'bg-red-500';
    if (percent >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <Activity className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-2" />
        <p className="text-gray-400">Loading risk limits...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Shield className="w-6 h-6" />
          Risk Limits Manager
        </h2>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>

          {limits?.tradingHalted ? (
            <button
              onClick={handleResumeTrading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <PlayCircle className="w-4 h-4" />
              Resume Trading
            </button>
          ) : (
            <button
              onClick={handleHaltTrading}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
            >
              <PauseCircle className="w-4 h-4" />
              Halt Trading
            </button>
          )}
        </div>
      </div>

      {limits?.tradingHalted && (
        <div className="bg-red-900 border-2 border-red-500 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-red-400" />
            <div>
              <div className="font-bold text-red-400">Trading Halted</div>
              <div className="text-sm text-red-300">{limits.haltReason}</div>
              {limits.haltTimestamp && (
                <div className="text-xs text-red-400 mt-1">
                  Since: {new Date(limits.haltTimestamp).toLocaleString()}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Daily P&L</span>
            <TrendingDown className="w-4 h-4 text-gray-400" />
          </div>
          <div className={`text-2xl font-bold ${dailyTracking?.totalPnl && dailyTracking.totalPnl < 0 ? 'text-red-400' : 'text-green-400'}`}>
            {formatCurrency(dailyTracking?.totalPnl || 0)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Limit: {formatCurrency(dailyTracking?.dailyLossLimit || 0)}
          </div>
          {dailyTracking && dailyTracking.totalPnl < 0 && (
            <div className="mt-2">
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${getProgressColor(getUsagePercent(Math.abs(dailyTracking.totalPnl), dailyTracking.dailyLossLimit))}`}
                  style={{ width: `${Math.min(100, getUsagePercent(Math.abs(dailyTracking.totalPnl), dailyTracking.dailyLossLimit))}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Current Exposure</span>
            <DollarSign className="w-4 h-4 text-gray-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {formatCurrency(currentExposure)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Limit: {formatCurrency(limits?.maxTotalExposure || 0)}
          </div>
          <div className="mt-2">
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${getProgressColor(getUsagePercent(currentExposure, limits?.maxTotalExposure || 1))}`}
                style={{ width: `${Math.min(100, getUsagePercent(currentExposure, limits?.maxTotalExposure || 1))}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Open Positions</span>
            <Activity className="w-4 h-4 text-gray-400" />
          </div>
          <div className="text-2xl font-bold text-white">{openPositions}</div>
          <div className="text-xs text-gray-500 mt-1">
            Limit: {limits?.maxOpenPositions || 0}
          </div>
          <div className="mt-2">
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${getProgressColor(getUsagePercent(openPositions, limits?.maxOpenPositions || 1))}`}
                style={{ width: `${Math.min(100, getUsagePercent(openPositions, limits?.maxOpenPositions || 1))}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Today's Trades</span>
            <Shield className="w-4 h-4 text-gray-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {dailyTracking?.totalTrades || 0}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {dailyTracking?.winningTrades || 0}W / {dailyTracking?.losingTrades || 0}L
          </div>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-white">Configure Limits</h3>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={formData.enforceLimits}
                onChange={(e) => setFormData({ ...formData, enforceLimits: e.target.checked })}
                className="rounded"
              />
              Enforce Limits
            </label>

            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={formData.alertOnBreach}
                onChange={(e) => setFormData({ ...formData, alertOnBreach: e.target.checked })}
                className="rounded"
              />
              Alert on Breach
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-300">Max Position Size</label>
              <button
                onClick={() => setFormData({ ...formData, maxPositionSizeEnabled: !formData.maxPositionSizeEnabled })}
                className="text-xs text-gray-400 hover:text-gray-300"
              >
                {formData.maxPositionSizeEnabled ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
              </button>
            </div>
            <input
              type="number"
              value={formData.maxPositionSize}
              onChange={(e) => setFormData({ ...formData, maxPositionSize: parseFloat(e.target.value) })}
              disabled={!formData.maxPositionSizeEnabled}
              className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:border-blue-500 disabled:opacity-50"
            />
            <p className="text-xs text-gray-500 mt-1">Maximum size for a single position ($)</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-300">Max Positions Per Market</label>
              <button
                onClick={() => setFormData({ ...formData, maxPositionsPerMarketEnabled: !formData.maxPositionsPerMarketEnabled })}
                className="text-xs text-gray-400 hover:text-gray-300"
              >
                {formData.maxPositionsPerMarketEnabled ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
              </button>
            </div>
            <input
              type="number"
              value={formData.maxPositionsPerMarket}
              onChange={(e) => setFormData({ ...formData, maxPositionsPerMarket: parseInt(e.target.value) })}
              disabled={!formData.maxPositionsPerMarketEnabled}
              className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:border-blue-500 disabled:opacity-50"
            />
            <p className="text-xs text-gray-500 mt-1">Maximum concurrent positions in one market</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-300">Max Total Exposure</label>
              <button
                onClick={() => setFormData({ ...formData, maxTotalExposureEnabled: !formData.maxTotalExposureEnabled })}
                className="text-xs text-gray-400 hover:text-gray-300"
              >
                {formData.maxTotalExposureEnabled ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
              </button>
            </div>
            <input
              type="number"
              value={formData.maxTotalExposure}
              onChange={(e) => setFormData({ ...formData, maxTotalExposure: parseFloat(e.target.value) })}
              disabled={!formData.maxTotalExposureEnabled}
              className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:border-blue-500 disabled:opacity-50"
            />
            <p className="text-xs text-gray-500 mt-1">Maximum total portfolio exposure ($)</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-300">Max Open Positions</label>
              <button
                onClick={() => setFormData({ ...formData, maxOpenPositionsEnabled: !formData.maxOpenPositionsEnabled })}
                className="text-xs text-gray-400 hover:text-gray-300"
              >
                {formData.maxOpenPositionsEnabled ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
              </button>
            </div>
            <input
              type="number"
              value={formData.maxOpenPositions}
              onChange={(e) => setFormData({ ...formData, maxOpenPositions: parseInt(e.target.value) })}
              disabled={!formData.maxOpenPositionsEnabled}
              className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:border-blue-500 disabled:opacity-50"
            />
            <p className="text-xs text-gray-500 mt-1">Maximum number of open positions</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-300">Max Daily Loss</label>
              <button
                onClick={() => setFormData({ ...formData, maxDailyLossEnabled: !formData.maxDailyLossEnabled })}
                className="text-xs text-gray-400 hover:text-gray-300"
              >
                {formData.maxDailyLossEnabled ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
              </button>
            </div>
            <input
              type="number"
              value={formData.maxDailyLoss}
              onChange={(e) => setFormData({ ...formData, maxDailyLoss: parseFloat(e.target.value) })}
              disabled={!formData.maxDailyLossEnabled}
              className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:border-blue-500 disabled:opacity-50"
            />
            <p className="text-xs text-gray-500 mt-1">Maximum loss per day (halts trading, $)</p>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {recentBreaches.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-bold text-white mb-4">Recent Limit Breaches</h3>

          <div className="space-y-3">
            {recentBreaches.map((breach) => (
              <div
                key={breach.id}
                className={`p-3 rounded-lg border ${
                  breach.severity === 'halt'
                    ? 'bg-red-900 border-red-700'
                    : breach.severity === 'critical'
                    ? 'bg-orange-900 border-orange-700'
                    : 'bg-yellow-900 border-yellow-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AlertTriangle
                      className={`w-5 h-5 ${
                        breach.severity === 'halt'
                          ? 'text-red-400'
                          : breach.severity === 'critical'
                          ? 'text-orange-400'
                          : 'text-yellow-400'
                      }`}
                    />
                    <div>
                      <div className="font-medium text-white">{breach.limitName}</div>
                      <div className="text-sm text-gray-300">{breach.errorMessage || breach.actionTaken}</div>
                      <div className="text-xs text-gray-400 mt-1">
                        {new Date(breach.createdAt).toLocaleString()}
                        {breach.moduleType && ` • ${breach.moduleType}`}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    {breach.limitValue !== null && (
                      <div className="text-sm text-gray-300">
                        Limit: {formatCurrency(breach.limitValue)}
                      </div>
                    )}
                    {breach.attemptedValue !== null && (
                      <div className="text-sm text-gray-400">
                        Attempted: {formatCurrency(breach.attemptedValue)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
