import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export interface RiskSettings {
  id: string;
  userId: string;
  positionId: string;
  stopLossEnabled: boolean;
  stopLossType: 'percentage' | 'fixed_price' | 'trailing';
  stopLossPercentage?: number;
  stopLossPrice?: number;
  takeProfitEnabled: boolean;
  takeProfitType: 'percentage' | 'fixed_price';
  takeProfitPercentage?: number;
  takeProfitPrice?: number;
  trailingStopEnabled: boolean;
  trailingActivationPrice?: number;
  trailingDistancePercentage?: number;
  highestPrice?: number;
  lowestPrice?: number;
  trailingStopActivated: boolean;
  status: 'active' | 'triggered' | 'cancelled' | 'expired';
}

export interface PositionWithRisk {
  id: string;
  userId: string;
  marketId: string;
  marketQuestion: string;
  outcome: string;
  side: string;
  size: number;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnl: number;
  unrealizedPnlPercentage: number;
  riskSettings?: RiskSettings;
}

export interface TriggerResult {
  triggered: boolean;
  triggerType?: 'stop_loss' | 'take_profit' | 'trailing_stop';
  triggerPrice?: number;
  shouldExecute: boolean;
}

class StopLossManager {
  private monitoringInterval: NodeJS.Timeout | null = null;
  private isMonitoring = false;
  private checkIntervalMs = 5000; // Check every 5 seconds

  async setRiskSettings(
    userId: string,
    positionId: string,
    settings: Partial<RiskSettings>
  ): Promise<void> {
    const { data: existing } = await supabase
      .from('position_risk_settings')
      .select('id')
      .eq('position_id', positionId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('position_risk_settings')
        .update({
          ...settings,
          user_id: userId,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id);

      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('position_risk_settings')
        .insert({
          user_id: userId,
          position_id: positionId,
          ...settings,
          status: 'active'
        });

      if (error) throw error;
    }
  }

  async getRiskSettings(positionId: string): Promise<RiskSettings | null> {
    const { data, error } = await supabase
      .from('position_risk_settings')
      .select('*')
      .eq('position_id', positionId)
      .eq('status', 'active')
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return this.mapRiskSettings(data);
  }

  async removeRiskSettings(positionId: string): Promise<void> {
    const { error } = await supabase
      .from('position_risk_settings')
      .update({ status: 'cancelled' })
      .eq('position_id', positionId);

    if (error) throw error;
  }

  async startMonitoring(userId: string): Promise<void> {
    if (this.isMonitoring) {
      console.log('Stop loss monitoring already active');
      return;
    }

    this.isMonitoring = true;
    console.log('Starting stop loss/take profit monitoring...');

    await this.checkPositions(userId);

    this.monitoringInterval = setInterval(async () => {
      await this.checkPositions(userId);
    }, this.checkIntervalMs);
  }

  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
    console.log('Stopped stop loss/take profit monitoring');
  }

  private async checkPositions(userId: string): Promise<void> {
    try {
      const positions = await this.getActivePositionsWithRisk(userId);

      for (const position of positions) {
        if (!position.riskSettings) continue;

        const triggerResult = await this.checkTriggers(position);

        if (triggerResult.triggered && triggerResult.shouldExecute) {
          await this.executeTrigger(position, triggerResult);
        }

        if (position.riskSettings.trailingStopEnabled) {
          await this.updateTrailingStop(position);
        }
      }
    } catch (error) {
      console.error('Error checking positions:', error);
    }
  }

  private async getActivePositionsWithRisk(
    userId: string
  ): Promise<PositionWithRisk[]> {
    const { data: positions, error: posError } = await supabase
      .from('positions')
      .select(`
        id,
        user_id,
        market_id,
        market_question,
        outcome,
        side,
        size,
        entry_price,
        current_price,
        unrealized_pnl,
        unrealized_pnl_percentage
      `)
      .eq('user_id', userId)
      .eq('status', 'open');

    if (posError) throw posError;
    if (!positions || positions.length === 0) return [];

    const { data: riskSettings, error: riskError } = await supabase
      .from('position_risk_settings')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active');

    if (riskError) throw riskError;

    const riskMap = new Map(
      (riskSettings || []).map((rs) => [rs.position_id, this.mapRiskSettings(rs)])
    );

    return positions.map((pos) => ({
      id: pos.id,
      userId: pos.user_id,
      marketId: pos.market_id,
      marketQuestion: pos.market_question,
      outcome: pos.outcome,
      side: pos.side,
      size: pos.size,
      entryPrice: pos.entry_price,
      currentPrice: pos.current_price,
      unrealizedPnl: pos.unrealized_pnl,
      unrealizedPnlPercentage: pos.unrealized_pnl_percentage,
      riskSettings: riskMap.get(pos.id)
    }));
  }

  private async checkTriggers(position: PositionWithRisk): Promise<TriggerResult> {
    const { currentPrice, entryPrice, riskSettings } = position;

    if (!riskSettings) {
      return { triggered: false, shouldExecute: false };
    }

    if (riskSettings.stopLossEnabled) {
      const stopLossHit = this.checkStopLoss(
        currentPrice,
        entryPrice,
        riskSettings
      );
      if (stopLossHit) {
        return {
          triggered: true,
          triggerType: 'stop_loss',
          triggerPrice: this.calculateStopLossPrice(entryPrice, riskSettings),
          shouldExecute: true
        };
      }
    }

    if (riskSettings.trailingStopEnabled && riskSettings.trailingStopActivated) {
      const trailingStopHit = this.checkTrailingStop(
        currentPrice,
        riskSettings
      );
      if (trailingStopHit) {
        return {
          triggered: true,
          triggerType: 'trailing_stop',
          triggerPrice: this.calculateTrailingStopPrice(riskSettings),
          shouldExecute: true
        };
      }
    }

    if (riskSettings.takeProfitEnabled) {
      const takeProfitHit = this.checkTakeProfit(
        currentPrice,
        entryPrice,
        riskSettings
      );
      if (takeProfitHit) {
        return {
          triggered: true,
          triggerType: 'take_profit',
          triggerPrice: this.calculateTakeProfitPrice(entryPrice, riskSettings),
          shouldExecute: true
        };
      }
    }

    return { triggered: false, shouldExecute: false };
  }

  private checkStopLoss(
    currentPrice: number,
    entryPrice: number,
    settings: RiskSettings
  ): boolean {
    if (!settings.stopLossEnabled) return false;

    const stopPrice = this.calculateStopLossPrice(entryPrice, settings);
    return currentPrice <= stopPrice;
  }

  private checkTakeProfit(
    currentPrice: number,
    entryPrice: number,
    settings: RiskSettings
  ): boolean {
    if (!settings.takeProfitEnabled) return false;

    const targetPrice = this.calculateTakeProfitPrice(entryPrice, settings);
    return currentPrice >= targetPrice;
  }

  private checkTrailingStop(
    currentPrice: number,
    settings: RiskSettings
  ): boolean {
    if (!settings.trailingStopEnabled || !settings.trailingStopActivated) {
      return false;
    }

    const trailPrice = this.calculateTrailingStopPrice(settings);
    return currentPrice <= trailPrice;
  }

  private calculateStopLossPrice(
    entryPrice: number,
    settings: RiskSettings
  ): number {
    if (settings.stopLossType === 'fixed_price' && settings.stopLossPrice) {
      return settings.stopLossPrice;
    }

    if (settings.stopLossType === 'percentage' && settings.stopLossPercentage) {
      return entryPrice * (1 - settings.stopLossPercentage / 100);
    }

    return 0;
  }

  private calculateTakeProfitPrice(
    entryPrice: number,
    settings: RiskSettings
  ): number {
    if (settings.takeProfitType === 'fixed_price' && settings.takeProfitPrice) {
      return settings.takeProfitPrice;
    }

    if (settings.takeProfitType === 'percentage' && settings.takeProfitPercentage) {
      return entryPrice * (1 + settings.takeProfitPercentage / 100);
    }

    return Infinity;
  }

  private calculateTrailingStopPrice(settings: RiskSettings): number {
    if (!settings.highestPrice || !settings.trailingDistancePercentage) {
      return 0;
    }

    return settings.highestPrice * (1 - settings.trailingDistancePercentage / 100);
  }

  private async updateTrailingStop(position: PositionWithRisk): Promise<void> {
    const { currentPrice, riskSettings } = position;

    if (!riskSettings?.trailingStopEnabled) return;

    let needsUpdate = false;
    const updates: any = {};

    if (
      !riskSettings.trailingStopActivated &&
      riskSettings.trailingActivationPrice &&
      currentPrice >= riskSettings.trailingActivationPrice
    ) {
      updates.trailing_stop_activated = true;
      updates.highest_price = currentPrice;
      needsUpdate = true;
      console.log(`Trailing stop activated for position ${position.id}`);
    }

    if (
      riskSettings.trailingStopActivated &&
      (!riskSettings.highestPrice || currentPrice > riskSettings.highestPrice)
    ) {
      updates.highest_price = currentPrice;
      needsUpdate = true;
    }

    if (needsUpdate) {
      const { error } = await supabase
        .from('position_risk_settings')
        .update(updates)
        .eq('id', riskSettings.id);

      if (error) {
        console.error('Error updating trailing stop:', error);
      }
    }
  }

  private async executeTrigger(
    position: PositionWithRisk,
    trigger: TriggerResult
  ): Promise<void> {
    console.log(
      `Executing ${trigger.triggerType} for position ${position.id} at price ${trigger.triggerPrice}`
    );

    const historyEntry = {
      user_id: position.userId,
      position_id: position.id,
      risk_setting_id: position.riskSettings?.id,
      trigger_type: trigger.triggerType,
      trigger_price: trigger.triggerPrice || position.currentPrice,
      position_size: position.size,
      entry_price: position.entryPrice,
      market_id: position.marketId,
      market_question: position.marketQuestion,
      outcome: position.outcome,
      realized_pnl: position.unrealizedPnl,
      realized_pnl_percentage: position.unrealizedPnlPercentage,
      execution_attempted: true
    };

    try {
      await supabase.from('risk_trigger_history').insert(historyEntry);

      await supabase
        .from('position_risk_settings')
        .update({
          status: 'triggered',
          trigger_type: trigger.triggerType,
          triggered_at: new Date().toISOString(),
          triggered_price: trigger.triggerPrice
        })
        .eq('id', position.riskSettings!.id);

      const message =
        trigger.triggerType === 'stop_loss'
          ? `Stop loss triggered for ${position.marketQuestion}`
          : trigger.triggerType === 'trailing_stop'
          ? `Trailing stop triggered for ${position.marketQuestion}`
          : `Take profit triggered for ${position.marketQuestion}`;

      toast.success(message, { duration: 5000 });

      await supabase
        .from('positions')
        .update({ status: 'closed', closed_at: new Date().toISOString() })
        .eq('id', position.id);

      await supabase.from('risk_trigger_history').update({
        execution_successful: true,
        executed_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error executing trigger:', error);

      await supabase.from('risk_trigger_history').update({
        execution_successful: false,
        execution_error: error instanceof Error ? error.message : 'Unknown error'
      });

      toast.error(`Failed to execute ${trigger.triggerType}`, { duration: 5000 });
    }
  }

  private mapRiskSettings(data: any): RiskSettings {
    return {
      id: data.id,
      userId: data.user_id,
      positionId: data.position_id,
      stopLossEnabled: data.stop_loss_enabled || false,
      stopLossType: data.stop_loss_type || 'percentage',
      stopLossPercentage: data.stop_loss_percentage,
      stopLossPrice: data.stop_loss_price,
      takeProfitEnabled: data.take_profit_enabled || false,
      takeProfitType: data.take_profit_type || 'percentage',
      takeProfitPercentage: data.take_profit_percentage,
      takeProfitPrice: data.take_profit_price,
      trailingStopEnabled: data.trailing_stop_enabled || false,
      trailingActivationPrice: data.trailing_activation_price,
      trailingDistancePercentage: data.trailing_distance_percentage,
      highestPrice: data.highest_price,
      lowestPrice: data.lowest_price,
      trailingStopActivated: data.trailing_stop_activated || false,
      status: data.status || 'active'
    };
  }

  async getTriggerHistory(
    userId: string,
    limit: number = 50
  ): Promise<any[]> {
    const { data, error } = await supabase
      .from('risk_trigger_history')
      .select('*')
      .eq('user_id', userId)
      .order('triggered_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  getMonitoringStatus(): {
    isMonitoring: boolean;
    checkIntervalMs: number;
  } {
    return {
      isMonitoring: this.isMonitoring,
      checkIntervalMs: this.checkIntervalMs
    };
  }
}

export const stopLossManager = new StopLossManager();
