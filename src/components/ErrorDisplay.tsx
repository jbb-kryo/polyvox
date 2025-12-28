import React from 'react';
import { AlertTriangle, RefreshCw, WifiOff, XCircle, AlertCircle, Info } from 'lucide-react';

interface ErrorDisplayProps {
  title?: string;
  message?: string;
  error?: Error | string | null;
  onRetry?: () => void;
  type?: 'error' | 'warning' | 'offline' | 'info';
  showRetry?: boolean;
  fullPage?: boolean;
}

export function ErrorDisplay({
  title = 'Something went wrong',
  message = 'An unexpected error occurred. Please try again.',
  error,
  onRetry,
  type = 'error',
  showRetry = true,
  fullPage = false,
}: ErrorDisplayProps) {
  const getIcon = () => {
    switch (type) {
      case 'offline':
        return <WifiOff className="w-8 h-8 text-gray-400" />;
      case 'warning':
        return <AlertTriangle className="w-8 h-8 text-yellow-400" />;
      case 'info':
        return <Info className="w-8 h-8 text-blue-400" />;
      default:
        return <XCircle className="w-8 h-8 text-red-400" />;
    }
  };

  const getColors = () => {
    switch (type) {
      case 'offline':
        return {
          bg: 'bg-gray-500 bg-opacity-20',
          border: 'border-gray-500',
          text: 'text-gray-400',
        };
      case 'warning':
        return {
          bg: 'bg-yellow-500 bg-opacity-20',
          border: 'border-yellow-500',
          text: 'text-yellow-400',
        };
      case 'info':
        return {
          bg: 'bg-blue-500 bg-opacity-20',
          border: 'border-blue-500',
          text: 'text-blue-400',
        };
      default:
        return {
          bg: 'bg-red-500 bg-opacity-20',
          border: 'border-red-500',
          text: 'text-red-400',
        };
    }
  };

  const colors = getColors();
  const containerClass = fullPage
    ? 'flex items-center justify-center min-h-screen p-6'
    : 'flex items-center justify-center p-6';

  return (
    <div className={containerClass}>
      <div className="max-w-md w-full bg-gray-800 border border-gray-700 rounded-lg p-6">
        <div className="flex flex-col items-center text-center">
          <div className={`p-3 ${colors.bg} rounded-full mb-4`}>
            {getIcon()}
          </div>

          <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
          <p className="text-sm text-gray-400 mb-4">{message}</p>

          {error && (
            <div className="w-full mb-4 p-3 bg-gray-900 rounded border border-gray-700">
              <p className="text-xs font-mono text-gray-400 break-all text-left">
                {typeof error === 'string' ? error : error.message}
              </p>
            </div>
          )}

          {showRetry && onRetry && (
            <button
              onClick={onRetry}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function InlineError({
  message,
  onRetry,
  compact = false,
}: {
  message: string;
  onRetry?: () => void;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500 bg-opacity-10 px-3 py-2 rounded">
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
        <span className="flex-1">{message}</span>
        {onRetry && (
          <button
            onClick={onRetry}
            className="p-1 hover:bg-red-500 hover:bg-opacity-20 rounded transition-colors"
            title="Retry"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-red-500 bg-opacity-10 border border-red-500 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm text-red-400">{message}</p>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center gap-1 px-3 py-1 text-xs bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Retry
          </button>
        )}
      </div>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  message,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  message: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="p-4 bg-gray-800 rounded-full mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm text-gray-400 text-center mb-4 max-w-md">{message}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

export function NetworkError({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorDisplay
      type="offline"
      title="Connection Error"
      message="Unable to connect to the server. Please check your internet connection and try again."
      onRetry={onRetry}
    />
  );
}

export function NotFoundError({ resource = 'resource', onRetry }: { resource?: string; onRetry?: () => void }) {
  return (
    <ErrorDisplay
      type="warning"
      title="Not Found"
      message={`The ${resource} you're looking for could not be found.`}
      onRetry={onRetry}
    />
  );
}
