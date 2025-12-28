import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { notificationService, Notification, NotificationPreferences } from '../services/notificationService';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  preferences: NotificationPreferences | null;
  isLoading: boolean;
  refreshNotifications: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  clearAll: () => Promise<void>;
  updatePreferences: (preferences: Partial<NotificationPreferences>) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshNotifications = useCallback(async () => {
    try {
      const [notifs, count, prefs] = await Promise.all([
        notificationService.getNotifications(50),
        notificationService.getUnreadCount(),
        notificationService.getPreferences(),
      ]);

      setNotifications(notifs);
      setUnreadCount(count);
      setPreferences(prefs);
    } catch (error) {
      console.error('Error refreshing notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const markAsRead = useCallback(async (notificationId: string) => {
    const success = await notificationService.markAsRead(notificationId);
    if (success) {
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId
            ? { ...n, is_read: true, read_at: new Date().toISOString() }
            : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    const success = await notificationService.markAllAsRead();
    if (success) {
      setNotifications(prev =>
        prev.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
      );
      setUnreadCount(0);
    }
  }, []);

  const deleteNotification = useCallback(async (notificationId: string) => {
    const success = await notificationService.deleteNotification(notificationId);
    if (success) {
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      const notification = notifications.find(n => n.id === notificationId);
      if (notification && !notification.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    }
  }, [notifications]);

  const clearAll = useCallback(async () => {
    const success = await notificationService.clearAllNotifications();
    if (success) {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, []);

  const updatePreferences = useCallback(async (newPreferences: Partial<NotificationPreferences>) => {
    const success = await notificationService.updatePreferences(newPreferences);
    if (success) {
      setPreferences(prev => (prev ? { ...prev, ...newPreferences } : null));
    }
  }, []);

  useEffect(() => {
    refreshNotifications();
  }, [refreshNotifications]);

  useEffect(() => {
    const unsubscribe = notificationService.subscribeToNotifications((notification) => {
      setNotifications(prev => [notification, ...prev]);
      if (!notification.is_read) {
        setUnreadCount(prev => prev + 1);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    preferences,
    isLoading,
    refreshNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    updatePreferences,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
