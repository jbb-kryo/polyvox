import { ValueMarket, PortfolioRecommendation } from '../types/valueminer';
import { CompositeEstimate } from './fairValueEstimator';

export interface EdgeAnalysis {
  marketOdds: number;
  fairValue: number;
  edge: number;
  edgePercent: number;
  isPositiveEdge: boolean;
  isSufficientEdge: boolean;
  minEdgeThreshold: number;
}

export interface KellySizing {
  kellySuggested: number;
  kellyPercent: number;
  fractionalKelly: number;
  fractionalAmount: number;
  maxRiskAmount: number;
  recommendedBet: number;
}

export interface ValueSignalResult {
  side: 'YES' | 'NO';
  edge: EdgeAnalysis;
  sizing: KellySizing;
  expectedValue: number;
  variance: number;
  sharpeRatio: number;
  probability: number;
}

export function calculateEdge(marketOdds: number, trueProb: number): number {
  const impliedProb = marketOdds;
  const edge = trueProb - impliedProb;
  return edge * 100;
}

export function calculateDetailedEdge(
  marketOdds: number,
  fairValue: number,
  minEdgeThreshold: number = 5
): EdgeAnalysis {
  const edge = fairValue - marketOdds;
  const edgePercent = edge * 100;

  return {
    marketOdds,
    fairValue,
    edge,
    edgePercent,
    isPositiveEdge: edgePercent > 0,
    isSufficientEdge: edgePercent >= minEdgeThreshold,
    minEdgeThreshold
  };
}

export function calculateKellyFraction(
  edge: number,
  odds: number,
  bankroll: number,
  fraction: number = 1
): number {
  const edgeDec = edge / 100;
  const winProb = odds + edgeDec;

  if (winProb <= 0 || winProb >= 1) return 0;

  const loseProb = 1 - winProb;

  const payoutRatio = (1 / odds) - 1;

  if (payoutRatio <= 0) return 0;

  const kellyPercent = (winProb * payoutRatio - loseProb) / payoutRatio;

  if (kellyPercent <= 0) return 0;

  const fractionalKelly = kellyPercent * fraction;

  return Math.min(fractionalKelly * bankroll, bankroll * 0.25);
}

export function calculateKellySizing(
  edge: number,
  marketOdds: number,
  bankroll: number,
  kellyFraction: number = 0.5,
  maxPositionPercent: number = 10
): KellySizing {
  const edgeDec = edge / 100;
  const winProb = marketOdds + edgeDec;

  if (winProb <= 0 || winProb >= 1 || edgeDec <= 0) {
    return {
      kellySuggested: 0,
      kellyPercent: 0,
      fractionalKelly: 0,
      fractionalAmount: 0,
      maxRiskAmount: bankroll * (maxPositionPercent / 100),
      recommendedBet: 0
    };
  }

  const loseProb = 1 - winProb;

  const payoutRatio = (1 - marketOdds) / marketOdds;

  const kellyPercent = (winProb * payoutRatio - loseProb) / payoutRatio;

  if (kellyPercent <= 0) {
    return {
      kellySuggested: 0,
      kellyPercent: 0,
      fractionalKelly: 0,
      fractionalAmount: 0,
      maxRiskAmount: bankroll * (maxPositionPercent / 100),
      recommendedBet: 0
    };
  }

  const kellySuggested = kellyPercent * bankroll;

  const fractionalKelly = kellyPercent * kellyFraction;
  const fractionalAmount = fractionalKelly * bankroll;

  const maxRiskAmount = bankroll * (maxPositionPercent / 100);

  const recommendedBet = Math.min(fractionalAmount, maxRiskAmount, bankroll * 0.25);

  return {
    kellySuggested,
    kellyPercent: kellyPercent * 100,
    fractionalKelly,
    fractionalAmount,
    maxRiskAmount,
    recommendedBet: Math.max(0, recommendedBet)
  };
}

export function calculateExpectedValue(
  betSize: number,
  edge: number,
  odds: number
): number {
  const edgeDec = edge / 100;
  const winProb = odds + edgeDec;

  if (winProb <= 0 || winProb >= 1) return 0;

  const loseProb = 1 - winProb;

  const winAmount = betSize * ((1 - odds) / odds);
  const loseAmount = -betSize;

  return (winProb * winAmount) + (loseProb * loseAmount);
}

export function calculateVariance(
  betSize: number,
  winProb: number,
  odds: number
): number {
  const loseProb = 1 - winProb;

  const winAmount = betSize * ((1 - odds) / odds);
  const loseAmount = -betSize;

  const expectedValue = (winProb * winAmount) + (loseProb * loseAmount);

  const varianceWin = winProb * Math.pow(winAmount - expectedValue, 2);
  const varianceLose = loseProb * Math.pow(loseAmount - expectedValue, 2);

  return varianceWin + varianceLose;
}

export function calculateSharpeRatio(
  returns: number[],
  riskFreeRate: number = 0
): number {
  if (returns.length < 2) return 0;

  const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);

  if (stdDev === 0) return 0;

  return (avgReturn - riskFreeRate) / stdDev;
}

export function analyzeValueSignal(
  side: 'YES' | 'NO',
  marketYesOdds: number,
  marketNoOdds: number,
  fairValueEstimate: CompositeEstimate,
  bankroll: number,
  settings: {
    kellyFraction: number;
    maxPositionPercent: number;
    minEdgeThreshold: number;
  }
): ValueSignalResult | null {
  const marketOdds = side === 'YES' ? marketYesOdds : marketNoOdds;
  const fairValue = side === 'YES'
    ? fairValueEstimate.finalProbability
    : (1 - fairValueEstimate.finalProbability);

  const edgeAnalysis = calculateDetailedEdge(
    marketOdds,
    fairValue,
    settings.minEdgeThreshold
  );

  if (!edgeAnalysis.isSufficientEdge) {
    return null;
  }

  const sizing = calculateKellySizing(
    edgeAnalysis.edgePercent,
    marketOdds,
    bankroll,
    settings.kellyFraction,
    settings.maxPositionPercent
  );

  if (sizing.recommendedBet <= 0) {
    return null;
  }

  const expectedValue = calculateExpectedValue(
    sizing.recommendedBet,
    edgeAnalysis.edgePercent,
    marketOdds
  );

  const winProb = fairValue;
  const variance = calculateVariance(sizing.recommendedBet, winProb, marketOdds);

  const sharpeRatio = variance > 0
    ? expectedValue / Math.sqrt(variance)
    : 0;

  return {
    side,
    edge: edgeAnalysis,
    sizing,
    expectedValue,
    variance,
    sharpeRatio,
    probability: fairValue
  };
}

export function findBestValueSignal(
  marketYesOdds: number,
  marketNoOdds: number,
  fairValueEstimate: CompositeEstimate,
  bankroll: number,
  settings: {
    kellyFraction: number;
    maxPositionPercent: number;
    minEdgeThreshold: number;
  }
): ValueSignalResult | null {
  const yesSignal = analyzeValueSignal(
    'YES',
    marketYesOdds,
    marketNoOdds,
    fairValueEstimate,
    bankroll,
    settings
  );

  const noSignal = analyzeValueSignal(
    'NO',
    marketYesOdds,
    marketNoOdds,
    fairValueEstimate,
    bankroll,
    settings
  );

  if (!yesSignal && !noSignal) return null;
  if (!yesSignal) return noSignal;
  if (!noSignal) return yesSignal;

  return yesSignal.edge.edgePercent > noSignal.edge.edgePercent
    ? yesSignal
    : noSignal;
}

export function simulateTrueProbability(
  category: string,
  marketQuestion: string
): { prob: number; source: string; confidence: number } {
  const lowerQuestion = marketQuestion.toLowerCase();

  if (category === 'politics') {
    if (lowerQuestion.includes('trump') || lowerQuestion.includes('biden')) {
      return { prob: 0.45 + Math.random() * 0.1, source: '538_polls', confidence: 0.75 };
    }
    return { prob: 0.40 + Math.random() * 0.2, source: 'historical_polls', confidence: 0.6 };
  }

  if (category === 'weather') {
    if (lowerQuestion.includes('rain') || lowerQuestion.includes('snow')) {
      return { prob: 0.25 + Math.random() * 0.3, source: 'weather.com', confidence: 0.85 };
    }
    return { prob: 0.30 + Math.random() * 0.4, source: 'weather_model', confidence: 0.7 };
  }

  if (category === 'sports') {
    return { prob: 0.35 + Math.random() * 0.3, source: 'vegas_odds', confidence: 0.8 };
  }

  if (category === 'crypto') {
    return { prob: 0.30 + Math.random() * 0.4, source: 'historical_volatility', confidence: 0.5 };
  }

  return { prob: 0.40 + Math.random() * 0.2, source: 'base_rate', confidence: 0.4 };
}

export function optimizePortfolio(
  signals: ValueSignalResult[],
  bankroll: number,
  maxPositions: number,
  diversificationRules: {
    maxPerMarket: number;
    maxPerCategory: number;
    maxCorrelation: number;
  }
): PortfolioRecommendation[] {
  const sortedSignals = [...signals].sort((a, b) => {
    const scoreA = a.edge.edgePercent * a.edge.edgeAnalysis.confidenceScore * a.sharpeRatio;
    const scoreB = b.edge.edgePercent * b.edge.edgeAnalysis.confidenceScore * b.sharpeRatio;
    return scoreB - scoreA;
  });

  const recommendations: PortfolioRecommendation[] = [];
  let allocatedCapital = 0;

  for (const signal of sortedSignals) {
    if (recommendations.length >= maxPositions) break;

    const adjustedSize = Math.min(
      signal.sizing.recommendedBet,
      diversificationRules.maxPerMarket,
      bankroll * 0.8 - allocatedCapital
    );

    if (adjustedSize < 10) continue;

    allocatedCapital += adjustedSize;

    recommendations.push({
      market_id: '',
      market_question: '',
      side: signal.side,
      edge: signal.edge.edgePercent,
      recommended_size: adjustedSize,
      kelly_fraction: signal.sizing.fractionalKelly,
      expected_value: signal.expectedValue,
      risk_score: Math.sqrt(signal.variance),
      priority: signal.sharpeRatio
    });
  }

  if (allocatedCapital > bankroll * 0.8) {
    const scaleFactor = (bankroll * 0.8) / allocatedCapital;
    recommendations.forEach(r => {
      r.recommended_size *= scaleFactor;
      r.expected_value *= scaleFactor;
    });
  }

  return recommendations;
}

export function calculateMinimumEdgeThreshold(
  category: string,
  marketLiquidity: number,
  confidenceScore: number
): number {
  let baseThreshold = 5;

  if (confidenceScore < 0.5) {
    baseThreshold = 10;
  } else if (confidenceScore < 0.7) {
    baseThreshold = 7;
  }

  if (marketLiquidity < 10000) {
    baseThreshold += 3;
  } else if (marketLiquidity < 50000) {
    baseThreshold += 1;
  }

  const categoryRisk: Record<string, number> = {
    'crypto': 2,
    'weather': -1,
    'sports': 0,
    'politics': 1,
    'economics': 1
  };

  baseThreshold += categoryRisk[category.toLowerCase()] || 0;

  return Math.max(3, Math.min(15, baseThreshold));
}

export function enforceMinimumEdge(
  edgePercent: number,
  minThreshold: number
): boolean {
  return edgePercent >= minThreshold;
}

export function calculateRiskOfRuin(
  edge: number,
  bankroll: number,
  betSize: number,
  numBets: number
): number {
  if (edge <= 0) return 1.0;

  const edgeDec = edge / 100;

  const winProb = 0.5 + (edgeDec / 2);
  const loseProb = 1 - winProb;

  if (winProb <= loseProb) return 1.0;

  const ruinProb = Math.pow(loseProb / winProb, bankroll / betSize);

  return Math.min(1, Math.max(0, ruinProb));
}

export function calculateOptimalBankrollAllocation(
  totalBankroll: number,
  opportunities: Array<{
    edge: number;
    odds: number;
    confidence: number;
  }>,
  kellyFraction: number = 0.5
): Array<{ index: number; allocation: number; kellyPercent: number }> {
  const allocations: Array<{ index: number; allocation: number; kellyPercent: number }> = [];

  let remainingBankroll = totalBankroll;

  for (let i = 0; i < opportunities.length; i++) {
    const opp = opportunities[i];

    const sizing = calculateKellySizing(
      opp.edge,
      opp.odds,
      remainingBankroll,
      kellyFraction,
      10
    );

    if (sizing.recommendedBet > 0) {
      allocations.push({
        index: i,
        allocation: sizing.recommendedBet,
        kellyPercent: sizing.kellyPercent
      });

      remainingBankroll -= sizing.recommendedBet;
    }

    if (remainingBankroll < totalBankroll * 0.2) break;
  }

  return allocations;
}

export {
  EdgeAnalysis,
  KellySizing,
  ValueSignalResult
};
