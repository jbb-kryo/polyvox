import { MomentumOpportunity, MarketMomentumData, PriceHistoryPoint, TrendPosition, MarketFilters } from '../types/trendrider';
import { fetchMarkets, fetchMarketById } from './polymarket';
import { supabase } from '../lib/supabase';

const POLYMARKET_FEE_RATE = 0.002;
const MIN_VOLUME_FOR_RELIABLE_TREND = 1000;
const TREND_CONFIRMATION_THRESHOLD = 3;

interface TrendIndicators {
  sma20: number;
  sma50: number;
  ema12: number;
  ema26: number;
  rsi: number;
  macd: number;
  macdSignal: number;
  volumeTrend: 'increasing' | 'decreasing' | 'stable';
  trendStrength: number;
  confirmed: boolean;
}

async function storePriceSnapshot(
  marketId: string,
  price: number,
  volume: number
): Promise<void> {
  try {
    const { data: authData } = await supabase.auth.getUser();

    await supabase.from('market_price_history').insert({
      market_id: marketId,
      price,
      volume: volume || 0,
      timestamp: new Date().toISOString(),
      user_id: authData.user?.id || null
    });
  } catch (error) {
    console.error('Error storing price snapshot:', error);
  }
}

async function fetchPriceHistory(
  marketId: string,
  windowMinutes: number
): Promise<PriceHistoryPoint[]> {
  try {
    const cutoffTime = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('market_price_history')
      .select('timestamp, price, volume')
      .eq('market_id', marketId)
      .gte('timestamp', cutoffTime)
      .order('timestamp', { ascending: true });

    if (error) {
      console.error('Error fetching price history:', error);
      return [];
    }

    return (data || []).map(d => ({
      timestamp: new Date(d.timestamp).getTime(),
      price: parseFloat(d.price.toString()),
      volume: parseFloat(d.volume?.toString() || '0')
    }));
  } catch (error) {
    console.error('Error in fetchPriceHistory:', error);
    return [];
  }
}

function calculateSMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1] || 0;

  const recentPrices = prices.slice(-period);
  const sum = recentPrices.reduce((acc, p) => acc + p, 0);
  return sum / period;
}

function calculateEMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1] || 0;

  const multiplier = 2 / (period + 1);
  let ema = calculateSMA(prices.slice(0, period), period);

  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema;
  }

  return ema;
}

function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) return 50;

  let gains = 0;
  let losses = 0;

  for (let i = prices.length - period; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) {
      gains += change;
    } else {
      losses += Math.abs(change);
    }
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;

  if (avgLoss === 0) return 100;

  const rs = avgGain / avgLoss;
  const rsi = 100 - (100 / (1 + rs));

  return rsi;
}

function calculateMACD(prices: number[]): { macd: number; signal: number; histogram: number } {
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  const macd = ema12 - ema26;

  const macdHistory: number[] = [];
  for (let i = 26; i <= prices.length; i++) {
    const slice = prices.slice(0, i);
    const e12 = calculateEMA(slice, 12);
    const e26 = calculateEMA(slice, 26);
    macdHistory.push(e12 - e26);
  }

  const signal = calculateEMA(macdHistory, 9);
  const histogram = macd - signal;

  return { macd, signal, histogram };
}

function analyzeVolumeTrend(history: PriceHistoryPoint[]): 'increasing' | 'decreasing' | 'stable' {
  if (history.length < 10) return 'stable';

  const recentVolume = history.slice(-5).reduce((sum, p) => sum + (p.volume || 0), 0) / 5;
  const olderVolume = history.slice(-10, -5).reduce((sum, p) => sum + (p.volume || 0), 0) / 5;

  if (recentVolume > olderVolume * 1.2) return 'increasing';
  if (recentVolume < olderVolume * 0.8) return 'decreasing';
  return 'stable';
}

function calculateTrendIndicators(history: PriceHistoryPoint[]): TrendIndicators {
  if (history.length < 2) {
    const currentPrice = history[history.length - 1]?.price || 0;
    return {
      sma20: currentPrice,
      sma50: currentPrice,
      ema12: currentPrice,
      ema26: currentPrice,
      rsi: 50,
      macd: 0,
      macdSignal: 0,
      volumeTrend: 'stable',
      trendStrength: 0,
      confirmed: false
    };
  }

  const prices = history.map(h => h.price);
  const currentPrice = prices[prices.length - 1];

  const sma20 = calculateSMA(prices, 20);
  const sma50 = calculateSMA(prices, 50);
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  const rsi = calculateRSI(prices);
  const { macd, signal } = calculateMACD(prices);
  const volumeTrend = analyzeVolumeTrend(history);

  let confirmationScore = 0;

  if (currentPrice > sma20 && sma20 > sma50) confirmationScore += 2;
  if (currentPrice < sma20 && sma20 < sma50) confirmationScore += 2;

  if (macd > signal) confirmationScore += 1;
  if (macd < signal) confirmationScore += 1;

  if ((currentPrice > sma20 && rsi > 50) || (currentPrice < sma20 && rsi < 50)) {
    confirmationScore += 1;
  }

  if (volumeTrend === 'increasing') confirmationScore += 1;

  const trendStrength = Math.abs(currentPrice - sma20) / sma20 * 100;
  const confirmed = confirmationScore >= TREND_CONFIRMATION_THRESHOLD;

  return {
    sma20,
    sma50,
    ema12,
    ema26,
    rsi,
    macd,
    macdSignal: signal,
    volumeTrend,
    trendStrength,
    confirmed
  };
}

function calculateVolumeWeightedMomentum(history: PriceHistoryPoint[]): number {
  if (history.length < 2) return 0;

  const recent = history[history.length - 1];
  const previous = history[0];

  const priceChange = recent.price - previous.price;
  const priceChangePercent = (priceChange / previous.price) * 100;

  let totalVolume = 0;
  let weightedPriceChange = 0;

  for (let i = 1; i < history.length; i++) {
    const vol = history[i].volume || 1;
    const change = history[i].price - history[i - 1].price;

    totalVolume += vol;
    weightedPriceChange += change * vol;
  }

  if (totalVolume === 0) return priceChangePercent;

  const volumeWeightedChange = (weightedPriceChange / totalVolume);
  const adjustedMomentum = (volumeWeightedChange / previous.price) * 100;

  return adjustedMomentum;
}

function calculateDynamicPositionSize(
  baseSize: number,
  trendStrength: number,
  indicators: TrendIndicators,
  totalCapital: number
): number {
  let multiplier = 1.0;

  if (indicators.confirmed) {
    multiplier += 0.3;
  }

  if (trendStrength > 10) {
    multiplier += 0.2;
  } else if (trendStrength > 5) {
    multiplier += 0.1;
  }

  if (indicators.volumeTrend === 'increasing') {
    multiplier += 0.1;
  }

  if ((indicators.rsi > 70) || (indicators.rsi < 30)) {
    multiplier -= 0.2;
  }

  multiplier = Math.max(0.5, Math.min(2.0, multiplier));

  const adjustedSize = baseSize * multiplier;
  const maxSize = totalCapital * 0.1;

  return Math.min(adjustedSize, maxSize);
}

export async function scanForMomentum(
  minMomentumPercent: number,
  windowMinutes: number,
  useCorsProxy: boolean,
  marketFilters?: MarketFilters
): Promise<MomentumOpportunity[]> {
  const opportunities: MomentumOpportunity[] = [];

  try {
    const markets = await fetchMarkets(100, useCorsProxy);

    for (const market of markets) {
      if (!market.outcomePrices || market.outcomePrices.length < 2) continue;

      const yesPrice = parseFloat(market.outcomePrices[0]);
      const noPrice = parseFloat(market.outcomePrices[1]);
      if (isNaN(yesPrice) || isNaN(noPrice)) continue;

      if (marketFilters) {
        if (marketFilters.minVolume > 0 && market.volume && market.volume < marketFilters.minVolume) {
          continue;
        }

        const spread = Math.abs(yesPrice + noPrice - 1.0);
        if (marketFilters.maxSpread > 0 && spread > marketFilters.maxSpread) {
          continue;
        }

        if (marketFilters.categoryWhitelist.length > 0) {
          const marketCategory = extractCategory(market.question);
          if (!marketFilters.categoryWhitelist.some(cat =>
            cat.toLowerCase() === 'all' || marketCategory.toLowerCase().includes(cat.toLowerCase())
          )) {
            continue;
          }
        }
      }

      await storePriceSnapshot(market.id, yesPrice, market.volume || 0);

      const priceHistory = await fetchPriceHistory(market.id, windowMinutes);

      if (priceHistory.length < 2) {
        continue;
      }

      const volumeWeightedMomentum = calculateVolumeWeightedMomentum(priceHistory);
      const indicators = calculateTrendIndicators(priceHistory);

      const absVelocity = Math.abs(volumeWeightedMomentum);

      if (absVelocity >= minMomentumPercent && indicators.confirmed) {
        const previousPrice = priceHistory[0].price;
        const priceChange = yesPrice - previousPrice;
        const priceChangePercent = (priceChange / previousPrice) * 100;
        const spread = Math.abs(yesPrice + noPrice - 1.0);

        opportunities.push({
          id: `momentum-${market.id}-${Date.now()}`,
          market: {
            id: market.id,
            question: market.question,
            currentPrice: yesPrice,
            previousPrice,
            priceChange,
            priceChangePercent,
            velocity: volumeWeightedMomentum,
            volume: market.volume,
            spread,
            category: extractCategory(market.question),
            tokenId: market.tokens?.[0]?.token_id
          },
          direction: volumeWeightedMomentum > 0 ? 'bullish' : 'bearish',
          strength: absVelocity,
          timestamp: Date.now(),
          indicators,
          trendConfirmed: indicators.confirmed,
          volumeTrend: indicators.volumeTrend
        });
      }
    }

    return opportunities.sort((a, b) => {
      const scoreA = b.strength * (b.indicators?.confirmed ? 1.5 : 1);
      const scoreB = a.strength * (a.indicators?.confirmed ? 1.5 : 1);
      return scoreA - scoreB;
    });
  } catch (error) {
    console.error('Momentum scan error:', error);
    return [];
  }
}

function extractCategory(question: string): string {
  const lowerQ = question.toLowerCase();
  if (lowerQ.includes('bitcoin') || lowerQ.includes('btc') || lowerQ.includes('ethereum') || lowerQ.includes('eth') || lowerQ.includes('crypto')) {
    return 'Crypto';
  }
  if (lowerQ.includes('election') || lowerQ.includes('trump') || lowerQ.includes('biden') || lowerQ.includes('political')) {
    return 'Politics';
  }
  if (lowerQ.includes('fed') || lowerQ.includes('rate') || lowerQ.includes('inflation') || lowerQ.includes('economy')) {
    return 'Economics';
  }
  if (lowerQ.includes('nvidia') || lowerQ.includes('apple') || lowerQ.includes('stock') || lowerQ.includes('tesla')) {
    return 'Stocks';
  }
  if (lowerQ.includes('sports') || lowerQ.includes('nfl') || lowerQ.includes('nba')) {
    return 'Sports';
  }
  return 'Other';
}

export function calculatePositionPnL(
  entryPrice: number,
  currentPrice: number,
  positionSize: number,
  direction: 'long' | 'short'
): { pnl: number; percent: number } {
  let pnl: number;

  if (direction === 'long') {
    const priceChange = currentPrice - entryPrice;
    pnl = (priceChange / entryPrice) * positionSize;
  } else {
    const priceChange = entryPrice - currentPrice;
    pnl = (priceChange / entryPrice) * positionSize;
  }

  const fees = positionSize * POLYMARKET_FEE_RATE * 2;
  const netPnL = pnl - fees;
  const percent = (netPnL / positionSize) * 100;

  return { pnl: netPnL, percent };
}

export async function updatePositionPrices(
  positions: TrendPosition[]
): Promise<TrendPosition[]> {
  const updatedPositions: TrendPosition[] = [];

  for (const position of positions) {
    try {
      const priceHistory = await fetchPriceHistory(position.marketId, 5);

      if (priceHistory.length > 0) {
        const latestPrice = priceHistory[priceHistory.length - 1].price;

        const { pnl, percent } = calculatePositionPnL(
          position.entryPrice,
          latestPrice,
          position.positionSize,
          position.direction
        );

        const highestPrice = position.highestPrice
          ? Math.max(position.highestPrice, latestPrice)
          : latestPrice;

        const lowestPrice = position.lowestPrice
          ? Math.min(position.lowestPrice, latestPrice)
          : latestPrice;

        updatedPositions.push({
          ...position,
          currentPrice: latestPrice,
          currentPnL: pnl,
          pnLPercent: percent,
          highestPrice,
          lowestPrice
        });
      } else {
        updatedPositions.push(position);
      }
    } catch (error) {
      console.error(`Error updating position ${position.id}:`, error);
      updatedPositions.push(position);
    }
  }

  return updatedPositions;
}

export function checkExitConditions(
  position: TrendPosition,
  settings: {
    profitTargetPercent: number;
    stopLossPercent: number;
    trailingStopEnabled: boolean;
    trailingStopPercent: number;
    maxHoldTime: number;
  }
): { shouldExit: boolean; reason: 'profit_target' | 'stop_loss' | 'trailing_stop' | 'time_limit' | null } {
  if (position.pnLPercent >= settings.profitTargetPercent) {
    return { shouldExit: true, reason: 'profit_target' };
  }

  if (position.pnLPercent <= -settings.stopLossPercent) {
    return { shouldExit: true, reason: 'stop_loss' };
  }

  if (settings.trailingStopEnabled && position.highestPrice && position.direction === 'long') {
    const drawdownFromHigh = ((position.highestPrice - position.currentPrice) / position.highestPrice) * 100;
    if (drawdownFromHigh >= settings.trailingStopPercent) {
      return { shouldExit: true, reason: 'trailing_stop' };
    }
  }

  if (settings.trailingStopEnabled && position.lowestPrice && position.direction === 'short') {
    const drawupFromLow = ((position.currentPrice - position.lowestPrice) / position.lowestPrice) * 100;
    if (drawupFromLow >= settings.trailingStopPercent) {
      return { shouldExit: true, reason: 'trailing_stop' };
    }
  }

  const holdTime = Date.now() - position.entryTime;
  const maxHoldTimeMs = settings.maxHoldTime * 60 * 60 * 1000;
  if (holdTime >= maxHoldTimeMs) {
    return { shouldExit: true, reason: 'time_limit' };
  }

  return { shouldExit: false, reason: null };
}

export async function detectTrendReversal(
  marketId: string,
  currentDirection: 'long' | 'short',
  windowMinutes: number = 5
): Promise<{ reversed: boolean; newDirection: 'bullish' | 'bearish' | null; confidence: number }> {
  try {
    const priceHistory = await fetchPriceHistory(marketId, windowMinutes);

    if (priceHistory.length < 10) {
      return { reversed: false, newDirection: null, confidence: 0 };
    }

    const indicators = calculateTrendIndicators(priceHistory);
    const momentum = calculateVolumeWeightedMomentum(priceHistory);

    let reversalSignals = 0;

    if (currentDirection === 'long') {
      if (momentum < -2) reversalSignals++;

      if (indicators.macd < indicators.macdSignal) reversalSignals++;

      if (indicators.rsi < 40) reversalSignals++;

      const prices = priceHistory.map(h => h.price);
      const currentPrice = prices[prices.length - 1];
      if (currentPrice < indicators.sma20) reversalSignals++;
    } else {
      if (momentum > 2) reversalSignals++;

      if (indicators.macd > indicators.macdSignal) reversalSignals++;

      if (indicators.rsi > 60) reversalSignals++;

      const prices = priceHistory.map(h => h.price);
      const currentPrice = prices[prices.length - 1];
      if (currentPrice > indicators.sma20) reversalSignals++;
    }

    const confidence = (reversalSignals / 4) * 100;
    const reversed = reversalSignals >= 3;

    const newDirection = reversed
      ? (currentDirection === 'long' ? 'bearish' : 'bullish')
      : null;

    return { reversed, newDirection, confidence };
  } catch (error) {
    console.error('Error detecting trend reversal:', error);
    return { reversed: false, newDirection: null, confidence: 0 };
  }
}

export async function monitorPositionsForAutoExit(
  positions: TrendPosition[],
  settings: {
    profitTargetPercent: number;
    stopLossPercent: number;
    trailingStopEnabled: boolean;
    trailingStopPercent: number;
    maxHoldTime: number;
  }
): Promise<Array<{ positionId: string; shouldExit: boolean; reason: string }>> {
  const exitDecisions: Array<{ positionId: string; shouldExit: boolean; reason: string }> = [];

  const updatedPositions = await updatePositionPrices(positions);

  for (const position of updatedPositions) {
    const exitCheck = checkExitConditions(position, settings);

    if (exitCheck.shouldExit && exitCheck.reason) {
      exitDecisions.push({
        positionId: position.id,
        shouldExit: true,
        reason: exitCheck.reason
      });
      continue;
    }

    const reversalCheck = await detectTrendReversal(
      position.marketId,
      position.direction,
      5
    );

    if (reversalCheck.reversed && reversalCheck.confidence >= 75) {
      exitDecisions.push({
        positionId: position.id,
        shouldExit: true,
        reason: `trend_reversal (${reversalCheck.confidence.toFixed(0)}% confidence)`
      });
    }
  }

  return exitDecisions;
}

export { calculateDynamicPositionSize, calculateTrendIndicators, TrendIndicators };
