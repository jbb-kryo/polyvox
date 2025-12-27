import { ArbitrageSettings } from '../../types/arbitrage';
import { Settings, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { useState } from 'react';

interface ArbitrageSettingsProps {
  settings: ArbitrageSettings;
  onChange: (settings: ArbitrageSettings) => void;
  onShowRealTradingWarning: () => void;
}

export default function ArbitrageSettingsPanel({
  settings,
  onChange,
  onShowRealTradingWarning
}: ArbitrageSettingsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleRealTradingToggle = (checked: boolean) => {
    if (checked) {
      onShowRealTradingWarning();
    } else {
      onChange({ ...settings, realTradingMode: false });
    }
  };

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
                Minimum Arbitrage Spread: {settings.minSpreadPercent}%
              </label>
              <input
                type="range"
                min="1"
                max="10"
                step="0.5"
                value={settings.minSpreadPercent}
                onChange={(e) => onChange({ ...settings, minSpreadPercent: parseFloat(e.target.value) })}
                className="w-full"
              />
              <p className="text-xs text-gray-500 mt-1">
                Only show opportunities above this threshold
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
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
                  className="w-full pl-8 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Amount to invest per arbitrage opportunity
              </p>
            </div>

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
              <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
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
