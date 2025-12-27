import { fetchMarketById } from './polymarket';
import { CopiedPosition, WhaleOrder, WhaleWatcherSettings, WhaleProfile } from '../types/whalewatcher';
import { saveCopiedPosition, updateCopiedPosition, closeCopiedPosition } from './database/whaleDb';
import { supabase } from '../lib/supabase';

const PRICE_CHECK_INTERVAL_MS = 5000;
const POSITION_TIMEOUT_MS = 24 * 60 * 60 * 1000;

interface CopyTradeDecision {
  shouldCopy: boolean;
  reason: string;
  positionSize?: number;
  confidence?: number;
}

interface ExitDecision {
  shouldExit: boolean;
  reason: 'whale_exit' | 'take_profit' | 'stop_loss' | 'timeout' | 'manual' | null;
  exitPrice?: number;
}

export function evaluateCopyTrade(
  whaleOrder: WhaleOrder,
  whaleProfile: WhaleProfile | null,
  settings: WhaleWatcherSettings,
  activePositions: CopiedPosition[]
): CopyTradeDecision {
  if (settings.whaleBlacklist.includes(whaleOrder.walletAddress)) {
    return {
      shouldCopy: false,
      reason: 'Whale is blacklisted'
    };
  }

  if (settings.whaleWhitelist.length > 0) {
    if (!settings.whaleWhitelist.includes(whaleOrder.walletAddress)) {
      return {
        shouldCopy: false,
        reason: 'Whale not in whitelist'
      };
    }
  }

  if (whaleOrder.size < settings.minWhaleOrderSize) {
    return {
      shouldCopy: false,
      reason: `Order size ${whaleOrder.size} below minimum ${settings.minWhaleOrderSize}`
    };
  }

  const openPositions = activePositions.filter(p => p.status === 'open');

  if (openPositions.length >= settings.maxConcurrentCopies) {
    return {
      shouldCopy: false,
      reason: `Max concurrent copies reached (${settings.maxConcurrentCopies})`
    };
  }

  const whalePositions = openPositions.filter(
    p => p.whaleWallet === whaleOrder.walletAddress
  );

  if (whalePositions.length >= settings.maxCopiesPerWhale) {
    return {
      shouldCopy: false,
      reason: `Max copies per whale reached (${settings.maxCopiesPerWhale})`
    };
  }

  let confidence = 50;

  if (whaleProfile) {
    if (whaleProfile.winRate >= 0.70) {
      confidence += 20;
    } else if (whaleProfile.winRate >= 0.60) {
      confidence += 10;
    } else if (whaleProfile.winRate < 0.45) {
      confidence -= 15;
    }

    if (whaleProfile.profitLoss > 500) {
      confidence += 15;
    } else if (whaleProfile.profitLoss > 200) {
      confidence += 10;
    } else if (whaleProfile.profitLoss < 0) {
      confidence -= 20;
    }

    if (whaleProfile.totalOrders >= 50) {
      confidence += 10;
    } else if (whaleProfile.totalOrders < 10) {
      confidence -= 10;
    }
  }

  if (whaleOrder.priceImpact > 10) {
    confidence += 10;
  } else if (whaleOrder.priceImpact > 5) {
    confidence += 5;
  }

  if (whaleOrder.size >= settings.minWhaleOrderSize * 3) {
    confidence += 5;
  }

  confidence = Math.max(0, Math.min(100, confidence));

  if (confidence < 40) {
    return {
      shouldCopy: false,
      reason: `Low confidence score: ${confidence}%`
    };
  }

  const positionSize = calculatePositionSize(whaleOrder, settings);

  return {
    shouldCopy: true,
    reason: `High confidence: ${confidence}% (Whale win rate: ${whaleProfile?.winRate ? (whaleProfile.winRate * 100).toFixed(1) : 'N/A'}%)`,
    positionSize,
    confidence
  };
}

export function calculatePositionSize(
  whaleOrder: WhaleOrder,
  settings: WhaleWatcherSettings
): number {
  if (settings.copyPositionMode === 'fixed') {
    return settings.copyPositionSize;
  } else {
    const percentageSize = (whaleOrder.size * settings.copyPositionPercent) / 100;
    return Math.max(10, Math.min(percentageSize, settings.copyPositionSize * 2));
  }
}

export async function executeCopyTrade(
  whaleOrder: WhaleOrder,
  positionSize: number,
  confidence: number,
  userId: string,
  realTradingMode: boolean
): Promise<CopiedPosition | null> {
  try {
    if (realTradingMode) {
      throw new Error('Real trading not yet implemented');
    }

    const position: CopiedPosition = {
      id: `copy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      whaleOrderId: whaleOrder.id,
      whaleWallet: whaleOrder.walletAddress,
      market: whaleOrder.market,
      marketId: whaleOrder.marketId,
      side: whaleOrder.side,
      entryPrice: whaleOrder.price,
      currentPrice: whaleOrder.price,
      positionSize,
      whaleOrderSize: whaleOrder.size,
      entryTime: new Date(),
      pnl: 0,
      pnlPercent: 0,
      status: 'open'
    };

    if (userId) {
      await saveCopiedPosition(position, userId, whaleOrder.id);
    }

    return position;
  } catch (error) {
    console.error('Error executing copy trade:', error);
    return null;
  }
}

export async function checkExitConditions(
  position: CopiedPosition,
  settings: WhaleWatcherSettings,
  whaleHasExited: boolean = false
): Promise<ExitDecision> {
  const currentPnLPercent = position.pnlPercent;

  if (whaleHasExited && settings.exitStrategy !== 'independent') {
    return {
      shouldExit: true,
      reason: 'whale_exit',
      exitPrice: position.currentPrice
    };
  }

  const positionAge = Date.now() - position.entryTime.getTime();
  if (positionAge >= POSITION_TIMEOUT_MS) {
    return {
      shouldExit: true,
      reason: 'timeout',
      exitPrice: position.currentPrice
    };
  }

  if (currentPnLPercent >= settings.takeProfitPercent) {
    return {
      shouldExit: true,
      reason: 'take_profit',
      exitPrice: position.currentPrice
    };
  }

  if (currentPnLPercent <= -settings.stopLossPercent) {
    return {
      shouldExit: true,
      reason: 'stop_loss',
      exitPrice: position.currentPrice
    };
  }

  return {
    shouldExit: false,
    reason: null
  };
}

export async function updatePositionPrice(
  position: CopiedPosition,
  useCorsProxy: boolean = false
): Promise<CopiedPosition> {
  try {
    const market = await fetchMarketById(position.marketId);

    if (!market || !market.outcomePrices || market.outcomePrices.length < 2) {
      return position;
    }

    const currentYesPrice = parseFloat(market.outcomePrices[0]);
    const currentNoPrice = parseFloat(market.outcomePrices[1]);

    if (isNaN(currentYesPrice) || isNaN(currentNoPrice)) {
      return position;
    }

    const currentPrice = position.side === 'YES' ? currentYesPrice : currentNoPrice;

    const priceDiff = currentPrice - position.entryPrice;
    const pnl = priceDiff * position.positionSize * (position.side === 'YES' ? 1 : -1);
    const pnlPercent = (pnl / position.positionSize) * 100;

    return {
      ...position,
      currentPrice,
      pnl,
      pnlPercent
    };
  } catch (error) {
    console.error('Error updating position price:', error);
    return position;
  }
}

export async function monitorAndManagePositions(
  positions: CopiedPosition[],
  settings: WhaleWatcherSettings,
  userId: string,
  useCorsProxy: boolean = false
): Promise<{
  updated: CopiedPosition[];
  closed: string[];
  actions: Array<{ positionId: string; action: string; reason: string }>;
}> {
  const updated: CopiedPosition[] = [];
  const closed: string[] = [];
  const actions: Array<{ positionId: string; action: string; reason: string }> = [];

  for (const position of positions) {
    if (position.status !== 'open') continue;

    const updatedPosition = await updatePositionPrice(position, useCorsProxy);
    updated.push(updatedPosition);

    const exitDecision = await checkExitConditions(updatedPosition, settings, false);

    if (exitDecision.shouldExit && exitDecision.reason) {
      closed.push(updatedPosition.id);

      if (userId) {
        await closeCopiedPosition(
          updatedPosition.id,
          exitDecision.exitPrice || updatedPosition.currentPrice,
          exitDecision.reason
        );
      }

      actions.push({
        positionId: updatedPosition.id,
        action: 'close',
        reason: exitDecision.reason
      });
    } else {
      if (userId && (
        Math.abs(updatedPosition.pnl - position.pnl) > 0.01 ||
        Math.abs(updatedPosition.currentPrice - position.currentPrice) > 0.001
      )) {
        await updateCopiedPosition(updatedPosition.id, {
          current_price: updatedPosition.currentPrice,
          pnl: updatedPosition.pnl,
          pnl_percent: updatedPosition.pnlPercent
        });
      }
    }
  }

  return { updated, closed, actions };
}

export async function detectWhaleExit(
  whaleWallet: string,
  marketId: string,
  side: 'YES' | 'NO'
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('whale_orders')
      .select('*')
      .eq('wallet_address', whaleWallet)
      .eq('market_id', marketId)
      .order('detected_at', { ascending: false })
      .limit(5);

    if (error || !data || data.length === 0) {
      return false;
    }

    const recentOrders = data.filter((order: any) => {
      const orderTime = new Date(order.detected_at).getTime();
      const now = Date.now();
      return (now - orderTime) < 3600000;
    });

    if (recentOrders.length === 0) return false;

    const oppositeSide = side === 'YES' ? 'NO' : 'YES';
    const hasOppositeSideOrder = recentOrders.some((order: any) => order.side === oppositeSide);

    return hasOppositeSideOrder;
  } catch (error) {
    console.error('Error detecting whale exit:', error);
    return false;
  }
}

export function calculatePerformanceAttribution(
  positions: CopiedPosition[]
): {
  byWhale: Map<string, { pnl: number; winRate: number; count: number }>;
  byMarket: Map<string, { pnl: number; winRate: number; count: number }>;
  bySide: Map<'YES' | 'NO', { pnl: number; winRate: number; count: number }>;
  byExitReason: Map<string, { pnl: number; count: number }>;
} {
  const byWhale = new Map<string, { pnl: number; winRate: number; count: number }>();
  const byMarket = new Map<string, { pnl: number; winRate: number; count: number }>();
  const bySide = new Map<'YES' | 'NO', { pnl: number; winRate: number; count: number }>();
  const byExitReason = new Map<string, { pnl: number; count: number }>();

  for (const position of positions) {
    if (position.status !== 'closed') continue;

    const whaleKey = position.whaleWallet;
    if (!byWhale.has(whaleKey)) {
      byWhale.set(whaleKey, { pnl: 0, winRate: 0, count: 0 });
    }
    const whaleStats = byWhale.get(whaleKey)!;
    whaleStats.pnl += position.pnl;
    whaleStats.count += 1;
    if (position.pnl > 0) {
      whaleStats.winRate = ((whaleStats.winRate * (whaleStats.count - 1)) + 1) / whaleStats.count;
    } else {
      whaleStats.winRate = (whaleStats.winRate * (whaleStats.count - 1)) / whaleStats.count;
    }

    const marketKey = position.marketId;
    if (!byMarket.has(marketKey)) {
      byMarket.set(marketKey, { pnl: 0, winRate: 0, count: 0 });
    }
    const marketStats = byMarket.get(marketKey)!;
    marketStats.pnl += position.pnl;
    marketStats.count += 1;
    if (position.pnl > 0) {
      marketStats.winRate = ((marketStats.winRate * (marketStats.count - 1)) + 1) / marketStats.count;
    } else {
      marketStats.winRate = (marketStats.winRate * (marketStats.count - 1)) / marketStats.count;
    }

    const sideKey = position.side;
    if (!bySide.has(sideKey)) {
      bySide.set(sideKey, { pnl: 0, winRate: 0, count: 0 });
    }
    const sideStats = bySide.get(sideKey)!;
    sideStats.pnl += position.pnl;
    sideStats.count += 1;
    if (position.pnl > 0) {
      sideStats.winRate = ((sideStats.winRate * (sideStats.count - 1)) + 1) / sideStats.count;
    } else {
      sideStats.winRate = (sideStats.winRate * (sideStats.count - 1)) / sideStats.count;
    }

    if (position.exitReason) {
      const exitKey = position.exitReason;
      if (!byExitReason.has(exitKey)) {
        byExitReason.set(exitKey, { pnl: 0, count: 0 });
      }
      const exitStats = byExitReason.get(exitKey)!;
      exitStats.pnl += position.pnl;
      exitStats.count += 1;
    }
  }

  return { byWhale, byMarket, bySide, byExitReason };
}

export function checkDailyLossLimit(
  positions: CopiedPosition[],
  dailyLossLimit: number
): {
  limitReached: boolean;
  todayPnL: number;
  todayLoss: number;
} {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayPositions = positions.filter(p => p.entryTime >= today);

  const todayPnL = todayPositions.reduce((sum, p) => sum + p.pnl, 0);
  const todayLoss = todayPnL < 0 ? Math.abs(todayPnL) : 0;

  return {
    limitReached: todayLoss >= dailyLossLimit,
    todayPnL,
    todayLoss
  };
}

export async function bulkClosePositions(
  positionIds: string[],
  exitReason: 'whale_exit' | 'take_profit' | 'stop_loss' | 'timeout' | 'manual',
  userId: string
): Promise<number> {
  let closedCount = 0;

  for (const positionId of positionIds) {
    try {
      const { data: position } = await supabase
        .from('whale_copied_positions')
        .select('current_price')
        .eq('id', positionId)
        .single();

      if (position) {
        await closeCopiedPosition(positionId, position.current_price, exitReason);
        closedCount++;
      }
    } catch (error) {
      console.error(`Error closing position ${positionId}:`, error);
    }
  }

  return closedCount;
}

export interface WhaleOrderStream {
  orderId: string;
  timestamp: Date;
  wallet: string;
  market: string;
  side: 'YES' | 'NO';
  size: number;
  price: number;
}

export function createWhaleOrderStream(
  minOrderSize: number,
  onWhaleDetected: (order: WhaleOrderStream) => void
): { start: () => void; stop: () => void } {
  let intervalId: NodeJS.Timeout | null = null;
  let isRunning = false;

  const start = () => {
    if (isRunning) return;

    isRunning = true;
    intervalId = setInterval(async () => {
    }, 10000);
  };

  const stop = () => {
    if (!isRunning) return;

    isRunning = false;
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };

  return { start, stop };
}

export {
  CopyTradeDecision,
  ExitDecision,
  WhaleOrderStream
};
