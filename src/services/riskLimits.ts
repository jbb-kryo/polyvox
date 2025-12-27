import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export interface RiskLimits {
  id: string;
  userId: string;
  maxPositionSize: number;
  maxPositionSizeEnabled: boolean;
  maxPositionsPerMarket: number;
  maxPositionsPerMarketEnabled: boolean;
  maxTotalExposure: number;
  maxTotalExposureEnabled: boolean;
  maxOpenPositions: number;
  maxOpenPositionsEnabled: boolean;
  maxDailyLoss: number;
  maxDailyLossEnabled: boolean;
  tradingHalted: boolean;
  haltReason: string | null;
  haltTimestamp: string | null;
  maxPositionPctOfPortfolio: number;
  maxRiskPerTrade: number;
  enforceLimits: boolean;
  alertOnBreach: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DailyLossTracking {
  id: string;
  userId: string;
  tradeDate: string;
  startingBalance: number;
  currentBalance: number;
  realizedPnl: number;
  unrealizedPnl: number;
  totalPnl: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  dailyLossLimit: number;
  limitBreached: boolean;
  breachTimestamp: string | null;
  tradingResumedAt: string | null;
  totalFees: number;
  createdAt: string;
  updatedAt: string;
}

export interface RiskLimitBreach {
  id: string;
  userId: string;
  breachType: string;
  severity: 'warning' | 'critical' | 'halt';
  limitName: string;
  limitValue: number | null;
  currentValue: number | null;
  attemptedValue: number | null;
  marketId: string | null;
  moduleType: string | null;
  positionId: string | null;
  actionTaken: string;
  tradeBlocked: boolean;
  tradingHalted: boolean;
  breachData: any;
  errorMessage: string | null;
  createdAt: string;
}

export interface RiskCheckResult {
  allowed: boolean;
  reason?: string;
  message?: string;
  limit?: number;
  current?: number;
  requested?: number;
  wouldBe?: number;
  checks?: any;
}

export interface PreTradeCheckResult {
  allowed: boolean;
  violations: RiskViolation[];
  warnings: RiskWarning[];
  limits: RiskLimits | null;
  dailyTracking: DailyLossTracking | null;
}

export interface RiskViolation {
  type: string;
  message: string;
  limit: number;
  current: number;
  attempted: number;
  severity: 'critical' | 'halt';
}

export interface RiskWarning {
  type: string;
  message: string;
  percentUsed: number;
}

class RiskLimitsService {
  async getRiskLimits(userId: string): Promise<RiskLimits | null> {
    try {
      const { data, error } = await supabase.rpc('get_or_create_risk_limits', {
        p_user_id: userId
      });

      if (error) {
        console.error('Error fetching risk limits:', error);
        return null;
      }

      return this.mapRiskLimits(data);
    } catch (error) {
      console.error('Error in getRiskLimits:', error);
      return null;
    }
  }

  async updateRiskLimits(userId: string, updates: Partial<RiskLimits>): Promise<boolean> {
    try {
      const updateData: any = {};

      if (updates.maxPositionSize !== undefined) updateData.max_position_size = updates.maxPositionSize;
      if (updates.maxPositionSizeEnabled !== undefined) updateData.max_position_size_enabled = updates.maxPositionSizeEnabled;
      if (updates.maxPositionsPerMarket !== undefined) updateData.max_positions_per_market = updates.maxPositionsPerMarket;
      if (updates.maxPositionsPerMarketEnabled !== undefined) updateData.max_positions_per_market_enabled = updates.maxPositionsPerMarketEnabled;
      if (updates.maxTotalExposure !== undefined) updateData.max_total_exposure = updates.maxTotalExposure;
      if (updates.maxTotalExposureEnabled !== undefined) updateData.max_total_exposure_enabled = updates.maxTotalExposureEnabled;
      if (updates.maxOpenPositions !== undefined) updateData.max_open_positions = updates.maxOpenPositions;
      if (updates.maxOpenPositionsEnabled !== undefined) updateData.max_open_positions_enabled = updates.maxOpenPositionsEnabled;
      if (updates.maxDailyLoss !== undefined) updateData.max_daily_loss = updates.maxDailyLoss;
      if (updates.maxDailyLossEnabled !== undefined) updateData.max_daily_loss_enabled = updates.maxDailyLossEnabled;
      if (updates.maxPositionPctOfPortfolio !== undefined) updateData.max_position_pct_of_portfolio = updates.maxPositionPctOfPortfolio;
      if (updates.maxRiskPerTrade !== undefined) updateData.max_risk_per_trade = updates.maxRiskPerTrade;
      if (updates.enforceLimits !== undefined) updateData.enforce_limits = updates.enforceLimits;
      if (updates.alertOnBreach !== undefined) updateData.alert_on_breach = updates.alertOnBreach;

      updateData.updated_at = new Date().toISOString();

      const { error } = await supabase
        .from('risk_limits')
        .update(updateData)
        .eq('user_id', userId);

      if (error) {
        console.error('Error updating risk limits:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in updateRiskLimits:', error);
      return false;
    }
  }

  async getDailyTracking(userId: string, date?: string): Promise<DailyLossTracking | null> {
    try {
      const tradeDate = date || new Date().toISOString().split('T')[0];

      const { data, error } = await supabase.rpc('get_or_create_daily_tracking', {
        p_user_id: userId,
        p_trade_date: tradeDate
      });

      if (error) {
        console.error('Error fetching daily tracking:', error);
        return null;
      }

      return this.mapDailyTracking(data);
    } catch (error) {
      console.error('Error in getDailyTracking:', error);
      return null;
    }
  }

  async isTradingHalted(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('is_trading_halted', {
        p_user_id: userId
      });

      if (error) {
        console.error('Error checking trading halt status:', error);
        return false;
      }

      return data === true;
    } catch (error) {
      console.error('Error in isTradingHalted:', error);
      return false;
    }
  }

  async checkAllLimits(
    userId: string,
    marketId: string,
    positionSize: number
  ): Promise<RiskCheckResult> {
    try {
      const { data, error } = await supabase.rpc('check_all_risk_limits', {
        p_user_id: userId,
        p_market_id: marketId,
        p_position_size: positionSize
      });

      if (error) {
        console.error('Error checking risk limits:', error);
        return {
          allowed: false,
          reason: 'error',
          message: 'Failed to check risk limits'
        };
      }

      return data as RiskCheckResult;
    } catch (error) {
      console.error('Error in checkAllLimits:', error);
      return {
        allowed: false,
        reason: 'error',
        message: 'Failed to check risk limits'
      };
    }
  }

  async performPreTradeChecks(
    userId: string,
    marketId: string,
    positionSize: number,
    moduleType: string
  ): Promise<PreTradeCheckResult> {
    const violations: RiskViolation[] = [];
    const warnings: RiskWarning[] = [];

    try {
      const [limits, dailyTracking, checkResult] = await Promise.all([
        this.getRiskLimits(userId),
        this.getDailyTracking(userId),
        this.checkAllLimits(userId, marketId, positionSize)
      ]);

      if (!limits) {
        return {
          allowed: false,
          violations: [{ type: 'error', message: 'Failed to load risk limits', limit: 0, current: 0, attempted: 0, severity: 'critical' }],
          warnings: [],
          limits: null,
          dailyTracking: null
        };
      }

      if (!checkResult.allowed) {
        const violation: RiskViolation = {
          type: checkResult.reason || 'unknown',
          message: checkResult.message || 'Risk limit exceeded',
          limit: checkResult.limit || 0,
          current: checkResult.current || 0,
          attempted: checkResult.requested || positionSize,
          severity: checkResult.reason === 'trading_halted' ? 'halt' : 'critical'
        };
        violations.push(violation);

        await this.logBreach(userId, {
          breachType: checkResult.reason || 'unknown',
          severity: violation.severity === 'halt' ? 'halt' : 'critical',
          limitName: checkResult.reason || 'unknown',
          limitValue: checkResult.limit,
          currentValue: checkResult.current,
          attemptedValue: positionSize,
          marketId,
          moduleType,
          actionTaken: 'trade_blocked',
          tradeBlocked: true,
          tradingHalted: violation.severity === 'halt',
          errorMessage: checkResult.message
        });
      }

      if (limits.alertOnBreach && dailyTracking) {
        if (dailyTracking.totalPnl < 0) {
          const lossPercent = Math.abs(dailyTracking.totalPnl / dailyTracking.dailyLossLimit) * 100;

          if (lossPercent > 80) {
            warnings.push({
              type: 'daily_loss_warning',
              message: `Daily loss at ${lossPercent.toFixed(0)}% of limit`,
              percentUsed: lossPercent
            });
          }
        }

        const exposureCheck = checkResult.checks?.total_exposure;
        if (exposureCheck && exposureCheck.would_be) {
          const exposurePercent = (exposureCheck.would_be / exposureCheck.limit) * 100;

          if (exposurePercent > 80) {
            warnings.push({
              type: 'exposure_warning',
              message: `Total exposure would be ${exposurePercent.toFixed(0)}% of limit`,
              percentUsed: exposurePercent
            });
          }
        }
      }

      return {
        allowed: violations.length === 0,
        violations,
        warnings,
        limits,
        dailyTracking
      };
    } catch (error) {
      console.error('Error in performPreTradeChecks:', error);
      return {
        allowed: false,
        violations: [{ type: 'error', message: 'Pre-trade check failed', limit: 0, current: 0, attempted: 0, severity: 'critical' }],
        warnings: [],
        limits: null,
        dailyTracking: null
      };
    }
  }

  async updateDailyTracking(
    userId: string,
    pnl: number,
    fees: number = 0
  ): Promise<void> {
    try {
      const { error } = await supabase.rpc('update_daily_tracking', {
        p_user_id: userId,
        p_pnl: pnl,
        p_fees: fees,
        p_is_winning: pnl > 0
      });

      if (error) {
        console.error('Error updating daily tracking:', error);
      }
    } catch (error) {
      console.error('Error in updateDailyTracking:', error);
    }
  }

  async resumeTrading(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase.rpc('resume_trading', {
        p_user_id: userId
      });

      if (error) {
        console.error('Error resuming trading:', error);
        return false;
      }

      toast.success('Trading resumed');
      return true;
    } catch (error) {
      console.error('Error in resumeTrading:', error);
      return false;
    }
  }

  async haltTrading(userId: string, reason: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('risk_limits')
        .update({
          trading_halted: true,
          halt_reason: reason,
          halt_timestamp: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) {
        console.error('Error halting trading:', error);
        return false;
      }

      toast.error(`Trading halted: ${reason}`);
      return true;
    } catch (error) {
      console.error('Error in haltTrading:', error);
      return false;
    }
  }

  async logBreach(
    userId: string,
    breach: {
      breachType: string;
      severity: 'warning' | 'critical' | 'halt';
      limitName: string;
      limitValue?: number | null;
      currentValue?: number | null;
      attemptedValue?: number | null;
      marketId?: string | null;
      moduleType?: string | null;
      positionId?: string | null;
      actionTaken: string;
      tradeBlocked?: boolean;
      tradingHalted?: boolean;
      breachData?: any;
      errorMessage?: string | null;
    }
  ): Promise<void> {
    try {
      const { error } = await supabase.from('risk_limit_breaches').insert({
        user_id: userId,
        breach_type: breach.breachType,
        severity: breach.severity,
        limit_name: breach.limitName,
        limit_value: breach.limitValue,
        current_value: breach.currentValue,
        attempted_value: breach.attemptedValue,
        market_id: breach.marketId,
        module_type: breach.moduleType,
        position_id: breach.positionId,
        action_taken: breach.actionTaken,
        trade_blocked: breach.tradeBlocked || false,
        trading_halted: breach.tradingHalted || false,
        breach_data: breach.breachData,
        error_message: breach.errorMessage
      });

      if (error) {
        console.error('Error logging breach:', error);
      }
    } catch (error) {
      console.error('Error in logBreach:', error);
    }
  }

  async getRecentBreaches(userId: string, limit: number = 20): Promise<RiskLimitBreach[]> {
    try {
      const { data, error } = await supabase
        .from('risk_limit_breaches')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching breaches:', error);
        return [];
      }

      return (data || []).map(this.mapBreach);
    } catch (error) {
      console.error('Error in getRecentBreaches:', error);
      return [];
    }
  }

  async getCurrentRiskStatus(userId: string): Promise<{
    limits: RiskLimits | null;
    dailyTracking: DailyLossTracking | null;
    tradingHalted: boolean;
    recentBreaches: RiskLimitBreach[];
    currentExposure: number;
    openPositions: number;
  }> {
    try {
      const [limits, dailyTracking, halted, breaches] = await Promise.all([
        this.getRiskLimits(userId),
        this.getDailyTracking(userId),
        this.isTradingHalted(userId),
        this.getRecentBreaches(userId, 5)
      ]);

      const { data: positions } = await supabase
        .from('active_positions')
        .select('position_size, entry_price')
        .eq('user_id', userId);

      const currentExposure = (positions || []).reduce(
        (sum, p) => sum + (p.position_size * p.entry_price),
        0
      );

      const openPositions = (positions || []).length;

      return {
        limits,
        dailyTracking,
        tradingHalted: halted,
        recentBreaches: breaches,
        currentExposure,
        openPositions
      };
    } catch (error) {
      console.error('Error in getCurrentRiskStatus:', error);
      return {
        limits: null,
        dailyTracking: null,
        tradingHalted: false,
        recentBreaches: [],
        currentExposure: 0,
        openPositions: 0
      };
    }
  }

  private mapRiskLimits(data: any): RiskLimits {
    return {
      id: data.id,
      userId: data.user_id,
      maxPositionSize: data.max_position_size,
      maxPositionSizeEnabled: data.max_position_size_enabled,
      maxPositionsPerMarket: data.max_positions_per_market,
      maxPositionsPerMarketEnabled: data.max_positions_per_market_enabled,
      maxTotalExposure: data.max_total_exposure,
      maxTotalExposureEnabled: data.max_total_exposure_enabled,
      maxOpenPositions: data.max_open_positions,
      maxOpenPositionsEnabled: data.max_open_positions_enabled,
      maxDailyLoss: data.max_daily_loss,
      maxDailyLossEnabled: data.max_daily_loss_enabled,
      tradingHalted: data.trading_halted,
      haltReason: data.halt_reason,
      haltTimestamp: data.halt_timestamp,
      maxPositionPctOfPortfolio: data.max_position_pct_of_portfolio,
      maxRiskPerTrade: data.max_risk_per_trade,
      enforceLimits: data.enforce_limits,
      alertOnBreach: data.alert_on_breach,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }

  private mapDailyTracking(data: any): DailyLossTracking {
    return {
      id: data.id,
      userId: data.user_id,
      tradeDate: data.trade_date,
      startingBalance: data.starting_balance,
      currentBalance: data.current_balance,
      realizedPnl: data.realized_pnl,
      unrealizedPnl: data.unrealized_pnl,
      totalPnl: data.total_pnl,
      totalTrades: data.total_trades,
      winningTrades: data.winning_trades,
      losingTrades: data.losing_trades,
      dailyLossLimit: data.daily_loss_limit,
      limitBreached: data.limit_breached,
      breachTimestamp: data.breach_timestamp,
      tradingResumedAt: data.trading_resumed_at,
      totalFees: data.total_fees,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }

  private mapBreach(data: any): RiskLimitBreach {
    return {
      id: data.id,
      userId: data.user_id,
      breachType: data.breach_type,
      severity: data.severity,
      limitName: data.limit_name,
      limitValue: data.limit_value,
      currentValue: data.current_value,
      attemptedValue: data.attempted_value,
      marketId: data.market_id,
      moduleType: data.module_type,
      positionId: data.position_id,
      actionTaken: data.action_taken,
      tradeBlocked: data.trade_blocked,
      tradingHalted: data.trading_halted,
      breachData: data.breach_data,
      errorMessage: data.error_message,
      createdAt: data.created_at
    };
  }
}

export const riskLimitsService = new RiskLimitsService();
export default riskLimitsService;
