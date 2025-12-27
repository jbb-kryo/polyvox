import { supabase } from '../../lib/supabase';
import { WhaleOrder, WhaleProfile, CopiedPosition } from '../../types/whalewatcher';

export async function saveWhaleOrder(order: WhaleOrder) {
  const { data, error } = await supabase
    .from('whale_orders')
    .insert({
      detected_at: order.timestamp.toISOString(),
      wallet_address: order.walletAddress,
      wallet_label: order.walletLabel,
      market: order.market,
      market_id: order.marketId,
      side: order.side,
      size: order.size,
      price: order.price,
      price_impact: order.priceImpact,
      status: order.status
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getWhaleOrders(limit = 50) {
  const { data, error } = await supabase
    .from('whale_orders')
    .select('*')
    .order('detected_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

export async function saveWhaleProfile(profile: WhaleProfile) {
  const { data, error } = await supabase
    .from('whale_profiles')
    .upsert({
      wallet_address: profile.walletAddress,
      label: profile.label,
      total_volume: profile.totalVolume,
      total_orders: profile.totalOrders,
      win_rate: profile.winRate,
      avg_order_size: profile.avgOrderSize,
      profit_loss: profile.profitLoss,
      last_active: profile.lastActive.toISOString(),
      is_whitelisted: profile.isWhitelisted,
      is_blacklisted: profile.isBlacklisted,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'wallet_address'
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getWhaleProfiles(limit = 20) {
  const { data, error } = await supabase
    .from('whale_profiles')
    .select('*')
    .order('total_volume', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

export async function updateWhaleProfile(walletAddress: string, updates: any) {
  const { data, error } = await supabase
    .from('whale_profiles')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('wallet_address', walletAddress)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function saveCopiedPosition(position: Omit<CopiedPosition, 'id'>, userId: string, whaleOrderId?: string) {
  const { data, error } = await supabase
    .from('whale_copied_positions')
    .insert({
      user_id: userId,
      whale_order_id: whaleOrderId || null,
      whale_wallet: position.whaleWallet,
      market: position.market,
      market_id: position.marketId,
      side: position.side,
      entry_price: position.entryPrice,
      current_price: position.currentPrice,
      position_size: position.positionSize,
      whale_order_size: position.whaleOrderSize,
      entry_time: position.entryTime.toISOString(),
      pnl: position.pnl,
      pnl_percent: position.pnlPercent,
      status: position.status
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getCopiedPositions(userId: string) {
  const { data, error } = await supabase
    .from('whale_copied_positions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'open')
    .order('entry_time', { ascending: false });

  if (error) throw error;
  return data;
}

export async function updateCopiedPosition(positionId: string, updates: any) {
  const { data, error } = await supabase
    .from('whale_copied_positions')
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

export async function closeCopiedPosition(
  positionId: string,
  exitPrice: number,
  exitReason: 'whale_exit' | 'take_profit' | 'stop_loss' | 'timeout' | 'manual'
) {
  const { data, error } = await supabase
    .from('whale_copied_positions')
    .update({
      status: 'closed',
      exit_time: new Date().toISOString(),
      exit_price: exitPrice,
      exit_reason: exitReason,
      updated_at: new Date().toISOString()
    })
    .eq('id', positionId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function saveWhaleAlert(alert: any, userId: string) {
  const { data, error } = await supabase
    .from('whale_alerts')
    .insert({
      user_id: userId,
      alert_type: alert.type,
      alert_timestamp: alert.timestamp.toISOString(),
      message: alert.message,
      whale_order_id: alert.whaleOrder?.id || null,
      position_id: alert.position?.id || null,
      is_read: false
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getWhaleAlerts(userId: string, unreadOnly = false) {
  let query = supabase
    .from('whale_alerts')
    .select('*')
    .eq('user_id', userId);

  if (unreadOnly) {
    query = query.eq('is_read', false);
  }

  const { data, error } = await query
    .order('alert_timestamp', { ascending: false })
    .limit(50);

  if (error) throw error;
  return data;
}

export async function markAlertAsRead(alertId: string) {
  const { data, error } = await supabase
    .from('whale_alerts')
    .update({ is_read: true })
    .eq('id', alertId)
    .select()
    .single();

  if (error) throw error;
  return data;
}
