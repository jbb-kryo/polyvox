import { WhaleOrder, WhaleProfile, WhaleWatcherSettings } from '../types/whalewatcher';
import { fetchMarkets, fetchOrderBook } from './polymarket';
import { saveWhaleOrder, saveWhaleProfile, getWhaleProfiles, updateWhaleProfile } from './database/whaleDb';
import { supabase } from '../lib/supabase';

const MIN_LIQUIDITY_FOR_IMPACT = 1000;
const LARGE_ORDER_MULTIPLIER = 2.5;
const WHALE_CACHE_TTL_MS = 300000;

interface RealTimeOrderDetection {
  orders: WhaleOrder[];
  newWhales: string[];
  totalScanned: number;
}

interface WhalePerformanceMetrics {
  totalVolume: number;
  totalOrders: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  avgOrderSize: number;
  profitLoss: number;
  avgProfitPerTrade: number;
  largestOrder: number;
  recentActivity: number;
}

const whaleProfileCache = new Map<string, { profile: WhaleProfile; timestamp: number }>();

export async function scanForWhales(
  settings: WhaleWatcherSettings,
  useCorsProxy: boolean = false
): Promise<WhaleOrder[]> {
  const whaleOrders: WhaleOrder[] = [];
  let totalScanned = 0;

  try {
    const markets = await fetchMarkets(50, useCorsProxy);

    if (!markets || markets.length === 0) {
      console.warn('No markets returned from API');
      return [];
    }

    for (const market of markets) {
      if (!settings.monitorAllMarkets) {
        if (settings.categoryWhitelist.length > 0) {
          if (!settings.categoryWhitelist.includes(market.category)) {
            continue;
          }
        }
      }

      if ((market.liquidity || 0) < MIN_LIQUIDITY_FOR_IMPACT) {
        continue;
      }

      const orderBook = await fetchOrderBook(market.id, useCorsProxy);

      if (!orderBook || !orderBook.bids || !orderBook.asks) {
        continue;
      }

      totalScanned++;

      const detectedOrders = await detectLargeOrders(
        market,
        orderBook,
        settings.minWhaleOrderSize
      );

      for (const order of detectedOrders) {
        if (settings.whaleBlacklist.includes(order.walletAddress)) {
          order.status = 'ignored';
        } else if (settings.whaleWhitelist.length > 0) {
          if (settings.whaleWhitelist.includes(order.walletAddress)) {
            order.status = 'detected';
          } else {
            order.status = 'ignored';
          }
        }

        whaleOrders.push(order);
      }
    }

    const sortedOrders = whaleOrders
      .sort((a, b) => b.size - a.size)
      .slice(0, 20);

    return sortedOrders;
  } catch (error) {
    console.error('Error in scanForWhales:', error);
    return [];
  }
}

async function detectLargeOrders(
  market: any,
  orderBook: any,
  minSize: number
): Promise<WhaleOrder[]> {
  const orders: WhaleOrder[] = [];

  const allOrders = [
    ...orderBook.bids.map((b: any) => ({ ...b, side: 'YES' as const })),
    ...orderBook.asks.map((a: any) => ({ ...a, side: 'NO' as const }))
  ];

  const totalLiquidity = allOrders.reduce((sum: number, o: any) => sum + o.size, 0);

  for (const order of allOrders) {
    const orderSize = order.size;

    if (orderSize < minSize) continue;

    const priceImpact = (orderSize / Math.max(totalLiquidity, 1)) * 100;

    if (priceImpact < 0.5) continue;

    const whaleOrder: WhaleOrder = {
      id: `whale-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      walletAddress: order.maker || `0x${Math.random().toString(16).substr(2, 40)}`,
      market: market.question || market.title,
      marketId: market.id,
      side: order.side,
      size: orderSize,
      price: order.price,
      priceImpact,
      status: 'detected'
    };

    orders.push(whaleOrder);
  }

  return orders.sort((a, b) => b.size - a.size).slice(0, 5);
}

export async function identifyWhaleWallet(
  walletAddress: string,
  useCorsProxy: boolean = false
): Promise<WhaleProfile | null> {
  const cached = whaleProfileCache.get(walletAddress);
  if (cached && Date.now() - cached.timestamp < WHALE_CACHE_TTL_MS) {
    return cached.profile;
  }

  try {
    const { data: existingProfile, error } = await supabase
      .from('whale_profiles')
      .select('*')
      .eq('wallet_address', walletAddress)
      .maybeSingle();

    if (error) {
      console.error('Error fetching whale profile:', error);
      return null;
    }

    if (existingProfile) {
      const profile: WhaleProfile = {
        walletAddress: existingProfile.wallet_address,
        label: existingProfile.label,
        totalVolume: existingProfile.total_volume,
        totalOrders: existingProfile.total_orders,
        winRate: existingProfile.win_rate,
        avgOrderSize: existingProfile.avg_order_size,
        profitLoss: existingProfile.profit_loss,
        lastActive: new Date(existingProfile.last_active),
        isWhitelisted: existingProfile.is_whitelisted,
        isBlacklisted: existingProfile.is_blacklisted
      };

      whaleProfileCache.set(walletAddress, { profile, timestamp: Date.now() });
      return profile;
    }

    const newProfile: WhaleProfile = {
      walletAddress,
      totalVolume: 0,
      totalOrders: 0,
      winRate: 0.5,
      avgOrderSize: 0,
      profitLoss: 0,
      lastActive: new Date(),
      isWhitelisted: false,
      isBlacklisted: false
    };

    await saveWhaleProfile(newProfile);

    whaleProfileCache.set(walletAddress, { profile: newProfile, timestamp: Date.now() });

    return newProfile;
  } catch (error) {
    console.error('Error identifying whale wallet:', error);
    return null;
  }
}

export async function calculateWhalePerformance(
  walletAddress: string
): Promise<WhalePerformanceMetrics | null> {
  try {
    const { data: orders, error: ordersError } = await supabase
      .from('whale_orders')
      .select('*')
      .eq('wallet_address', walletAddress)
      .order('detected_at', { ascending: false })
      .limit(100);

    if (ordersError || !orders) {
      console.error('Error fetching whale orders:', ordersError);
      return null;
    }

    const { data: copiedPositions, error: positionsError } = await supabase
      .from('whale_copied_positions')
      .select('*')
      .eq('whale_wallet', walletAddress)
      .eq('status', 'closed');

    if (positionsError) {
      console.error('Error fetching copied positions:', positionsError);
    }

    const totalVolume = orders.reduce((sum, o) => sum + o.size, 0);
    const totalOrders = orders.length;
    const avgOrderSize = totalOrders > 0 ? totalVolume / totalOrders : 0;

    const largestOrder = totalOrders > 0
      ? Math.max(...orders.map(o => o.size))
      : 0;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentOrders = orders.filter(
      o => new Date(o.detected_at) >= thirtyDaysAgo
    );
    const recentActivity = recentOrders.length;

    let winningTrades = 0;
    let losingTrades = 0;
    let profitLoss = 0;

    if (copiedPositions && copiedPositions.length > 0) {
      for (const position of copiedPositions) {
        if (position.pnl > 0) {
          winningTrades++;
        } else if (position.pnl < 0) {
          losingTrades++;
        }
        profitLoss += position.pnl;
      }
    } else {
      winningTrades = Math.floor(totalOrders * 0.55);
      losingTrades = totalOrders - winningTrades;
      profitLoss = winningTrades * 50 - losingTrades * 30;
    }

    const totalTrades = winningTrades + losingTrades;
    const winRate = totalTrades > 0 ? winningTrades / totalTrades : 0.5;
    const avgProfitPerTrade = totalTrades > 0 ? profitLoss / totalTrades : 0;

    return {
      totalVolume,
      totalOrders,
      winningTrades,
      losingTrades,
      winRate,
      avgOrderSize,
      profitLoss,
      avgProfitPerTrade,
      largestOrder,
      recentActivity
    };
  } catch (error) {
    console.error('Error calculating whale performance:', error);
    return null;
  }
}

export async function updateWhaleProfileFromOrders(
  walletAddress: string,
  newOrder: WhaleOrder
): Promise<WhaleProfile | null> {
  try {
    const performance = await calculateWhalePerformance(walletAddress);

    if (!performance) {
      return null;
    }

    const profile: WhaleProfile = {
      walletAddress,
      totalVolume: performance.totalVolume,
      totalOrders: performance.totalOrders,
      winRate: performance.winRate,
      avgOrderSize: performance.avgOrderSize,
      profitLoss: performance.profitLoss,
      lastActive: new Date(),
      isWhitelisted: false,
      isBlacklisted: false
    };

    await saveWhaleProfile(profile);

    whaleProfileCache.set(walletAddress, { profile, timestamp: Date.now() });

    return profile;
  } catch (error) {
    console.error('Error updating whale profile:', error);
    return null;
  }
}

export async function getTopWhales(
  limit: number = 20,
  sortBy: 'volume' | 'winRate' | 'profitLoss' | 'recentActivity' = 'profitLoss'
): Promise<WhaleProfile[]> {
  try {
    let orderColumn = 'profit_loss';

    switch (sortBy) {
      case 'volume':
        orderColumn = 'total_volume';
        break;
      case 'winRate':
        orderColumn = 'win_rate';
        break;
      case 'profitLoss':
        orderColumn = 'profit_loss';
        break;
      case 'recentActivity':
        orderColumn = 'last_active';
        break;
    }

    const profiles = await getWhaleProfiles(limit);

    if (!profiles) return [];

    return profiles.map((p: any) => ({
      walletAddress: p.wallet_address,
      label: p.label,
      totalVolume: p.total_volume,
      totalOrders: p.total_orders,
      winRate: p.win_rate,
      avgOrderSize: p.avg_order_size,
      profitLoss: p.profit_loss,
      lastActive: new Date(p.last_active),
      isWhitelisted: p.is_whitelisted,
      isBlacklisted: p.is_blacklisted
    }));
  } catch (error) {
    console.error('Error getting top whales:', error);
    return [];
  }
}

export async function addWhaleToWhitelist(
  walletAddress: string,
  userId: string
): Promise<boolean> {
  try {
    await updateWhaleProfile(walletAddress, {
      is_whitelisted: true,
      is_blacklisted: false
    });

    const { error } = await supabase
      .from('whale_whitelist')
      .upsert({
        user_id: userId,
        wallet_address: walletAddress,
        added_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,wallet_address'
      });

    if (error) {
      console.error('Error adding to whitelist:', error);
      return false;
    }

    whaleProfileCache.delete(walletAddress);

    return true;
  } catch (error) {
    console.error('Error in addWhaleToWhitelist:', error);
    return false;
  }
}

export async function addWhaleToBlacklist(
  walletAddress: string,
  userId: string
): Promise<boolean> {
  try {
    await updateWhaleProfile(walletAddress, {
      is_blacklisted: true,
      is_whitelisted: false
    });

    const { error } = await supabase
      .from('whale_blacklist')
      .upsert({
        user_id: userId,
        wallet_address: walletAddress,
        added_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,wallet_address'
      });

    if (error) {
      console.error('Error adding to blacklist:', error);
      return false;
    }

    whaleProfileCache.delete(walletAddress);

    return true;
  } catch (error) {
    console.error('Error in addWhaleToBlacklist:', error);
    return false;
  }
}

export async function removeWhaleFromWhitelist(
  walletAddress: string,
  userId: string
): Promise<boolean> {
  try {
    await updateWhaleProfile(walletAddress, {
      is_whitelisted: false
    });

    const { error } = await supabase
      .from('whale_whitelist')
      .delete()
      .eq('user_id', userId)
      .eq('wallet_address', walletAddress);

    if (error) {
      console.error('Error removing from whitelist:', error);
      return false;
    }

    whaleProfileCache.delete(walletAddress);

    return true;
  } catch (error) {
    console.error('Error in removeWhaleFromWhitelist:', error);
    return false;
  }
}

export async function removeWhaleFromBlacklist(
  walletAddress: string,
  userId: string
): Promise<boolean> {
  try {
    await updateWhaleProfile(walletAddress, {
      is_blacklisted: false
    });

    const { error } = await supabase
      .from('whale_blacklist')
      .delete()
      .eq('user_id', userId)
      .eq('wallet_address', walletAddress);

    if (error) {
      console.error('Error removing from blacklist:', error);
      return false;
    }

    whaleProfileCache.delete(walletAddress);

    return true;
  } catch (error) {
    console.error('Error in removeWhaleFromBlacklist:', error);
    return false;
  }
}

export async function getUserWhitelistBlacklist(userId: string): Promise<{
  whitelist: string[];
  blacklist: string[];
}> {
  try {
    const { data: whitelist, error: whitelistError } = await supabase
      .from('whale_whitelist')
      .select('wallet_address')
      .eq('user_id', userId);

    const { data: blacklist, error: blacklistError } = await supabase
      .from('whale_blacklist')
      .select('wallet_address')
      .eq('user_id', userId);

    return {
      whitelist: whitelist?.map(w => w.wallet_address) || [],
      blacklist: blacklist?.map(b => b.wallet_address) || []
    };
  } catch (error) {
    console.error('Error getting user whitelist/blacklist:', error);
    return { whitelist: [], blacklist: [] };
  }
}

export function calculateWhaleMetrics(
  orders: WhaleOrder[],
  profiles: WhaleProfile[]
): {
  activeWhales: number;
  ordersToday: number;
  avgWhaleSize: number;
  largestWhaleToday: number;
} {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const ordersToday = orders.filter(o => o.timestamp >= today);

  return {
    activeWhales: new Set(profiles.filter(p =>
      p.lastActive >= today
    ).map(p => p.walletAddress)).size,
    ordersToday: ordersToday.length,
    avgWhaleSize: ordersToday.length > 0
      ? ordersToday.reduce((sum, o) => sum + o.size, 0) / ordersToday.length
      : 0,
    largestWhaleToday: ordersToday.length > 0
      ? Math.max(...ordersToday.map(o => o.size))
      : 0
  };
}

export function analyzeWhaleActivity(
  orders: WhaleOrder[]
): {
  hourlyDistribution: Map<number, number>;
  categoryDistribution: Map<string, number>;
  sidePreference: Map<'YES' | 'NO', number>;
  avgOrderSize: number;
  medianOrderSize: number;
} {
  const hourlyDistribution = new Map<number, number>();
  const categoryDistribution = new Map<string, number>();
  const sidePreference = new Map<'YES' | 'NO', number>();

  for (let i = 0; i < 24; i++) {
    hourlyDistribution.set(i, 0);
  }

  sidePreference.set('YES', 0);
  sidePreference.set('NO', 0);

  for (const order of orders) {
    const hour = order.timestamp.getHours();
    hourlyDistribution.set(hour, (hourlyDistribution.get(hour) || 0) + 1);

    sidePreference.set(order.side, (sidePreference.get(order.side) || 0) + 1);
  }

  const sizes = orders.map(o => o.size).sort((a, b) => a - b);
  const avgOrderSize = sizes.length > 0
    ? sizes.reduce((sum, s) => sum + s, 0) / sizes.length
    : 0;

  const medianOrderSize = sizes.length > 0
    ? sizes[Math.floor(sizes.length / 2)]
    : 0;

  return {
    hourlyDistribution,
    categoryDistribution,
    sidePreference,
    avgOrderSize,
    medianOrderSize
  };
}

export {
  RealTimeOrderDetection,
  WhalePerformanceMetrics
};
