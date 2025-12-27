import { fetchMarkets, fetchOrderBook, fetchMarketById } from './polymarket';
import { SnipeOrder } from '../types/snipemaster';
import { supabase } from '../lib/supabase';

const POLYMARKET_FEE_RATE = 0.002;
const MIN_LIQUIDITY_USD = 500;
const MAX_SPREAD_PERCENT = 10;
const ORDER_CHECK_INTERVAL_MS = 5000;

interface OrderBookDepth {
  marketId: string;
  side: 'yes' | 'no';
  bestBid: number;
  bestAsk: number;
  bidDepth: number;
  askDepth: number;
  totalBidVolume: number;
  totalAskVolume: number;
  spread: number;
  spreadPercent: number;
  liquidity: number;
  depthScore: number;
}

interface OptimalSnipePrice {
  marketId: string;
  side: 'yes' | 'no';
  currentPrice: number;
  recommendedPrice: number;
  discount: number;
  expectedFillTime: number;
  confidence: number;
  reasoning: string;
}

interface OrderLadder {
  marketId: string;
  side: 'yes' | 'no';
  totalSize: number;
  orders: Array<{
    price: number;
    size: number;
    discount: number;
  }>;
  avgPrice: number;
  totalDiscount: number;
}

interface FillDetectionResult {
  orderId: string;
  filled: boolean;
  filledAt?: Date;
  fillPrice?: number;
  fillSize?: number;
  partialFill: boolean;
}

export async function analyzeOrderBookDepth(
  marketId: string,
  side: 'yes' | 'no',
  useCorsProxy: boolean = false
): Promise<OrderBookDepth | null> {
  try {
    const orderBook = await fetchOrderBook(marketId, useCorsProxy);

    if (!orderBook || !orderBook.bids || !orderBook.asks) {
      console.error('Invalid order book data');
      return null;
    }

    const bids = orderBook.bids.sort((a, b) => b.price - a.price);
    const asks = orderBook.asks.sort((a, b) => a.price - b.price);

    if (bids.length === 0 || asks.length === 0) {
      return null;
    }

    const bestBid = bids[0].price;
    const bestAsk = asks[0].price;
    const spread = bestAsk - bestBid;
    const midPrice = (bestBid + bestAsk) / 2;
    const spreadPercent = (spread / midPrice) * 100;

    const top10Bids = bids.slice(0, 10);
    const top10Asks = asks.slice(0, 10);

    const totalBidVolume = top10Bids.reduce((sum, bid) => sum + bid.size, 0);
    const totalAskVolume = top10Asks.reduce((sum, ask) => sum + ask.size, 0);

    const bidDepth = top10Bids.length;
    const askDepth = top10Asks.length;

    const avgBidSize = totalBidVolume / Math.max(bidDepth, 1);
    const avgAskSize = totalAskVolume / Math.max(askDepth, 1);

    const liquidity = (totalBidVolume + totalAskVolume) * midPrice;

    let depthScore = 0;
    if (liquidity >= 5000) depthScore += 3;
    else if (liquidity >= 2000) depthScore += 2;
    else if (liquidity >= 1000) depthScore += 1;

    if (spreadPercent < 2) depthScore += 2;
    else if (spreadPercent < 5) depthScore += 1;

    if (bidDepth >= 8 && askDepth >= 8) depthScore += 2;
    else if (bidDepth >= 5 && askDepth >= 5) depthScore += 1;

    depthScore = Math.min(depthScore, 10);

    return {
      marketId,
      side,
      bestBid,
      bestAsk,
      bidDepth,
      askDepth,
      totalBidVolume,
      totalAskVolume,
      spread,
      spreadPercent,
      liquidity,
      depthScore
    };
  } catch (error) {
    console.error('Error analyzing order book depth:', error);
    return null;
  }
}

export function calculateOptimalSnipePrice(
  currentPrice: number,
  targetDiscountPercent: number,
  orderBookDepth: OrderBookDepth,
  minProfitPercent: number = 5
): OptimalSnipePrice {
  const { bestBid, bestAsk, spreadPercent, depthScore, liquidity, side } = orderBookDepth;

  let baseDiscount = targetDiscountPercent;

  if (spreadPercent > 5) {
    baseDiscount += 1;
  }

  if (depthScore < 4) {
    baseDiscount += 1.5;
  }

  if (liquidity < 1000) {
    baseDiscount += 1;
  }

  const maxDiscount = Math.min(baseDiscount + 3, 15);
  const minDiscount = Math.max(baseDiscount - 1, 1);

  let recommendedDiscount = baseDiscount;

  if (currentPrice > 0.70) {
    recommendedDiscount += 0.5;
  } else if (currentPrice < 0.30) {
    recommendedDiscount -= 0.5;
  }

  recommendedDiscount = Math.max(minDiscount, Math.min(maxDiscount, recommendedDiscount));

  const recommendedPrice = currentPrice * (1 - recommendedDiscount / 100);

  const finalPrice = Math.max(0.01, Math.min(0.99, recommendedPrice));

  let expectedFillTime = 30;
  if (recommendedDiscount < 3) {
    expectedFillTime = 15;
  } else if (recommendedDiscount > 6) {
    expectedFillTime = 60;
  }

  if (depthScore >= 7) {
    expectedFillTime *= 0.7;
  } else if (depthScore < 4) {
    expectedFillTime *= 1.5;
  }

  let confidence = 50;
  if (depthScore >= 7 && spreadPercent < 3 && liquidity >= 2000) {
    confidence = 85;
  } else if (depthScore >= 5 && spreadPercent < 5 && liquidity >= 1000) {
    confidence = 70;
  } else if (depthScore < 3 || spreadPercent > 8 || liquidity < 500) {
    confidence = 30;
  }

  const reasoning = `Depth Score: ${depthScore}/10, Spread: ${spreadPercent.toFixed(2)}%, ` +
    `Liquidity: $${liquidity.toFixed(0)}, Discount: ${recommendedDiscount.toFixed(1)}%`;

  return {
    marketId: orderBookDepth.marketId,
    side,
    currentPrice,
    recommendedPrice: finalPrice,
    discount: recommendedDiscount,
    expectedFillTime,
    confidence,
    reasoning
  };
}

export function createOrderLadder(
  totalSize: number,
  optimalPrice: OptimalSnipePrice,
  numberOfOrders: number = 3,
  priceRangePercent: number = 2
): OrderLadder {
  const orders: Array<{ price: number; size: number; discount: number }> = [];

  const baseSizePercents = [0.5, 0.3, 0.2];

  const actualOrders = Math.min(numberOfOrders, 3);

  for (let i = 0; i < actualOrders; i++) {
    const sizePercent = baseSizePercents[i] || (1 / actualOrders);
    const orderSize = totalSize * sizePercent;

    const priceOffset = (i / Math.max(actualOrders - 1, 1)) * priceRangePercent;
    const orderPrice = optimalPrice.recommendedPrice * (1 - priceOffset / 100);

    const finalPrice = Math.max(0.01, Math.min(0.99, orderPrice));

    const discount = ((optimalPrice.currentPrice - finalPrice) / optimalPrice.currentPrice) * 100;

    orders.push({
      price: finalPrice,
      size: orderSize,
      discount
    });
  }

  const totalSizeCheck = orders.reduce((sum, o) => sum + o.size, 0);
  if (Math.abs(totalSizeCheck - totalSize) > 0.01) {
    const diff = totalSize - totalSizeCheck;
    orders[0].size += diff;
  }

  const avgPrice = orders.reduce((sum, o) => sum * o.size, 0) / totalSize;
  const totalDiscount = ((optimalPrice.currentPrice - avgPrice) / optimalPrice.currentPrice) * 100;

  return {
    marketId: optimalPrice.marketId,
    side: optimalPrice.side,
    totalSize,
    orders,
    avgPrice,
    totalDiscount
  };
}

export async function detectOrderFills(
  orders: SnipeOrder[],
  useCorsProxy: boolean = false
): Promise<FillDetectionResult[]> {
  const results: FillDetectionResult[] = [];

  for (const order of orders) {
    if (order.status !== 'pending') {
      continue;
    }

    try {
      const market = await fetchMarketById(order.marketId);

      if (!market) {
        results.push({
          orderId: order.id,
          filled: false,
          partialFill: false
        });
        continue;
      }

      const outcomePrices = market.outcomePrices || [];
      if (outcomePrices.length < 2) {
        results.push({
          orderId: order.id,
          filled: false,
          partialFill: false
        });
        continue;
      }

      const currentYesPrice = parseFloat(outcomePrices[0]);
      const currentNoPrice = parseFloat(outcomePrices[1]);

      if (isNaN(currentYesPrice) || isNaN(currentNoPrice)) {
        results.push({
          orderId: order.id,
          filled: false,
          partialFill: false
        });
        continue;
      }

      let filled = false;

      if (order.side === 'yes') {
        filled = currentYesPrice <= order.limitPrice * 1.005;
      } else {
        filled = currentNoPrice <= order.limitPrice * 1.005;
      }

      if (filled) {
        results.push({
          orderId: order.id,
          filled: true,
          filledAt: new Date(),
          fillPrice: order.side === 'yes' ? currentYesPrice : currentNoPrice,
          fillSize: order.size,
          partialFill: false
        });
      } else {
        results.push({
          orderId: order.id,
          filled: false,
          partialFill: false
        });
      }
    } catch (error) {
      console.error(`Error detecting fill for order ${order.id}:`, error);
      results.push({
        orderId: order.id,
        filled: false,
        partialFill: false
      });
    }
  }

  return results;
}

export function shouldCancelOrder(
  order: SnipeOrder,
  timeoutMinutes: number
): { shouldCancel: boolean; reason: string } {
  const now = Date.now();
  const orderAge = now - new Date(order.createdAt).getTime();
  const timeoutMs = timeoutMinutes * 60 * 1000;

  if (orderAge >= timeoutMs) {
    return {
      shouldCancel: true,
      reason: `Order expired after ${timeoutMinutes} minutes`
    };
  }

  return {
    shouldCancel: false,
    reason: ''
  };
}

export async function autoManageOrders(
  orders: SnipeOrder[],
  settings: {
    timeoutMinutes: number;
    resubmitAfterCancel: boolean;
    maxResubmits: number;
    targetDiscount: number;
    minProfitPercent: number;
  },
  useCorsProxy: boolean = false
): Promise<{
  toCancel: string[];
  toResubmit: Array<{ marketId: string; side: 'yes' | 'no'; size: number }>;
  filled: FillDetectionResult[];
}> {
  const toCancel: string[] = [];
  const toResubmit: Array<{ marketId: string; side: 'yes' | 'no'; size: number }> = [];

  const pendingOrders = orders.filter(o => o.status === 'pending');

  for (const order of pendingOrders) {
    const cancelCheck = shouldCancelOrder(order, settings.timeoutMinutes);

    if (cancelCheck.shouldCancel) {
      toCancel.push(order.id);

      if (settings.resubmitAfterCancel) {
        const resubmitCount = (order as any).resubmitCount || 0;

        if (resubmitCount < settings.maxResubmits) {
          toResubmit.push({
            marketId: order.marketId,
            side: order.side,
            size: order.size
          });
        }
      }
    }
  }

  const fillResults = await detectOrderFills(pendingOrders, useCorsProxy);
  const filled = fillResults.filter(r => r.filled);

  return {
    toCancel,
    toResubmit,
    filled
  };
}

export async function scanForSnipeOpportunities(
  settings: {
    minProfitPercent: number;
    targetDiscount: number;
    maxPositionSize: number;
    maxConcurrentOrders: number;
  },
  currentOrderCount: number,
  useCorsProxy: boolean = false
): Promise<Array<{
  market: any;
  optimalPrice: OptimalSnipePrice;
  orderBookDepth: OrderBookDepth;
  confidence: number;
}>> {
  try {
    const markets = await fetchMarkets(50, useCorsProxy);
    const opportunities: Array<{
      market: any;
      optimalPrice: OptimalSnipePrice;
      orderBookDepth: OrderBookDepth;
      confidence: number;
    }> = [];

    if (currentOrderCount >= settings.maxConcurrentOrders) {
      return opportunities;
    }

    for (const market of markets) {
      if (!market.outcomePrices || market.outcomePrices.length < 2) continue;

      const yesPrice = parseFloat(market.outcomePrices[0]);
      const noPrice = parseFloat(market.outcomePrices[1]);

      if (isNaN(yesPrice) || isNaN(noPrice)) continue;

      if ((market.liquidity || 0) < MIN_LIQUIDITY_USD) continue;

      const spread = Math.abs(yesPrice + noPrice - 1.0);
      const spreadPercent = (spread / ((yesPrice + noPrice) / 2)) * 100;

      if (spreadPercent > MAX_SPREAD_PERCENT) continue;

      for (const side of ['yes', 'no'] as const) {
        const currentPrice = side === 'yes' ? yesPrice : noPrice;

        const orderBookDepth = await analyzeOrderBookDepth(market.id, side, useCorsProxy);

        if (!orderBookDepth) continue;

        if (orderBookDepth.depthScore < 3) continue;

        if (orderBookDepth.liquidity < MIN_LIQUIDITY_USD) continue;

        const optimalPrice = calculateOptimalSnipePrice(
          currentPrice,
          settings.targetDiscount,
          orderBookDepth,
          settings.minProfitPercent
        );

        if (optimalPrice.confidence < 40) continue;

        const potentialProfit = ((currentPrice - optimalPrice.recommendedPrice) / optimalPrice.recommendedPrice) * 100;

        if (potentialProfit < settings.minProfitPercent) continue;

        opportunities.push({
          market,
          optimalPrice,
          orderBookDepth,
          confidence: optimalPrice.confidence
        });
      }
    }

    return opportunities.sort((a, b) => b.confidence - a.confidence).slice(0, 10);
  } catch (error) {
    console.error('Error scanning for snipe opportunities:', error);
    return [];
  }
}

export async function storeOrderInDatabase(
  order: Omit<SnipeOrder, 'id'>,
  userId: string
): Promise<string | null> {
  try {
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
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString()
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error storing order:', error);
      return null;
    }

    return data.id;
  } catch (error) {
    console.error('Error in storeOrderInDatabase:', error);
    return null;
  }
}

export async function updateOrderStatus(
  orderId: string,
  status: 'pending' | 'filled' | 'cancelled' | 'expired',
  fillData?: { fillPrice: number; fillSize: number; filledAt: Date }
): Promise<boolean> {
  try {
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    };

    if (fillData) {
      updateData.fill_price = fillData.fillPrice;
      updateData.filled_at = fillData.filledAt.toISOString();
    }

    const { error } = await supabase
      .from('snipe_orders')
      .update(updateData)
      .eq('id', orderId);

    if (error) {
      console.error('Error updating order status:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in updateOrderStatus:', error);
    return false;
  }
}

export async function createPositionFromFilledOrder(
  order: SnipeOrder,
  fillPrice: number,
  userId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('snipe_positions')
      .insert({
        user_id: userId,
        order_id: order.id,
        market_id: order.marketId,
        market_title: order.marketTitle,
        side: order.side.toUpperCase(),
        entry_price: fillPrice,
        current_price: fillPrice,
        size: order.size,
        pnl: 0,
        pnl_percent: 0
      });

    if (error) {
      console.error('Error creating position:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in createPositionFromFilledOrder:', error);
    return false;
  }
}

export {
  OrderBookDepth,
  OptimalSnipePrice,
  OrderLadder,
  FillDetectionResult
};
