import { supabase } from '../lib/supabase';

export type ErrorSeverity = 'critical' | 'error' | 'warning' | 'info';

export interface ErrorLogEntry {
  id?: string;
  userId?: string;
  errorType: string;
  errorMessage: string;
  errorStack?: string;
  errorCode?: string;
  severity: ErrorSeverity;
  componentName?: string;
  userAction?: string;
  url: string;
  userAgent: string;
  context?: Record<string, any>;
  resolved?: boolean;
  createdAt?: string;
}

export interface ErrorStatistics {
  totalErrors: number;
  criticalErrors: number;
  regularErrors: number;
  warnings: number;
  uniqueUsers: number;
  mostCommonError: string | null;
  mostAffectedComponent: string | null;
  errorRateTrend: number;
}

export interface ErrorRateMetric {
  timeBucket: string;
  totalErrors: number;
  uniqueUsers: number;
  criticalCount: number;
  errorCount: number;
  warningCount: number;
  infoCount: number;
}

class ErrorTrackingService {
  private static instance: ErrorTrackingService;
  private errorQueue: ErrorLogEntry[] = [];
  private isProcessing = false;
  private batchSize = 10;
  private flushInterval = 5000;
  private flushTimer: NodeJS.Timeout | null = null;

  private constructor() {
    this.startFlushTimer();
    this.setupGlobalErrorHandlers();
  }

  static getInstance(): ErrorTrackingService {
    if (!ErrorTrackingService.instance) {
      ErrorTrackingService.instance = new ErrorTrackingService();
    }
    return ErrorTrackingService.instance;
  }

  private setupGlobalErrorHandlers() {
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        this.logError({
          errorType: 'runtime',
          errorMessage: event.message,
          errorStack: event.error?.stack,
          severity: 'error',
          url: window.location.href,
          userAgent: navigator.userAgent,
          context: {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
          },
        });
      });

      window.addEventListener('unhandledrejection', (event) => {
        this.logError({
          errorType: 'unhandled_promise',
          errorMessage: event.reason?.message || String(event.reason),
          errorStack: event.reason?.stack,
          severity: 'error',
          url: window.location.href,
          userAgent: navigator.userAgent,
          context: {
            reason: event.reason,
          },
        });
      });
    }
  }

  private startFlushTimer() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.flushInterval);
  }

  async logError(error: Omit<ErrorLogEntry, 'url' | 'userAgent'> & Partial<Pick<ErrorLogEntry, 'url' | 'userAgent'>>): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const errorEntry: ErrorLogEntry = {
        ...error,
        userId: user?.id,
        url: error.url || (typeof window !== 'undefined' ? window.location.href : ''),
        userAgent: error.userAgent || (typeof navigator !== 'undefined' ? navigator.userAgent : ''),
      };

      this.errorQueue.push(errorEntry);

      if (errorEntry.severity === 'critical') {
        await this.notifyCriticalError(errorEntry);
        await this.flush();
      } else if (this.errorQueue.length >= this.batchSize) {
        await this.flush();
      }
    } catch (err) {
      console.error('Failed to queue error:', err);
    }
  }

  private async notifyCriticalError(error: ErrorLogEntry): Promise<void> {
    try {
      const { notificationService } = await import('./notificationService');
      await notificationService.createNotification({
        type: 'error',
        title: 'Critical Error Occurred',
        message: error.errorMessage,
        category: 'system',
        module: error.componentName || error.errorType,
        metadata: {
          errorId: error.id,
          errorType: error.errorType,
          componentName: error.componentName,
          url: error.url,
        },
        showToast: true,
      });
    } catch (err) {
      console.error('Failed to send critical error notification:', err);
    }
  }

  async flush(): Promise<void> {
    if (this.isProcessing || this.errorQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      const batch = this.errorQueue.splice(0, this.batchSize);

      const { error } = await supabase
        .from('error_logs')
        .insert(
          batch.map((entry) => ({
            user_id: entry.userId,
            error_type: entry.errorType,
            error_message: entry.errorMessage,
            error_stack: entry.errorStack,
            error_code: entry.errorCode,
            severity: entry.severity,
            component_name: entry.componentName,
            user_action: entry.userAction,
            url: entry.url,
            user_agent: entry.userAgent,
            context: entry.context || {},
          }))
        );

      if (error) {
        console.error('Failed to log errors to database:', error);
        this.errorQueue.unshift(...batch);
      }
    } catch (err) {
      console.error('Error flushing error queue:', err);
    } finally {
      this.isProcessing = false;
    }
  }

  async logErrorSync(error: Omit<ErrorLogEntry, 'url' | 'userAgent'> & Partial<Pick<ErrorLogEntry, 'url' | 'userAgent'>>): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const errorEntry = {
        user_id: user?.id,
        error_type: error.errorType,
        error_message: error.errorMessage,
        error_stack: error.errorStack,
        error_code: error.errorCode,
        severity: error.severity,
        component_name: error.componentName,
        user_action: error.userAction,
        url: error.url || (typeof window !== 'undefined' ? window.location.href : ''),
        user_agent: error.userAgent || (typeof navigator !== 'undefined' ? navigator.userAgent : ''),
        context: error.context || {},
      };

      const { error: dbError } = await supabase
        .from('error_logs')
        .insert([errorEntry]);

      if (dbError) {
        console.error('Failed to log error:', dbError);
      }
    } catch (err) {
      console.error('Error logging to database:', err);
    }
  }

  async getRecentErrors(limit = 50): Promise<ErrorLogEntry[]> {
    try {
      const { data, error } = await supabase
        .from('error_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map((row) => ({
        id: row.id,
        userId: row.user_id,
        errorType: row.error_type,
        errorMessage: row.error_message,
        errorStack: row.error_stack,
        errorCode: row.error_code,
        severity: row.severity,
        componentName: row.component_name,
        userAction: row.user_action,
        url: row.url,
        userAgent: row.user_agent,
        context: row.context,
        resolved: row.resolved,
        createdAt: row.created_at,
      }));
    } catch (err) {
      console.error('Failed to fetch recent errors:', err);
      return [];
    }
  }

  async getErrorStatistics(timeRange = '24 hours'): Promise<ErrorStatistics | null> {
    try {
      const { data, error } = await supabase.rpc('get_error_statistics', {
        time_range: timeRange,
      });

      if (error) throw error;

      if (data && data.length > 0) {
        const stats = data[0];
        return {
          totalErrors: parseInt(stats.total_errors) || 0,
          criticalErrors: parseInt(stats.critical_errors) || 0,
          regularErrors: parseInt(stats.regular_errors) || 0,
          warnings: parseInt(stats.warnings) || 0,
          uniqueUsers: parseInt(stats.unique_users) || 0,
          mostCommonError: stats.most_common_error,
          mostAffectedComponent: stats.most_affected_component,
          errorRateTrend: parseFloat(stats.error_rate_trend) || 0,
        };
      }

      return null;
    } catch (err) {
      console.error('Failed to fetch error statistics:', err);
      return null;
    }
  }

  async getErrorRateMetrics(hours = 24): Promise<ErrorRateMetric[]> {
    try {
      const startTime = new Date();
      startTime.setHours(startTime.getHours() - hours);

      const { data, error } = await supabase
        .from('error_rate_metrics')
        .select('*')
        .gte('time_bucket', startTime.toISOString())
        .order('time_bucket', { ascending: true });

      if (error) throw error;

      return (data || []).map((row) => ({
        timeBucket: row.time_bucket,
        totalErrors: row.total_errors,
        uniqueUsers: row.unique_users,
        criticalCount: row.critical_count,
        errorCount: row.error_count,
        warningCount: row.warning_count,
        infoCount: row.info_count,
      }));
    } catch (err) {
      console.error('Failed to fetch error rate metrics:', err);
      return [];
    }
  }

  async markErrorResolved(errorId: string): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('error_logs')
        .update({
          resolved: true,
          resolved_at: new Date().toISOString(),
          resolved_by: user?.id,
        })
        .eq('id', errorId);

      if (error) throw error;

      return true;
    } catch (err) {
      console.error('Failed to mark error as resolved:', err);
      return false;
    }
  }

  async getErrorsByType(errorType: string, limit = 50): Promise<ErrorLogEntry[]> {
    try {
      const { data, error } = await supabase
        .from('error_logs')
        .select('*')
        .eq('error_type', errorType)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map((row) => ({
        id: row.id,
        userId: row.user_id,
        errorType: row.error_type,
        errorMessage: row.error_message,
        errorStack: row.error_stack,
        errorCode: row.error_code,
        severity: row.severity,
        componentName: row.component_name,
        userAction: row.user_action,
        url: row.url,
        userAgent: row.user_agent,
        context: row.context,
        resolved: row.resolved,
        createdAt: row.created_at,
      }));
    } catch (err) {
      console.error('Failed to fetch errors by type:', err);
      return [];
    }
  }

  async getUnresolvedErrors(limit = 50): Promise<ErrorLogEntry[]> {
    try {
      const { data, error } = await supabase
        .from('error_logs')
        .select('*')
        .eq('resolved', false)
        .eq('severity', 'critical')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map((row) => ({
        id: row.id,
        userId: row.user_id,
        errorType: row.error_type,
        errorMessage: row.error_message,
        errorStack: row.error_stack,
        errorCode: row.error_code,
        severity: row.severity,
        componentName: row.component_name,
        userAction: row.user_action,
        url: row.url,
        userAgent: row.user_agent,
        context: row.context,
        resolved: row.resolved,
        createdAt: row.created_at,
      }));
    } catch (err) {
      console.error('Failed to fetch unresolved errors:', err);
      return [];
    }
  }

  destroy() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.flush();
  }
}

export const errorTracking = ErrorTrackingService.getInstance();

export function logError(
  errorType: string,
  errorMessage: string,
  severity: ErrorSeverity = 'error',
  options?: {
    errorStack?: string;
    errorCode?: string;
    componentName?: string;
    userAction?: string;
    context?: Record<string, any>;
  }
): void {
  errorTracking.logError({
    errorType,
    errorMessage,
    severity,
    ...options,
  });
}

export function logCriticalError(
  errorMessage: string,
  errorStack?: string,
  componentName?: string
): void {
  errorTracking.logError({
    errorType: 'critical',
    errorMessage,
    errorStack,
    severity: 'critical',
    componentName,
  });
}

export function logNetworkError(
  errorMessage: string,
  url: string,
  statusCode?: number
): void {
  errorTracking.logError({
    errorType: 'network',
    errorMessage,
    severity: 'error',
    errorCode: statusCode?.toString(),
    context: {
      requestUrl: url,
      statusCode,
    },
  });
}

export function logValidationError(
  errorMessage: string,
  field?: string,
  value?: any
): void {
  errorTracking.logError({
    errorType: 'validation',
    errorMessage,
    severity: 'warning',
    context: {
      field,
      value,
    },
  });
}
