import { useState, useEffect } from 'react';
import { X, Eye, EyeOff, Activity, TestTube, Globe, Wallet, Lock, AlertTriangle, Bell } from 'lucide-react';
import { GlobalSettings } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import WalletSetupModal from './WalletSetupModal';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: GlobalSettings;
  onSave: (settings: GlobalSettings) => void;
  onRequestLiveTrading?: () => void;
}

export default function SettingsModal({ isOpen, onClose, settings, onSave, onRequestLiveTrading }: SettingsModalProps) {
  const { profile } = useAuth();
  const { preferences, updatePreferences } = useNotifications();
  const [localSettings, setLocalSettings] = useState<GlobalSettings>(settings);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [walletSetupOpen, setWalletSetupOpen] = useState(false);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(localSettings);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">Global Settings</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Polymarket API Base URL
            </label>
            <input
              type="text"
              value={localSettings.apiBaseUrl}
              onChange={(e) => setLocalSettings({ ...localSettings, apiBaseUrl: e.target.value })}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://clob.polymarket.com"
            />
            <p className="mt-1 text-xs text-gray-500">Base URL for Polymarket CLOB API</p>
          </div>

          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <Wallet className="w-6 h-6 text-blue-400" />
              <div>
                <h3 className="text-lg font-semibold text-white">Wallet Configuration</h3>
                <p className="text-xs text-gray-400">Secure encrypted wallet storage</p>
              </div>
            </div>

            {profile?.wallet_address ? (
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 bg-green-500 bg-opacity-10 border border-green-500 rounded-lg">
                  <Lock className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-green-400 mb-1">Wallet Configured</p>
                    <p className="text-xs text-green-200 mb-2">
                      Your private key is encrypted and securely stored
                    </p>
                    <p className="text-xs font-mono text-gray-300">
                      {profile.wallet_address.slice(0, 6)}...{profile.wallet_address.slice(-4)}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setWalletSetupOpen(true)}
                  className="w-full px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium"
                >
                  Update Wallet
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 bg-yellow-500 bg-opacity-10 border border-yellow-500 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-400 mb-1">No Wallet Configured</p>
                    <p className="text-xs text-yellow-200">
                      Set up your wallet to start trading. Your private key will be encrypted before storage.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setWalletSetupOpen(true)}
                  className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <Lock className="w-4 h-4" />
                  Configure Secure Wallet
                </button>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <TestTube className="w-5 h-5 text-gray-400" />
                  <div>
                    <h3 className="text-sm font-medium text-gray-300">Paper Trading Mode</h3>
                    <p className="text-xs text-gray-500">Real market data without executing orders</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localSettings.paperTradingMode}
                    onChange={(e) => {
                      if (!e.target.checked && onRequestLiveTrading) {
                        onRequestLiveTrading();
                      } else {
                        setLocalSettings({ ...localSettings, paperTradingMode: e.target.checked });
                      }
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-500"></div>
                </label>
              </div>
              {localSettings.paperTradingMode ? (
                <div className="text-xs text-yellow-300 bg-yellow-900 bg-opacity-20 rounded p-2">
                  Paper trading uses real market data without executing actual blockchain transactions
                </div>
              ) : (
                <div className="text-xs text-red-300 bg-red-900 bg-opacity-20 rounded p-2 flex items-start gap-2">
                  <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                  <span>LIVE TRADING: Real transactions with real money</span>
                </div>
              )}
            </div>

            <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Globe className="w-5 h-5 text-gray-400" />
                  <div>
                    <h3 className="text-sm font-medium text-gray-300">CORS Proxy</h3>
                    <p className="text-xs text-gray-500">Route requests through CORS proxy</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localSettings.useCorsProxy}
                    onChange={(e) => setLocalSettings({ ...localSettings, useCorsProxy: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              {localSettings.useCorsProxy && (
                <div className="text-xs text-blue-300 bg-blue-900 bg-opacity-20 rounded p-2">
                  Using corsproxy.io to bypass CORS restrictions
                </div>
              )}
            </div>

            <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Activity className="w-5 h-5 text-gray-400" />
                  <div>
                    <h3 className="text-sm font-medium text-gray-300">VPN Proxy Status</h3>
                    <p className="text-xs text-gray-500">Connection routing status</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></div>
                  <span className="text-xs text-yellow-500 font-medium">Checking</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <Bell className="w-6 h-6 text-blue-400" />
              <div>
                <h3 className="text-lg font-semibold text-white">Notification Preferences</h3>
                <p className="text-xs text-gray-400">Customize your notification settings</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-200">Toast Notifications</p>
                  <p className="text-xs text-gray-400">Show popup notifications</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences?.enable_toast ?? true}
                    onChange={(e) => updatePreferences({ enable_toast: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-200">Opportunity Alerts</p>
                  <p className="text-xs text-gray-400">New trading opportunities</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences?.enable_opportunity_notifications ?? true}
                    onChange={(e) => updatePreferences({ enable_opportunity_notifications: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-200">Execution Notifications</p>
                  <p className="text-xs text-gray-400">Trade execution confirmations</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences?.enable_execution_notifications ?? true}
                    onChange={(e) => updatePreferences({ enable_execution_notifications: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-200">Stop Loss Alerts</p>
                  <p className="text-xs text-gray-400">Stop loss triggered notifications</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences?.enable_stop_loss_notifications ?? true}
                    onChange={(e) => updatePreferences({ enable_stop_loss_notifications: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-200">Error Notifications</p>
                  <p className="text-xs text-gray-400">System errors and failures</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences?.enable_error_notifications ?? true}
                    onChange={(e) => updatePreferences({ enable_error_notifications: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-200">Low Balance Alerts</p>
                  <p className="text-xs text-gray-400">Insufficient funds warnings</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences?.enable_low_balance_notifications ?? true}
                    onChange={(e) => updatePreferences({ enable_low_balance_notifications: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-200">Position Updates</p>
                  <p className="text-xs text-gray-400">Position changes and updates</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences?.enable_position_updates ?? true}
                    onChange={(e) => updatePreferences({ enable_position_updates: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-200">Module Alerts</p>
                  <p className="text-xs text-gray-400">Module-specific notifications</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences?.enable_module_alerts ?? true}
                    onChange={(e) => updatePreferences({ enable_module_alerts: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>

          <div className="bg-blue-900 bg-opacity-20 border border-blue-700 rounded-lg p-4">
            <p className="text-xs text-blue-300">
              <strong>Security Notice:</strong> Your private key is encrypted using AES-256-GCM before storage.
              Decryption only happens on-demand when executing trades. Never share your private key or master password with anyone.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-300 hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
          >
            Save Settings
          </button>
        </div>
      </div>

      <WalletSetupModal
        isOpen={walletSetupOpen}
        onClose={() => setWalletSetupOpen(false)}
      />
    </div>
  );
}
