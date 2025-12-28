import { supabase } from '../lib/supabase';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type TradingModule =
  | 'arbitrage_hunter'
  | 'snipe_master'
  | 'trend_rider'
  | 'whale_watcher'
  | 'value_miner'
  | 'position_manager'
  | 'risk_manager'
  | 'order_executor'
  | 'system';

export type ActivityType =
  | 'scan_start'
  | 'scan_complete'
  | 'opportunity_found'
  | 'opportunity_filtered'
  | 'execution_start'
  | 'execution_complete'
  | 'execution_failed'
  | 'order_submitted'
  | 'order_filled'
  | 'order_cancelled'
  | 'order_failed'
  | 'position_opened'
  | 'position_closed'
  | 'position_updated'
  | 'stop_loss_triggered'
  | 'take_profit_triggered'
  | 'risk_check'
  | 'risk_limit_exceeded'
  | 'balance_check'
  | 'config_change'
  | 'error';

export interface TradingActivityLog {
  id?: string;
  userId?: string;
  logLevel: LogLevel;
  module: TradingModule;
  activityType: ActivityType;
  message: string;
  details?: Record<string, any>;
  marketId?: string;
  orderId?: string;
  positionId?: string;
  durationMs?: number;
  success?: boolean;
  createdAt?: string;
}

export interface LogStatistics {
  totalLogs: number;
  debugCount: number;
  infoCount: number;
  warnCount: number;
  errorCount: number;
  successCount: number;
  failureCount: number;
  avgDurationMs: number;
  mostActiveModule: string | null;
  mostCommonActivity: string | null;
}

class TradingActivityLogger {
  private static instance: TradingActivityLogger;
  private logQueue: TradingActivityLog[] = [];
  private isProcessing = false;
  private batchSize = 20;
  private flushInterval = 3000;
  private flushTimer: NodeJS.Timeout | null = null;
  private isEnabled = true;

  private constructor() {
    this.startFlushTimer();
  }

  static getInstance(): TradingActivityLogger {
    if (!TradingActivityLogger.instance) {
      TradingActivityLogger.instance = new TradingActivityLogger();
    }
    return TradingActivityLogger.instance;
  }

  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (!enabled && this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    } else if (enabled && !this.flushTimer) {
      this.startFlushTimer();
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

  async log(entry: TradingActivityLog): Promise<void> {
    if (!this.isEnabled) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const logEntry: TradingActivityLog = {
        ...entry,
        userId: user.id,
      };

      this.logQueue.push(logEntry);

      if (entry.logLevel === 'error' || this.logQueue.length >= this.batchSize) {
        await this.flush();
      }
    } catch (err) {
      console.error('Failed to queue trading activity log:', err);
    }
  }

  async flush(): Promise<void> {
    if (this.isProcessing || this.logQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      const batch = this.logQueue.splice(0, this.batchSize);

      const { error } = await supabase
        .from('trading_activity_logs')
        .insert(
          batch.map((entry) => ({
            user_id: entry.userId,
            log_level: entry.logLevel,
            module: entry.module,
            activity_type: entry.activityType,
            message: entry.message,
            details: entry.details || {},
            market_id: entry.marketId,
            order_id: entry.orderId,
            position_id: entry.positionId,
            duration_ms: entry.durationMs,
            success: entry.success,
          }))
        );

      if (error) {
        console.error('Failed to log trading activities to database:', error);
        this.logQueue.unshift(...batch);
      }
    } catch (err) {
      console.error('Error flushing trading activity queue:', err);
    } finally {
      this.isProcessing = false;
    }
  }

  async debug(
    module: TradingModule,
    activityType: ActivityType,
    message: string,
    details?: Record<string, any>
  ): Promise<void> {
    await this.log({
      logLevel: 'debug',
      module,
      activityType,
      message,
      details,
    });
  }

  async info(
    module: TradingModule,
    activityType: ActivityType,
    message: string,
    details?: Record<string, any>
  ): Promise<void> {
    await this.log({
      logLevel: 'info',
      module,
      activityType,
      message,
      details,
    });
  }

  async warn(
    module: TradingModule,
    activityType: ActivityType,
    message: string,
    details?: Record<string, any>
  ): Promise<void> {
    await this.log({
      logLevel: 'warn',
      module,
      activityType,
      message,
      details,
    });
  }

  async error(
    module: TradingModule,
    activityType: ActivityType,
    message: string,
    details?: Record<string, any>
  ): Promise<void> {
    await this.log({
      logLevel: 'error',
      module,
      activityType,
      message,
      details,
    });
  }

  async logScanStart(module: TradingModule, details?: Record<string, any>): Promise<void> {
    await this.info(module, 'scan_start', `${module} scan started`, details);
  }

  async logScanComplete(
    module: TradingModule,
    durationMs: number,
    opportunitiesFound: number
  ): Promise<void> {
    await this.info(module, 'scan_complete', `${module} scan completed`, {
      durationMs,
      opportunitiesFound,
    });
  }

  async logOpportunityFound(
    module: TradingModule,
    marketId: string,
    details: Record<string, any>
  ): Promise<void> {
    await this.info(module, 'opportunity_found', 'Trading opportunity identified', {
      marketId,
      ...details,
    });
  }

  async logExecutionStart(
    module: TradingModule,
    marketId: string,
    details?: Record<string, any>
  ): Promise<void> {
    await this.info(module, 'execution_start', 'Starting trade execution', {
      marketId,
      ...details,
    });
  }

  async logExecutionComplete(
    module: TradingModule,
    marketId: string,
    orderId: string,
    durationMs: number,
    details?: Record<string, any>
  ): Promise<void> {
    await this.info(module, 'execution_complete', 'Trade execution completed', {
      marketId,
      orderId,
      durationMs,
      ...details,
    });
  }

  async logExecutionFailed(
    module: TradingModule,
    marketId: string,
    reason: string,
    details?: Record<string, any>
  ): Promise<void> {
    await this.error(module, 'execution_failed', `Trade execution failed: ${reason}`, {
      marketId,
      reason,
      ...details,
    });
  }

  async logOrderSubmitted(
    module: TradingModule,
    marketId: string,
    orderId: string,
    details: Record<string, any>
  ): Promise<void> {
    await this.info(module, 'order_submitted', 'Order submitted to exchange', {
      marketId,
      orderId,
      ...details,
    });
  }

  async logOrderFilled(
    module: TradingModule,
    marketId: string,
    orderId: string,
    details: Record<string, any>
  ): Promise<void> {
    await this.info(module, 'order_filled', 'Order filled successfully', {
      marketId,
      orderId,
      ...details,
    });
  }

  async logPositionOpened(
    module: TradingModule,
    positionId: string,
    marketId: string,
    details: Record<string, any>
  ): Promise<void> {
    await this.info(module, 'position_opened', 'Position opened', {
      positionId,
      marketId,
      ...details,
    });
  }

  async logPositionClosed(
    module: TradingModule,
    positionId: string,
    pnl: number,
    details?: Record<string, any>
  ): Promise<void> {
    await this.info(module, 'position_closed', 'Position closed', {
      positionId,
      pnl,
      ...details,
    });
  }

  async logRiskCheck(
    module: TradingModule,
    passed: boolean,
    details: Record<string, any>
  ): Promise<void> {
    const level = passed ? 'info' : 'warn';
    const message = passed ? 'Risk check passed' : 'Risk check failed';

    await this.log({
      logLevel: level,
      module,
      activityType: 'risk_check',
      message,
      success: passed,
      details,
    });
  }

  async getStatistics(timeRange = '24 hours'): Promise<LogStatistics | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase.rpc('get_trading_log_statistics', {
        p_user_id: user.id,
        time_range: timeRange,
      });

      if (error) throw error;

      if (data && data.length > 0) {
        const stats = data[0];
        return {
          totalLogs: parseInt(stats.total_logs) || 0,
          debugCount: parseInt(stats.debug_count) || 0,
          infoCount: parseInt(stats.info_count) || 0,
          warnCount: parseInt(stats.warn_count) || 0,
          errorCount: parseInt(stats.error_count) || 0,
          successCount: parseInt(stats.success_count) || 0,
          failureCount: parseInt(stats.failure_count) || 0,
          avgDurationMs: parseFloat(stats.avg_duration_ms) || 0,
          mostActiveModule: stats.most_active_module,
          mostCommonActivity: stats.most_common_activity,
        };
      }

      return null;
    } catch (err) {
      console.error('Failed to fetch trading log statistics:', err);
      return null;
    }
  }

  async getLogs(options: {
    limit?: number;
    offset?: number;
    logLevel?: LogLevel;
    module?: TradingModule;
    activityType?: ActivityType;
    search?: string;
  } = {}): Promise<TradingActivityLog[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase.rpc('get_trading_activity_timeline', {
        p_user_id: user.id,
        p_limit: options.limit || 100,
        p_offset: options.offset || 0,
        p_log_level: options.logLevel || null,
        p_module: options.module || null,
        p_activity_type: options.activityType || null,
        p_search: options.search || null,
      });

      if (error) throw error;

      return (data || []).map((row: any) => ({
        id: row.id,
        logLevel: row.log_level,
        module: row.module,
        activityType: row.activity_type,
        message: row.message,
        details: row.details,
        marketId: row.market_id,
        orderId: row.order_id,
        durationMs: row.duration_ms,
        success: row.success,
        createdAt: row.created_at,
      }));
    } catch (err) {
      console.error('Failed to fetch trading activity logs:', err);
      return [];
    }
  }

  async cleanupOldLogs(retentionDays = 90): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('cleanup_old_trading_logs', {
        retention_days: retentionDays,
      });

      if (error) throw error;

      return data?.[0]?.deleted_count || 0;
    } catch (err) {
      console.error('Failed to cleanup old logs:', err);
      return 0;
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

export const tradingLogger = TradingActivityLogger.getInstance();

export class ActivityTimer {
  private startTime: number;
  private module: TradingModule;
  private activityType: ActivityType;
  private details?: Record<string, any>;

  constructor(module: TradingModule, activityType: ActivityType, details?: Record<string, any>) {
    this.startTime = Date.now();
    this.module = module;
    this.activityType = activityType;
    this.details = details;
  }

  async complete(success = true, additionalDetails?: Record<string, any>): Promise<void> {
    const durationMs = Date.now() - this.startTime;

    await tradingLogger.log({
      logLevel: success ? 'info' : 'warn',
      module: this.module,
      activityType: this.activityType,
      message: `Activity completed in ${durationMs}ms`,
      durationMs,
      success,
      details: {
        ...this.details,
        ...additionalDetails,
      },
    });
  }

  async fail(reason: string, additionalDetails?: Record<string, any>): Promise<void> {
    const durationMs = Date.now() - this.startTime;

    await tradingLogger.error(
      this.module,
      this.activityType,
      `Activity failed: ${reason}`,
      {
        durationMs,
        reason,
        ...this.details,
        ...additionalDetails,
      }
    );
  }
}
