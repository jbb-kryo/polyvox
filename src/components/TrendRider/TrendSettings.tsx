import { TrendRiderSettings } from '../../types/trendrider';
import { Settings, ChevronDown, ChevronUp, AlertTriangle, Filter, Clock } from 'lucide-react';
import { useState } from 'react';

interface TrendSettingsProps {
  settings: TrendRiderSettings;
  onChange: (settings: TrendRiderSettings) => void;
  onShowRealTradingWarning: () => void;
}

export default function TrendSettingsPanel({
  settings,
  onChange,
  onShowRealTradingWarning
}: TrendSettingsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [newCategory, setNewCategory] = useState('');

  const handleRealTradingToggle = (checked: boolean) => {
    if (checked) {
      onShowRealTradingWarning();
    } else {
      onChange({ ...settings, realTradingMode: false });
    }
  };

  const addCategory = () => {
    if (newCategory.trim()) {
      onChange({
        ...settings,
        marketFilters: {
          ...settings.marketFilters,
          categoryWhitelist: [...settings.marketFilters.categoryWhitelist, newCategory.trim()]
        }
      });
      setNewCategory('');
    }
  };

  const removeCategory = (category: string) => {
    onChange({
      ...settings,
      marketFilters: {
        ...settings.marketFilters,
        categoryWhitelist: settings.marketFilters.categoryWhitelist.filter(c => c !== category)
      }
    });
  };

  const cooldownRemaining = settings.cooldownEnabled && settings.lastLossTime
    ? Math.max(0, Math.ceil((settings.lastLossTime + settings.cooldownMinutes * 60 * 1000 - Date.now()) / (60 * 1000)))
    : 0;

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-750 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Settings className="w-5 h-5 text-gray-400" />
          <h3 className="text-lg font-semibold text-white">Bot Settings</h3>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </button>

      {isExpanded && (
        <div className="p-4 border-t border-gray-700 space-y-6">
          <div className={`p-4 rounded-lg border ${
            settings.realTradingMode
              ? 'bg-red-900 bg-opacity-20 border-red-700'
              : 'bg-gray-900 border-gray-700'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <AlertTriangle className={`w-5 h-5 ${
                  settings.realTradingMode ? 'text-red-400' : 'text-gray-400'
                }`} />
                <div>
                  <h4 className="text-sm font-medium text-gray-300">Real Trading Mode</h4>
                  <p className="text-xs text-gray-500">Execute actual blockchain transactions</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.realTradingMode}
                  onChange={(e) => handleRealTradingToggle(e.target.checked)}
                  className="sr-only peer"
                />
                <div className={`w-11 h-6 peer-focus:outline-none peer-focus:ring-4 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${
                  settings.realTradingMode
                    ? 'bg-red-600 peer-focus:ring-red-800'
                    : 'bg-gray-700 peer-focus:ring-blue-800 peer-checked:bg-red-600'
                }`}></div>
              </label>
            </div>
            {settings.realTradingMode && (
              <div className="text-xs text-red-300 space-y-1">
                <p className="font-bold">DANGER: Real money at risk!</p>
                <p>Trades will be executed on Polygon blockchain with your wallet.</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Minimum Momentum: {settings.minMomentumPercent}%
              </label>
              <input
                type="range"
                min="2"
                max="15"
                step="0.5"
                value={settings.minMomentumPercent}
                onChange={(e) => onChange({ ...settings, minMomentumPercent: parseFloat(e.target.value) })}
                className="w-full"
              />
              <p className="text-xs text-gray-500 mt-1">
                Price movement required to trigger entry
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Momentum Window
              </label>
              <select
                value={settings.momentumWindow}
                onChange={(e) => onChange({ ...settings, momentumWindow: parseInt(e.target.value) as 5 | 10 | 15 | 60 })}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="5">5 minutes</option>
                <option value="10">10 minutes</option>
                <option value="15">15 minutes</option>
                <option value="60">1 hour</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Time window to measure momentum
              </p>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 space-y-4">
            <h4 className="text-sm font-medium text-gray-300">Position Sizing</h4>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Sizing Mode
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => onChange({ ...settings, positionSizeMode: 'fixed' })}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    settings.positionSizeMode === 'fixed'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  Fixed $
                </button>
                <button
                  onClick={() => onChange({ ...settings, positionSizeMode: 'percent' })}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    settings.positionSizeMode === 'percent'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  % of Capital
                </button>
              </div>
            </div>

            {settings.positionSizeMode === 'fixed' ? (
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Position Size Per Trade
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={settings.positionSize}
                    onChange={(e) => onChange({ ...settings, positionSize: Math.max(1, parseFloat(e.target.value) || 1) })}
                    className="w-full pl-8 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Fixed amount per trade
                </p>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Total Capital
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                    <input
                      type="number"
                      min="50"
                      step="50"
                      value={settings.totalCapital}
                      onChange={(e) => onChange({ ...settings, totalCapital: Math.max(50, parseFloat(e.target.value) || 250) })}
                      className="w-full pl-8 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Your total trading capital
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Position Size: {settings.positionSizePercent}% (${((settings.totalCapital * settings.positionSizePercent) / 100).toFixed(2)} per trade)
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    step="0.5"
                    value={settings.positionSizePercent}
                    onChange={(e) => onChange({ ...settings, positionSizePercent: parseFloat(e.target.value) })}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Percentage of capital per trade
                  </p>
                </div>
              </>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Max Concurrent Positions
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={settings.maxConcurrentPositions}
                onChange={(e) => onChange({ ...settings, maxConcurrentPositions: Math.max(1, parseInt(e.target.value) || 1) })}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Maximum number of open positions at once
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Daily Loss Limit
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                <input
                  type="number"
                  min="5"
                  step="5"
                  value={settings.dailyLossLimit}
                  onChange={(e) => onChange({ ...settings, dailyLossLimit: Math.max(5, parseFloat(e.target.value) || 50) })}
                  className="w-full pl-8 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Auto-pause trading if daily loss exceeds this amount
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Profit Target: {settings.profitTargetPercent}%
              </label>
              <input
                type="range"
                min="2"
                max="20"
                step="1"
                value={settings.profitTargetPercent}
                onChange={(e) => onChange({ ...settings, profitTargetPercent: parseFloat(e.target.value) })}
                className="w-full"
              />
              <p className="text-xs text-gray-500 mt-1">
                Auto-close position when profit reached
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Stop Loss: {settings.stopLossPercent}%
              </label>
              <input
                type="range"
                min="1"
                max="15"
                step="0.5"
                value={settings.stopLossPercent}
                onChange={(e) => onChange({ ...settings, stopLossPercent: parseFloat(e.target.value) })}
                className="w-full"
              />
              <p className="text-xs text-gray-500 mt-1">
                Auto-close position when loss reached
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Max Hold Time (hours)
              </label>
              <input
                type="number"
                min="1"
                max="48"
                value={settings.maxHoldTime}
                onChange={(e) => onChange({ ...settings, maxHoldTime: Math.max(1, parseInt(e.target.value) || 24) })}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Auto-close position after this time
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Scan Interval
              </label>
              <select
                value={settings.scanInterval}
                onChange={(e) => onChange({ ...settings, scanInterval: parseInt(e.target.value) as 30 | 60 | 120 })}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="30">30 seconds</option>
                <option value="60">60 seconds</option>
                <option value="120">120 seconds</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                How often to scan for new opportunities
              </p>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-gray-400" />
                <div>
                  <h4 className="text-sm font-medium text-gray-300">Cooldown After Losses</h4>
                  <p className="text-xs text-gray-500">Pause trading after stop-loss hits</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.cooldownEnabled}
                  onChange={(e) => onChange({ ...settings, cooldownEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {settings.cooldownEnabled && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Cooldown Duration: {settings.cooldownMinutes} minutes
                  </label>
                  <input
                    type="range"
                    min="5"
                    max="120"
                    step="5"
                    value={settings.cooldownMinutes}
                    onChange={(e) => onChange({ ...settings, cooldownMinutes: parseInt(e.target.value) })}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Wait this long after a stop-loss before resuming
                  </p>
                </div>
                {cooldownRemaining > 0 && (
                  <div className="bg-yellow-900 bg-opacity-20 border border-yellow-700 rounded p-2">
                    <p className="text-xs text-yellow-300">
                      Cooldown active: {cooldownRemaining} minutes remaining
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-900 rounded-lg">
            <div>
              <h4 className="text-sm font-medium text-gray-300">Trailing Stop Loss</h4>
              <p className="text-xs text-gray-500 mt-1">
                Lock in profits by trailing stop as price moves favorably
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.trailingStopEnabled}
                onChange={(e) => onChange({ ...settings, trailingStopEnabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {settings.trailingStopEnabled && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Trailing Stop: {settings.trailingStopPercent}%
              </label>
              <input
                type="range"
                min="2"
                max="10"
                step="0.5"
                value={settings.trailingStopPercent}
                onChange={(e) => onChange({ ...settings, trailingStopPercent: parseFloat(e.target.value) })}
                className="w-full"
              />
              <p className="text-xs text-gray-500 mt-1">
                Close if price drops this % from highest point
              </p>
            </div>
          )}

          <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 space-y-4">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="w-full flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <Filter className="w-5 h-5 text-gray-400" />
                <div className="text-left">
                  <h4 className="text-sm font-medium text-gray-300">Market Filters</h4>
                  <p className="text-xs text-gray-500">Filter markets by volume, spread, and category</p>
                </div>
              </div>
              {showFilters ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </button>

            {showFilters && (
              <div className="space-y-4 pt-4 border-t border-gray-700">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Min Volume (0 = no filter)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                    <input
                      type="number"
                      min="0"
                      step="10000"
                      value={settings.marketFilters.minVolume}
                      onChange={(e) => onChange({
                        ...settings,
                        marketFilters: { ...settings.marketFilters, minVolume: Math.max(0, parseFloat(e.target.value) || 0) }
                      })}
                      className="w-full pl-8 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Only scan markets with volume above this amount
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Max Spread: {(settings.marketFilters.maxSpread * 100).toFixed(1)}% (0 = no filter)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="0.1"
                    step="0.005"
                    value={settings.marketFilters.maxSpread}
                    onChange={(e) => onChange({
                      ...settings,
                      marketFilters: { ...settings.marketFilters, maxSpread: parseFloat(e.target.value) }
                    })}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Filter out markets with spreads larger than this
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Category Whitelist
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addCategory()}
                      placeholder="Enter category (e.g. Crypto, Politics)"
                      className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={addCategory}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {settings.marketFilters.categoryWhitelist.length === 0 ? (
                      <p className="text-xs text-gray-500">All categories (no filter)</p>
                    ) : (
                      settings.marketFilters.categoryWhitelist.map(cat => (
                        <span
                          key={cat}
                          className="inline-flex items-center gap-2 px-3 py-1 bg-blue-600 text-white text-xs rounded-full"
                        >
                          {cat}
                          <button
                            onClick={() => removeCategory(cat)}
                            className="hover:text-red-300"
                          >
                            ×
                          </button>
                        </span>
                      ))
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Options: Crypto, Politics, Economics, Stocks, Sports, Other
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-900 rounded-lg">
            <div>
              <h4 className="text-sm font-medium text-gray-300">Auto-Execute Trades</h4>
              <p className="text-xs text-gray-500 mt-1">
                Automatically execute trades when opportunities are found
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.autoExecute}
                onChange={(e) => onChange({ ...settings, autoExecute: e.target.checked })}
                className="sr-only peer"
                disabled={settings.realTradingMode}
              />
              <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-lg peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
            </label>
          </div>

          {settings.autoExecute && !settings.realTradingMode && (
            <div className="bg-yellow-900 bg-opacity-20 border border-yellow-700 rounded-lg p-3">
              <p className="text-xs text-yellow-300">
                <strong>Warning:</strong> Auto-execute is enabled. Trades will be executed automatically without confirmation.
              </p>
            </div>
          )}

          {settings.realTradingMode && (
            <div className="bg-red-900 bg-opacity-20 border border-red-700 rounded-lg p-3">
              <p className="text-xs text-red-300">
                <strong>Note:</strong> Auto-execute is disabled in Real Trading Mode for safety. All trades require manual confirmation.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
