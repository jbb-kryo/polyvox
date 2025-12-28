import { useState, useEffect, useMemo } from 'react';
import { TrendingUp, TrendingDown, AlertTriangle, Activity } from 'lucide-react';
import { errorTracking, ErrorRateMetric } from '../services/errorTracking';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';

interface ErrorRateMonitorProps {
  hours?: number;
  refreshInterval?: number;
}

export function ErrorRateMonitor({ hours = 24, refreshInterval = 60000 }: ErrorRateMonitorProps) {
  const [metrics, setMetrics] = useState<ErrorRateMetric[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
    const interval = setInterval(loadMetrics, refreshInterval);
    return () => clearInterval(interval);
  }, [hours, refreshInterval]);

  const loadMetrics = async () => {
    try {
      const data = await errorTracking.getErrorRateMetrics(hours);
      setMetrics(data);
    } catch (err) {
      console.error('Failed to load error rate metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  const chartData = useMemo(() => {
    return metrics.map((m) => ({
      time: new Date(m.timeBucket).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      fullTime: new Date(m.timeBucket).toLocaleString(),
      critical: m.criticalCount,
      errors: m.errorCount,
      warnings: m.warningCount,
      total: m.totalErrors,
    }));
  }, [metrics]);

  const stats = useMemo(() => {
    if (metrics.length === 0) {
      return {
        totalErrors: 0,
        avgErrorRate: 0,
        peakErrorRate: 0,
        trend: 0,
      };
    }

    const total = metrics.reduce((sum, m) => sum + m.totalErrors, 0);
    const avg = total / metrics.length;
    const peak = Math.max(...metrics.map((m) => m.totalErrors));

    const halfPoint = Math.floor(metrics.length / 2);
    const firstHalf = metrics.slice(0, halfPoint);
    const secondHalf = metrics.slice(halfPoint);

    const firstHalfAvg =
      firstHalf.reduce((sum, m) => sum + m.totalErrors, 0) / firstHalf.length;
    const secondHalfAvg =
      secondHalf.reduce((sum, m) => sum + m.totalErrors, 0) / secondHalf.length;

    const trend =
      firstHalfAvg === 0
        ? 100
        : ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;

    return {
      totalErrors: total,
      avgErrorRate: avg,
      peakErrorRate: peak,
      trend,
    };
  }, [metrics]);

  if (loading) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-700 rounded w-1/4"></div>
          <div className="h-64 bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Error Rate Monitor
            </h3>
            <p className="text-sm text-gray-400 mt-1">
              Last {hours} {hours === 1 ? 'hour' : 'hours'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {stats.trend > 5 ? (
              <div className="flex items-center gap-1 px-3 py-1 bg-red-500/10 text-red-400 rounded-lg">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm font-medium">+{stats.trend.toFixed(1)}%</span>
              </div>
            ) : stats.trend < -5 ? (
              <div className="flex items-center gap-1 px-3 py-1 bg-green-500/10 text-green-400 rounded-lg">
                <TrendingDown className="w-4 h-4" />
                <span className="text-sm font-medium">{stats.trend.toFixed(1)}%</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 px-3 py-1 bg-gray-700 text-gray-400 rounded-lg">
                <span className="text-sm font-medium">Stable</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 p-6 bg-gray-900/50">
        <div className="text-center">
          <div className="text-2xl font-bold text-white">{stats.totalErrors}</div>
          <div className="text-xs text-gray-400 mt-1">Total Errors</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-white">{stats.avgErrorRate.toFixed(1)}</div>
          <div className="text-xs text-gray-400 mt-1">Avg per Hour</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-white">{stats.peakErrorRate}</div>
          <div className="text-xs text-gray-400 mt-1">Peak Rate</div>
        </div>
      </div>

      {chartData.length > 0 ? (
        <div className="p-6">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorCritical" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorErrors" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorWarnings" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#eab308" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#eab308" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="time"
                stroke="#9ca3af"
                style={{ fontSize: '12px' }}
              />
              <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: '0.5rem',
                  color: '#fff',
                }}
                labelStyle={{ color: '#9ca3af' }}
              />
              <Legend
                wrapperStyle={{ fontSize: '12px' }}
                iconType="circle"
              />
              <Area
                type="monotone"
                dataKey="critical"
                stackId="1"
                stroke="#ef4444"
                fillOpacity={1}
                fill="url(#colorCritical)"
                name="Critical"
              />
              <Area
                type="monotone"
                dataKey="errors"
                stackId="1"
                stroke="#f97316"
                fillOpacity={1}
                fill="url(#colorErrors)"
                name="Errors"
              />
              <Area
                type="monotone"
                dataKey="warnings"
                stackId="1"
                stroke="#eab308"
                fillOpacity={1}
                fill="url(#colorWarnings)"
                name="Warnings"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="p-12 text-center">
          <AlertTriangle className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">No error data available</p>
          <p className="text-gray-500 text-sm mt-1">Error metrics will appear here once errors are logged</p>
        </div>
      )}
    </div>
  );
}

interface CompactErrorRateMonitorProps {
  hours?: number;
}

export function CompactErrorRateMonitor({ hours = 24 }: CompactErrorRateMonitorProps) {
  const [metrics, setMetrics] = useState<ErrorRateMetric[]>([]);

  useEffect(() => {
    loadMetrics();
    const interval = setInterval(loadMetrics, 60000);
    return () => clearInterval(interval);
  }, [hours]);

  const loadMetrics = async () => {
    const data = await errorTracking.getErrorRateMetrics(hours);
    setMetrics(data);
  };

  const recentErrors = useMemo(() => {
    const lastHour = metrics.slice(-1)[0];
    return lastHour?.totalErrors || 0;
  }, [metrics]);

  const trend = useMemo(() => {
    if (metrics.length < 2) return 0;
    const current = metrics[metrics.length - 1]?.totalErrors || 0;
    const previous = metrics[metrics.length - 2]?.totalErrors || 0;
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }, [metrics]);

  const isHealthy = recentErrors === 0;
  const isCritical = recentErrors > 10 || trend > 50;

  return (
    <div
      className={`border rounded-lg p-4 ${
        isCritical
          ? 'bg-red-500/10 border-red-500/30'
          : isHealthy
          ? 'bg-green-500/10 border-green-500/30'
          : 'bg-gray-800 border-gray-700'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-lg ${
              isCritical
                ? 'bg-red-500/20'
                : isHealthy
                ? 'bg-green-500/20'
                : 'bg-gray-700'
            }`}
          >
            <Activity
              className={`w-5 h-5 ${
                isCritical
                  ? 'text-red-400'
                  : isHealthy
                  ? 'text-green-400'
                  : 'text-gray-400'
              }`}
            />
          </div>
          <div>
            <div className="text-sm font-medium text-gray-400">Error Rate</div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-2xl font-bold text-white">
                {recentErrors}
              </span>
              <span className="text-xs text-gray-500">/ hour</span>
              {trend !== 0 && (
                <span
                  className={`text-xs flex items-center gap-1 ${
                    trend > 0 ? 'text-red-400' : 'text-green-400'
                  }`}
                >
                  {trend > 0 ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  {Math.abs(trend).toFixed(0)}%
                </span>
              )}
            </div>
          </div>
        </div>

        <div
          className={`px-3 py-1 rounded-lg text-sm font-medium ${
            isCritical
              ? 'bg-red-500/20 text-red-400'
              : isHealthy
              ? 'bg-green-500/20 text-green-400'
              : 'bg-gray-700 text-gray-400'
          }`}
        >
          {isCritical ? 'Critical' : isHealthy ? 'Healthy' : 'Normal'}
        </div>
      </div>
    </div>
  );
}
