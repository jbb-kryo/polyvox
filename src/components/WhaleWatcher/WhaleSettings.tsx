import { Settings, ChevronDown, ChevronUp, AlertTriangle, Bell, Mail, Phone } from 'lucide-react';
import { useState } from 'react';
import { WhaleWatcherSettings } from '../../types/whalewatcher';

interface WhaleSettingsProps {
  settings: WhaleWatcherSettings;
  onChange: (settings: WhaleWatcherSettings) => void;
  onShowRealTradingWarning: () => void;
}

export default function WhaleSettings({
  settings,
  onChange,
  onShowRealTradingWarning
}: WhaleSettingsProps) {
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
                <p>Copied positions will be executed on Polygon blockchain with your wallet.</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Minimum Whale Order Size
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                <input
                  type="number"
                  min="100"
                  step="100"
                  value={settings.minWhaleOrderSize}
                  onChange={(e) => onChange({ ...settings, minWhaleOrderSize: Math.max(100, parseFloat(e.target.value) || 1000) })}
                  className="w-full pl-8 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Only detect orders above this size
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Scan Interval
              </label>
              <select
                value={settings.scanInterval}
                onChange={(e) => onChange({ ...settings, scanInterval: parseInt(e.target.value) as 10 | 30 | 60 })}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="10">10 seconds</option>
                <option value="30">30 seconds</option>
                <option value="60">60 seconds</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                How often to scan for whale orders
              </p>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 space-y-4">
            <h4 className="text-sm font-medium text-gray-300">Copy Position Sizing</h4>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Sizing Mode
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => onChange({ ...settings, copyPositionMode: 'fixed' })}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    settings.copyPositionMode === 'fixed'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  Fixed $
                </button>
                <button
                  onClick={() => onChange({ ...settings, copyPositionMode: 'percentage' })}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    settings.copyPositionMode === 'percentage'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  % of Whale
                </button>
              </div>
            </div>

            {settings.copyPositionMode === 'fixed' ? (
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Fixed Position Size
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                  <input
                    type="number"
                    min="10"
                    step="10"
                    value={settings.copyPositionSize}
                    onChange={(e) => onChange({ ...settings, copyPositionSize: Math.max(10, parseFloat(e.target.value) || 50) })}
                    className="w-full pl-8 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Fixed amount per copied position
                </p>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Copy Percentage: {settings.copyPositionPercent}% of whale order
                </label>
                <input
                  type="range"
                  min="1"
                  max="20"
                  step="0.5"
                  value={settings.copyPositionPercent}
                  onChange={(e) => onChange({ ...settings, copyPositionPercent: parseFloat(e.target.value) })}
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Copy this % of whale order size
                </p>
              </div>
            )}
          </div>

          <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 space-y-4">
            <h4 className="text-sm font-medium text-gray-300">Exit Strategy</h4>

            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  checked={settings.exitStrategy === 'follow_whale'}
                  onChange={() => onChange({ ...settings, exitStrategy: 'follow_whale' })}
                  className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
                />
                <div>
                  <div className="text-sm font-medium text-gray-300">Follow Whale</div>
                  <div className="text-xs text-gray-500">Exit when whale exits their position</div>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  checked={settings.exitStrategy === 'independent'}
                  onChange={() => onChange({ ...settings, exitStrategy: 'independent' })}
                  className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
                />
                <div>
                  <div className="text-sm font-medium text-gray-300">Independent</div>
                  <div className="text-xs text-gray-500">Use your own take-profit/stop-loss targets</div>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  checked={settings.exitStrategy === 'hybrid'}
                  onChange={() => onChange({ ...settings, exitStrategy: 'hybrid' })}
                  className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
                />
                <div>
                  <div className="text-sm font-medium text-gray-300">Hybrid</div>
                  <div className="text-xs text-gray-500">Exit on whale exit OR your targets (whichever comes first)</div>
                </div>
              </label>
            </div>

            {(settings.exitStrategy === 'independent' || settings.exitStrategy === 'hybrid') && (
              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-700">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Take Profit: {settings.takeProfitPercent}%
                  </label>
                  <input
                    type="range"
                    min="2"
                    max="50"
                    step="1"
                    value={settings.takeProfitPercent}
                    onChange={(e) => onChange({ ...settings, takeProfitPercent: parseFloat(e.target.value) })}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Stop Loss: {settings.stopLossPercent}%
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    step="0.5"
                    value={settings.stopLossPercent}
                    onChange={(e) => onChange({ ...settings, stopLossPercent: parseFloat(e.target.value) })}
                    className="w-full"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Max Concurrent Copies
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={settings.maxConcurrentCopies}
                onChange={(e) => onChange({ ...settings, maxConcurrentCopies: Math.max(1, parseInt(e.target.value) || 5) })}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Maximum number of open copied positions
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Max Copies Per Whale
              </label>
              <input
                type="number"
                min="1"
                max="5"
                value={settings.maxCopiesPerWhale}
                onChange={(e) => onChange({ ...settings, maxCopiesPerWhale: Math.max(1, parseInt(e.target.value) || 2) })}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Limit copies from same whale
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
                  min="10"
                  step="10"
                  value={settings.dailyLossLimit}
                  onChange={(e) => onChange({ ...settings, dailyLossLimit: Math.max(10, parseFloat(e.target.value) || 100) })}
                  className="w-full pl-8 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Auto-pause copying if daily loss exceeds this
              </p>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-gray-400" />
              <h4 className="text-sm font-medium text-gray-300">Alert Settings</h4>
            </div>

            <div className="space-y-3">
              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-300">Browser Notifications</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.alerts.browser}
                  onChange={(e) => onChange({
                    ...settings,
                    alerts: { ...settings.alerts, browser: e.target.checked }
                  })}
                  className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-2 focus:ring-blue-500"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-300">🔊</span>
                  <span className="text-sm text-gray-300">Sound Alerts</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.alerts.sound}
                  onChange={(e) => onChange({
                    ...settings,
                    alerts: { ...settings.alerts, sound: e.target.checked }
                  })}
                  className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-2 focus:ring-blue-500"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-300">Email Alerts</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.alerts.email}
                  onChange={(e) => onChange({
                    ...settings,
                    alerts: { ...settings.alerts, email: e.target.checked }
                  })}
                  className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-2 focus:ring-blue-500"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-300">Telegram Alerts</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.alerts.telegram}
                  onChange={(e) => onChange({
                    ...settings,
                    alerts: { ...settings.alerts, telegram: e.target.checked }
                  })}
                  className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-2 focus:ring-blue-500"
                />
              </label>

              {settings.alerts.telegram && (
                <div className="pl-6 pt-2">
                  <label className="block text-xs font-medium text-gray-400 mb-1">
                    Webhook URL
                  </label>
                  <input
                    type="text"
                    value={settings.alerts.webhookUrl || ''}
                    onChange={(e) => onChange({
                      ...settings,
                      alerts: { ...settings.alerts, webhookUrl: e.target.value }
                    })}
                    placeholder="https://..."
                    className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-sm text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-900 rounded-lg">
            <div>
              <h4 className="text-sm font-medium text-gray-300">Auto-Copy Whales</h4>
              <p className="text-xs text-gray-500 mt-1">
                Automatically copy whale orders when detected
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
                <strong>Warning:</strong> Auto-copy is enabled. Positions will be copied automatically without confirmation.
              </p>
            </div>
          )}

          {settings.realTradingMode && (
            <div className="bg-red-900 bg-opacity-20 border border-red-700 rounded-lg p-3">
              <p className="text-xs text-red-300">
                <strong>Note:</strong> Auto-copy is disabled in Real Trading Mode for safety. All copies require manual confirmation.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
