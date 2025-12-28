import React from 'react';
import { Activity, TrendingUp, TrendingDown, AlertCircle, CheckCircle, Info } from 'lucide-react';
import type { ActivityItem } from '../hooks/useRealtimeDashboard';

interface RecentActivityFeedProps {
  activities: ActivityItem[];
  maxItems?: number;
}

export function RecentActivityFeed({ activities, maxItems = 10 }: RecentActivityFeedProps) {
  const displayedActivities = activities.slice(0, maxItems);

  const getIcon = (item: ActivityItem) => {
    if (item.status === 'success') {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
    if (item.status === 'error') {
      return <AlertCircle className="w-4 h-4 text-red-500" />;
    }
    if (item.status === 'warning') {
      return <AlertCircle className="w-4 h-4 text-yellow-500" />;
    }
    return <Info className="w-4 h-4 text-blue-500" />;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'text-green-600 bg-green-50';
      case 'error':
        return 'text-red-600 bg-red-50';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50';
      default:
        return 'text-blue-600 bg-blue-50';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const formatAmount = (amount: number | undefined) => {
    if (amount === undefined) return null;
    const sign = amount >= 0 ? '+' : '';
    return `${sign}$${amount.toFixed(2)}`;
  };

  if (displayedActivities.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No recent activity</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {displayedActivities.map((item) => (
        <div
          key={item.id}
          className="flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
        >
          <div className="flex-shrink-0 mt-0.5">
            {getIcon(item)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(item.status)}`}>
                    {item.module}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatTimestamp(item.timestamp)}
                  </span>
                </div>
                <p className="text-sm text-gray-900">{item.message}</p>
              </div>

              {item.amount !== undefined && (
                <div className={`text-sm font-semibold flex items-center gap-1 ${
                  item.amount >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {item.amount >= 0 ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  {formatAmount(item.amount)}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
