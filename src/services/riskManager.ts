import { supabase } from '../lib/supabase';
import { ScanOpportunity } from './backgroundScanner';

export interface RiskCheckResult {
  passed: boolean;
  checks: {
    emergencyStop: { passed: boolean; message?: string };
    balance: { passed: boolean; message?: string };
    positionLimits: { passed: boolean; message?: string };
    dailyLimits: { passed: boolean; message?: string };
    exposureLimits: { passed: boolean; message?: string };
    marketLimits: { passed: boolean; message?: string };
    lossLimits: { passed: boolean; message?: string };
  };
  failureReasons: string[];
  recommendations?: string[];
}

export interface PositionLimit {
  limitType: 'global' | 'per_module' | 'per_market' | 'per_category';
  limitScope: string;
  maxPositionSize: number;
  maxTotalExposure: number;
  maxOpenPositions: number;
  maxDailyTrades: number;
  maxDailyExposure: number;
  maxLossPerTrade: number;
  maxDailyLoss: number;
  isActive: boolean;
}

export interface DailyStats {
  totalTrades: number;
  successfulTrades: number;
  failedTrades: number;
  totalExposure: number;
  totalProfitLoss: number;
  totalFees: number;
}

export interface ActivePosition {
  id: string;
  moduleType: string;
  marketId: string;
  side: string;
  positionSize: number;
  entryPrice: number;
  currentPrice?: number;
  unrealizedPnl: number;
  status: string;
}

class RiskManagerService {
  private userId: string | null = null;
  private cachedLimits: Map<string, PositionLimit> = new Map();
  private cacheExpiry: number = 0;
  private readonly CACHE_TTL = 30000; // 30 seconds

  initialize(userId: string): void {
    this.userId = userId;
    this.clearCache();
  }

  private clearCache(): void {
    this.cachedLimits.clear();
    this.cacheExpiry = 0;
  }

  async performSafetyChecks(
    opportunity: ScanOpportunity,
    positionSize: number,
    moduleType: string
  ): Promise<RiskCheckResult> {
    if (!this.userId) {
      throw new Error('Risk manager not initialized');
    }

    const result: RiskCheckResult = {
      passed: false,
      checks: {
        emergencyStop: { passed: false },
        balance: { passed: false },
        positionLimits: { passed: false },
        dailyLimits: { passed: false },
        exposureLimits: { passed: false },
        marketLimits: { passed: false },
        lossLimits: { passed: false }
      },
      failureReasons: [],
      recommendations: []
    };

    try {
      result.checks.emergencyStop = await this.checkEmergencyStop();
      if (!result.checks.emergencyStop.passed) {
        result.failureReasons.push(result.checks.emergencyStop.message!);
      }

      result.checks.balance = await this.checkBalance(positionSize);
      if (!result.checks.balance.passed) {
        result.failureReasons.push(result.checks.balance.message!);
      }

      result.checks.positionLimits = await this.checkPositionLimits(
        positionSize,
        moduleType
      );
      if (!result.checks.positionLimits.passed) {
        result.failureReasons.push(result.checks.positionLimits.message!);
      }

      result.checks.dailyLimits = await this.checkDailyLimits(moduleType);
      if (!result.checks.dailyLimits.passed) {
        result.failureReasons.push(result.checks.dailyLimits.message!);
      }

      result.checks.exposureLimits = await this.checkExposureLimits(
        positionSize,
        moduleType
      );
      if (!result.checks.exposureLimits.passed) {
        result.failureReasons.push(result.checks.exposureLimits.message!);
      }

      result.checks.marketLimits = await this.checkMarketLimits(
        opportunity.marketId,
        positionSize
      );
      if (!result.checks.marketLimits.passed) {
        result.failureReasons.push(result.checks.marketLimits.message!);
      }

      result.checks.lossLimits = await this.checkLossLimits(moduleType);
      if (!result.checks.lossLimits.passed) {
        result.failureReasons.push(result.checks.lossLimits.message!);
      }

      result.passed = Object.values(result.checks).every(check => check.passed);

      if (!result.passed) {
        result.recommendations = this.generateRecommendations(result.checks);
      }
    } catch (error) {
      console.error('Error performing safety checks:', error);
      result.failureReasons.push('Internal error during safety checks');
    }

    return result;
  }

  private async checkEmergencyStop(): Promise<{ passed: boolean; message?: string }> {
    if (!this.userId) {
      return { passed: false, message: 'User not authenticated' };
    }

    const { data, error } = await supabase
      .from('emergency_stop')
      .select('is_stopped, stop_reason')
      .eq('user_id', this.userId)
      .maybeSingle();

    if (error) {
      console.error('Error checking emergency stop:', error);
      return { passed: false, message: 'Failed to check emergency stop status' };
    }

    if (data?.is_stopped) {
      return {
        passed: false,
        message: `Emergency stop active: ${data.stop_reason || 'Manual stop'}`
      };
    }

    return { passed: true };
  }

  private async checkBalance(positionSize: number): Promise<{ passed: boolean; message?: string }> {
    const estimatedCost = positionSize * 1.1;

    const balance = await this.getAvailableBalance();

    if (balance < estimatedCost) {
      return {
        passed: false,
        message: `Insufficient balance: $${balance.toFixed(2)} available, $${estimatedCost.toFixed(2)} required`
      };
    }

    if (balance < estimatedCost * 1.2) {
      return {
        passed: true,
        message: 'Warning: Low balance for future trades'
      };
    }

    return { passed: true };
  }

  private async checkPositionLimits(
    positionSize: number,
    moduleType: string
  ): Promise<{ passed: boolean; message?: string }> {
    const limits = await this.getActiveLimits();

    const globalLimit = limits.find(l => l.limitType === 'global');
    if (globalLimit && positionSize > globalLimit.maxPositionSize) {
      return {
        passed: false,
        message: `Position size $${positionSize} exceeds global limit $${globalLimit.maxPositionSize}`
      };
    }

    const moduleLimit = limits.find(
      l => l.limitType === 'per_module' && l.limitScope === moduleType
    );
    if (moduleLimit && positionSize > moduleLimit.maxPositionSize) {
      return {
        passed: false,
        message: `Position size $${positionSize} exceeds ${moduleType} limit $${moduleLimit.maxPositionSize}`
      };
    }

    const openPositions = await this.getOpenPositionsCount();
    const maxPositions = globalLimit?.maxOpenPositions || 10;

    if (openPositions >= maxPositions) {
      return {
        passed: false,
        message: `Maximum open positions (${maxPositions}) reached`
      };
    }

    return { passed: true };
  }

  private async checkDailyLimits(
    moduleType: string
  ): Promise<{ passed: boolean; message?: string }> {
    const limits = await this.getActiveLimits();
    const globalLimit = limits.find(l => l.limitType === 'global');

    if (!globalLimit) {
      return { passed: true };
    }

    const dailyStats = await this.getDailyStats(moduleType);

    if (dailyStats.totalTrades >= globalLimit.maxDailyTrades) {
      return {
        passed: false,
        message: `Daily trade limit (${globalLimit.maxDailyTrades}) reached`
      };
    }

    if (dailyStats.totalExposure >= globalLimit.maxDailyExposure) {
      return {
        passed: false,
        message: `Daily exposure limit ($${globalLimit.maxDailyExposure}) reached`
      };
    }

    return { passed: true };
  }

  private async checkExposureLimits(
    positionSize: number,
    moduleType: string
  ): Promise<{ passed: boolean; message?: string }> {
    const limits = await this.getActiveLimits();
    const globalLimit = limits.find(l => l.limitType === 'global');

    if (!globalLimit) {
      return { passed: true };
    }

    const currentExposure = await this.getCurrentExposure();
    const newExposure = currentExposure + positionSize;

    if (newExposure > globalLimit.maxTotalExposure) {
      return {
        passed: false,
        message: `Total exposure would exceed limit: $${newExposure.toFixed(2)} > $${globalLimit.maxTotalExposure}`
      };
    }

    const moduleExposure = await this.getCurrentExposure(moduleType);
    const moduleLimit = limits.find(
      l => l.limitType === 'per_module' && l.limitScope === moduleType
    );

    if (moduleLimit && moduleExposure + positionSize > moduleLimit.maxTotalExposure) {
      return {
        passed: false,
        message: `${moduleType} exposure would exceed limit: $${(moduleExposure + positionSize).toFixed(2)} > $${moduleLimit.maxTotalExposure}`
      };
    }

    return { passed: true };
  }

  private async checkMarketLimits(
    marketId: string,
    positionSize: number
  ): Promise<{ passed: boolean; message?: string }> {
    const positions = await this.getActivePositions();
    const marketPositions = positions.filter(p => p.marketId === marketId);

    const limits = await this.getActiveLimits();
    const globalLimit = limits.find(l => l.limitType === 'global');

    const maxPerMarket = 1;

    if (marketPositions.length >= maxPerMarket) {
      return {
        passed: false,
        message: `Maximum positions per market (${maxPerMarket}) reached`
      };
    }

    return { passed: true };
  }

  private async checkLossLimits(
    moduleType: string
  ): Promise<{ passed: boolean; message?: string }> {
    const limits = await this.getActiveLimits();
    const globalLimit = limits.find(l => l.limitType === 'global');

    if (!globalLimit) {
      return { passed: true };
    }

    const dailyStats = await this.getDailyStats(moduleType);

    if (dailyStats.totalProfitLoss < -globalLimit.maxDailyLoss) {
      return {
        passed: false,
        message: `Daily loss limit exceeded: -$${Math.abs(dailyStats.totalProfitLoss).toFixed(2)} > $${globalLimit.maxDailyLoss}`
      };
    }

    return { passed: true };
  }

  private generateRecommendations(checks: RiskCheckResult['checks']): string[] {
    const recommendations: string[] = [];

    if (!checks.balance.passed) {
      recommendations.push('Add funds to your account');
      recommendations.push('Reduce position size');
    }

    if (!checks.positionLimits.passed) {
      recommendations.push('Close some existing positions');
      recommendations.push('Reduce position size');
    }

    if (!checks.dailyLimits.passed) {
      recommendations.push('Wait until tomorrow to resume trading');
      recommendations.push('Adjust daily limits in settings');
    }

    if (!checks.exposureLimits.passed) {
      recommendations.push('Close some positions to reduce exposure');
      recommendations.push('Increase exposure limits in settings');
    }

    if (!checks.lossLimits.passed) {
      recommendations.push('Review your trading strategy');
      recommendations.push('Wait for market conditions to improve');
      recommendations.push('Consider stopping trading for today');
    }

    return recommendations;
  }

  async getActiveLimits(): Promise<PositionLimit[]> {
    if (!this.userId) {
      return [];
    }

    if (this.cachedLimits.size > 0 && Date.now() < this.cacheExpiry) {
      return Array.from(this.cachedLimits.values());
    }

    const { data, error } = await supabase
      .from('position_limits')
      .select('*')
      .eq('user_id', this.userId)
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching position limits:', error);
      return [];
    }

    const limits = (data || []).map(d => ({
      limitType: d.limit_type,
      limitScope: d.limit_scope,
      maxPositionSize: d.max_position_size,
      maxTotalExposure: d.max_total_exposure,
      maxOpenPositions: d.max_open_positions,
      maxDailyTrades: d.max_daily_trades,
      maxDailyExposure: d.max_daily_exposure,
      maxLossPerTrade: d.max_loss_per_trade,
      maxDailyLoss: d.max_daily_loss,
      isActive: d.is_active
    }));

    this.cachedLimits.clear();
    limits.forEach(limit => {
      this.cachedLimits.set(`${limit.limitType}_${limit.limitScope}`, limit);
    });
    this.cacheExpiry = Date.now() + this.CACHE_TTL;

    return limits;
  }

  private async getAvailableBalance(): Promise<number> {
    return 10000;
  }

  private async getCurrentExposure(scope: string = 'all'): Promise<number> {
    if (!this.userId) {
      return 0;
    }

    const { data, error } = await supabase.rpc('get_current_exposure', {
      p_user_id: this.userId,
      p_scope: scope
    });

    if (error) {
      console.error('Error getting current exposure:', error);
      return 0;
    }

    return data || 0;
  }

  private async getOpenPositionsCount(): Promise<number> {
    if (!this.userId) {
      return 0;
    }

    const { count, error } = await supabase
      .from('active_positions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', this.userId)
      .eq('status', 'open');

    if (error) {
      console.error('Error getting open positions count:', error);
      return 0;
    }

    return count || 0;
  }

  async getActivePositions(): Promise<ActivePosition[]> {
    if (!this.userId) {
      return [];
    }

    const { data, error } = await supabase
      .from('active_positions')
      .select('*')
      .eq('user_id', this.userId)
      .eq('status', 'open');

    if (error) {
      console.error('Error fetching active positions:', error);
      return [];
    }

    return (data || []).map(d => ({
      id: d.id,
      moduleType: d.module_type,
      marketId: d.market_id,
      side: d.side,
      positionSize: d.position_size,
      entryPrice: d.entry_price,
      currentPrice: d.current_price,
      unrealizedPnl: d.unrealized_pnl,
      status: d.status
    }));
  }

  private async getDailyStats(moduleType: string = 'all'): Promise<DailyStats> {
    if (!this.userId) {
      return {
        totalTrades: 0,
        successfulTrades: 0,
        failedTrades: 0,
        totalExposure: 0,
        totalProfitLoss: 0,
        totalFees: 0
      };
    }

    const { data, error } = await supabase
      .from('daily_execution_stats')
      .select('*')
      .eq('user_id', this.userId)
      .eq('date', new Date().toISOString().split('T')[0])
      .eq('module_type', moduleType)
      .maybeSingle();

    if (error || !data) {
      return {
        totalTrades: 0,
        successfulTrades: 0,
        failedTrades: 0,
        totalExposure: 0,
        totalProfitLoss: 0,
        totalFees: 0
      };
    }

    return {
      totalTrades: data.total_trades,
      successfulTrades: data.successful_trades,
      failedTrades: data.failed_trades,
      totalExposure: data.total_exposure,
      totalProfitLoss: data.total_profit_loss,
      totalFees: data.total_fees
    };
  }

  async setEmergencyStop(
    isStopped: boolean,
    reason?: string,
    stoppedBy: 'user' | 'system' | 'risk_manager' = 'user'
  ): Promise<void> {
    if (!this.userId) {
      throw new Error('Risk manager not initialized');
    }

    const updateData: any = {
      user_id: this.userId,
      is_stopped: isStopped,
      stopped_by: stoppedBy
    };

    if (isStopped) {
      updateData.stop_reason = reason || 'Manual stop';
      updateData.stopped_at = new Date().toISOString();
      updateData.trigger_type = stoppedBy === 'user' ? 'manual' : 'other';
    } else {
      updateData.resumed_at = new Date().toISOString();
      updateData.stop_reason = null;
      updateData.trigger_type = null;
    }

    const { error } = await supabase
      .from('emergency_stop')
      .upsert(updateData, { onConflict: 'user_id' });

    if (error) {
      console.error('Error setting emergency stop:', error);
      throw new Error('Failed to set emergency stop');
    }
  }

  async getEmergencyStopStatus(): Promise<{ isStopped: boolean; reason?: string }> {
    if (!this.userId) {
      return { isStopped: false };
    }

    const { data, error } = await supabase
      .from('emergency_stop')
      .select('is_stopped, stop_reason')
      .eq('user_id', this.userId)
      .maybeSingle();

    if (error || !data) {
      return { isStopped: false };
    }

    return {
      isStopped: data.is_stopped,
      reason: data.stop_reason
    };
  }

  async updateDailyStats(
    moduleType: string,
    updates: Partial<DailyStats>
  ): Promise<void> {
    if (!this.userId) {
      return;
    }

    const today = new Date().toISOString().split('T')[0];

    const { data: existing } = await supabase
      .from('daily_execution_stats')
      .select('*')
      .eq('user_id', this.userId)
      .eq('date', today)
      .eq('module_type', moduleType)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('daily_execution_stats')
        .update({
          total_trades: (existing.total_trades || 0) + (updates.totalTrades || 0),
          successful_trades: (existing.successful_trades || 0) + (updates.successfulTrades || 0),
          failed_trades: (existing.failed_trades || 0) + (updates.failedTrades || 0),
          total_exposure: (existing.total_exposure || 0) + (updates.totalExposure || 0),
          total_profit_loss: (existing.total_profit_loss || 0) + (updates.totalProfitLoss || 0),
          total_fees: (existing.total_fees || 0) + (updates.totalFees || 0)
        })
        .eq('id', existing.id);

      if (error) {
        console.error('Error updating daily stats:', error);
      }
    } else {
      const { error } = await supabase
        .from('daily_execution_stats')
        .insert({
          user_id: this.userId,
          date: today,
          module_type: moduleType,
          total_trades: updates.totalTrades || 0,
          successful_trades: updates.successfulTrades || 0,
          failed_trades: updates.failedTrades || 0,
          total_exposure: updates.totalExposure || 0,
          total_profit_loss: updates.totalProfitLoss || 0,
          total_fees: updates.totalFees || 0
        });

      if (error) {
        console.error('Error inserting daily stats:', error);
      }
    }
  }

  async initializeDefaultLimits(): Promise<void> {
    if (!this.userId) {
      throw new Error('Risk manager not initialized');
    }

    await supabase.rpc('initialize_default_limits', {
      p_user_id: this.userId
    });

    this.clearCache();
  }
}

export const riskManager = new RiskManagerService();
export default riskManager;
