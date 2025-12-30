import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export type ActionType =
  | 'trade_execution'
  | 'module_toggle'
  | 'api_call'
  | 'market_data_fetch'
  | 'position_update'
  | 'wallet_operation';

export interface RateLimitConfig {
  id: string;
  userId: string;
  actionType: ActionType;
  limitPerMinute: number;
  limitPerHour: number;
  limitPerDay: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RateLimitCheck {
  limited: boolean;
  reason: 'per_minute' | 'per_hour' | 'per_day' | null;
  limit?: number;
  current?: number;
  resetInSeconds?: number;
  usage?: {
    perMinute: number;
    perHour: number;
    perDay: number;
  };
}

export interface RateLimitViolation {
  id: string;
  userId: string;
  actionType: ActionType;
  limitType: string;
  limitValue: number;
  attemptedAction: Record<string, any>;
  timestamp: string;
}

export interface RateLimitUsage {
  actionType: ActionType;
  perMinute: number;
  perHour: number;
  perDay: number;
  limits: {
    perMinute: number;
    perHour: number;
    perDay: number;
  };
}

class RateLimiterService {
  private initialized = new Set<string>();

  async initializeUserLimits(userId: string): Promise<boolean> {
    if (this.initialized.has(userId)) {
      return true;
    }

    try {
      const { error } = await supabase.rpc('initialize_user_rate_limits', {
        p_user_id: userId
      });

      if (error) {
        console.error('Error initializing rate limits:', error);
        return false;
      }

      this.initialized.add(userId);
      return true;
    } catch (error) {
      console.error('Error initializing rate limits:', error);
      return false;
    }
  }

  async checkRateLimit(
    userId: string,
    actionType: ActionType,
    metadata?: Record<string, any>
  ): Promise<RateLimitCheck> {
    await this.initializeUserLimits(userId);

    try {
      const { data, error } = await supabase.rpc('record_and_check_rate_limit', {
        p_user_id: userId,
        p_action_type: actionType,
        p_metadata: metadata || {}
      });

      if (error) {
        console.error('Error checking rate limit:', error);
        return { limited: false, reason: null };
      }

      return data as RateLimitCheck;
    } catch (error) {
      console.error('Error checking rate limit:', error);
      return { limited: false, reason: null };
    }
  }

  async checkOnly(userId: string, actionType: ActionType): Promise<RateLimitCheck> {
    await this.initializeUserLimits(userId);

    try {
      const { data, error } = await supabase.rpc('is_rate_limited', {
        p_user_id: userId,
        p_action_type: actionType
      });

      if (error) {
        console.error('Error checking rate limit:', error);
        return { limited: false, reason: null };
      }

      return data as RateLimitCheck;
    } catch (error) {
      console.error('Error checking rate limit:', error);
      return { limited: false, reason: null };
    }
  }

  async getConfig(userId: string, actionType: ActionType): Promise<RateLimitConfig | null> {
    await this.initializeUserLimits(userId);

    try {
      const { data, error } = await supabase
        .from('rate_limit_configs')
        .select('*')
        .eq('user_id', userId)
        .eq('action_type', actionType)
        .maybeSingle();

      if (error) {
        console.error('Error fetching rate limit config:', error);
        return null;
      }

      if (!data) return null;

      return {
        id: data.id,
        userId: data.user_id,
        actionType: data.action_type,
        limitPerMinute: data.limit_per_minute,
        limitPerHour: data.limit_per_hour,
        limitPerDay: data.limit_per_day,
        enabled: data.enabled,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    } catch (error) {
      console.error('Error fetching rate limit config:', error);
      return null;
    }
  }

  async getAllConfigs(userId: string): Promise<RateLimitConfig[]> {
    await this.initializeUserLimits(userId);

    try {
      const { data, error } = await supabase
        .from('rate_limit_configs')
        .select('*')
        .eq('user_id', userId)
        .order('action_type');

      if (error) {
        console.error('Error fetching rate limit configs:', error);
        return [];
      }

      return (data || []).map(item => ({
        id: item.id,
        userId: item.user_id,
        actionType: item.action_type,
        limitPerMinute: item.limit_per_minute,
        limitPerHour: item.limit_per_hour,
        limitPerDay: item.limit_per_day,
        enabled: item.enabled,
        createdAt: item.created_at,
        updatedAt: item.updated_at
      }));
    } catch (error) {
      console.error('Error fetching rate limit configs:', error);
      return [];
    }
  }

  async updateConfig(
    userId: string,
    actionType: ActionType,
    config: {
      limitPerMinute?: number;
      limitPerHour?: number;
      limitPerDay?: number;
      enabled?: boolean;
    }
  ): Promise<boolean> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (config.limitPerMinute !== undefined) {
        updateData.limit_per_minute = config.limitPerMinute;
      }
      if (config.limitPerHour !== undefined) {
        updateData.limit_per_hour = config.limitPerHour;
      }
      if (config.limitPerDay !== undefined) {
        updateData.limit_per_day = config.limitPerDay;
      }
      if (config.enabled !== undefined) {
        updateData.enabled = config.enabled;
      }

      const { error } = await supabase
        .from('rate_limit_configs')
        .update(updateData)
        .eq('user_id', userId)
        .eq('action_type', actionType);

      if (error) {
        console.error('Error updating rate limit config:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error updating rate limit config:', error);
      return false;
    }
  }

  async getViolations(userId: string, limit: number = 50): Promise<RateLimitViolation[]> {
    try {
      const { data, error } = await supabase
        .from('rate_limit_violations')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching violations:', error);
        return [];
      }

      return (data || []).map(item => ({
        id: item.id,
        userId: item.user_id,
        actionType: item.action_type,
        limitType: item.limit_type,
        limitValue: item.limit_value,
        attemptedAction: item.attempted_action,
        timestamp: item.timestamp
      }));
    } catch (error) {
      console.error('Error fetching violations:', error);
      return [];
    }
  }

  async getCurrentUsage(userId: string, actionType: ActionType): Promise<RateLimitUsage | null> {
    const config = await this.getConfig(userId, actionType);
    if (!config) return null;

    try {
      const [perMinute, perHour, perDay] = await Promise.all([
        this.getUsageCount(userId, actionType, 1),
        this.getUsageCount(userId, actionType, 60),
        this.getUsageCount(userId, actionType, 1440)
      ]);

      return {
        actionType,
        perMinute,
        perHour,
        perDay,
        limits: {
          perMinute: config.limitPerMinute,
          perHour: config.limitPerHour,
          perDay: config.limitPerDay
        }
      };
    } catch (error) {
      console.error('Error fetching usage:', error);
      return null;
    }
  }

  private async getUsageCount(
    userId: string,
    actionType: ActionType,
    windowMinutes: number
  ): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('get_rate_limit_usage', {
        p_user_id: userId,
        p_action_type: actionType,
        p_window_minutes: windowMinutes
      });

      if (error) {
        console.error('Error getting usage count:', error);
        return 0;
      }

      return data || 0;
    } catch (error) {
      console.error('Error getting usage count:', error);
      return 0;
    }
  }

  formatRateLimitError(check: RateLimitCheck): string {
    if (!check.limited) return '';

    const timeUnit = check.reason === 'per_minute' ? 'minute' :
                     check.reason === 'per_hour' ? 'hour' : 'day';

    const resetTime = check.resetInSeconds
      ? check.resetInSeconds < 60
        ? `${check.resetInSeconds} seconds`
        : check.resetInSeconds < 3600
        ? `${Math.ceil(check.resetInSeconds / 60)} minutes`
        : `${Math.ceil(check.resetInSeconds / 3600)} hours`
      : 'soon';

    return `Rate limit exceeded: ${check.current}/${check.limit} per ${timeUnit}. Try again in ${resetTime}.`;
  }

  showRateLimitToast(check: RateLimitCheck, actionName: string = 'Action'): void {
    if (check.limited) {
      const message = this.formatRateLimitError(check);
      toast.error(message, {
        duration: 5000,
        icon: '⏱️'
      });
    }
  }

  async withRateLimit<T>(
    userId: string,
    actionType: ActionType,
    action: () => Promise<T>,
    metadata?: Record<string, any>,
    showToast: boolean = true
  ): Promise<T | null> {
    const check = await this.checkRateLimit(userId, actionType, metadata);

    if (check.limited) {
      if (showToast) {
        this.showRateLimitToast(check);
      }
      return null;
    }

    return await action();
  }

  async cleanupOldTracking(): Promise<void> {
    try {
      await supabase.rpc('cleanup_old_rate_limit_tracking');
    } catch (error) {
      console.error('Error cleaning up old tracking:', error);
    }
  }
}

export const rateLimiter = new RateLimiterService();
export default rateLimiter;
