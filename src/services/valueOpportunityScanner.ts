import { fetchMarkets } from './polymarket';
import { estimateFairValue, batchEstimateFairValues, CompositeEstimate } from './fairValueEstimator';
import {
  findBestValueSignal,
  calculateMinimumEdgeThreshold,
  ValueSignalResult,
  optimizePortfolio
} from './edgeCalculator';
import { ValueMarket, ValueMinerSettings, PortfolioRecommendation } from '../types/valueminer';
import { supabase } from '../lib/supabase';

export interface ScanResult {
  markets: ValueMarket[];
  totalScanned: number;
  valueOpportunities: number;
  highEdgeOpportunities: number;
  portfolioRecommendations: PortfolioRecommendation[];
  scanDuration: number;
}

export interface MarketWithSignal {
  market: ValueMarket;
  signal: ValueSignalResult;
  fairValueEstimate: CompositeEstimate;
}

const SCAN_CACHE_TTL_MS = 60000;

const scanCache = new Map<string, { result: ScanResult; timestamp: number }>();

export async function scanForValueOpportunities(
  settings: ValueMinerSettings,
  bankroll: number,
  useCorsProxy: boolean = false,
  useCache: boolean = true
): Promise<ScanResult> {
  const startTime = Date.now();

  const cacheKey = JSON.stringify({ settings, bankroll });

  if (useCache && scanCache.has(cacheKey)) {
    const cached = scanCache.get(cacheKey)!;
    if (Date.now() - cached.timestamp < SCAN_CACHE_TTL_MS) {
      return cached.result;
    }
  }

  const rawMarkets = await fetchMarkets(100, useCorsProxy);

  if (!rawMarkets || rawMarkets.length === 0) {
    return {
      markets: [],
      totalScanned: 0,
      valueOpportunities: 0,
      highEdgeOpportunities: 0,
      portfolioRecommendations: [],
      scanDuration: Date.now() - startTime
    };
  }

  const filteredMarkets = rawMarkets.filter(m => {
    if (settings.categoryFilters.length > 0) {
      if (!settings.categoryFilters.includes(m.category)) {
        return false;
      }
    }

    if ((m.volume24hr || 0) < settings.minVolume) {
      return false;
    }

    return true;
  });

  const fairValueEstimates = await batchEstimateFairValues(filteredMarkets, useCorsProxy);

  const valueMarkets: ValueMarket[] = [];
  const signals: MarketWithSignal[] = [];

  for (const market of filteredMarkets) {
    const estimate = fairValueEstimates.get(market.id);
    if (!estimate) continue;

    const yesPrice = parseFloat(market.outcomePrices?.[0] || '0.5');
    const noPrice = parseFloat(market.outcomePrices?.[1] || '0.5');

    const minEdge = calculateMinimumEdgeThreshold(
      market.category,
      market.liquidity || 0,
      estimate.confidenceScore
    );

    const signal = findBestValueSignal(
      yesPrice,
      noPrice,
      estimate,
      bankroll,
      {
        kellyFraction: settings.kellyFraction,
        maxPositionPercent: settings.maxPositionPercent,
        minEdgeThreshold: Math.max(settings.minEdge, minEdge)
      }
    );

    const valueMarket: ValueMarket = {
      id: `vm-${market.id}`,
      market_id: market.id,
      market_question: market.question || market.title,
      category: market.category,
      pm_yes_odds: yesPrice,
      pm_no_odds: noPrice,
      true_probability: estimate.finalProbability,
      edge_yes: null,
      edge_no: null,
      best_side: null,
      best_edge: null,
      volume_24h: market.volume24hr || 0,
      data_source: estimate.sources.map(s => s.source).join(', '),
      confidence: estimate.confidenceScore,
      last_updated: new Date().toISOString(),
      created_at: new Date().toISOString()
    };

    if (signal) {
      valueMarket.best_side = signal.side;
      valueMarket.best_edge = signal.edge.edgePercent;

      if (signal.side === 'YES') {
        valueMarket.edge_yes = signal.edge.edgePercent;
        valueMarket.edge_no = null;
      } else {
        valueMarket.edge_yes = null;
        valueMarket.edge_no = signal.edge.edgePercent;
      }

      signals.push({
        market: valueMarket,
        signal,
        fairValueEstimate: estimate
      });
    } else {
      const yesEdge = (estimate.finalProbability - yesPrice) * 100;
      const noEdge = ((1 - estimate.finalProbability) - noPrice) * 100;

      valueMarket.edge_yes = yesEdge;
      valueMarket.edge_no = noEdge;

      if (yesEdge > noEdge) {
        valueMarket.best_side = 'YES';
        valueMarket.best_edge = yesEdge;
      } else {
        valueMarket.best_side = 'NO';
        valueMarket.best_edge = noEdge;
      }
    }

    valueMarkets.push(valueMarket);
  }

  const valueOpportunities = valueMarkets.filter(m =>
    m.best_edge !== null &&
    m.best_edge >= settings.minEdge &&
    m.best_edge <= settings.maxEdge
  ).length;

  const highEdgeOpportunities = valueMarkets.filter(m =>
    m.best_edge !== null &&
    m.best_edge >= settings.autoTradeMinEdge
  ).length;

  const portfolioRecommendations = optimizePortfolio(
    signals.map(s => s.signal),
    bankroll,
    10,
    settings.diversificationRules
  );

  for (let i = 0; i < portfolioRecommendations.length && i < signals.length; i++) {
    portfolioRecommendations[i].market_id = signals[i].market.market_id;
    portfolioRecommendations[i].market_question = signals[i].market.market_question;
  }

  const result: ScanResult = {
    markets: valueMarkets,
    totalScanned: filteredMarkets.length,
    valueOpportunities,
    highEdgeOpportunities,
    portfolioRecommendations,
    scanDuration: Date.now() - startTime
  };

  scanCache.set(cacheKey, { result, timestamp: Date.now() });

  return result;
}

export async function saveValueMarkets(markets: ValueMarket[], userId: string) {
  try {
    const records = markets.map(m => ({
      user_id: userId,
      market_id: m.market_id,
      market_question: m.market_question,
      category: m.category,
      pm_yes_odds: m.pm_yes_odds,
      pm_no_odds: m.pm_no_odds,
      true_probability: m.true_probability,
      edge_yes: m.edge_yes,
      edge_no: m.edge_no,
      best_side: m.best_side,
      best_edge: m.best_edge,
      volume_24h: m.volume_24h,
      data_source: m.data_source,
      confidence: m.confidence,
      last_updated: m.last_updated
    }));

    const { error } = await supabase
      .from('value_markets')
      .upsert(records, {
        onConflict: 'user_id,market_id',
        ignoreDuplicates: false
      });

    if (error) {
      console.error('Error saving value markets:', error);
    }
  } catch (error) {
    console.error('Error in saveValueMarkets:', error);
  }
}

export async function getHistoricalValueMarkets(
  userId: string,
  limit: number = 50
): Promise<ValueMarket[]> {
  try {
    const { data, error } = await supabase
      .from('value_markets')
      .select('*')
      .eq('user_id', userId)
      .order('last_updated', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching historical value markets:', error);
      return [];
    }

    return data.map((d: any) => ({
      id: d.id,
      market_id: d.market_id,
      market_question: d.market_question,
      category: d.category,
      pm_yes_odds: d.pm_yes_odds,
      pm_no_odds: d.pm_no_odds,
      true_probability: d.true_probability,
      edge_yes: d.edge_yes,
      edge_no: d.edge_no,
      best_side: d.best_side,
      best_edge: d.best_edge,
      volume_24h: d.volume_24h,
      data_source: d.data_source,
      confidence: d.confidence,
      last_updated: d.last_updated,
      created_at: d.created_at
    }));
  } catch (error) {
    console.error('Error in getHistoricalValueMarkets:', error);
    return [];
  }
}

export async function trackSignalPerformance(
  marketId: string,
  side: 'YES' | 'NO',
  predictedEdge: number,
  outcome: boolean
): Promise<void> {
  try {
    const actualEdge = outcome ? predictedEdge : -predictedEdge;

    const { error } = await supabase
      .from('signal_performance')
      .insert({
        market_id: marketId,
        side,
        predicted_edge: predictedEdge,
        actual_outcome: outcome,
        actual_edge: actualEdge,
        recorded_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error tracking signal performance:', error);
    }
  } catch (error) {
    console.error('Error in trackSignalPerformance:', error);
  }
}

export async function analyzeEdgeAccuracy(
  userId: string,
  days: number = 30
): Promise<{
  totalSignals: number;
  correctSignals: number;
  accuracy: number;
  avgPredictedEdge: number;
  avgActualEdge: number;
  edgeBias: number;
}> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const { data, error } = await supabase
      .from('signal_performance')
      .select('*')
      .gte('recorded_at', cutoffDate.toISOString());

    if (error || !data || data.length === 0) {
      return {
        totalSignals: 0,
        correctSignals: 0,
        accuracy: 0,
        avgPredictedEdge: 0,
        avgActualEdge: 0,
        edgeBias: 0
      };
    }

    const totalSignals = data.length;
    const correctSignals = data.filter(d => d.actual_outcome === true).length;
    const accuracy = (correctSignals / totalSignals) * 100;

    const avgPredictedEdge = data.reduce((sum, d) => sum + d.predicted_edge, 0) / totalSignals;
    const avgActualEdge = data.reduce((sum, d) => sum + d.actual_edge, 0) / totalSignals;
    const edgeBias = avgPredictedEdge - avgActualEdge;

    return {
      totalSignals,
      correctSignals,
      accuracy,
      avgPredictedEdge,
      avgActualEdge,
      edgeBias
    };
  } catch (error) {
    console.error('Error in analyzeEdgeAccuracy:', error);
    return {
      totalSignals: 0,
      correctSignals: 0,
      accuracy: 0,
      avgPredictedEdge: 0,
      avgActualEdge: 0,
      edgeBias: 0
    };
  }
}

export function filterHighQualitySignals(
  markets: ValueMarket[],
  minConfidence: number = 0.7,
  minEdge: number = 5
): ValueMarket[] {
  return markets.filter(m =>
    m.confidence >= minConfidence &&
    m.best_edge !== null &&
    m.best_edge >= minEdge
  );
}

export function rankMarketsByQuality(
  markets: ValueMarket[],
  preferences: {
    edgeWeight: number;
    confidenceWeight: number;
    volumeWeight: number;
  } = {
    edgeWeight: 0.5,
    confidenceWeight: 0.3,
    volumeWeight: 0.2
  }
): ValueMarket[] {
  const maxEdge = Math.max(...markets.map(m => m.best_edge || 0), 1);
  const maxVolume = Math.max(...markets.map(m => m.volume_24h), 1);

  return [...markets].sort((a, b) => {
    const scoreA =
      ((a.best_edge || 0) / maxEdge) * preferences.edgeWeight +
      a.confidence * preferences.confidenceWeight +
      (a.volume_24h / maxVolume) * preferences.volumeWeight;

    const scoreB =
      ((b.best_edge || 0) / maxEdge) * preferences.edgeWeight +
      b.confidence * preferences.confidenceWeight +
      (b.volume_24h / maxVolume) * preferences.volumeWeight;

    return scoreB - scoreA;
  });
}

export function generateTradingRecommendation(
  market: ValueMarket,
  signal: ValueSignalResult | null,
  bankroll: number,
  settings: ValueMinerSettings
): {
  shouldTrade: boolean;
  reason: string;
  recommendedAction: string;
  confidence: string;
} {
  if (!signal || !market.best_edge) {
    return {
      shouldTrade: false,
      reason: 'No sufficient edge detected',
      recommendedAction: 'Monitor - No action',
      confidence: 'N/A'
    };
  }

  if (market.best_edge < settings.minEdge) {
    return {
      shouldTrade: false,
      reason: `Edge ${market.best_edge.toFixed(1)}% below minimum ${settings.minEdge}%`,
      recommendedAction: 'Skip - Edge too small',
      confidence: 'Low'
    };
  }

  if (market.confidence < 0.5) {
    return {
      shouldTrade: false,
      reason: 'Low confidence in fair value estimate',
      recommendedAction: 'Skip - Low confidence',
      confidence: 'Low'
    };
  }

  if (market.volume_24h < settings.minVolume) {
    return {
      shouldTrade: false,
      reason: 'Insufficient liquidity',
      recommendedAction: 'Skip - Low volume',
      confidence: 'Medium'
    };
  }

  if (signal.sizing.recommendedBet < 10) {
    return {
      shouldTrade: false,
      reason: 'Recommended bet size too small',
      recommendedAction: 'Skip - Position too small',
      confidence: 'Medium'
    };
  }

  let confidenceLevel = 'Medium';
  if (market.confidence >= 0.8 && market.best_edge >= settings.autoTradeMinEdge) {
    confidenceLevel = 'Very High';
  } else if (market.confidence >= 0.7 && market.best_edge >= 8) {
    confidenceLevel = 'High';
  }

  return {
    shouldTrade: true,
    reason: `${market.best_edge.toFixed(1)}% edge with ${(market.confidence * 100).toFixed(0)}% confidence`,
    recommendedAction: `Take ${market.best_side} position - $${signal.sizing.recommendedBet.toFixed(2)}`,
    confidence: confidenceLevel
  };
}

export async function continuousValueScan(
  settings: ValueMinerSettings,
  bankroll: number,
  onNewOpportunities: (opportunities: ValueMarket[]) => void,
  useCorsProxy: boolean = false
): Promise<{ stop: () => void }> {
  let isRunning = true;
  let intervalId: NodeJS.Timeout | null = null;

  const scan = async () => {
    if (!isRunning) return;

    try {
      const result = await scanForValueOpportunities(settings, bankroll, useCorsProxy, false);

      const highQualityOpportunities = filterHighQualitySignals(
        result.markets,
        0.7,
        settings.autoTradeMinEdge
      );

      if (highQualityOpportunities.length > 0) {
        onNewOpportunities(highQualityOpportunities);
      }
    } catch (error) {
      console.error('Error in continuous value scan:', error);
    }
  };

  scan();

  intervalId = setInterval(scan, 60000);

  return {
    stop: () => {
      isRunning = false;
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    }
  };
}

export {
  ScanResult,
  MarketWithSignal
};
