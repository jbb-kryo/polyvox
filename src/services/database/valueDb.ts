import { supabase } from '../../lib/supabase';
import { ValueMarket, ValuePosition, ValueSignal } from '../../types/valueminer';

export async function saveValueMarket(market: Omit<ValueMarket, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('value_markets')
    .upsert({
      market_id: market.market_id,
      market_question: market.market_question,
      category: market.category,
      pm_yes_odds: market.pm_yes_odds,
      pm_no_odds: market.pm_no_odds,
      true_probability: market.true_probability,
      edge_yes: market.edge_yes,
      edge_no: market.edge_no,
      best_side: market.best_side,
      best_edge: market.best_edge,
      volume_24h: market.volume_24h,
      data_source: market.data_source,
      confidence: market.confidence,
      last_updated: new Date().toISOString()
    }, {
      onConflict: 'market_id',
      ignoreDuplicates: false
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getValueMarkets(minEdge = 0, limit = 50) {
  const { data, error } = await supabase
    .from('value_markets')
    .select('*')
    .gte('best_edge', minEdge)
    .order('best_edge', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

export async function saveValueSignal(signal: Omit<ValueSignal, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('value_signals')
    .insert({
      market_id: signal.market_id,
      market_question: signal.market_question,
      category: signal.category,
      side: signal.side,
      edge: signal.edge,
      kelly_bet: signal.kelly_bet,
      pm_odds: signal.pm_odds,
      true_prob: signal.true_prob,
      data_source: signal.data_source,
      confidence: signal.confidence,
      volume_24h: signal.volume_24h,
      recommended_size: signal.recommended_size,
      is_executed: false
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getValueSignals(minEdge = 0, limit = 50) {
  const { data, error } = await supabase
    .from('value_signals')
    .select('*')
    .gte('edge', minEdge)
    .eq('is_executed', false)
    .order('edge', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

export async function saveValuePosition(position: Omit<ValuePosition, 'id' | 'created_at' | 'updated_at'>, userId: string) {
  const { data, error } = await supabase
    .from('value_positions')
    .insert({
      user_id: userId,
      market_id: position.market_id,
      market_question: position.market_question,
      side: position.side,
      entry_odds: position.entry_odds,
      entry_edge: position.entry_edge,
      position_size: position.position_size,
      kelly_fraction: position.kelly_fraction,
      current_odds: position.current_odds,
      current_edge: position.current_edge,
      pnl: position.pnl,
      expected_value: position.expected_value,
      status: position.status
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getValuePositions(userId: string, status?: string) {
  let query = supabase
    .from('value_positions')
    .select('*')
    .eq('user_id', userId);

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query
    .order('opened_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function updateValuePosition(positionId: string, updates: any) {
  const { data, error } = await supabase
    .from('value_positions')
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

export async function closeValuePosition(
  positionId: string,
  exitOdds: number,
  exitReason: string
) {
  const { data, error } = await supabase
    .from('value_positions')
    .update({
      status: 'closed',
      closed_at: new Date().toISOString(),
      exit_odds: exitOdds,
      exit_reason: exitReason,
      updated_at: new Date().toISOString()
    })
    .eq('id', positionId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getPerformanceMetrics(userId: string, period: string) {
  const { data, error } = await supabase
    .from('performance_metrics')
    .select('*')
    .eq('user_id', userId)
    .eq('period', period)
    .order('calculated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}
