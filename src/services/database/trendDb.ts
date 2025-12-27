import { supabase } from '../../lib/supabase';
import { MomentumOpportunity, TrendPosition, TrendTrade } from '../../types/trendrider';

export async function saveTrendOpportunity(opportunity: MomentumOpportunity) {
  const { data, error } = await supabase
    .from('trend_opportunities')
    .insert({
      market_id: opportunity.market.id,
      market_question: opportunity.market.question,
      category: opportunity.market.category || 'Other',
      current_price: opportunity.market.currentPrice,
      previous_price: opportunity.market.previousPrice,
      price_change: opportunity.market.priceChange,
      price_change_percent: opportunity.market.priceChangePercent,
      velocity: opportunity.market.velocity,
      volume: opportunity.market.volume || 0,
      direction: opportunity.direction,
      strength: opportunity.strength,
      is_executed: false
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getTrendOpportunities(limit = 20) {
  const { data, error } = await supabase
    .from('trend_opportunities')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

export async function saveTrendPosition(position: Omit<TrendPosition, 'id'>, userId: string) {
  const { data, error } = await supabase
    .from('trend_positions')
    .insert({
      user_id: userId,
      market_id: position.marketId,
      market_question: position.marketQuestion,
      direction: position.direction,
      entry_price: position.entryPrice,
      current_price: position.currentPrice,
      position_size: position.positionSize,
      profit_target: position.profitTarget,
      stop_loss: position.stopLoss,
      pnl: position.currentPnL,
      pnl_percent: position.pnLPercent,
      highest_price: position.highestPrice,
      lowest_price: position.lowestPrice,
      status: 'open'
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getTrendPositions(userId: string) {
  const { data, error } = await supabase
    .from('trend_positions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'open')
    .order('opened_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function updateTrendPosition(positionId: string, updates: any) {
  const { data, error } = await supabase
    .from('trend_positions')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', positionId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function closeTrendPosition(
  positionId: string,
  exitPrice: number,
  exitReason: 'profit_target' | 'stop_loss' | 'manual' | 'time_limit'
) {
  const { data: position, error: fetchError } = await supabase
    .from('trend_positions')
    .select('*')
    .eq('id', positionId)
    .single();

  if (fetchError) throw fetchError;

  const { data, error } = await supabase
    .from('trend_positions')
    .update({
      status: 'closed',
      closed_at: new Date().toISOString(),
      current_price: exitPrice
    })
    .eq('id', positionId)
    .select()
    .single();

  if (error) throw error;

  const duration = Math.floor((Date.now() - new Date(position.opened_at).getTime()) / 60000);

  await supabase.from('trend_trades').insert({
    user_id: position.user_id,
    market_id: position.market_id,
    market_question: position.market_question,
    direction: position.direction,
    entry_price: position.entry_price,
    exit_price: exitPrice,
    position_size: position.position_size,
    profit: data.pnl,
    profit_percent: data.pnl_percent,
    exit_reason: exitReason,
    duration_minutes: duration,
    fees: 0,
    max_drawdown: 0,
    opened_at: position.opened_at,
    closed_at: data.closed_at
  });

  return data;
}

export async function getTrendTrades(userId: string, limit = 50) {
  const { data, error } = await supabase
    .from('trend_trades')
    .select('*')
    .eq('user_id', userId)
    .order('closed_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}
