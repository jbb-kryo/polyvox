import { supabase } from '../../lib/supabase';
import { ArbitrageOpportunity, ArbitragePosition, ArbitrageTrade } from '../../types/arbitrage';

export async function saveArbitrageOpportunity(opportunity: ArbitrageOpportunity, userId: string) {
  const { data, error } = await supabase
    .from('arbitrage_opportunities')
    .insert({
      user_id: userId,
      market1_id: opportunity.marketPair.market1.id,
      market1_question: opportunity.marketPair.market1.question,
      market1_price: opportunity.marketPair.market1.price,
      market2_id: opportunity.marketPair.market2.id,
      market2_question: opportunity.marketPair.market2.question,
      market2_price: opportunity.marketPair.market2.price,
      combined_probability: opportunity.combinedProbability,
      profit_percent: opportunity.profitPercent,
      is_executed: false
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getArbitrageOpportunities(userId: string, limit = 20) {
  const { data, error } = await supabase
    .from('arbitrage_opportunities')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

export async function saveArbitragePosition(position: Omit<ArbitragePosition, 'id'>, userId: string) {
  const { data, error } = await supabase
    .from('arbitrage_positions')
    .insert({
      user_id: userId,
      market_pair: position.marketPair,
      market1_id: position.marketPair.split(' vs ')[0],
      market2_id: position.marketPair.split(' vs ')[1],
      entry_price_m1: position.entryPrices.market1,
      entry_price_m2: position.entryPrices.market2,
      current_price_m1: position.currentPrices.market1,
      current_price_m2: position.currentPrices.market2,
      position_size: position.positionSize,
      pnl: position.currentPnL,
      pnl_percent: position.pnLPercent,
      status: 'open'
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getArbitragePositions(userId: string) {
  const { data, error } = await supabase
    .from('arbitrage_positions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'open')
    .order('opened_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function updateArbitragePosition(positionId: string, updates: any) {
  const { data, error } = await supabase
    .from('arbitrage_positions')
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

export async function closeArbitragePosition(positionId: string, exitPrices: { market1: number; market2: number }) {
  const { data: position, error: fetchError } = await supabase
    .from('arbitrage_positions')
    .select('*')
    .eq('id', positionId)
    .single();

  if (fetchError) throw fetchError;

  const { data, error } = await supabase
    .from('arbitrage_positions')
    .update({
      status: 'closed',
      closed_at: new Date().toISOString(),
      current_price_m1: exitPrices.market1,
      current_price_m2: exitPrices.market2
    })
    .eq('id', positionId)
    .select()
    .single();

  if (error) throw error;

  const duration = Math.floor((Date.now() - new Date(position.opened_at).getTime()) / 60000);

  await supabase.from('arbitrage_trades').insert({
    user_id: position.user_id,
    market_pair: position.market_pair,
    entry_price_m1: position.entry_price_m1,
    entry_price_m2: position.entry_price_m2,
    exit_price_m1: exitPrices.market1,
    exit_price_m2: exitPrices.market2,
    position_size: position.position_size,
    profit: data.pnl,
    profit_percent: data.pnl_percent,
    duration_minutes: duration,
    fees: 0,
    opened_at: position.opened_at,
    closed_at: data.closed_at
  });

  return data;
}

export async function getArbitrageTrades(userId: string, limit = 50) {
  const { data, error } = await supabase
    .from('arbitrage_trades')
    .select('*')
    .eq('user_id', userId)
    .order('closed_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}
