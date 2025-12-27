import { supabase } from '../../lib/supabase';

export async function getModulePerformance(userId: string, moduleName?: string, period?: string) {
  let query = supabase
    .from('module_performance')
    .select('*')
    .eq('user_id', userId);

  if (moduleName) {
    query = query.eq('module_name', moduleName);
  }

  if (period) {
    query = query.eq('period', period);
  }

  const { data, error } = await query
    .order('date', { ascending: false })
    .limit(100);

  if (error) throw error;
  return data;
}

export async function saveModulePerformance(performance: any, userId: string) {
  const { data, error } = await supabase
    .from('module_performance')
    .upsert({
      user_id: userId,
      module_name: performance.module_name,
      period: performance.period,
      date: performance.date,
      total_trades: performance.total_trades,
      winning_trades: performance.winning_trades,
      win_rate: performance.win_rate,
      total_pnl: performance.total_pnl,
      total_fees: performance.total_fees,
      roi: performance.roi,
      sharpe_ratio: performance.sharpe_ratio,
      max_drawdown: performance.max_drawdown,
      avg_trade_duration: performance.avg_trade_duration,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id,module_name,period,date'
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getTradeAnalytics(userId: string, startDate?: string, endDate?: string) {
  let query = supabase
    .from('trade_analytics')
    .select('*')
    .eq('user_id', userId);

  if (startDate) {
    query = query.gte('date', startDate);
  }

  if (endDate) {
    query = query.lte('date', endDate);
  }

  const { data, error } = await query
    .order('date', { ascending: true });

  if (error) throw error;
  return data;
}

export async function saveTradeAnalytics(analytics: any, userId: string) {
  const { data, error } = await supabase
    .from('trade_analytics')
    .upsert({
      user_id: userId,
      date: analytics.date,
      total_trades: analytics.total_trades,
      winning_trades: analytics.winning_trades,
      total_pnl: analytics.total_pnl,
      total_fees: analytics.total_fees,
      best_trade: analytics.best_trade,
      worst_trade: analytics.worst_trade,
      avg_hold_time: analytics.avg_hold_time,
      module_breakdown: analytics.module_breakdown,
      category_breakdown: analytics.category_breakdown,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id,date'
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getAllTrades(userId: string, limit = 100) {
  const [arbitrageTrades, trendTrades, snipeTrades] = await Promise.all([
    supabase
      .from('arbitrage_trades')
      .select('*')
      .eq('user_id', userId)
      .order('closed_at', { ascending: false })
      .limit(limit),
    supabase
      .from('trend_trades')
      .select('*')
      .eq('user_id', userId)
      .order('closed_at', { ascending: false })
      .limit(limit),
    supabase
      .from('snipe_trades')
      .select('*')
      .eq('user_id', userId)
      .order('closed_at', { ascending: false })
      .limit(limit)
  ]);

  const allTrades = [
    ...(arbitrageTrades.data || []).map(t => ({ ...t, module: 'arbitrage' })),
    ...(trendTrades.data || []).map(t => ({ ...t, module: 'trend' })),
    ...(snipeTrades.data || []).map(t => ({ ...t, module: 'snipe' }))
  ].sort((a, b) => new Date(b.closed_at).getTime() - new Date(a.closed_at).getTime());

  return allTrades.slice(0, limit);
}

export async function getWatchlist(userId: string) {
  const { data, error } = await supabase
    .from('market_watchlist')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function addToWatchlist(userId: string, marketId: string, marketQuestion: string, notes?: string) {
  const { data, error } = await supabase
    .from('market_watchlist')
    .insert({
      user_id: userId,
      market_id: marketId,
      market_question: marketQuestion,
      notes: notes || null
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function removeFromWatchlist(userId: string, marketId: string) {
  const { error } = await supabase
    .from('market_watchlist')
    .delete()
    .eq('user_id', userId)
    .eq('market_id', marketId);

  if (error) throw error;
  return { success: true };
}
