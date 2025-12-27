import { supabase } from '../../lib/supabase';
import { SnipeOrder, SnipePosition } from '../../types/snipemaster';

export async function saveSnipeOrder(order: Omit<SnipeOrder, 'id' | 'createdAt'>, userId: string) {
  const { data, error } = await supabase
    .from('snipe_orders')
    .insert({
      user_id: userId,
      market_id: order.marketId,
      market_title: order.marketTitle,
      side: order.side.toUpperCase(),
      current_price: order.currentPrice,
      limit_price: order.limitPrice,
      discount_percent: order.discount,
      size: order.size,
      status: order.status,
      expires_at: order.filledAt ? new Date(order.filledAt).toISOString() : null
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getSnipeOrders(userId: string) {
  const { data, error } = await supabase
    .from('snipe_orders')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['pending', 'filled'])
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function updateSnipeOrder(orderId: string, updates: any) {
  const { data, error } = await supabase
    .from('snipe_orders')
    .update(updates)
    .eq('id', orderId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function saveSnipePosition(position: Omit<SnipePosition, 'id' | 'openedAt'>, userId: string, orderId?: string) {
  const { data, error } = await supabase
    .from('snipe_positions')
    .insert({
      user_id: userId,
      order_id: orderId || null,
      market_id: position.marketId,
      market_title: position.marketTitle,
      side: position.side.toUpperCase(),
      entry_price: position.entryPrice,
      current_price: position.currentPrice,
      size: position.size,
      pnl: position.pnl,
      pnl_percent: position.pnlPercent
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getSnipePositions(userId: string) {
  const { data, error } = await supabase
    .from('snipe_positions')
    .select('*')
    .eq('user_id', userId)
    .order('opened_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function updateSnipePosition(positionId: string, updates: any) {
  const { data, error } = await supabase
    .from('snipe_positions')
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

export async function closeSnipePosition(positionId: string, exitPrice: number) {
  const { data: position, error: fetchError } = await supabase
    .from('snipe_positions')
    .select('*')
    .eq('id', positionId)
    .single();

  if (fetchError) throw fetchError;

  const profit = (exitPrice - position.entry_price) * position.size;
  const profitPercent = ((exitPrice - position.entry_price) / position.entry_price) * 100;
  const duration = Math.floor((Date.now() - new Date(position.opened_at).getTime()) / 60000);

  await supabase.from('snipe_trades').insert({
    user_id: position.user_id,
    market_id: position.market_id,
    market_title: position.market_title,
    side: position.side,
    entry_price: position.entry_price,
    exit_price: exitPrice,
    size: position.size,
    profit,
    profit_percent: profitPercent,
    entry_discount: 0,
    duration_minutes: duration,
    fees: 0,
    opened_at: position.opened_at,
    closed_at: new Date().toISOString()
  });

  const { error: deleteError } = await supabase
    .from('snipe_positions')
    .delete()
    .eq('id', positionId);

  if (deleteError) throw deleteError;

  return { success: true };
}

export async function getSnipeTrades(userId: string, limit = 50) {
  const { data, error } = await supabase
    .from('snipe_trades')
    .select('*')
    .eq('user_id', userId)
    .order('closed_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}
