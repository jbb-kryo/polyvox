import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, AlertTriangle, Loader2 } from 'lucide-react';
import { connectionStatusService } from '../services/connectionStatus';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export function ConnectionStatus() {
  const [status, setStatus] = useState(connectionStatusService.getStatus());
  const { isOnline } = useOnlineStatus();

  useEffect(() => {
    const unsubscribe = connectionStatusService.subscribe((newStatus) => {
      setStatus(newStatus);
    });

    return unsubscribe;
  }, []);

  if (status === 'online' && isOnline) {
    return null;
  }

  const getStatusConfig = () => {
    switch (status) {
      case 'offline':
        return {
          icon: <WifiOff className="w-4 h-4" />,
          text: 'Offline',
          bg: 'bg-red-500',
          textColor: 'text-red-100',
        };
      case 'slow':
        return {
          icon: <AlertTriangle className="w-4 h-4" />,
          text: 'Slow Connection',
          bg: 'bg-yellow-500',
          textColor: 'text-yellow-100',
        };
      case 'checking':
        return {
          icon: <Loader2 className="w-4 h-4 animate-spin" />,
          text: 'Checking...',
          bg: 'bg-blue-500',
          textColor: 'text-blue-100',
        };
      default:
        return {
          icon: <Wifi className="w-4 h-4" />,
          text: 'Online',
          bg: 'bg-green-500',
          textColor: 'text-green-100',
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${config.bg} ${config.textColor} text-xs font-medium`}>
      {config.icon}
      <span>{config.text}</span>
    </div>
  );
}

export function OfflineBanner() {
  const { isOnline, wasOffline } = useOnlineStatus();
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    if (isOnline && wasOffline) {
      setShowReconnected(true);
      const timer = setTimeout(() => {
        setShowReconnected(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  if (isOnline && !showReconnected) {
    return null;
  }

  if (showReconnected) {
    return (
      <div className="bg-green-500 text-white px-4 py-2 text-center text-sm font-medium">
        <div className="flex items-center justify-center gap-2">
          <Wifi className="w-4 h-4" />
          Connection restored
        </div>
      </div>
    );
  }

  return (
    <div className="bg-red-500 text-white px-4 py-2 text-center text-sm font-medium">
      <div className="flex items-center justify-center gap-2">
        <WifiOff className="w-4 h-4" />
        You are currently offline. Some features may not work properly.
      </div>
    </div>
  );
}
