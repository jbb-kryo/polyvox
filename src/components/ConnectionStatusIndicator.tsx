import React from 'react';
import { Wifi, WifiOff, RefreshCw, AlertTriangle } from 'lucide-react';
import { useConnectionStatus } from '../hooks/useRealTimeMarket';
import { ConnectionStatus } from '../services/marketDataStream';

interface ConnectionStatusIndicatorProps {
  showText?: boolean;
  compact?: boolean;
  showRateLimit?: boolean;
}

export function ConnectionStatusIndicator({
  showText = true,
  compact = false,
  showRateLimit = false
}: ConnectionStatusIndicatorProps) {
  const { status, isConnected, rateLimitInfo } = useConnectionStatus();

  const getStatusConfig = (
    status: ConnectionStatus
  ): { icon: React.ReactNode; text: string; color: string; bgColor: string } => {
    switch (status) {
      case 'connected':
        return {
          icon: <Wifi className="w-4 h-4" />,
          text: 'Connected',
          color: 'text-green-600',
          bgColor: 'bg-green-50'
        };
      case 'connecting':
        return {
          icon: <RefreshCw className="w-4 h-4 animate-spin" />,
          text: 'Connecting...',
          color: 'text-blue-600',
          bgColor: 'bg-blue-50'
        };
      case 'reconnecting':
        return {
          icon: <RefreshCw className="w-4 h-4 animate-spin" />,
          text: 'Reconnecting...',
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50'
        };
      case 'disconnected':
        return {
          icon: <WifiOff className="w-4 h-4" />,
          text: 'Disconnected',
          color: 'text-gray-600',
          bgColor: 'bg-gray-50'
        };
      case 'error':
        return {
          icon: <AlertTriangle className="w-4 h-4" />,
          text: 'Connection Error',
          color: 'text-red-600',
          bgColor: 'bg-red-50'
        };
      default:
        return {
          icon: <WifiOff className="w-4 h-4" />,
          text: 'Unknown',
          color: 'text-gray-600',
          bgColor: 'bg-gray-50'
        };
    }
  };

  const config = getStatusConfig(status);

  const formatResetTime = (ms: number): string => {
    const seconds = Math.ceil(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  if (compact) {
    return (
      <div className={`flex items-center gap-1 px-2 py-1 rounded ${config.bgColor}`}>
        <div className={config.color}>{config.icon}</div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${config.bgColor}`}>
        <div className={config.color}>{config.icon}</div>
        {showText && (
          <span className={`text-sm font-medium ${config.color}`}>{config.text}</span>
        )}
      </div>

      {showRateLimit && isConnected && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50">
          <span className="text-xs text-gray-600">
            Rate Limit: {rateLimitInfo.remaining}/100
          </span>
          {rateLimitInfo.remaining < 20 && rateLimitInfo.resetTime > 0 && (
            <span className="text-xs text-orange-600">
              Reset: {formatResetTime(rateLimitInfo.resetTime)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

interface LiveUpdateBadgeProps {
  isLive: boolean;
  lastUpdate?: Date;
}

export function LiveUpdateBadge({ isLive, lastUpdate }: LiveUpdateBadgeProps) {
  const getTimeSinceUpdate = (): string => {
    if (!lastUpdate) return 'Never';

    const now = Date.now();
    const diff = now - lastUpdate.getTime();

    if (diff < 10000) return 'Just now';
    if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return `${Math.floor(diff / 3600000)}h ago`;
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5">
        <div
          className={`w-2 h-2 rounded-full ${
            isLive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
          }`}
        />
        <span className="text-xs font-medium text-gray-700">
          {isLive ? 'Live' : 'Paused'}
        </span>
      </div>
      {lastUpdate && (
        <span className="text-xs text-gray-500">{getTimeSinceUpdate()}</span>
      )}
    </div>
  );
}

interface MarketDataStatusProps {
  marketId: string;
  snapshot?: { timestamp: Date } | null;
  connectionStatus: ConnectionStatus;
}

export function MarketDataStatus({
  marketId,
  snapshot,
  connectionStatus
}: MarketDataStatusProps) {
  const isLive = connectionStatus === 'connected';

  return (
    <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg">
      <div className="flex items-center gap-3">
        <div className="text-sm text-gray-600">Market: {marketId.substring(0, 8)}...</div>
        <LiveUpdateBadge isLive={isLive} lastUpdate={snapshot?.timestamp} />
      </div>
      <ConnectionStatusIndicator compact showText={false} />
    </div>
  );
}
