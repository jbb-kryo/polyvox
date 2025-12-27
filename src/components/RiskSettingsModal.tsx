import { useState, useEffect } from 'react';
import { X, Shield, TrendingDown, TrendingUp, Activity } from 'lucide-react';
import toast from 'react-hot-toast';
import { stopLossManager, RiskSettings } from '../services/stopLossManager';

interface RiskSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  position: {
    id: string;
    marketQuestion: string;
    outcome: string;
    entryPrice: number;
    currentPrice: number;
    size: number;
  };
  userId: string;
}

export default function RiskSettingsModal({
  isOpen,
  onClose,
  position,
  userId
}: RiskSettingsModalProps) {
  const [loading, setLoading] = useState(false);
  const [existingSettings, setExistingSettings] = useState<RiskSettings | null>(null);

  const [stopLossEnabled, setStopLossEnabled] = useState(false);
  const [stopLossType, setStopLossType] = useState<'percentage' | 'fixed_price'>('percentage');
  const [stopLossPercentage, setStopLossPercentage] = useState('5');
  const [stopLossPrice, setStopLossPrice] = useState('');

  const [takeProfitEnabled, setTakeProfitEnabled] = useState(false);
  const [takeProfitType, setTakeProfitType] = useState<'percentage' | 'fixed_price'>('percentage');
  const [takeProfitPercentage, setTakeProfitPercentage] = useState('10');
  const [takeProfitPrice, setTakeProfitPrice] = useState('');

  const [trailingStopEnabled, setTrailingStopEnabled] = useState(false);
  const [trailingActivationPrice, setTrailingActivationPrice] = useState('');
  const [trailingDistancePercentage, setTrailingDistancePercentage] = useState('3');

  useEffect(() => {
    if (isOpen) {
      loadExistingSettings();
    }
  }, [isOpen, position.id]);

  const loadExistingSettings = async () => {
    try {
      const settings = await stopLossManager.getRiskSettings(position.id);
      if (settings) {
        setExistingSettings(settings);
        setStopLossEnabled(settings.stopLossEnabled);
        setStopLossType(settings.stopLossType === 'trailing' ? 'percentage' : settings.stopLossType);
        setStopLossPercentage(settings.stopLossPercentage?.toString() || '5');
        setStopLossPrice(settings.stopLossPrice?.toString() || '');
        setTakeProfitEnabled(settings.takeProfitEnabled);
        setTakeProfitType(settings.takeProfitType);
        setTakeProfitPercentage(settings.takeProfitPercentage?.toString() || '10');
        setTakeProfitPrice(settings.takeProfitPrice?.toString() || '');
        setTrailingStopEnabled(settings.trailingStopEnabled);
        setTrailingActivationPrice(settings.trailingActivationPrice?.toString() || '');
        setTrailingDistancePercentage(settings.trailingDistancePercentage?.toString() || '3');
      }
    } catch (error) {
      console.error('Error loading risk settings:', error);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);

      const settings: Partial<RiskSettings> = {
        stopLossEnabled,
        stopLossType,
        takeProfitEnabled,
        takeProfitType,
        trailingStopEnabled
      };

      if (stopLossEnabled) {
        if (stopLossType === 'percentage') {
          settings.stopLossPercentage = parseFloat(stopLossPercentage);
        } else {
          settings.stopLossPrice = parseFloat(stopLossPrice);
        }
      }

      if (takeProfitEnabled) {
        if (takeProfitType === 'percentage') {
          settings.takeProfitPercentage = parseFloat(takeProfitPercentage);
        } else {
          settings.takeProfitPrice = parseFloat(takeProfitPrice);
        }
      }

      if (trailingStopEnabled) {
        settings.trailingActivationPrice = parseFloat(trailingActivationPrice);
        settings.trailingDistancePercentage = parseFloat(trailingDistancePercentage);
      }

      await stopLossManager.setRiskSettings(userId, position.id, settings);

      toast.success('Risk settings saved');
      onClose();
    } catch (error) {
      console.error('Error saving risk settings:', error);
      toast.error('Failed to save risk settings');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async () => {
    try {
      setLoading(true);
      await stopLossManager.removeRiskSettings(position.id);
      toast.success('Risk settings removed');
      onClose();
    } catch (error) {
      console.error('Error removing risk settings:', error);
      toast.error('Failed to remove risk settings');
    } finally {
      setLoading(false);
    }
  };

  const calculateStopLossPrice = () => {
    if (stopLossType === 'percentage') {
      return (position.entryPrice * (1 - parseFloat(stopLossPercentage || '0') / 100)).toFixed(4);
    }
    return stopLossPrice;
  };

  const calculateTakeProfitPrice = () => {
    if (takeProfitType === 'percentage') {
      return (position.entryPrice * (1 + parseFloat(takeProfitPercentage || '0') / 100)).toFixed(4);
    }
    return takeProfitPrice;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-blue-400" />
            <div>
              <h2 className="text-xl font-bold text-white">Risk Management</h2>
              <p className="text-sm text-gray-400">{position.marketQuestion}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-700 rounded-lg">
            <div>
              <p className="text-sm text-gray-400">Entry Price</p>
              <p className="text-lg font-semibold text-white">${position.entryPrice.toFixed(4)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Current Price</p>
              <p className="text-lg font-semibold text-white">${position.currentPrice.toFixed(4)}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-red-900/20 border border-red-700 rounded-lg">
              <div className="flex items-center flex-1">
                <input
                  type="checkbox"
                  id="stopLossEnabled"
                  checked={stopLossEnabled}
                  onChange={(e) => setStopLossEnabled(e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                <label htmlFor="stopLossEnabled" className="ml-3 flex items-center gap-2 text-white font-medium cursor-pointer">
                  <TrendingDown className="w-5 h-5 text-red-400" />
                  Stop Loss
                </label>
              </div>
            </div>

            {stopLossEnabled && (
              <div className="ml-8 space-y-3 p-4 bg-gray-700 rounded-lg">
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={stopLossType === 'percentage'}
                      onChange={() => setStopLossType('percentage')}
                      className="w-4 h-4"
                    />
                    <span className="text-white">Percentage</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={stopLossType === 'fixed_price'}
                      onChange={() => setStopLossType('fixed_price')}
                      className="w-4 h-4"
                    />
                    <span className="text-white">Fixed Price</span>
                  </label>
                </div>

                {stopLossType === 'percentage' ? (
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">
                      Loss Percentage
                    </label>
                    <input
                      type="number"
                      value={stopLossPercentage}
                      onChange={(e) => setStopLossPercentage(e.target.value)}
                      className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg border border-gray-500 focus:outline-none focus:border-blue-500"
                      placeholder="5"
                      step="0.1"
                      min="0"
                      max="100"
                    />
                    <p className="mt-2 text-sm text-gray-400">
                      Stop loss will trigger at ${calculateStopLossPrice()}
                    </p>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">
                      Stop Loss Price
                    </label>
                    <input
                      type="number"
                      value={stopLossPrice}
                      onChange={(e) => setStopLossPrice(e.target.value)}
                      className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg border border-gray-500 focus:outline-none focus:border-blue-500"
                      placeholder="0.45"
                      step="0.0001"
                      min="0"
                      max="1"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-green-900/20 border border-green-700 rounded-lg">
              <div className="flex items-center flex-1">
                <input
                  type="checkbox"
                  id="takeProfitEnabled"
                  checked={takeProfitEnabled}
                  onChange={(e) => setTakeProfitEnabled(e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                <label htmlFor="takeProfitEnabled" className="ml-3 flex items-center gap-2 text-white font-medium cursor-pointer">
                  <TrendingUp className="w-5 h-5 text-green-400" />
                  Take Profit
                </label>
              </div>
            </div>

            {takeProfitEnabled && (
              <div className="ml-8 space-y-3 p-4 bg-gray-700 rounded-lg">
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={takeProfitType === 'percentage'}
                      onChange={() => setTakeProfitType('percentage')}
                      className="w-4 h-4"
                    />
                    <span className="text-white">Percentage</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={takeProfitType === 'fixed_price'}
                      onChange={() => setTakeProfitType('fixed_price')}
                      className="w-4 h-4"
                    />
                    <span className="text-white">Fixed Price</span>
                  </label>
                </div>

                {takeProfitType === 'percentage' ? (
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">
                      Profit Percentage
                    </label>
                    <input
                      type="number"
                      value={takeProfitPercentage}
                      onChange={(e) => setTakeProfitPercentage(e.target.value)}
                      className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg border border-gray-500 focus:outline-none focus:border-blue-500"
                      placeholder="10"
                      step="0.1"
                      min="0"
                      max="1000"
                    />
                    <p className="mt-2 text-sm text-gray-400">
                      Take profit will trigger at ${calculateTakeProfitPrice()}
                    </p>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">
                      Take Profit Price
                    </label>
                    <input
                      type="number"
                      value={takeProfitPrice}
                      onChange={(e) => setTakeProfitPrice(e.target.value)}
                      className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg border border-gray-500 focus:outline-none focus:border-blue-500"
                      placeholder="0.65"
                      step="0.0001"
                      min="0"
                      max="1"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-blue-900/20 border border-blue-700 rounded-lg">
              <div className="flex items-center flex-1">
                <input
                  type="checkbox"
                  id="trailingStopEnabled"
                  checked={trailingStopEnabled}
                  onChange={(e) => setTrailingStopEnabled(e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                <label htmlFor="trailingStopEnabled" className="ml-3 flex items-center gap-2 text-white font-medium cursor-pointer">
                  <Activity className="w-5 h-5 text-blue-400" />
                  Trailing Stop
                </label>
              </div>
            </div>

            {trailingStopEnabled && (
              <div className="ml-8 space-y-3 p-4 bg-gray-700 rounded-lg">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    Activation Price
                  </label>
                  <input
                    type="number"
                    value={trailingActivationPrice}
                    onChange={(e) => setTrailingActivationPrice(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg border border-gray-500 focus:outline-none focus:border-blue-500"
                    placeholder="0.60"
                    step="0.0001"
                    min="0"
                    max="1"
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    Trailing stop activates when price reaches this level
                  </p>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    Trail Distance (%)
                  </label>
                  <input
                    type="number"
                    value={trailingDistancePercentage}
                    onChange={(e) => setTrailingDistancePercentage(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg border border-gray-500 focus:outline-none focus:border-blue-500"
                    placeholder="3"
                    step="0.1"
                    min="0"
                    max="50"
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    Stop loss trails price by this percentage
                  </p>
                </div>

                <div className="p-3 bg-blue-900/30 rounded border border-blue-700">
                  <p className="text-xs text-blue-300">
                    Once price reaches ${trailingActivationPrice || '—'}, the stop loss will automatically follow the price up, maintaining a {trailingDistancePercentage}% distance. If price drops by this percentage from the highest point, the position will be closed.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="sticky bottom-0 bg-gray-800 border-t border-gray-700 p-6 flex items-center justify-between">
          <div>
            {existingSettings && (
              <button
                onClick={handleRemove}
                disabled={loading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                Remove All
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
