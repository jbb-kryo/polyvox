import { PolymarketMarket, OrderBook } from '../types';
import { ArbitrageOpportunity } from '../types/arbitrage';
import { fetchMarkets, fetchOrderBook, fetchMarketById } from './polymarket';
import { polymarketRateLimiter, RequestPriority } from './apiRateLimiter';

const POLYMARKET_FEE_RATE = 0.002;
const MIN_LIQUIDITY_USD = 100;
const MAX_SLIPPAGE_PERCENT = 2;
const MIN_EXECUTION_PROBABILITY = 0.7;

interface OrderBookDepth {
  totalBidLiquidity: number;
  totalAskLiquidity: number;
  avgBidPrice: number;
  avgAskPrice: number;
  bidDepth: number[];
  askDepth: number[];
}

interface ArbitrageCalculation {
  grossProfit: number;
  fees: number;
  slippage: number;
  netProfit: number;
  profitPercent: number;
  executionProbability: number;
  optimalSize: number;
}

export interface RealTimeArbitrageOpportunity extends ArbitrageOpportunity {
  orderBooks: {
    market1: OrderBook;
    market2: OrderBook;
  };
  liquidity: {
    market1: OrderBookDepth;
    market2: OrderBookDepth;
  };
  calculation: ArbitrageCalculation;
  confidence: number;
  recommendedAction: 'execute' | 'wait' | 'skip';
  risks: string[];
}

function analyzeOrderBook(orderBook: OrderBook, positionSize: number): OrderBookDepth {
  const bids = orderBook.bids.sort((a, b) => b.price - a.price);
  const asks = orderBook.asks.sort((a, b) => a.price - b.price);

  let totalBidLiquidity = 0;
  let weightedBidSum = 0;
  const bidDepth: number[] = [];

  for (const bid of bids) {
    const volume = bid.price * bid.size;
    totalBidLiquidity += volume;
    weightedBidSum += bid.price * volume;
    bidDepth.push(totalBidLiquidity);

    if (totalBidLiquidity >= positionSize * 2) break;
  }

  let totalAskLiquidity = 0;
  let weightedAskSum = 0;
  const askDepth: number[] = [];

  for (const ask of asks) {
    const volume = ask.price * ask.size;
    totalAskLiquidity += volume;
    weightedAskSum += ask.price * volume;
    askDepth.push(totalAskLiquidity);

    if (totalAskLiquidity >= positionSize * 2) break;
  }

  const avgBidPrice = totalBidLiquidity > 0 ? weightedBidSum / totalBidLiquidity : 0;
  const avgAskPrice = totalAskLiquidity > 0 ? weightedAskSum / totalAskLiquidity : 0;

  return {
    totalBidLiquidity,
    totalAskLiquidity,
    avgBidPrice,
    avgAskPrice,
    bidDepth,
    askDepth
  };
}

function estimateSlippage(
  orderBook: OrderBook,
  side: 'buy' | 'sell',
  positionSize: number
): number {
  const orders = side === 'buy'
    ? orderBook.asks.sort((a, b) => a.price - b.price)
    : orderBook.bids.sort((a, b) => b.price - a.price);

  if (orders.length === 0) return 0;

  let remainingSize = positionSize;
  let totalCost = 0;
  let totalShares = 0;

  for (const order of orders) {
    if (remainingSize <= 0) break;

    const sharesToTake = Math.min(remainingSize / order.price, order.size);
    const cost = sharesToTake * order.price;

    totalCost += cost;
    totalShares += sharesToTake;
    remainingSize -= cost;
  }

  if (totalShares === 0) return 0;

  const avgExecutionPrice = totalCost / totalShares;
  const bestPrice = orders[0].price;
  const slippagePercent = Math.abs((avgExecutionPrice - bestPrice) / bestPrice) * 100;

  return slippagePercent;
}

function calculateExecutionProbability(
  depth: OrderBookDepth,
  positionSize: number,
  slippage: number
): number {
  let probability = 1.0;

  if (depth.totalAskLiquidity < positionSize) {
    probability *= depth.totalAskLiquidity / positionSize;
  }

  if (slippage > 0.5) {
    probability *= 1 - (slippage / MAX_SLIPPAGE_PERCENT);
  }

  if (depth.totalAskLiquidity < MIN_LIQUIDITY_USD) {
    probability *= depth.totalAskLiquidity / MIN_LIQUIDITY_USD;
  }

  return Math.max(0, Math.min(1, probability));
}

function calculateArbitrage(
  price1: number,
  price2: number,
  orderBook1: OrderBook,
  orderBook2: OrderBook,
  positionSize: number
): ArbitrageCalculation {
  const depth1 = analyzeOrderBook(orderBook1, positionSize);
  const depth2 = analyzeOrderBook(orderBook2, positionSize);

  const slippage1 = estimateSlippage(orderBook1, 'buy', positionSize);
  const slippage2 = estimateSlippage(orderBook2, 'buy', positionSize);

  const adjustedPrice1 = price1 * (1 + slippage1 / 100);
  const adjustedPrice2 = price2 * (1 + slippage2 / 100);

  const totalCost = adjustedPrice1 + adjustedPrice2;
  const fees = positionSize * POLYMARKET_FEE_RATE * 2;
  const grossProfit = positionSize - (totalCost * positionSize);
  const slippageCost = ((adjustedPrice1 - price1) + (adjustedPrice2 - price2)) * positionSize;
  const netProfit = grossProfit - fees - slippageCost;
  const profitPercent = (netProfit / positionSize) * 100;

  const executionProb1 = calculateExecutionProbability(depth1, positionSize, slippage1);
  const executionProb2 = calculateExecutionProbability(depth2, positionSize, slippage2);
  const executionProbability = executionProb1 * executionProb2;

  const maxSafeSize1 = Math.min(
    depth1.totalAskLiquidity * 0.5,
    depth2.totalAskLiquidity * 0.5
  );
  const optimalSize = Math.min(positionSize, maxSafeSize1);

  return {
    grossProfit,
    fees,
    slippage: slippageCost,
    netProfit,
    profitPercent,
    executionProbability,
    optimalSize
  };
}

function assessRisks(
  calc: ArbitrageCalculation,
  depth1: OrderBookDepth,
  depth2: OrderBookDepth,
  market1: PolymarketMarket,
  market2: PolymarketMarket
): string[] {
  const risks: string[] = [];

  if (calc.executionProbability < 0.8) {
    risks.push(`Low execution probability: ${(calc.executionProbability * 100).toFixed(0)}%`);
  }

  if (depth1.totalAskLiquidity < MIN_LIQUIDITY_USD) {
    risks.push(`Low liquidity in market 1: $${depth1.totalAskLiquidity.toFixed(0)}`);
  }

  if (depth2.totalAskLiquidity < MIN_LIQUIDITY_USD) {
    risks.push(`Low liquidity in market 2: $${depth2.totalAskLiquidity.toFixed(0)}`);
  }

  const slippage1 = estimateSlippage({ bids: [], asks: [{ price: market1.bestAsk, size: 1000 }], timestamp: 0 }, 'buy', calc.optimalSize);
  const slippage2 = estimateSlippage({ bids: [], asks: [{ price: market2.bestAsk, size: 1000 }], timestamp: 0 }, 'buy', calc.optimalSize);

  if (slippage1 > 1.0) {
    risks.push(`High slippage risk in market 1: ${slippage1.toFixed(2)}%`);
  }

  if (slippage2 > 1.0) {
    risks.push(`High slippage risk in market 2: ${slippage2.toFixed(2)}%`);
  }

  if (market1.volume < 1000 || market2.volume < 1000) {
    risks.push('Low market volume - prices may be stale');
  }

  if (calc.netProfit < 0.5) {
    risks.push('Net profit below $0.50 - may not cover gas costs');
  }

  const timeDiff = Math.abs(market1.endDate ? new Date(market1.endDate).getTime() - Date.now() : Infinity);
  if (timeDiff < 24 * 60 * 60 * 1000) {
    risks.push('Market closing within 24 hours');
  }

  return risks;
}

export async function scanForRealArbitrage(
  minSpreadPercent: number,
  positionSize: number,
  useCorsProxy: boolean
): Promise<RealTimeArbitrageOpportunity[]> {
  try {
    console.log(`Scanning for real arbitrage opportunities...`);

    const markets = await fetchMarkets(100, useCorsProxy);

    if (markets.length === 0) {
      return [];
    }

    const opportunities: RealTimeArbitrageOpportunity[] = [];
    const checkedPairs = new Set<string>();

    for (let i = 0; i < markets.length; i++) {
      const market1 = markets[i];

      if (market1.liquidity < MIN_LIQUIDITY_USD) continue;
      if (!market1.active) continue;

      const orderBook1 = await fetchOrderBook(market1.id, useCorsProxy);
      if (!orderBook1 || orderBook1.asks.length === 0 || orderBook1.bids.length === 0) {
        continue;
      }

      const yesAsk = market1.bestAsk;
      const yesBid = market1.bestBid;
      const noAsk = 1 - yesBid;
      const noBid = 1 - yesAsk;

      if (yesAsk > 0 && noAsk > 0 && yesAsk < 1 && noAsk < 1) {
        const pairKey = `${market1.id}-internal`;

        if (!checkedPairs.has(pairKey)) {
          checkedPairs.add(pairKey);

          const internalOrderBook: OrderBook = {
            bids: [{ price: noBid, size: 1000 }],
            asks: [{ price: noAsk, size: 1000 }],
            timestamp: Date.now()
          };

          const calc = calculateArbitrage(
            yesAsk,
            noAsk,
            orderBook1,
            internalOrderBook,
            positionSize
          );

          if (calc.profitPercent >= minSpreadPercent && calc.executionProbability >= MIN_EXECUTION_PROBABILITY) {
            const depth1 = analyzeOrderBook(orderBook1, positionSize);
            const depth2 = analyzeOrderBook(internalOrderBook, positionSize);
            const risks = assessRisks(calc, depth1, depth2, market1, market1);

            const confidence = calc.executionProbability * (1 - (risks.length * 0.1));
            const recommendedAction =
              confidence > 0.8 && risks.length <= 1 ? 'execute' :
              confidence > 0.6 && risks.length <= 2 ? 'wait' : 'skip';

            opportunities.push({
              id: `${market1.id}-internal-${Date.now()}-${Math.random()}`,
              marketPair: {
                market1: {
                  id: market1.id,
                  question: `${market1.question} (YES)`,
                  price: yesAsk
                },
                market2: {
                  id: market1.id,
                  question: `${market1.question} (NO)`,
                  price: noAsk
                }
              },
              combinedProbability: yesAsk + noAsk,
              profitPercent: calc.profitPercent,
              timestamp: Date.now(),
              orderBooks: {
                market1: orderBook1,
                market2: internalOrderBook
              },
              liquidity: {
                market1: depth1,
                market2: depth2
              },
              calculation: calc,
              confidence,
              recommendedAction,
              risks
            });
          }
        }
      }

      for (let j = i + 1; j < Math.min(i + 20, markets.length); j++) {
        const market2 = markets[j];

        if (market2.liquidity < MIN_LIQUIDITY_USD) continue;
        if (!market2.active) continue;
        if (market1.category !== market2.category) continue;

        const pairKey = `${market1.id}-${market2.id}`;
        if (checkedPairs.has(pairKey)) continue;

        checkedPairs.add(pairKey);

        const q1 = market1.question.toLowerCase();
        const q2 = market2.question.toLowerCase();

        const words1 = q1.split(/\s+/).filter(w => w.length > 4);
        const words2 = q2.split(/\s+/).filter(w => w.length > 4);
        const commonWords = words1.filter(word => words2.includes(word));

        if (commonWords.length < 2) continue;

        const orderBook2 = await fetchOrderBook(market2.id, useCorsProxy);
        if (!orderBook2 || orderBook2.asks.length === 0 || orderBook2.bids.length === 0) {
          continue;
        }

        const price1 = market1.bestAsk;
        const price2 = market2.bestAsk;

        if (price1 <= 0 || price2 <= 0 || price1 > 1 || price2 > 1) continue;

        const calc = calculateArbitrage(
          price1,
          price2,
          orderBook1,
          orderBook2,
          positionSize
        );

        if (calc.profitPercent >= minSpreadPercent && calc.executionProbability >= MIN_EXECUTION_PROBABILITY) {
          const depth1 = analyzeOrderBook(orderBook1, positionSize);
          const depth2 = analyzeOrderBook(orderBook2, positionSize);
          const risks = assessRisks(calc, depth1, depth2, market1, market2);

          const confidence = calc.executionProbability * (1 - (risks.length * 0.1));
          const recommendedAction =
            confidence > 0.8 && risks.length <= 1 ? 'execute' :
            confidence > 0.6 && risks.length <= 2 ? 'wait' : 'skip';

          opportunities.push({
            id: `${market1.id}-${market2.id}-${Date.now()}-${Math.random()}`,
            marketPair: {
              market1: {
                id: market1.id,
                question: market1.question,
                price: price1
              },
              market2: {
                id: market2.id,
                question: market2.question,
                price: price2
              }
            },
            combinedProbability: price1 + price2,
            profitPercent: calc.profitPercent,
            timestamp: Date.now(),
            orderBooks: {
              market1: orderBook1,
              market2: orderBook2
            },
            liquidity: {
              market1: depth1,
              market2: depth2
            },
            calculation: calc,
            confidence,
            recommendedAction,
            risks
          });
        }
      }

      await new Promise(resolve => setTimeout(resolve, 50));
    }

    opportunities.sort((a, b) => {
      const scoreA = a.calculation.netProfit * a.confidence;
      const scoreB = b.calculation.netProfit * b.confidence;
      return scoreB - scoreA;
    });

    console.log(`Found ${opportunities.length} real arbitrage opportunities`);

    return opportunities.slice(0, 20);
  } catch (error) {
    console.error('Error scanning for real arbitrage:', error);
    throw error;
  }
}

export async function monitorPositionForAutoClose(
  marketId1: string,
  marketId2: string,
  entryPrices: { market1: number; market2: number },
  positionSize: number,
  targetProfitPercent: number
): Promise<{
  shouldClose: boolean;
  reason: string;
  currentProfit: number;
  currentProfitPercent: number;
}> {
  try {
    const [orderBook1, orderBook2] = await Promise.all([
      fetchOrderBook(marketId1),
      fetchOrderBook(marketId2)
    ]);

    if (!orderBook1 || !orderBook2) {
      return {
        shouldClose: false,
        reason: 'Unable to fetch order books',
        currentProfit: 0,
        currentProfitPercent: 0
      };
    }

    const currentBid1 = orderBook1.bids[0]?.price || 0;
    const currentBid2 = orderBook2.bids[0]?.price || 0;

    const entryTotal = entryPrices.market1 + entryPrices.market2;
    const currentTotal = currentBid1 + currentBid2;

    const entryValue = positionSize;
    const exitValue = (currentBid1 + currentBid2) * positionSize;

    const grossProfit = exitValue - entryValue;
    const fees = positionSize * POLYMARKET_FEE_RATE * 2;

    const slippage1 = estimateSlippage(orderBook1, 'sell', positionSize);
    const slippage2 = estimateSlippage(orderBook2, 'sell', positionSize);
    const slippageCost = ((slippage1 + slippage2) / 100) * positionSize;

    const currentProfit = grossProfit - fees - slippageCost;
    const currentProfitPercent = (currentProfit / positionSize) * 100;

    if (currentProfitPercent >= targetProfitPercent * 0.9) {
      return {
        shouldClose: true,
        reason: `Target profit reached: ${currentProfitPercent.toFixed(2)}% (target: ${targetProfitPercent}%)`,
        currentProfit,
        currentProfitPercent
      };
    }

    if (currentTotal < 1.0 && currentProfitPercent > 0) {
      return {
        shouldClose: true,
        reason: 'Arbitrage converging, lock in profit',
        currentProfit,
        currentProfitPercent
      };
    }

    const depth1 = analyzeOrderBook(orderBook1, positionSize);
    const depth2 = analyzeOrderBook(orderBook2, positionSize);

    if (depth1.totalBidLiquidity < positionSize * 0.5 || depth2.totalBidLiquidity < positionSize * 0.5) {
      if (currentProfitPercent > 0) {
        return {
          shouldClose: true,
          reason: 'Liquidity drying up, close position',
          currentProfit,
          currentProfitPercent
        };
      }
    }

    if (currentProfitPercent < -10) {
      return {
        shouldClose: true,
        reason: 'Stop loss triggered: -10%',
        currentProfit,
        currentProfitPercent
      };
    }

    return {
      shouldClose: false,
      reason: 'Position still optimal',
      currentProfit,
      currentProfitPercent
    };
  } catch (error) {
    console.error('Error monitoring position:', error);
    return {
      shouldClose: false,
      reason: 'Error checking position',
      currentProfit: 0,
      currentProfitPercent: 0
    };
  }
}

export function calculatePositionPnL(
  entryPrices: { market1: number; market2: number },
  currentPrices: { market1: number; market2: number },
  positionSize: number
): { pnl: number; percent: number } {
  const entryTotal = entryPrices.market1 + entryPrices.market2;
  const currentTotal = currentPrices.market1 + currentPrices.market2;

  const theoreticalProfit = (1.0 - entryTotal) * positionSize;
  const currentValue = currentTotal * positionSize;
  const fees = positionSize * POLYMARKET_FEE_RATE * 2;

  const pnl = currentValue - positionSize - fees;
  const percent = (pnl / positionSize) * 100;

  return { pnl, percent };
}

export async function scanForArbitrage(
  minSpreadPercent: number,
  useCorsProxy: boolean
): Promise<ArbitrageOpportunity[]> {
  return scanForRealArbitrage(minSpreadPercent, 10, useCorsProxy);
}
