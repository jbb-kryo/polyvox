import React, { useState, useEffect } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Clock,
  TrendingUp,
  Database,
  Zap,
  AlertCircle
} from 'lucide-react';
import {
  getApiHealth,
  getRateLimiterMetrics,
  getRateLimiterStatus,
  getCircuitBreakerStatus,
  invalidateCache
} from '../services/polymarket';
import { cacheManager, formatBytes, formatHitRate, getCacheRecommendations } from '../services/cacheManager';
import { CircuitState } from '../services/apiRateLimiter';

export function ApiMonitor() {
  const [health, setHealth] = useState<any>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [cacheStats, setCacheStats] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshData = () => {
    setHealth(getApiHealth());
    setMetrics(getRateLimiterMetrics());
    setCacheStats(cacheManager.getStatistics());
  };

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleInvalidateCache = () => {
    setIsRefreshing(true);
    cacheManager.invalidateAll();
    setTimeout(() => {
      refreshData();
      setIsRefreshing(false);
    }, 500);
  };

  if (!health || !metrics || !cacheStats) {
    return <div className="p-6">Loading...</div>;
  }

  const successRate = metrics.totalRequests > 0
    ? ((metrics.successfulRequests / metrics.totalRequests) * 100).toFixed(1)
    : '0';

  const recommendations = getCacheRecommendations(cacheStats);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">API Monitor</h2>
        <button
          onClick={handleInvalidateCache}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Clear Cache
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={<Activity className="w-5 h-5" />}
          label="Total Requests"
          value={metrics.totalRequests.toLocaleString()}
          color="blue"
        />
        <MetricCard
          icon={<CheckCircle className="w-5 h-5" />}
          label="Success Rate"
          value={`${successRate}%`}
          color="green"
        />
        <MetricCard
          icon={<Database className="w-5 h-5" />}
          label="Cache Hit Rate"
          value={formatHitRate(cacheStats.hitRate)}
          color="purple"
        />
        <MetricCard
          icon={<Clock className="w-5 h-5" />}
          label="Avg Latency"
          value={`${metrics.averageLatency.toFixed(0)}ms`}
          color="orange"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <HealthCard health={health} />
        <RateLimitCard health={health} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CircuitBreakerCard />
        <CacheStatsCard stats={cacheStats} recommendations={recommendations} />
      </div>

      <RequestMetricsCard metrics={metrics} />
    </div>
  );
}

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: 'blue' | 'green' | 'purple' | 'orange' | 'red';
}

function MetricCard({ icon, label, value, color }: MetricCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
    red: 'bg-red-50 text-red-600'
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
        <div>
          <div className="text-sm text-gray-600">{label}</div>
          <div className="text-2xl font-bold text-gray-900">{value}</div>
        </div>
      </div>
    </div>
  );
}

function HealthCard({ health }: { health: any }) {
  const isHealthy = health.healthy;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">API Health</h3>
        {isHealthy ? (
          <div className="flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 rounded-full">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Healthy</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1 bg-red-50 text-red-700 rounded-full">
            <XCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Degraded</span>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Active Requests</span>
          <span className="text-sm font-medium text-gray-900">{health.activeRequests}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Queue Length</span>
          <span className="text-sm font-medium text-gray-900">{health.queueLength}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Cache Size</span>
          <span className="text-sm font-medium text-gray-900">{health.cacheSize}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Circuit Breaks</span>
          <span className={`text-sm font-medium ${health.metrics.circuitBreaks > 0 ? 'text-red-600' : 'text-gray-900'}`}>
            {health.metrics.circuitBreaks}
          </span>
        </div>
      </div>
    </div>
  );
}

function RateLimitCard({ health }: { health: any }) {
  const gammaLimit = health.rateLimits.gamma;
  const clobLimit = health.rateLimits.clob;

  const gammaPercentage = (gammaLimit.current / gammaLimit.max) * 100;
  const clobPercentage = (clobLimit.current / clobLimit.max) * 100;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Rate Limits</h3>
        <Zap className="w-5 h-5 text-gray-400" />
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Gamma API</span>
            <span className="text-sm text-gray-600">
              {gammaLimit.current} / {gammaLimit.max}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${
                gammaPercentage > 80 ? 'bg-red-500' : gammaPercentage > 60 ? 'bg-orange-500' : 'bg-green-500'
              }`}
              style={{ width: `${gammaPercentage}%` }}
            />
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Reset in {Math.ceil(gammaLimit.resetIn / 1000)}s
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">CLOB API</span>
            <span className="text-sm text-gray-600">
              {clobLimit.current} / {clobLimit.max}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${
                clobPercentage > 80 ? 'bg-red-500' : clobPercentage > 60 ? 'bg-orange-500' : 'bg-green-500'
              }`}
              style={{ width: `${clobPercentage}%` }}
            />
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Reset in {Math.ceil(clobLimit.resetIn / 1000)}s
          </div>
        </div>
      </div>
    </div>
  );
}

function CircuitBreakerCard() {
  const [endpoints, setEndpoints] = useState<string[]>(['gamma-markets', 'gamma-market', 'clob-orderbook']);
  const [statuses, setStatuses] = useState<Record<string, any>>({});

  useEffect(() => {
    const fetchStatuses = () => {
      const newStatuses: Record<string, any> = {};
      endpoints.forEach(endpoint => {
        newStatuses[endpoint] = getCircuitBreakerStatus(endpoint);
      });
      setStatuses(newStatuses);
    };

    fetchStatuses();
    const interval = setInterval(fetchStatuses, 5000);
    return () => clearInterval(interval);
  }, [endpoints]);

  const getStateColor = (state: CircuitState | null) => {
    if (!state) return 'gray';
    switch (state) {
      case CircuitState.CLOSED:
        return 'green';
      case CircuitState.HALF_OPEN:
        return 'orange';
      case CircuitState.OPEN:
        return 'red';
      default:
        return 'gray';
    }
  };

  const getStateIcon = (state: CircuitState | null) => {
    if (!state) return <AlertCircle className="w-4 h-4" />;
    switch (state) {
      case CircuitState.CLOSED:
        return <CheckCircle className="w-4 h-4" />;
      case CircuitState.HALF_OPEN:
        return <AlertTriangle className="w-4 h-4" />;
      case CircuitState.OPEN:
        return <XCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Circuit Breakers</h3>
        <TrendingUp className="w-5 h-5 text-gray-400" />
      </div>

      <div className="space-y-3">
        {endpoints.map(endpoint => {
          const status = statuses[endpoint];
          const state = status?.state || CircuitState.CLOSED;
          const color = getStateColor(state);
          const icon = getStateIcon(state);

          return (
            <div
              key={endpoint}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className={`text-${color}-600`}>{icon}</div>
                <span className="text-sm font-medium text-gray-700">{endpoint}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className={`text-xs font-medium text-${color}-600 uppercase`}>
                  {state}
                </span>
                {status && (
                  <span className="text-xs text-gray-500">
                    Failures: {status.failureCount}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CacheStatsCard({ stats, recommendations }: { stats: any; recommendations: string[] }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Cache Performance</h3>
        <Database className="w-5 h-5 text-gray-400" />
      </div>

      <div className="space-y-3 mb-4">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Total Entries</span>
          <span className="text-sm font-medium text-gray-900">{stats.totalEntries}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Hit Rate</span>
          <span className="text-sm font-medium text-green-600">{formatHitRate(stats.hitRate)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Miss Rate</span>
          <span className="text-sm font-medium text-orange-600">{formatHitRate(stats.missRate)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Memory Usage</span>
          <span className="text-sm font-medium text-gray-900">{formatBytes(stats.memoryUsageEstimate)}</span>
        </div>
      </div>

      {recommendations.length > 0 && (
        <div className="pt-4 border-t">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Recommendations</h4>
          <ul className="space-y-1">
            {recommendations.map((rec, index) => (
              <li key={index} className="text-xs text-gray-600 flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function RequestMetricsCard({ metrics }: { metrics: any }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Request Metrics</h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center p-4 bg-blue-50 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">{metrics.totalRequests}</div>
          <div className="text-sm text-gray-600">Total</div>
        </div>
        <div className="text-center p-4 bg-green-50 rounded-lg">
          <div className="text-2xl font-bold text-green-600">{metrics.successfulRequests}</div>
          <div className="text-sm text-gray-600">Success</div>
        </div>
        <div className="text-center p-4 bg-red-50 rounded-lg">
          <div className="text-2xl font-bold text-red-600">{metrics.failedRequests}</div>
          <div className="text-sm text-gray-600">Failed</div>
        </div>
        <div className="text-center p-4 bg-purple-50 rounded-lg">
          <div className="text-2xl font-bold text-purple-600">{metrics.cachedRequests}</div>
          <div className="text-sm text-gray-600">Cached</div>
        </div>
        <div className="text-center p-4 bg-orange-50 rounded-lg">
          <div className="text-2xl font-bold text-orange-600">{metrics.queuedRequests}</div>
          <div className="text-sm text-gray-600">Queued</div>
        </div>
        <div className="text-center p-4 bg-yellow-50 rounded-lg">
          <div className="text-2xl font-bold text-yellow-600">{metrics.rateLimitHits}</div>
          <div className="text-sm text-gray-600">Rate Limited</div>
        </div>
        <div className="text-center p-4 bg-red-50 rounded-lg">
          <div className="text-2xl font-bold text-red-600">{metrics.circuitBreaks}</div>
          <div className="text-sm text-gray-600">Circuit Breaks</div>
        </div>
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-gray-600">{metrics.averageLatency.toFixed(0)}ms</div>
          <div className="text-sm text-gray-600">Avg Latency</div>
        </div>
      </div>
    </div>
  );
}
