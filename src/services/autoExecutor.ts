import { supabase } from '../lib/supabase';
import { ScanOpportunity } from './backgroundScanner';
import { riskManager, RiskCheckResult } from './riskManager';
import { orderExecutionService } from './orderExecution';

export type ModuleType = 'valueminer' | 'arbitrage' | 'snipe' | 'trend' | 'whale';

export interface AutoExecutionSettings {
  moduleType: ModuleType;
  isEnabled: boolean;
  minEdgePercent: number;
  minConfidenceScore: number;
  minPriorityScore: number;
  minLiquidity: number;
  minVolume24h: number;
  positionSizeMode: 'fixed' | 'kelly' | 'percentage';
  fixedPositionSize: number;
  kellyFraction: number;
  maxPositionSize: number;
  minPositionSize: number;
  maxPositionsPerMarket: number;
  maxDailyTrades: number;
  maxDailyExposure: number;
  requireManualApproval: boolean;
  stopOnLoss: boolean;
  stopLossThreshold: number;
}

export interface ExecutionResult {
  success: boolean;
  executionLogId?: string;
  positionId?: string;
  orderId?: string;
  transactionHash?: string;
  filledAmount?: number;
  averageFillPrice?: number;
  executionCost?: number;
  error?: string;
  failureReason?: string;
  safetyCheckResults?: RiskCheckResult;
}

export interface ExecutionLog {
  id: string;
  moduleType: string;
  opportunityId?: string;
  marketId: string;
  marketQuestion: string;
  side: string;
  positionSize: number;
  entryPrice: number;
  expectedEdge: number;
  executionStatus: string;
  failureReason?: string;
  safetyChecksPassed: boolean;
  safetyCheckResults: any;
  executionCost?: number;
  gasCost?: number;
  totalCost?: number;
  orderId?: string;
  transactionHash?: string;
  isPaperTrading: boolean;
  isAutoExecuted: boolean;
  evaluatedAt: string;
  submittedAt?: string;
  filledAt?: string;
}

class AutoExecutorService {
  private userId: string | null = null;
  private isPaperTrading: boolean = true;
  private walletAddress: string = '';
  private walletPrivateKey: string = '';
  private isInitialized: boolean = false;
  private executionCallbacks: ((result: ExecutionResult) => void)[] = [];
  private processingQueue: Set<string> = new Set();

  async initialize(
    userId: string,
    isPaperTrading: boolean,
    walletAddress: string = '',
    walletPrivateKey: string = ''
  ): Promise<void> {
    this.userId = userId;
    this.isPaperTrading = isPaperTrading;
    this.walletAddress = walletAddress;
    this.walletPrivateKey = walletPrivateKey;

    riskManager.initialize(userId);

    await riskManager.initializeDefaultLimits();

    this.isInitialized = true;
  }

  async evaluateAndExecute(
    opportunity: ScanOpportunity,
    moduleType: ModuleType
  ): Promise<ExecutionResult> {
    if (!this.isInitialized || !this.userId) {
      return {
        success: false,
        error: 'Auto-executor not initialized'
      };
    }

    if (this.processingQueue.has(opportunity.marketId)) {
      return {
        success: false,
        error: 'Execution already in progress for this market'
      };
    }

    this.processingQueue.add(opportunity.marketId);

    try {
      const settings = await this.getExecutionSettings(moduleType);

      if (!settings.isEnabled) {
        return {
          success: false,
          error: 'Auto-execution disabled for this module'
        };
      }

      const shouldExecute = this.evaluateOpportunity(opportunity, settings);

      if (!shouldExecute.passed) {
        return {
          success: false,
          error: `Opportunity does not meet criteria: ${shouldExecute.reason}`
        };
      }

      const positionSize = this.calculatePositionSize(opportunity, settings);

      if (positionSize < settings.minPositionSize) {
        return {
          success: false,
          error: `Position size $${positionSize} below minimum $${settings.minPositionSize}`
        };
      }

      if (positionSize > settings.maxPositionSize) {
        return {
          success: false,
          error: `Position size $${positionSize} exceeds maximum $${settings.maxPositionSize}`
        };
      }

      const safetyChecks = await riskManager.performSafetyChecks(
        opportunity,
        positionSize,
        moduleType
      );

      const executionLog = await this.createExecutionLog(
        opportunity,
        moduleType,
        positionSize,
        safetyChecks
      );

      if (!safetyChecks.passed) {
        await this.updateExecutionLog(executionLog.id, {
          execution_status: 'failed',
          failure_reason: safetyChecks.failureReasons.join('; '),
          failed_at: new Date().toISOString()
        });

        return {
          success: false,
          executionLogId: executionLog.id,
          error: 'Safety checks failed',
          failureReason: safetyChecks.failureReasons.join('; '),
          safetyCheckResults: safetyChecks
        };
      }

      const executionResult = await this.executeTradeAtomic(
        opportunity,
        positionSize,
        executionLog.id,
        moduleType
      );

      const finalResult: ExecutionResult = {
        ...executionResult,
        executionLogId: executionLog.id,
        safetyCheckResults: safetyChecks
      };

      this.notifyExecutionCallbacks(finalResult);

      return finalResult;
    } catch (error: any) {
      console.error('Error in evaluateAndExecute:', error);
      return {
        success: false,
        error: error.message || 'Unknown execution error'
      };
    } finally {
      this.processingQueue.delete(opportunity.marketId);
    }
  }

  private evaluateOpportunity(
    opportunity: ScanOpportunity,
    settings: AutoExecutionSettings
  ): { passed: boolean; reason?: string } {
    if (!opportunity.edgePercent || opportunity.edgePercent < settings.minEdgePercent) {
      return {
        passed: false,
        reason: `Edge ${opportunity.edgePercent}% below minimum ${settings.minEdgePercent}%`
      };
    }

    if (!opportunity.confidenceScore || opportunity.confidenceScore < settings.minConfidenceScore) {
      return {
        passed: false,
        reason: `Confidence ${opportunity.confidenceScore} below minimum ${settings.minConfidenceScore}`
      };
    }

    if (!opportunity.priorityScore || opportunity.priorityScore < settings.minPriorityScore) {
      return {
        passed: false,
        reason: `Priority ${opportunity.priorityScore} below minimum ${settings.minPriorityScore}`
      };
    }

    if (opportunity.liquidity && opportunity.liquidity < settings.minLiquidity) {
      return {
        passed: false,
        reason: `Liquidity $${opportunity.liquidity} below minimum $${settings.minLiquidity}`
      };
    }

    if (opportunity.volume24h && opportunity.volume24h < settings.minVolume24h) {
      return {
        passed: false,
        reason: `Volume $${opportunity.volume24h} below minimum $${settings.minVolume24h}`
      };
    }

    return { passed: true };
  }

  private calculatePositionSize(
    opportunity: ScanOpportunity,
    settings: AutoExecutionSettings
  ): number {
    let size = settings.fixedPositionSize;

    switch (settings.positionSizeMode) {
      case 'fixed':
        size = settings.fixedPositionSize;
        break;

      case 'kelly':
        const edge = (opportunity.edgePercent || 0) / 100;
        const confidence = opportunity.confidenceScore || 0.5;
        const kellySize = edge * confidence * 10000 * settings.kellyFraction;
        size = Math.max(settings.minPositionSize, Math.min(kellySize, settings.maxPositionSize));
        break;

      case 'percentage':
        const baseAmount = 10000;
        const percentage = settings.fixedPositionSize / 100;
        size = baseAmount * percentage;
        break;
    }

    size = Math.max(settings.minPositionSize, Math.min(size, settings.maxPositionSize));

    return Math.round(size * 100) / 100;
  }

  private async executeTradeAtomic(
    opportunity: ScanOpportunity,
    positionSize: number,
    executionLogId: string,
    moduleType: ModuleType
  ): Promise<ExecutionResult> {
    const startTime = Date.now();

    try {
      await this.updateExecutionLog(executionLogId, {
        execution_status: 'submitted',
        submitted_at: new Date().toISOString()
      });

      if (this.isPaperTrading) {
        const result = await this.executePaperTrade(
          opportunity,
          positionSize,
          executionLogId,
          moduleType
        );

        return result;
      } else {
        const result = await this.executeLiveTrade(
          opportunity,
          positionSize,
          executionLogId,
          moduleType
        );

        return result;
      }
    } catch (error: any) {
      console.error('Execution error:', error);

      await this.rollbackExecution(executionLogId, error.message);

      return {
        success: false,
        executionLogId,
        error: error.message || 'Execution failed',
        failureReason: 'Exception during execution'
      };
    }
  }

  private async executePaperTrade(
    opportunity: ScanOpportunity,
    positionSize: number,
    executionLogId: string,
    moduleType: ModuleType
  ): Promise<ExecutionResult> {
    await new Promise(resolve => setTimeout(resolve, 500));

    const mockOrderId = `paper_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const mockTxHash = `0x${Math.random().toString(36).substr(2, 64)}`;

    const price = opportunity.side === 'YES'
      ? opportunity.marketOddsYes || 0.5
      : opportunity.marketOddsNo || 0.5;

    const executionCost = positionSize * price;
    const gasCost = 0;
    const totalCost = executionCost + gasCost;

    const expectedProfit = (opportunity.edgePercent || 0) / 100 * positionSize;

    await this.updateExecutionLog(executionLogId, {
      execution_status: 'filled',
      order_id: mockOrderId,
      transaction_hash: mockTxHash,
      filled_amount: positionSize,
      average_fill_price: price,
      execution_cost: executionCost,
      gas_cost: gasCost,
      total_cost: totalCost,
      expected_profit: expectedProfit,
      filled_at: new Date().toISOString()
    });

    const positionId = await this.createActivePosition(
      opportunity,
      positionSize,
      price,
      executionLogId,
      moduleType
    );

    await riskManager.updateDailyStats(moduleType, {
      totalTrades: 1,
      successfulTrades: 1,
      totalExposure: positionSize
    });

    return {
      success: true,
      executionLogId,
      positionId,
      orderId: mockOrderId,
      transactionHash: mockTxHash,
      filledAmount: positionSize,
      averageFillPrice: price,
      executionCost: totalCost
    };
  }

  private async executeLiveTrade(
    opportunity: ScanOpportunity,
    positionSize: number,
    executionLogId: string,
    moduleType: ModuleType
  ): Promise<ExecutionResult> {
    try {
      const price = opportunity.side === 'YES'
        ? opportunity.marketOddsYes || 0.5
        : opportunity.marketOddsNo || 0.5;

      if (!this.walletAddress || !this.walletPrivateKey) {
        throw new Error('Wallet not configured for live trading');
      }

      const tokenId = opportunity.side === 'YES' ? '0' : '1';

      const order = await orderExecutionService.createOrder({
        userId: this.userId!,
        moduleType,
        marketId: opportunity.marketId,
        tokenId,
        side: 'BUY',
        orderType: 'LIMIT',
        price,
        size: positionSize,
        paperTrading: false,
        walletAddress: this.walletAddress,
        privateKey: this.walletPrivateKey
      });

      await this.updateExecutionLog(executionLogId, {
        execution_status: 'filled',
        order_id: order.id,
        transaction_hash: order.clob_order_id,
        filled_amount: order.filled_size,
        average_fill_price: order.price,
        execution_cost: order.filled_size * order.price,
        gas_cost: 0,
        total_cost: order.filled_size * order.price,
        filled_at: new Date().toISOString()
      });

      const positionId = await this.createActivePosition(
        opportunity,
        order.filled_size || positionSize,
        order.price,
        executionLogId,
        moduleType
      );

      await riskManager.updateDailyStats(moduleType, {
        totalTrades: 1,
        successfulTrades: 1,
        totalExposure: order.filled_size || positionSize
      });

      return {
        success: true,
        executionLogId,
        positionId,
        orderId: order.id,
        transactionHash: order.clob_order_id,
        filledAmount: order.filled_size,
        averageFillPrice: order.price,
        executionCost: order.filled_size * order.price
      };
    } catch (error: any) {
      await this.updateExecutionLog(executionLogId, {
        execution_status: 'failed',
        failure_reason: error.message,
        failed_at: new Date().toISOString()
      });

      await riskManager.updateDailyStats(moduleType, {
        totalTrades: 1,
        failedTrades: 1
      });

      throw error;
    }
  }

  private async rollbackExecution(executionLogId: string, reason: string): Promise<void> {
    await this.updateExecutionLog(executionLogId, {
      execution_status: 'rolled_back',
      failure_reason: reason,
      failed_at: new Date().toISOString()
    });
  }

  private async createExecutionLog(
    opportunity: ScanOpportunity,
    moduleType: ModuleType,
    positionSize: number,
    safetyChecks: RiskCheckResult
  ): Promise<{ id: string }> {
    const price = opportunity.side === 'YES'
      ? opportunity.marketOddsYes || 0.5
      : opportunity.marketOddsNo || 0.5;

    const { data, error } = await supabase
      .from('execution_logs')
      .insert({
        user_id: this.userId,
        module_type: moduleType,
        opportunity_id: opportunity.id,
        market_id: opportunity.marketId,
        market_question: opportunity.marketQuestion,
        side: opportunity.side || 'YES',
        position_size: positionSize,
        entry_price: price,
        expected_edge: opportunity.edgePercent,
        execution_status: 'pending',
        safety_checks_passed: safetyChecks.passed,
        safety_check_results: safetyChecks,
        is_paper_trading: this.isPaperTrading,
        is_auto_executed: true,
        evaluated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create execution log: ${error.message}`);
    }

    return { id: data.id };
  }

  private async updateExecutionLog(
    executionLogId: string,
    updates: Record<string, any>
  ): Promise<void> {
    const { error } = await supabase
      .from('execution_logs')
      .update(updates)
      .eq('id', executionLogId);

    if (error) {
      console.error('Error updating execution log:', error);
    }
  }

  private async createActivePosition(
    opportunity: ScanOpportunity,
    positionSize: number,
    entryPrice: number,
    executionLogId: string,
    moduleType: ModuleType
  ): Promise<string> {
    const { data, error } = await supabase
      .from('active_positions')
      .insert({
        user_id: this.userId,
        execution_log_id: executionLogId,
        module_type: moduleType,
        market_id: opportunity.marketId,
        market_question: opportunity.marketQuestion,
        side: opportunity.side || 'YES',
        position_size: positionSize,
        entry_price: entryPrice,
        current_price: entryPrice,
        unrealized_pnl: 0,
        status: 'open',
        opened_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating active position:', error);
      throw new Error(`Failed to create position: ${error.message}`);
    }

    return data.id;
  }

  async getExecutionSettings(moduleType: ModuleType): Promise<AutoExecutionSettings> {
    if (!this.userId) {
      return this.getDefaultSettings(moduleType);
    }

    const { data, error } = await supabase
      .from('auto_execution_settings')
      .select('*')
      .eq('user_id', this.userId)
      .eq('module_type', moduleType)
      .maybeSingle();

    if (error || !data) {
      return this.getDefaultSettings(moduleType);
    }

    return {
      moduleType: data.module_type,
      isEnabled: data.is_enabled,
      minEdgePercent: data.min_edge_percent,
      minConfidenceScore: data.min_confidence_score,
      minPriorityScore: data.min_priority_score,
      minLiquidity: data.min_liquidity,
      minVolume24h: data.min_volume_24h,
      positionSizeMode: data.position_size_mode,
      fixedPositionSize: data.fixed_position_size,
      kellyFraction: data.kelly_fraction,
      maxPositionSize: data.max_position_size,
      minPositionSize: data.min_position_size,
      maxPositionsPerMarket: data.max_positions_per_market,
      maxDailyTrades: data.max_daily_trades,
      maxDailyExposure: data.max_daily_exposure,
      requireManualApproval: data.require_manual_approval,
      stopOnLoss: data.stop_on_loss,
      stopLossThreshold: data.stop_loss_threshold
    };
  }

  private getDefaultSettings(moduleType: ModuleType): AutoExecutionSettings {
    return {
      moduleType,
      isEnabled: false,
      minEdgePercent: 8,
      minConfidenceScore: 0.7,
      minPriorityScore: 0.6,
      minLiquidity: 10000,
      minVolume24h: 10000,
      positionSizeMode: 'fixed',
      fixedPositionSize: 100,
      kellyFraction: 0.25,
      maxPositionSize: 500,
      minPositionSize: 10,
      maxPositionsPerMarket: 1,
      maxDailyTrades: 10,
      maxDailyExposure: 2000,
      requireManualApproval: false,
      stopOnLoss: true,
      stopLossThreshold: -500
    };
  }

  async saveExecutionSettings(settings: AutoExecutionSettings): Promise<void> {
    if (!this.userId) {
      throw new Error('Auto-executor not initialized');
    }

    const { error } = await supabase
      .from('auto_execution_settings')
      .upsert({
        user_id: this.userId,
        module_type: settings.moduleType,
        is_enabled: settings.isEnabled,
        min_edge_percent: settings.minEdgePercent,
        min_confidence_score: settings.minConfidenceScore,
        min_priority_score: settings.minPriorityScore,
        min_liquidity: settings.minLiquidity,
        min_volume_24h: settings.minVolume24h,
        position_size_mode: settings.positionSizeMode,
        fixed_position_size: settings.fixedPositionSize,
        kelly_fraction: settings.kellyFraction,
        max_position_size: settings.maxPositionSize,
        min_position_size: settings.minPositionSize,
        max_positions_per_market: settings.maxPositionsPerMarket,
        max_daily_trades: settings.maxDailyTrades,
        max_daily_exposure: settings.maxDailyExposure,
        require_manual_approval: settings.requireManualApproval,
        stop_on_loss: settings.stopOnLoss,
        stop_loss_threshold: settings.stopLossThreshold
      }, {
        onConflict: 'user_id,module_type'
      });

    if (error) {
      throw new Error(`Failed to save settings: ${error.message}`);
    }
  }

  async getExecutionLogs(limit: number = 50): Promise<ExecutionLog[]> {
    if (!this.userId) {
      return [];
    }

    const { data, error } = await supabase
      .from('execution_logs')
      .select('*')
      .eq('user_id', this.userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching execution logs:', error);
      return [];
    }

    return (data || []).map(d => ({
      id: d.id,
      moduleType: d.module_type,
      opportunityId: d.opportunity_id,
      marketId: d.market_id,
      marketQuestion: d.market_question,
      side: d.side,
      positionSize: d.position_size,
      entryPrice: d.entry_price,
      expectedEdge: d.expected_edge,
      executionStatus: d.execution_status,
      failureReason: d.failure_reason,
      safetyChecksPassed: d.safety_checks_passed,
      safetyCheckResults: d.safety_check_results,
      executionCost: d.execution_cost,
      gasCost: d.gas_cost,
      totalCost: d.total_cost,
      orderId: d.order_id,
      transactionHash: d.transaction_hash,
      isPaperTrading: d.is_paper_trading,
      isAutoExecuted: d.is_auto_executed,
      evaluatedAt: d.evaluated_at,
      submittedAt: d.submitted_at,
      filledAt: d.filled_at
    }));
  }

  onExecution(callback: (result: ExecutionResult) => void): () => void {
    this.executionCallbacks.push(callback);

    return () => {
      const index = this.executionCallbacks.indexOf(callback);
      if (index > -1) {
        this.executionCallbacks.splice(index, 1);
      }
    };
  }

  private notifyExecutionCallbacks(result: ExecutionResult): void {
    this.executionCallbacks.forEach(callback => {
      try {
        callback(result);
      } catch (error) {
        console.error('Error in execution callback:', error);
      }
    });
  }

  terminate(): void {
    this.isInitialized = false;
    this.userId = null;
    this.executionCallbacks = [];
    this.processingQueue.clear();
  }
}

export const autoExecutor = new AutoExecutorService();
export default autoExecutor;
