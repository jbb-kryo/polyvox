import { supabase } from '../lib/supabase';
import { fetchMarkets } from './polymarket';

export interface Position {
  id: string;
  userId: string;
  executionLogId?: string;
  moduleType: string;
  marketId: string;
  marketQuestion: string;
  side: 'YES' | 'NO' | 'BOTH';
  positionSize: number;
  entryPrice: number;
  entryCost: number;
  currentPrice?: number;
  currentValue: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
  status: 'open' | 'closed' | 'partial';
  stopLossPrice?: number;
  takeProfitPrice?: number;
  highestPrice?: number;
  lowestPrice?: number;
  peakUnrealizedPnl: number;
  lastPriceUpdate?: string;
  priceUpdateCount: number;
  openedAt: string;
  closedAt?: string;
  lastUpdatedAt: string;
  metadata?: any;
}

export interface PositionHistory {
  id: string;
  userId: string;
  activePositionId?: string;
  executionLogId?: string;
  moduleType: string;
  marketId: string;
  marketQuestion: string;
  side: string;
  positionSize: number;
  entryPrice: number;
  entryCost: number;
  exitPrice?: number;
  exitValue?: number;
  exitReason?: string;
  realizedPnl: number;
  realizedPnlPercent: number;
  netPnl: number;
  roiPercent: number;
  holdDurationSeconds: number;
  finalStatus: string;
  openedAt: string;
  closedAt: string;
}

export interface PositionSnapshot {
  id: string;
  positionId: string;
  currentPrice: number;
  positionValue: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
  marketOddsYes?: number;
  marketOddsNo?: number;
  marketVolume24h?: number;
  marketLiquidity?: number;
  snapshotAt: string;
}

export interface PositionEvent {
  id: string;
  positionId: string;
  eventType: string;
  eventDescription: string;
  oldValue?: number;
  newValue?: number;
  pnlChange?: number;
  eventAt: string;
  metadata?: any;
}

export interface PortfolioSummary {
  totalPositions: number;
  totalValue: number;
  totalCost: number;
  totalPnl: number;
  totalPnlPercent: number;
  winningPositions: number;
  losingPositions: number;
  byModule: Record<string, {
    count: number;
    value: number;
    pnl: number;
    pnl_percent: number;
  }>;
}

export interface PerformanceMetrics {
  date: string;
  positionsOpened: number;
  positionsClosed: number;
  totalPnl: number;
  winRate: number;
  avgHoldTimeHours: number;
}

class PositionManagerService {
  private userId: string | null = null;
  private updateInterval: NodeJS.Timeout | null = null;
  private positionCallbacks: Map<string, ((position: Position) => void)[]> = new Map();
  private portfolioCallbacks: ((summary: PortfolioSummary) => void)[] = [];

  initialize(userId: string): void {
    this.userId = userId;
    this.startAutoUpdate();
  }

  terminate(): void {
    this.stopAutoUpdate();
    this.userId = null;
    this.positionCallbacks.clear();
    this.portfolioCallbacks.clear();
  }

  private startAutoUpdate(): void {
    this.stopAutoUpdate();

    this.updateInterval = setInterval(async () => {
      try {
        await this.updateAllPositions();
      } catch (error) {
        console.error('Error in auto-update:', error);
      }
    }, 60000);
  }

  private stopAutoUpdate(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  async getActivePositions(moduleType?: string): Promise<Position[]> {
    if (!this.userId) {
      return [];
    }

    let query = supabase
      .from('active_positions')
      .select('*')
      .eq('user_id', this.userId)
      .eq('status', 'open')
      .order('opened_at', { ascending: false });

    if (moduleType) {
      query = query.eq('module_type', moduleType);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching active positions:', error);
      return [];
    }

    return (data || []).map(this.mapPosition);
  }

  async getPosition(positionId: string): Promise<Position | null> {
    if (!this.userId) {
      return null;
    }

    const { data, error } = await supabase
      .from('active_positions')
      .select('*')
      .eq('id', positionId)
      .eq('user_id', this.userId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return this.mapPosition(data);
  }

  async getPositionHistory(limit: number = 50): Promise<PositionHistory[]> {
    if (!this.userId) {
      return [];
    }

    const { data, error } = await supabase
      .from('position_history')
      .select('*')
      .eq('user_id', this.userId)
      .order('closed_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching position history:', error);
      return [];
    }

    return (data || []).map(d => ({
      id: d.id,
      userId: d.user_id,
      activePositionId: d.active_position_id,
      executionLogId: d.execution_log_id,
      moduleType: d.module_type,
      marketId: d.market_id,
      marketQuestion: d.market_question,
      side: d.side,
      positionSize: d.position_size,
      entryPrice: d.entry_price,
      entryCost: d.entry_cost,
      exitPrice: d.exit_price,
      exitValue: d.exit_value,
      exitReason: d.exit_reason,
      realizedPnl: d.realized_pnl,
      realizedPnlPercent: d.realized_pnl_percent,
      netPnl: d.net_pnl,
      roiPercent: d.roi_percent,
      holdDurationSeconds: d.hold_duration_seconds,
      finalStatus: d.final_status,
      openedAt: d.opened_at,
      closedAt: d.closed_at
    }));
  }

  async getPositionSnapshots(positionId: string, limit: number = 100): Promise<PositionSnapshot[]> {
    if (!this.userId) {
      return [];
    }

    const { data, error } = await supabase
      .from('position_snapshots')
      .select('*')
      .eq('position_id', positionId)
      .eq('user_id', this.userId)
      .order('snapshot_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching position snapshots:', error);
      return [];
    }

    return (data || []).map(d => ({
      id: d.id,
      positionId: d.position_id,
      currentPrice: d.current_price,
      positionValue: d.position_value,
      unrealizedPnl: d.unrealized_pnl,
      unrealizedPnlPercent: d.unrealized_pnl_percent,
      marketOddsYes: d.market_odds_yes,
      marketOddsNo: d.market_odds_no,
      marketVolume24h: d.market_volume_24h,
      marketLiquidity: d.market_liquidity,
      snapshotAt: d.snapshot_at
    }));
  }

  async getPositionEvents(positionId: string): Promise<PositionEvent[]> {
    if (!this.userId) {
      return [];
    }

    const { data, error } = await supabase
      .from('position_events')
      .select('*')
      .eq('position_id', positionId)
      .eq('user_id', this.userId)
      .order('event_at', { ascending: false });

    if (error) {
      console.error('Error fetching position events:', error);
      return [];
    }

    return (data || []).map(d => ({
      id: d.id,
      positionId: d.position_id,
      eventType: d.event_type,
      eventDescription: d.event_description,
      oldValue: d.old_value,
      newValue: d.new_value,
      pnlChange: d.pnl_change,
      eventAt: d.event_at,
      metadata: d.event_metadata
    }));
  }

  async updatePositionPrice(positionId: string, newPrice: number, marketData?: any): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('update_position_price', {
        p_position_id: positionId,
        p_new_price: newPrice,
        p_market_data: marketData || {}
      });

      if (error) {
        console.error('Error updating position price:', error);
        return false;
      }

      const position = await this.getPosition(positionId);
      if (position) {
        this.notifyPositionCallbacks(positionId, position);
      }

      return data || false;
    } catch (error) {
      console.error('Error updating position price:', error);
      return false;
    }
  }

  async updateAllPositions(): Promise<void> {
    if (!this.userId) {
      return;
    }

    const positions = await this.getActivePositions();

    const marketIds = [...new Set(positions.map(p => p.marketId))];

    if (marketIds.length === 0) {
      return;
    }

    try {
      const markets = await fetchMarkets(100, 0);

      const marketPrices = new Map<string, { yes: number; no: number; data: any }>();
      markets.forEach(market => {
        if (market.outcomes && market.outcomes.length >= 2) {
          marketPrices.set(market.id, {
            yes: market.outcomes[0].price,
            no: market.outcomes[1].price,
            data: {
              volume_24h: market.volume24h,
              liquidity: market.liquidity,
              odds_yes: market.outcomes[0].price,
              odds_no: market.outcomes[1].price
            }
          });
        }
      });

      for (const position of positions) {
        const marketPrice = marketPrices.get(position.marketId);
        if (marketPrice) {
          const newPrice = position.side === 'YES' ? marketPrice.yes : marketPrice.no;
          await this.updatePositionPrice(position.id, newPrice, marketPrice.data);

          await this.createSnapshot(position.id, newPrice, marketPrice.data);
        }
      }

      await this.notifyPortfolioCallbacks();
    } catch (error) {
      console.error('Error updating positions:', error);
    }
  }

  private async createSnapshot(positionId: string, currentPrice: number, marketData: any): Promise<void> {
    if (!this.userId) {
      return;
    }

    const position = await this.getPosition(positionId);
    if (!position) {
      return;
    }

    const { error } = await supabase
      .from('position_snapshots')
      .insert({
        user_id: this.userId,
        position_id: positionId,
        current_price: currentPrice,
        position_value: position.currentValue,
        unrealized_pnl: position.unrealizedPnl,
        unrealized_pnl_percent: position.unrealizedPnlPercent,
        market_odds_yes: marketData?.odds_yes,
        market_odds_no: marketData?.odds_no,
        market_volume_24h: marketData?.volume_24h,
        market_liquidity: marketData?.liquidity,
        snapshot_metadata: marketData || {}
      });

    if (error) {
      console.error('Error creating snapshot:', error);
    }
  }

  async closePosition(
    positionId: string,
    exitPrice: number,
    exitReason: string = 'manual',
    exitMetadata?: any
  ): Promise<string | null> {
    try {
      const { data, error } = await supabase.rpc('close_position', {
        p_position_id: positionId,
        p_exit_price: exitPrice,
        p_exit_reason: exitReason,
        p_exit_metadata: exitMetadata || {}
      });

      if (error) {
        console.error('Error closing position:', error);
        throw new Error(error.message);
      }

      await this.notifyPortfolioCallbacks();

      return data;
    } catch (error: any) {
      console.error('Error closing position:', error);
      throw error;
    }
  }

  async closePositionByMarket(marketId: string, exitPrice: number, exitReason: string = 'manual'): Promise<number> {
    if (!this.userId) {
      return 0;
    }

    const positions = await this.getActivePositions();
    const marketPositions = positions.filter(p => p.marketId === marketId);

    let closedCount = 0;

    for (const position of marketPositions) {
      try {
        await this.closePosition(position.id, exitPrice, exitReason);
        closedCount++;
      } catch (error) {
        console.error(`Error closing position ${position.id}:`, error);
      }
    }

    return closedCount;
  }

  async getPortfolioSummary(): Promise<PortfolioSummary> {
    if (!this.userId) {
      return {
        totalPositions: 0,
        totalValue: 0,
        totalCost: 0,
        totalPnl: 0,
        totalPnlPercent: 0,
        winningPositions: 0,
        losingPositions: 0,
        byModule: {}
      };
    }

    try {
      const { data, error } = await supabase.rpc('get_portfolio_summary', {
        p_user_id: this.userId
      });

      if (error || !data || data.length === 0) {
        return {
          totalPositions: 0,
          totalValue: 0,
          totalCost: 0,
          totalPnl: 0,
          totalPnlPercent: 0,
          winningPositions: 0,
          losingPositions: 0,
          byModule: {}
        };
      }

      const summary = data[0];
      return {
        totalPositions: summary.total_positions || 0,
        totalValue: summary.total_value || 0,
        totalCost: summary.total_cost || 0,
        totalPnl: summary.total_pnl || 0,
        totalPnlPercent: summary.total_pnl_percent || 0,
        winningPositions: summary.winning_positions || 0,
        losingPositions: summary.losing_positions || 0,
        byModule: summary.by_module || {}
      };
    } catch (error) {
      console.error('Error fetching portfolio summary:', error);
      return {
        totalPositions: 0,
        totalValue: 0,
        totalCost: 0,
        totalPnl: 0,
        totalPnlPercent: 0,
        winningPositions: 0,
        losingPositions: 0,
        byModule: {}
      };
    }
  }

  async getPerformanceMetrics(days: number = 30): Promise<PerformanceMetrics[]> {
    if (!this.userId) {
      return [];
    }

    try {
      const { data, error } = await supabase.rpc('get_position_performance', {
        p_user_id: this.userId,
        p_days: days
      });

      if (error || !data) {
        return [];
      }

      return data.map((d: any) => ({
        date: d.date,
        positionsOpened: d.positions_opened || 0,
        positionsClosed: d.positions_closed || 0,
        totalPnl: d.total_pnl || 0,
        winRate: d.win_rate || 0,
        avgHoldTimeHours: d.avg_hold_time_hours || 0
      }));
    } catch (error) {
      console.error('Error fetching performance metrics:', error);
      return [];
    }
  }

  async getPositionsByMarket(marketId: string): Promise<Position[]> {
    if (!this.userId) {
      return [];
    }

    const { data, error } = await supabase
      .from('active_positions')
      .select('*')
      .eq('user_id', this.userId)
      .eq('market_id', marketId)
      .eq('status', 'open');

    if (error) {
      console.error('Error fetching positions by market:', error);
      return [];
    }

    return (data || []).map(this.mapPosition);
  }

  async getAggregatedPositions(): Promise<Map<string, Position[]>> {
    const positions = await this.getActivePositions();
    const grouped = new Map<string, Position[]>();

    positions.forEach(position => {
      const key = position.moduleType;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(position);
    });

    return grouped;
  }

  onPositionUpdate(positionId: string, callback: (position: Position) => void): () => void {
    if (!this.positionCallbacks.has(positionId)) {
      this.positionCallbacks.set(positionId, []);
    }

    this.positionCallbacks.get(positionId)!.push(callback);

    return () => {
      const callbacks = this.positionCallbacks.get(positionId);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  onPortfolioUpdate(callback: (summary: PortfolioSummary) => void): () => void {
    this.portfolioCallbacks.push(callback);

    return () => {
      const index = this.portfolioCallbacks.indexOf(callback);
      if (index > -1) {
        this.portfolioCallbacks.splice(index, 1);
      }
    };
  }

  private notifyPositionCallbacks(positionId: string, position: Position): void {
    const callbacks = this.positionCallbacks.get(positionId);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(position);
        } catch (error) {
          console.error('Error in position callback:', error);
        }
      });
    }
  }

  private async notifyPortfolioCallbacks(): Promise<void> {
    if (this.portfolioCallbacks.length === 0) {
      return;
    }

    const summary = await this.getPortfolioSummary();
    this.portfolioCallbacks.forEach(callback => {
      try {
        callback(summary);
      } catch (error) {
        console.error('Error in portfolio callback:', error);
      }
    });
  }

  private mapPosition(data: any): Position {
    return {
      id: data.id,
      userId: data.user_id,
      executionLogId: data.execution_log_id,
      moduleType: data.module_type,
      marketId: data.market_id,
      marketQuestion: data.market_question,
      side: data.side,
      positionSize: data.position_size,
      entryPrice: data.entry_price,
      entryCost: data.entry_cost || data.entry_price * data.position_size,
      currentPrice: data.current_price,
      currentValue: data.current_value || data.entry_price * data.position_size,
      unrealizedPnl: data.unrealized_pnl || 0,
      unrealizedPnlPercent: data.unrealized_pnl_percent || 0,
      status: data.status,
      stopLossPrice: data.stop_loss_price,
      takeProfitPrice: data.take_profit_price,
      highestPrice: data.highest_price,
      lowestPrice: data.lowest_price,
      peakUnrealizedPnl: data.peak_unrealized_pnl || 0,
      lastPriceUpdate: data.last_price_update,
      priceUpdateCount: data.price_update_count || 0,
      openedAt: data.opened_at,
      closedAt: data.closed_at,
      lastUpdatedAt: data.last_updated_at,
      metadata: data.position_metadata
    };
  }
}

export const positionManager = new PositionManagerService();
export default positionManager;
