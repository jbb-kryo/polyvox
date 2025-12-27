import { Settings, ChevronDown, ChevronUp, AlertTriangle, DollarSign, Target } from 'lucide-react';
import { useState } from 'react';
import { ValueMinerSettings } from '../../types/valueminer';

interface ValueMinerSettingsProps {
  settings: ValueMinerSettings;
  onUpdate: (settings: ValueMinerSettings) => void;
  onShowRealTradingWarning: () => void;
}

export default function ValueMinerSettingsPanel({ settings, onUpdate, onShowRealTradingWarning }: ValueMinerSettingsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleRealTradingToggle = (checked: boolean) => {
    if (checked) {
      onShowRealTradingWarning();
    } else {
      onUpdate({ ...settings, realTradingMode: false });
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
          <h3 className="text-lg font-semibold text-white">Value Betting Settings</h3>
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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className={`w-5 h-5 ${
                  settings.realTradingMode ? 'text-red-400' : 'text-gray-400'
                }`} />
                <div>
                  <h4 className="text-sm font-medium text-gray-300">Real Trading Mode</h4>
                  <p className="text-xs text-gray-500">Execute actual value bets on Polymarket</p>
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
          </div>

          <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 space-y-4">
            <h4 className="text-sm font-medium text-gray-300 flex items-center gap-2">
              <Target className="w-4 h-4" />
              Edge Filters
            </h4>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Min Edge: {settings.minEdge}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="20"
                  step="0.5"
                  value={settings.minEdge}
                  onChange={(e) => onUpdate({ ...settings, minEdge: parseFloat(e.target.value) })}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Max Edge: {settings.maxEdge}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="50"
                  step="1"
                  value={settings.maxEdge}
                  onChange={(e) => onUpdate({ ...settings, maxEdge: parseFloat(e.target.value) })}
                  className="w-full"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Min 24h Volume
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={settings.minVolume}
                  onChange={(e) => onUpdate({ ...settings, minVolume: Math.max(0, parseFloat(e.target.value) || 0) })}
                  className="w-full pl-8 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 space-y-4">
            <h4 className="text-sm font-medium text-gray-300 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Position Sizing
            </h4>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Sizing Method
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => onUpdate({ ...settings, positionSizingMethod: 'kelly' })}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    settings.positionSizingMethod === 'kelly'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  Kelly
                </button>
                <button
                  onClick={() => onUpdate({ ...settings, positionSizingMethod: 'fixed_percent' })}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    settings.positionSizingMethod === 'fixed_percent'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  Fixed %
                </button>
                <button
                  onClick={() => onUpdate({ ...settings, positionSizingMethod: 'fixed_amount' })}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    settings.positionSizingMethod === 'fixed_amount'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  Fixed $
                </button>
              </div>
            </div>

            {settings.positionSizingMethod === 'kelly' && (
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Kelly Fraction: {settings.kellyFraction}x
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.1"
                  value={settings.kellyFraction}
                  onChange={(e) => onUpdate({ ...settings, kellyFraction: parseFloat(e.target.value) })}
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Use fraction of full Kelly for reduced risk
                </p>
              </div>
            )}

            {settings.positionSizingMethod === 'fixed_percent' && (
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Fixed Percent: {settings.fixedPercent}%
                </label>
                <input
                  type="range"
                  min="1"
                  max="20"
                  step="0.5"
                  value={settings.fixedPercent}
                  onChange={(e) => onUpdate({ ...settings, fixedPercent: parseFloat(e.target.value) })}
                  className="w-full"
                />
              </div>
            )}

            {settings.positionSizingMethod === 'fixed_amount' && (
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Fixed Amount
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                  <input
                    type="number"
                    min="10"
                    step="10"
                    value={settings.fixedAmount}
                    onChange={(e) => onUpdate({ ...settings, fixedAmount: Math.max(10, parseFloat(e.target.value) || 100) })}
                    className="w-full pl-8 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-900 rounded-lg">
            <div>
              <h4 className="text-sm font-medium text-gray-300">Auto-Trade</h4>
              <p className="text-xs text-gray-500 mt-1">
                Automatically take positions on high-edge markets
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.autoTradeEnabled}
                onChange={(e) => onUpdate({ ...settings, autoTradeEnabled: e.target.checked })}
                className="sr-only peer"
                disabled={settings.realTradingMode}
              />
              <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 peer-disabled:opacity-50"></div>
            </label>
          </div>

          {settings.autoTradeEnabled && (
            <div className="bg-yellow-900 bg-opacity-20 border border-yellow-700 rounded-lg p-3">
              <p className="text-xs text-yellow-300">
                <strong>Warning:</strong> Auto-trade will place bets automatically when edge threshold is met.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
