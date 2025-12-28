import { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Filter,
  Download,
  RefreshCw,
  Activity,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  Clock,
  TrendingUp,
  Eye,
} from 'lucide-react';
import { tradingLogger, TradingActivityLog, LogLevel, TradingModule, ActivityType, LogStatistics } from '../services/tradingActivityLogger';
import { VirtualList } from './VirtualTable';
import { formatDistanceToNow } from '../utils/dateFormat';

export function TradingActivityLogViewer() {
  const [logs, setLogs] = useState<TradingActivityLog[]>([]);
  const [statistics, setStatistics] = useState<LogStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<LogLevel | 'all'>('all');
  const [selectedModule, setSelectedModule] = useState<TradingModule | 'all'>('all');
  const [selectedActivity, setSelectedActivity] = useState<ActivityType | 'all'>('all');
  const [selectedLog, setSelectedLog] = useState<TradingActivityLog | null>(null);
  const [timeRange, setTimeRange] = useState<'1 hour' | '24 hours' | '7 days' | '30 days'>('24 hours');

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [searchTerm, selectedLevel, selectedModule, selectedActivity, timeRange]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [logsData, statsData] = await Promise.all([
        tradingLogger.getLogs({
          limit: 500,
          logLevel: selectedLevel === 'all' ? undefined : selectedLevel,
          module: selectedModule === 'all' ? undefined : selectedModule,
          activityType: selectedActivity === 'all' ? undefined : selectedActivity,
          search: searchTerm || undefined,
        }),
        tradingLogger.getStatistics(timeRange),
      ]);

      setLogs(logsData);
      setStatistics(statsData);
    } catch (err) {
      console.error('Failed to load trading activity logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const exportLogs = () => {
    const csvContent = [
      ['Timestamp', 'Level', 'Module', 'Activity', 'Message', 'Duration (ms)', 'Success', 'Details'].join(','),
      ...logs.map((log) =>
        [
          log.createdAt ? new Date(log.createdAt).toISOString() : '',
          log.logLevel,
          log.module,
          log.activityType,
          `"${log.message.replace(/"/g, '""')}"`,
          log.durationMs || '',
          log.success !== null ? log.success : '',
          `"${JSON.stringify(log.details || {}).replace(/"/g, '""')}"`,
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `trading-logs-${new Date().toISOString()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getLogLevelIcon = (level: LogLevel) => {
    switch (level) {
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'warn':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'info':
        return <CheckCircle className="w-5 h-5 text-blue-500" />;
      case 'debug':
        return <Info className="w-5 h-5 text-gray-500" />;
    }
  };

  const getLogLevelColor = (level: LogLevel) => {
    switch (level) {
      case 'error':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'warn':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'info':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'debug':
        return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  const getActivityTypeColor = (activityType: string) => {
    if (activityType.includes('failed') || activityType.includes('error')) {
      return 'bg-red-900/30 text-red-400 border-red-700/30';
    }
    if (activityType.includes('complete') || activityType.includes('filled') || activityType.includes('opened')) {
      return 'bg-green-900/30 text-green-400 border-green-700/30';
    }
    if (activityType.includes('start') || activityType.includes('submitted')) {
      return 'bg-blue-900/30 text-blue-400 border-blue-700/30';
    }
    return 'bg-gray-700 text-gray-300';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Trading Activity Logs</h2>
          <p className="text-gray-400 mt-1">Comprehensive audit trail of all trading activities</p>
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
            <option value="30 days">Last 30 Days</option>
          </select>
          <button
            onClick={exportLogs}
            disabled={logs.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
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
              <span className="text-gray-400 text-sm">Total Activities</span>
              <Activity className="w-4 h-4 text-gray-500" />
            </div>
            <div className="text-3xl font-bold text-white">{statistics.totalLogs}</div>
            <div className="text-xs text-gray-500 mt-1">{statistics.mostActiveModule || 'N/A'}</div>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Success Rate</span>
              <TrendingUp className="w-4 h-4 text-green-500" />
            </div>
            <div className="text-3xl font-bold text-white">
              {statistics.totalLogs > 0
                ? Math.round((statistics.successCount / (statistics.successCount + statistics.failureCount)) * 100) || 0
                : 0}
              %
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {statistics.successCount} / {statistics.successCount + statistics.failureCount} operations
            </div>
          </div>

          <div className="bg-gray-800 border border-red-900/30 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Errors & Warnings</span>
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
            </div>
            <div className="text-3xl font-bold text-orange-400">
              {statistics.errorCount + statistics.warnCount}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {statistics.errorCount} errors, {statistics.warnCount} warnings
            </div>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Avg Duration</span>
              <Clock className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-3xl font-bold text-white">
              {Math.round(statistics.avgDurationMs)}
              <span className="text-lg text-gray-500">ms</span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {statistics.mostCommonActivity?.replace(/_/g, ' ') || 'N/A'}
            </div>
          </div>
        </div>
      )}

      <div className="bg-gray-800 border border-gray-700 rounded-lg">
        <div className="p-4 border-b border-gray-700">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search logs..."
                  className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value as any)}
                className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Levels</option>
                <option value="debug">Debug</option>
                <option value="info">Info</option>
                <option value="warn">Warning</option>
                <option value="error">Error</option>
              </select>

              <select
                value={selectedModule}
                onChange={(e) => setSelectedModule(e.target.value as any)}
                className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Modules</option>
                <option value="arbitrage_hunter">ArbitrageHunter</option>
                <option value="snipe_master">SnipeMaster</option>
                <option value="trend_rider">TrendRider</option>
                <option value="whale_watcher">WhaleWatcher</option>
                <option value="value_miner">ValueMiner</option>
                <option value="position_manager">Position Manager</option>
                <option value="risk_manager">Risk Manager</option>
                <option value="order_executor">Order Executor</option>
                <option value="system">System</option>
              </select>
            </div>
          </div>
        </div>

        <div className="p-4">
          {loading ? (
            <div className="text-center py-12">
              <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-2" />
              <p className="text-gray-400">Loading activity logs...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="w-12 h-12 text-gray-600 mx-auto mb-2" />
              <p className="text-gray-400">No activity logs found</p>
              <p className="text-gray-500 text-sm mt-1">Trading activities will appear here once logged</p>
            </div>
          ) : (
            <VirtualList
              items={logs}
              itemHeight={90}
              height={600}
              renderItem={(log) => (
                <div
                  key={log.id}
                  onClick={() => setSelectedLog(log)}
                  className="flex items-start gap-4 p-4 border border-gray-700 rounded-lg mb-2 hover:bg-gray-700/50 cursor-pointer transition-colors"
                >
                  <div className="mt-1">{getLogLevelIcon(log.logLevel)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`px-2 py-0.5 text-xs rounded border ${getLogLevelColor(log.logLevel)}`}>
                        {log.logLevel.toUpperCase()}
                      </span>
                      <span className="px-2 py-0.5 text-xs rounded bg-gray-700 text-gray-300">
                        {log.module.replace(/_/g, ' ')}
                      </span>
                      <span className={`px-2 py-0.5 text-xs rounded border ${getActivityTypeColor(log.activityType)}`}>
                        {log.activityType.replace(/_/g, ' ')}
                      </span>
                      {log.success !== null && (
                        <span
                          className={`px-2 py-0.5 text-xs rounded border flex items-center gap-1 ${
                            log.success
                              ? 'bg-green-900/30 text-green-400 border-green-700/30'
                              : 'bg-red-900/30 text-red-400 border-red-700/30'
                          }`}
                        >
                          {log.success ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          {log.success ? 'Success' : 'Failed'}
                        </span>
                      )}
                      {log.durationMs && (
                        <span className="px-2 py-0.5 text-xs rounded bg-blue-900/30 text-blue-400 border border-blue-700/30 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {log.durationMs}ms
                        </span>
                      )}
                    </div>
                    <p className="text-white font-medium mb-1 truncate">{log.message}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>{log.createdAt ? formatDistanceToNow(new Date(log.createdAt)) : 'Just now'}</span>
                      {log.marketId && <span>Market: {log.marketId.substring(0, 8)}...</span>}
                      {log.orderId && <span>Order: {log.orderId.substring(0, 8)}...</span>}
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

      {selectedLog && (
        <LogDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />
      )}
    </div>
  );
}

interface LogDetailModalProps {
  log: TradingActivityLog;
  onClose: () => void;
}

function LogDetailModal({ log, onClose }: LogDetailModalProps) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-gray-800 border border-gray-700 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xl font-bold text-white mb-2">Activity Log Details</h3>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 text-xs rounded border ${
                  log.logLevel === 'error'
                    ? 'bg-red-500/10 text-red-400 border-red-500/20'
                    : log.logLevel === 'warn'
                    ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                    : log.logLevel === 'info'
                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                    : 'bg-gray-500/10 text-gray-400 border-gray-500/20'
                }`}>
                  {log.logLevel.toUpperCase()}
                </span>
                <span className="px-2 py-1 text-xs rounded bg-gray-700 text-gray-300">
                  {log.module.replace(/_/g, ' ')}
                </span>
                <span className="px-2 py-1 text-xs rounded bg-blue-900/30 text-blue-400 border border-blue-700/30">
                  {log.activityType.replace(/_/g, ' ')}
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
            <label className="block text-sm font-medium text-gray-400 mb-1">Message</label>
            <p className="text-white bg-gray-900 p-3 rounded border border-gray-700">{log.message}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Timestamp</label>
              <p className="text-white bg-gray-900 p-2 rounded border border-gray-700">
                {log.createdAt ? new Date(log.createdAt).toLocaleString() : 'Unknown'}
              </p>
            </div>

            {log.durationMs && (
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Duration</label>
                <p className="text-white bg-gray-900 p-2 rounded border border-gray-700">{log.durationMs}ms</p>
              </div>
            )}

            {log.marketId && (
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Market ID</label>
                <p className="text-white bg-gray-900 p-2 rounded border border-gray-700 text-sm break-all">{log.marketId}</p>
              </div>
            )}

            {log.orderId && (
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Order ID</label>
                <p className="text-white bg-gray-900 p-2 rounded border border-gray-700 text-sm break-all">{log.orderId}</p>
              </div>
            )}

            {log.positionId && (
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Position ID</label>
                <p className="text-white bg-gray-900 p-2 rounded border border-gray-700 text-sm break-all">{log.positionId}</p>
              </div>
            )}

            {log.success !== null && (
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Status</label>
                <p className={`p-2 rounded border ${
                  log.success
                    ? 'bg-green-900/30 text-green-400 border-green-700/30'
                    : 'bg-red-900/30 text-red-400 border-red-700/30'
                }`}>
                  {log.success ? 'Success' : 'Failed'}
                </p>
              </div>
            )}
          </div>

          {log.details && Object.keys(log.details).length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Additional Details</label>
              <pre className="text-xs text-gray-300 bg-gray-900 p-3 rounded border border-gray-700 overflow-x-auto">
                {JSON.stringify(log.details, null, 2)}
              </pre>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
