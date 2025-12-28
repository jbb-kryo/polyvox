import { useState, useEffect, useMemo } from 'react';
import { AlertTriangle, CheckCircle, XCircle, AlertCircle, Info, TrendingUp, TrendingDown, Minus, RefreshCw, Eye, Check } from 'lucide-react';
import { errorTracking, ErrorLogEntry, ErrorStatistics, ErrorRateMetric } from '../services/errorTracking';
import { VirtualList } from './VirtualTable';
import { formatDistanceToNow } from '../utils/dateFormat';

export function ErrorDashboard() {
  const [errors, setErrors] = useState<ErrorLogEntry[]>([]);
  const [statistics, setStatistics] = useState<ErrorStatistics | null>(null);
  const [metrics, setMetrics] = useState<ErrorRateMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'critical' | 'error' | 'warning' | 'unresolved'>('all');
  const [selectedError, setSelectedError] = useState<ErrorLogEntry | null>(null);
  const [timeRange, setTimeRange] = useState<'1 hour' | '24 hours' | '7 days'>('24 hours');

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [timeRange]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [errorsData, statsData, metricsData] = await Promise.all([
        errorTracking.getRecentErrors(100),
        errorTracking.getErrorStatistics(timeRange),
        errorTracking.getErrorRateMetrics(timeRange === '1 hour' ? 1 : timeRange === '24 hours' ? 24 : 168),
      ]);

      setErrors(errorsData);
      setStatistics(statsData);
      setMetrics(metricsData);
    } catch (err) {
      console.error('Failed to load error data:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredErrors = useMemo(() => {
    switch (filter) {
      case 'critical':
        return errors.filter((e) => e.severity === 'critical');
      case 'error':
        return errors.filter((e) => e.severity === 'error');
      case 'warning':
        return errors.filter((e) => e.severity === 'warning');
      case 'unresolved':
        return errors.filter((e) => !e.resolved && (e.severity === 'critical' || e.severity === 'error'));
      default:
        return errors;
    }
  }, [errors, filter]);

  const handleMarkResolved = async (errorId: string) => {
    const success = await errorTracking.markErrorResolved(errorId);
    if (success) {
      setErrors((prev) =>
        prev.map((e) => (e.id === errorId ? { ...e, resolved: true } : e))
      );
      if (selectedError?.id === errorId) {
        setSelectedError({ ...selectedError, resolved: true });
      }
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-orange-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-500" />;
      default:
        return null;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'error':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      case 'warning':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'info':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  const getTrendIcon = (trend: number) => {
    if (trend > 5) return <TrendingUp className="w-4 h-4 text-red-400" />;
    if (trend < -5) return <TrendingDown className="w-4 h-4 text-green-400" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Error Dashboard</h2>
          <p className="text-gray-400 mt-1">Monitor and track application errors</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="1 hour">Last Hour</option>
            <option value="24 hours">Last 24 Hours</option>
            <option value="7 days">Last 7 Days</option>
          </select>
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Total Errors</span>
              {getTrendIcon(statistics.errorRateTrend)}
            </div>
            <div className="text-3xl font-bold text-white">{statistics.totalErrors}</div>
            <div className="text-xs text-gray-500 mt-1">
              {statistics.errorRateTrend > 0 ? '+' : ''}
              {statistics.errorRateTrend.toFixed(1)}% vs previous period
            </div>
          </div>

          <div className="bg-gray-800 border border-red-900/30 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Critical Errors</span>
              <XCircle className="w-4 h-4 text-red-500" />
            </div>
            <div className="text-3xl font-bold text-red-400">{statistics.criticalErrors}</div>
            <div className="text-xs text-gray-500 mt-1">
              Requires immediate attention
            </div>
          </div>

          <div className="bg-gray-800 border border-orange-900/30 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Regular Errors</span>
              <AlertCircle className="w-4 h-4 text-orange-500" />
            </div>
            <div className="text-3xl font-bold text-orange-400">{statistics.regularErrors}</div>
            <div className="text-xs text-gray-500 mt-1">
              {statistics.mostCommonError || 'Various types'}
            </div>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Affected Users</span>
              <Info className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-3xl font-bold text-white">{statistics.uniqueUsers}</div>
            <div className="text-xs text-gray-500 mt-1">
              {statistics.mostAffectedComponent || 'Multiple components'}
            </div>
          </div>
        </div>
      )}

      <div className="bg-gray-800 border border-gray-700 rounded-lg">
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Recent Errors</h3>
            <div className="flex gap-2">
              {(['all', 'critical', 'error', 'warning', 'unresolved'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                    filter === f
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4">
          {loading ? (
            <div className="text-center py-12">
              <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-2" />
              <p className="text-gray-400">Loading errors...</p>
            </div>
          ) : filteredErrors.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
              <p className="text-gray-400">No errors found</p>
              <p className="text-gray-500 text-sm mt-1">Your application is running smoothly!</p>
            </div>
          ) : (
            <VirtualList
              items={filteredErrors}
              itemHeight={80}
              height={600}
              renderItem={(error) => (
                <div
                  key={error.id}
                  onClick={() => setSelectedError(error)}
                  className="flex items-start gap-4 p-4 border border-gray-700 rounded-lg mb-2 hover:bg-gray-700/50 cursor-pointer transition-colors"
                >
                  <div className="mt-1">{getSeverityIcon(error.severity)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 text-xs rounded border ${getSeverityColor(error.severity)}`}>
                        {error.severity.toUpperCase()}
                      </span>
                      <span className="px-2 py-0.5 text-xs rounded bg-gray-700 text-gray-300">
                        {error.errorType}
                      </span>
                      {error.componentName && (
                        <span className="px-2 py-0.5 text-xs rounded bg-blue-900/30 text-blue-400 border border-blue-700/30">
                          {error.componentName}
                        </span>
                      )}
                      {error.resolved && (
                        <span className="px-2 py-0.5 text-xs rounded bg-green-900/30 text-green-400 border border-green-700/30 flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          Resolved
                        </span>
                      )}
                    </div>
                    <p className="text-white font-medium mb-1 truncate">{error.errorMessage}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>{error.createdAt ? formatDistanceToNow(new Date(error.createdAt)) : 'Just now'}</span>
                      {error.userAction && <span>Action: {error.userAction}</span>}
                    </div>
                  </div>
                  <button className="text-gray-400 hover:text-white transition-colors">
                    <Eye className="w-5 h-5" />
                  </button>
                </div>
              )}
            />
          )}
        </div>
      </div>

      {selectedError && (
        <ErrorDetailModal error={selectedError} onClose={() => setSelectedError(null)} onResolve={handleMarkResolved} />
      )}
    </div>
  );
}

interface ErrorDetailModalProps {
  error: ErrorLogEntry;
  onClose: () => void;
  onResolve: (errorId: string) => void;
}

function ErrorDetailModal({ error, onClose, onResolve }: ErrorDetailModalProps) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-gray-800 border border-gray-700 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xl font-bold text-white mb-2">Error Details</h3>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 text-xs rounded border ${
                  error.severity === 'critical'
                    ? 'bg-red-500/10 text-red-400 border-red-500/20'
                    : error.severity === 'error'
                    ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                    : error.severity === 'warning'
                    ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                    : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                }`}>
                  {error.severity.toUpperCase()}
                </span>
                <span className="px-2 py-1 text-xs rounded bg-gray-700 text-gray-300">
                  {error.errorType}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <XCircle className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)] space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Error Message</label>
            <p className="text-white bg-gray-900 p-3 rounded border border-gray-700">{error.errorMessage}</p>
          </div>

          {error.errorStack && (
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Stack Trace</label>
              <pre className="text-xs text-gray-300 bg-gray-900 p-3 rounded border border-gray-700 overflow-x-auto">
                {error.errorStack}
              </pre>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {error.componentName && (
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Component</label>
                <p className="text-white bg-gray-900 p-2 rounded border border-gray-700">{error.componentName}</p>
              </div>
            )}

            {error.errorCode && (
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Error Code</label>
                <p className="text-white bg-gray-900 p-2 rounded border border-gray-700">{error.errorCode}</p>
              </div>
            )}

            {error.userAction && (
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">User Action</label>
                <p className="text-white bg-gray-900 p-2 rounded border border-gray-700">{error.userAction}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Timestamp</label>
              <p className="text-white bg-gray-900 p-2 rounded border border-gray-700">
                {error.createdAt ? new Date(error.createdAt).toLocaleString() : 'Unknown'}
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">URL</label>
            <p className="text-blue-400 bg-gray-900 p-2 rounded border border-gray-700 text-sm break-all">{error.url}</p>
          </div>

          {error.context && Object.keys(error.context).length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Additional Context</label>
              <pre className="text-xs text-gray-300 bg-gray-900 p-3 rounded border border-gray-700 overflow-x-auto">
                {JSON.stringify(error.context, null, 2)}
              </pre>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Close
          </button>
          {!error.resolved && error.id && (
            <button
              onClick={() => {
                onResolve(error.id!);
                onClose();
              }}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              Mark as Resolved
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
