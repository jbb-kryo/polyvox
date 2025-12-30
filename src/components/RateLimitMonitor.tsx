import { useState, useEffect } from 'react';
import { Activity, AlertTriangle, CheckCircle, Settings, RefreshCw, Clock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import rateLimiter, { ActionType, RateLimitConfig, RateLimitViolation } from '../services/rateLimiter';
import toast from 'react-hot-toast';

export default function RateLimitMonitor() {
  const { user } = useAuth();
  const [configs, setConfigs] = useState<RateLimitConfig[]>([]);
  const [violations, setViolations] = useState<RateLimitViolation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editingAction, setEditingAction] = useState<ActionType | null>(null);
  const [editFormData, setEditFormData] = useState({
    limitPerMinute: 0,
    limitPerHour: 0,
    limitPerDay: 0,
    enabled: true
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
      const [configsData, violationsData] = await Promise.all([
        rateLimiter.getAllConfigs(user.id),
        rateLimiter.getViolations(user.id, 20)
      ]);

      setConfigs(configsData);
      setViolations(violationsData);
    } catch (error) {
      console.error('Error loading rate limit data:', error);
      toast.error('Failed to load rate limit data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (config: RateLimitConfig) => {
    setEditingAction(config.actionType);
    setEditFormData({
      limitPerMinute: config.limitPerMinute,
      limitPerHour: config.limitPerHour,
      limitPerDay: config.limitPerDay,
      enabled: config.enabled
    });
    setEditMode(true);
  };

  const handleSave = async () => {
    if (!user?.id || !editingAction) return;

    try {
      const success = await rateLimiter.updateConfig(user.id, editingAction, editFormData);

      if (success) {
        toast.success('Rate limit updated successfully');
        await loadData();
        setEditMode(false);
        setEditingAction(null);
      } else {
        toast.error('Failed to update rate limit');
      }
    } catch (error) {
      console.error('Error updating rate limit:', error);
      toast.error('Failed to update rate limit');
    }
  };

  const handleCancel = () => {
    setEditMode(false);
    setEditingAction(null);
  };

  const getActionLabel = (actionType: string): string => {
    const labels: Record<string, string> = {
      trade_execution: 'Trade Execution',
      module_toggle: 'Module Activation',
      api_call: 'API Calls',
      market_data_fetch: 'Market Data Fetch',
      position_update: 'Position Updates',
      wallet_operation: 'Wallet Operations'
    };
    return labels[actionType] || actionType;
  };

  const formatTimestamp = (timestamp: string): string => {
    return new Date(timestamp).toLocaleString();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Rate Limit Monitor</h2>
          <p className="text-gray-400 mt-1">Manage and monitor API rate limits</p>
        </div>
        <button
          onClick={loadData}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Rate Limit Configuration
            </h3>
          </div>

          <div className="space-y-4">
            {configs.map((config) => (
              <div
                key={config.id}
                className="bg-gray-700 rounded-lg p-4 border border-gray-600"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-blue-400" />
                    <span className="font-medium text-white">
                      {getActionLabel(config.actionType)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {config.enabled ? (
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-gray-500" />
                    )}
                    <button
                      onClick={() => handleEdit(config)}
                      className="text-sm text-blue-400 hover:text-blue-300"
                    >
                      Edit
                    </button>
                  </div>
                </div>

                {editMode && editingAction === config.actionType ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-gray-400">Per Minute</label>
                      <input
                        type="number"
                        value={editFormData.limitPerMinute}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            limitPerMinute: parseInt(e.target.value)
                          })
                        }
                        className="w-full px-3 py-2 bg-gray-600 text-white rounded border border-gray-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400">Per Hour</label>
                      <input
                        type="number"
                        value={editFormData.limitPerHour}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            limitPerHour: parseInt(e.target.value)
                          })
                        }
                        className="w-full px-3 py-2 bg-gray-600 text-white rounded border border-gray-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400">Per Day</label>
                      <input
                        type="number"
                        value={editFormData.limitPerDay}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            limitPerDay: parseInt(e.target.value)
                          })
                        }
                        className="w-full px-3 py-2 bg-gray-600 text-white rounded border border-gray-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={editFormData.enabled}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            enabled: e.target.checked
                          })
                        }
                        className="rounded"
                      />
                      <label className="text-sm text-gray-300">Enabled</label>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleSave}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded"
                      >
                        Save
                      </button>
                      <button
                        onClick={handleCancel}
                        className="px-3 py-1.5 bg-gray-600 hover:bg-gray-500 text-white text-sm rounded"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <div className="text-gray-400">Per Minute</div>
                      <div className="text-white font-medium">{config.limitPerMinute}</div>
                    </div>
                    <div>
                      <div className="text-gray-400">Per Hour</div>
                      <div className="text-white font-medium">{config.limitPerHour}</div>
                    </div>
                    <div>
                      <div className="text-gray-400">Per Day</div>
                      <div className="text-white font-medium">{config.limitPerDay}</div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              Recent Violations
            </h3>
          </div>

          {violations.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <p className="text-gray-400">No rate limit violations</p>
              <p className="text-sm text-gray-500 mt-1">All actions within limits</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {violations.map((violation) => (
                <div
                  key={violation.id}
                  className="bg-gray-700 rounded-lg p-3 border border-red-500 border-opacity-30"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                      <span className="font-medium text-white text-sm">
                        {getActionLabel(violation.actionType)}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTimestamp(violation.timestamp)}
                    </span>
                  </div>

                  <div className="text-sm text-gray-300 ml-6">
                    Exceeded {violation.limitType.replace('_', ' ')} limit of{' '}
                    {violation.limitValue}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
