import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export type NotificationType = 'success' | 'warning' | 'error' | 'info' | 'opportunity' | 'execution' | 'stop_loss' | 'low_balance';
export type NotificationCategory = 'trade' | 'position' | 'alert' | 'system' | 'module';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  category: NotificationCategory;
  module?: string;
  metadata?: Record<string, any>;
  is_read: boolean;
  created_at: string;
  read_at?: string;
}

export interface NotificationPreferences {
  id: string;
  user_id: string;
  enable_toast: boolean;
  enable_opportunity_notifications: boolean;
  enable_execution_notifications: boolean;
  enable_stop_loss_notifications: boolean;
  enable_error_notifications: boolean;
  enable_low_balance_notifications: boolean;
  enable_position_updates: boolean;
  enable_module_alerts: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateNotificationParams {
  type: NotificationType;
  title: string;
  message: string;
  category: NotificationCategory;
  module?: string;
  metadata?: Record<string, any>;
  showToast?: boolean;
}

class NotificationService {
  async createNotification(params: CreateNotificationParams): Promise<Notification | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('User not authenticated');
        return null;
      }

      const preferences = await this.getPreferences();

      const shouldShow = this.shouldShowNotification(params.type, preferences);
      if (!shouldShow) {
        return null;
      }

      const { data, error } = await supabase
        .from('notifications')
        .insert({
          user_id: user.id,
          type: params.type,
          title: params.title,
          message: params.message,
          category: params.category,
          module: params.module,
          metadata: params.metadata || {},
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating notification:', error);
        return null;
      }

      if (params.showToast !== false && preferences?.enable_toast) {
        this.showToast(params.type, params.title, params.message);
      }

      return data;
    } catch (error) {
      console.error('Error in createNotification:', error);
      return null;
    }
  }

  private shouldShowNotification(type: NotificationType, preferences: NotificationPreferences | null): boolean {
    if (!preferences) return true;

    switch (type) {
      case 'opportunity':
        return preferences.enable_opportunity_notifications;
      case 'execution':
        return preferences.enable_execution_notifications;
      case 'stop_loss':
        return preferences.enable_stop_loss_notifications;
      case 'error':
        return preferences.enable_error_notifications;
      case 'low_balance':
        return preferences.enable_low_balance_notifications;
      default:
        return true;
    }
  }

  private showToast(type: NotificationType, title: string, message: string) {
    const content = `${title}\n${message}`;

    switch (type) {
      case 'success':
      case 'execution':
        toast.success(content, { duration: 4000 });
        break;
      case 'error':
        toast.error(content, { duration: 5000 });
        break;
      case 'warning':
      case 'stop_loss':
      case 'low_balance':
        toast(content, {
          icon: '⚠️',
          duration: 5000,
          style: {
            background: '#F59E0B',
            color: '#fff',
          },
        });
        break;
      case 'opportunity':
        toast(content, {
          icon: '🎯',
          duration: 4000,
          style: {
            background: '#3B82F6',
            color: '#fff',
          },
        });
        break;
      default:
        toast(content, { duration: 4000 });
    }
  }

  async getNotifications(limit: number = 50, unreadOnly: boolean = false): Promise<Notification[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (unreadOnly) {
        query = query.eq('is_read', false);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching notifications:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getNotifications:', error);
      return [];
    }
  }

  async getUnreadCount(): Promise<number> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;

      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) {
        console.error('Error fetching unread count:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error in getUnreadCount:', error);
      return 0;
    }
  }

  async markAsRead(notificationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq('id', notificationId);

      if (error) {
        console.error('Error marking notification as read:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in markAsRead:', error);
      return false;
    }
  }

  async markAllAsRead(): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { error } = await supabase
        .from('notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) {
        console.error('Error marking all as read:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in markAllAsRead:', error);
      return false;
    }
  }

  async deleteNotification(notificationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) {
        console.error('Error deleting notification:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteNotification:', error);
      return false;
    }
  }

  async clearAllNotifications(): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.id);

      if (error) {
        console.error('Error clearing notifications:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in clearAllNotifications:', error);
      return false;
    }
  }

  async getPreferences(): Promise<NotificationPreferences | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching preferences:', error);
        return null;
      }

      if (!data) {
        return await this.createDefaultPreferences();
      }

      return data;
    } catch (error) {
      console.error('Error in getPreferences:', error);
      return null;
    }
  }

  async createDefaultPreferences(): Promise<NotificationPreferences | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('notification_preferences')
        .insert({
          user_id: user.id,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating default preferences:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in createDefaultPreferences:', error);
      return null;
    }
  }

  async updatePreferences(preferences: Partial<NotificationPreferences>): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { error } = await supabase
        .from('notification_preferences')
        .update(preferences)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error updating preferences:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in updatePreferences:', error);
      return false;
    }
  }

  subscribeToNotifications(callback: (notification: Notification) => void) {
    const channel = supabase
      .channel('notifications-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
          callback(payload.new as Notification);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  notifyOpportunity(title: string, message: string, module: string, metadata?: Record<string, any>) {
    return this.createNotification({
      type: 'opportunity',
      title,
      message,
      category: 'alert',
      module,
      metadata,
    });
  }

  notifyExecution(title: string, message: string, module: string, metadata?: Record<string, any>) {
    return this.createNotification({
      type: 'execution',
      title,
      message,
      category: 'trade',
      module,
      metadata,
    });
  }

  notifyStopLoss(title: string, message: string, module: string, metadata?: Record<string, any>) {
    return this.createNotification({
      type: 'stop_loss',
      title,
      message,
      category: 'position',
      module,
      metadata,
    });
  }

  notifyError(title: string, message: string, module?: string, metadata?: Record<string, any>) {
    return this.createNotification({
      type: 'error',
      title,
      message,
      category: 'system',
      module,
      metadata,
    });
  }

  notifyLowBalance(title: string, message: string, metadata?: Record<string, any>) {
    return this.createNotification({
      type: 'low_balance',
      title,
      message,
      category: 'alert',
      metadata,
    });
  }

  notifySuccess(title: string, message: string, category: NotificationCategory = 'system', module?: string, metadata?: Record<string, any>) {
    return this.createNotification({
      type: 'success',
      title,
      message,
      category,
      module,
      metadata,
    });
  }
}

export const notificationService = new NotificationService();
