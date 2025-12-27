import { ValueMarket } from '../types/valueminer';
import { fetchMarkets } from './polymarket';

interface FairValueEstimate {
  probability: number;
  source: string;
  confidence: number;
  method: string;
  metadata?: Record<string, any>;
}

interface CompositeEstimate {
  finalProbability: number;
  sources: FairValueEstimate[];
  confidenceWeightedAvg: number;
  confidenceScore: number;
  methodology: string;
}

const BASE_RATE_CONFIDENCE = 0.3;
const HISTORICAL_DATA_CONFIDENCE = 0.6;
const EXPERT_CONSENSUS_CONFIDENCE = 0.75;
const QUANTITATIVE_MODEL_CONFIDENCE = 0.85;

export async function estimateFairValue(
  marketQuestion: string,
  category: string,
  metadata?: any
): Promise<CompositeEstimate> {
  const estimates: FairValueEstimate[] = [];

  const baseRate = calculateBaseRate(category, marketQuestion);
  if (baseRate) {
    estimates.push(baseRate);
  }

  const historical = analyzeHistoricalData(category, marketQuestion, metadata);
  if (historical) {
    estimates.push(historical);
  }

  const sentiment = analyzeSentiment(marketQuestion);
  if (sentiment) {
    estimates.push(sentiment);
  }

  const statistical = applyStatisticalModels(category, marketQuestion, metadata);
  if (statistical) {
    estimates.push(statistical);
  }

  const timeAdjusted = applyTimeDecay(marketQuestion, metadata?.closeTime);
  if (timeAdjusted) {
    estimates.push(timeAdjusted);
  }

  const composite = combineEstimates(estimates);

  return composite;
}

function calculateBaseRate(category: string, question: string): FairValueEstimate | null {
  const lowerQuestion = question.toLowerCase();
  const lowerCategory = category.toLowerCase();

  const baseRates: Record<string, number> = {
    'politics': 0.50,
    'sports': 0.50,
    'crypto': 0.45,
    'economics': 0.50,
    'weather': 0.50,
    'entertainment': 0.50,
    'science': 0.40,
    'business': 0.50
  };

  let baseRate = baseRates[lowerCategory] || 0.50;

  if (lowerQuestion.includes('will') && lowerQuestion.includes('happen')) {
    baseRate *= 0.9;
  }

  if (lowerQuestion.includes('before') || lowerQuestion.includes('by end')) {
    baseRate *= 0.85;
  }

  if (lowerQuestion.includes('never') || lowerQuestion.includes('won\'t')) {
    baseRate = 1 - baseRate;
  }

  if (lowerQuestion.includes('record') || lowerQuestion.includes('highest')) {
    baseRate *= 0.7;
  }

  return {
    probability: Math.max(0.1, Math.min(0.9, baseRate)),
    source: 'base_rate',
    confidence: BASE_RATE_CONFIDENCE,
    method: 'category_base_rate_with_adjustments'
  };
}

function analyzeHistoricalData(
  category: string,
  question: string,
  metadata?: any
): FairValueEstimate | null {
  const lowerQuestion = question.toLowerCase();
  const lowerCategory = category.toLowerCase();

  if (lowerCategory === 'politics') {
    return analyzePoliticalHistoricalData(lowerQuestion, metadata);
  }

  if (lowerCategory === 'sports') {
    return analyzeSportsHistoricalData(lowerQuestion, metadata);
  }

  if (lowerCategory === 'crypto') {
    return analyzeCryptoHistoricalData(lowerQuestion, metadata);
  }

  if (lowerCategory === 'weather') {
    return analyzeWeatherHistoricalData(lowerQuestion, metadata);
  }

  if (lowerCategory === 'economics') {
    return analyzeEconomicsHistoricalData(lowerQuestion, metadata);
  }

  return null;
}

function analyzePoliticalHistoricalData(question: string, metadata?: any): FairValueEstimate | null {
  let probability = 0.50;
  let confidence = HISTORICAL_DATA_CONFIDENCE;

  if (question.includes('republican') || question.includes('gop')) {
    probability = 0.48;
  } else if (question.includes('democrat') || question.includes('democratic')) {
    probability = 0.52;
  }

  if (question.includes('trump')) {
    probability = question.includes('win') ? 0.46 : 0.54;
    confidence = 0.65;
  } else if (question.includes('biden')) {
    probability = question.includes('win') ? 0.48 : 0.52;
    confidence = 0.65;
  }

  if (question.includes('incumbent')) {
    probability *= 1.15;
    confidence = 0.70;
  }

  if (question.includes('midterm')) {
    probability = question.includes('opposition') ? 0.60 : 0.40;
  }

  if (question.includes('approval') && question.includes('above')) {
    const match = question.match(/(\d+)%/);
    if (match) {
      const threshold = parseInt(match[1]);
      if (threshold > 50) {
        probability = 0.35;
      } else if (threshold > 45) {
        probability = 0.55;
      } else {
        probability = 0.70;
      }
    }
  }

  return {
    probability: Math.max(0.1, Math.min(0.9, probability)),
    source: 'political_historical_analysis',
    confidence,
    method: 'pattern_matching_with_historical_precedent',
    metadata: { category: 'politics' }
  };
}

function analyzeSportsHistoricalData(question: string, metadata?: any): FairValueEstimate | null {
  let probability = 0.50;
  const confidence = HISTORICAL_DATA_CONFIDENCE;

  if (question.includes('favorite') || question.includes('favored')) {
    probability = 0.62;
  } else if (question.includes('underdog')) {
    probability = 0.38;
  }

  if (question.includes('home')) {
    probability *= 1.08;
  } else if (question.includes('away')) {
    probability *= 0.92;
  }

  if (question.includes('playoff') || question.includes('championship')) {
    probability = question.includes('reach') ? 0.35 : 0.50;
  }

  if (question.includes('score over') || question.includes('total points')) {
    probability = 0.50;
  }

  return {
    probability: Math.max(0.15, Math.min(0.85, probability)),
    source: 'sports_historical_analysis',
    confidence,
    method: 'home_advantage_and_historical_win_rates',
    metadata: { category: 'sports' }
  };
}

function analyzeCryptoHistoricalData(question: string, metadata?: any): FairValueEstimate | null {
  let probability = 0.45;
  const confidence = HISTORICAL_DATA_CONFIDENCE * 0.7;

  if (question.includes('bitcoin') || question.includes('btc')) {
    if (question.includes('reach') || question.includes('above')) {
      const match = question.match(/\$?(\d{1,3}),?(\d{3})/);
      if (match) {
        const target = parseInt(match[1] + match[2]);
        if (target > 100000) {
          probability = 0.25;
        } else if (target > 80000) {
          probability = 0.40;
        } else if (target > 60000) {
          probability = 0.55;
        } else {
          probability = 0.70;
        }
      }
    }

    if (question.includes('ath') || question.includes('all-time high')) {
      probability = 0.35;
    }
  }

  if (question.includes('ethereum') || question.includes('eth')) {
    probability *= 0.95;
  }

  if (question.includes('crash') || question.includes('drop')) {
    probability = 0.40;
  }

  if (question.includes('bull market') || question.includes('bull run')) {
    probability = 0.48;
  }

  return {
    probability: Math.max(0.1, Math.min(0.9, probability)),
    source: 'crypto_volatility_analysis',
    confidence,
    method: 'historical_volatility_and_price_targets',
    metadata: { category: 'crypto', volatility: 'high' }
  };
}

function analyzeWeatherHistoricalData(question: string, metadata?: any): FairValueEstimate | null {
  let probability = 0.50;
  const confidence = HISTORICAL_DATA_CONFIDENCE * 1.2;

  if (question.includes('rain') || question.includes('precipitation')) {
    probability = 0.35;
  }

  if (question.includes('snow')) {
    probability = question.includes('december') || question.includes('january') ? 0.45 : 0.20;
  }

  if (question.includes('temperature') || question.includes('degrees')) {
    if (question.includes('above') && question.includes('average')) {
      probability = 0.52;
    } else if (question.includes('below') && question.includes('average')) {
      probability = 0.48;
    } else if (question.includes('record')) {
      probability = 0.10;
    }
  }

  if (question.includes('sunny') || question.includes('clear')) {
    probability = 0.60;
  }

  if (question.includes('hurricane') || question.includes('tornado')) {
    probability = 0.25;
  }

  return {
    probability: Math.max(0.05, Math.min(0.95, probability)),
    source: 'weather_climatology',
    confidence,
    method: 'historical_weather_patterns',
    metadata: { category: 'weather' }
  };
}

function analyzeEconomicsHistoricalData(question: string, metadata?: any): FairValueEstimate | null {
  let probability = 0.50;
  const confidence = HISTORICAL_DATA_CONFIDENCE;

  if (question.includes('recession')) {
    probability = 0.30;
  }

  if (question.includes('fed') || question.includes('federal reserve')) {
    if (question.includes('raise') || question.includes('increase')) {
      probability = 0.55;
    } else if (question.includes('cut') || question.includes('lower')) {
      probability = 0.45;
    }
  }

  if (question.includes('unemployment')) {
    if (question.includes('above')) {
      probability = 0.40;
    } else if (question.includes('below')) {
      probability = 0.60;
    }
  }

  if (question.includes('gdp')) {
    if (question.includes('positive') || question.includes('growth')) {
      probability = 0.65;
    } else if (question.includes('negative') || question.includes('decline')) {
      probability = 0.35;
    }
  }

  if (question.includes('inflation')) {
    if (question.includes('above 3%') || question.includes('above 4%')) {
      probability = 0.60;
    } else if (question.includes('below 2%')) {
      probability = 0.45;
    }
  }

  return {
    probability: Math.max(0.1, Math.min(0.9, probability)),
    source: 'economic_indicators',
    confidence,
    method: 'economic_cycle_analysis',
    metadata: { category: 'economics' }
  };
}

function analyzeSentiment(question: string): FairValueEstimate | null {
  const lowerQuestion = question.toLowerCase();

  let sentimentScore = 0;
  let wordCount = 0;

  const positiveWords = ['will', 'yes', 'win', 'succeed', 'achieve', 'reach', 'beat', 'victory', 'increase', 'rise', 'growth'];
  const negativeWords = ['not', 'no', 'lose', 'fail', 'miss', 'below', 'decline', 'fall', 'crash', 'defeat'];

  positiveWords.forEach(word => {
    if (lowerQuestion.includes(word)) {
      sentimentScore += 0.05;
      wordCount++;
    }
  });

  negativeWords.forEach(word => {
    if (lowerQuestion.includes(word)) {
      sentimentScore -= 0.05;
      wordCount++;
    }
  });

  if (wordCount === 0) return null;

  const baseProbability = 0.50;
  const adjustedProbability = baseProbability + sentimentScore;

  return {
    probability: Math.max(0.2, Math.min(0.8, adjustedProbability)),
    source: 'sentiment_analysis',
    confidence: 0.35,
    method: 'keyword_sentiment_scoring',
    metadata: { sentimentScore, wordCount }
  };
}

function applyStatisticalModels(
  category: string,
  question: string,
  metadata?: any
): FairValueEstimate | null {
  const lowerQuestion = question.toLowerCase();

  if (lowerQuestion.includes('before') || lowerQuestion.includes('by')) {
    const timeConstraint = extractTimeConstraint(lowerQuestion);
    if (timeConstraint) {
      const daysRemaining = timeConstraint.daysRemaining;

      let probability = 0.50;

      if (daysRemaining < 7) {
        probability *= 0.7;
      } else if (daysRemaining < 30) {
        probability *= 0.85;
      } else if (daysRemaining < 90) {
        probability *= 0.95;
      }

      return {
        probability: Math.max(0.1, Math.min(0.9, probability)),
        source: 'time_decay_model',
        confidence: QUANTITATIVE_MODEL_CONFIDENCE * 0.8,
        method: 'exponential_time_decay',
        metadata: { daysRemaining, timeConstraint: timeConstraint.text }
      };
    }
  }

  if (lowerQuestion.includes('record') || lowerQuestion.includes('all-time high') || lowerQuestion.includes('all-time low')) {
    return {
      probability: 0.15,
      source: 'extreme_event_model',
      confidence: QUANTITATIVE_MODEL_CONFIDENCE,
      method: 'tail_risk_estimation',
      metadata: { eventType: 'extreme' }
    };
  }

  return null;
}

function extractTimeConstraint(question: string): { daysRemaining: number; text: string } | null {
  const now = new Date();

  const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

  for (let i = 0; i < monthNames.length; i++) {
    if (question.includes(monthNames[i])) {
      const yearMatch = question.match(/\b(202\d)\b/);
      const year = yearMatch ? parseInt(yearMatch[1]) : now.getFullYear();

      const targetDate = new Date(year, i, 1);
      const daysRemaining = Math.max(0, (targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      return { daysRemaining, text: `${monthNames[i]} ${year}` };
    }
  }

  const daysMatch = question.match(/(\d+)\s*days?/);
  if (daysMatch) {
    return { daysRemaining: parseInt(daysMatch[1]), text: daysMatch[0] };
  }

  const weeksMatch = question.match(/(\d+)\s*weeks?/);
  if (weeksMatch) {
    return { daysRemaining: parseInt(weeksMatch[1]) * 7, text: weeksMatch[0] };
  }

  const monthsMatch = question.match(/(\d+)\s*months?/);
  if (monthsMatch) {
    return { daysRemaining: parseInt(monthsMatch[1]) * 30, text: monthsMatch[0] };
  }

  return null;
}

function applyTimeDecay(question: string, closeTime?: string): FairValueEstimate | null {
  if (!closeTime) return null;

  const now = new Date();
  const close = new Date(closeTime);
  const daysUntilClose = (close.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

  if (daysUntilClose < 0) {
    return null;
  }

  let decayFactor = 1.0;

  if (daysUntilClose < 1) {
    decayFactor = 0.95;
  } else if (daysUntilClose < 7) {
    decayFactor = 0.98;
  } else if (daysUntilClose < 30) {
    decayFactor = 0.99;
  }

  const baseProb = 0.50;

  return {
    probability: baseProb * decayFactor,
    source: 'time_decay_adjustment',
    confidence: 0.40,
    method: 'market_close_proximity',
    metadata: { daysUntilClose }
  };
}

function combineEstimates(estimates: FairValueEstimate[]): CompositeEstimate {
  if (estimates.length === 0) {
    return {
      finalProbability: 0.50,
      sources: [],
      confidenceWeightedAvg: 0.50,
      confidenceScore: BASE_RATE_CONFIDENCE,
      methodology: 'default_uninformed_prior'
    };
  }

  let totalWeight = 0;
  let weightedSum = 0;

  for (const estimate of estimates) {
    const weight = estimate.confidence;
    weightedSum += estimate.probability * weight;
    totalWeight += weight;
  }

  const confidenceWeightedAvg = weightedSum / totalWeight;

  const highConfidenceEstimates = estimates.filter(e => e.confidence >= 0.7);
  let finalProbability = confidenceWeightedAvg;

  if (highConfidenceEstimates.length > 0) {
    const highConfWeight = highConfidenceEstimates.reduce((sum, e) => sum + e.confidence, 0);
    const highConfSum = highConfidenceEstimates.reduce((sum, e) => sum + e.probability * e.confidence, 0);
    const highConfAvg = highConfSum / highConfWeight;

    finalProbability = (confidenceWeightedAvg * 0.4) + (highConfAvg * 0.6);
  }

  const variance = estimates.reduce((sum, e) => {
    return sum + Math.pow(e.probability - confidenceWeightedAvg, 2) * e.confidence;
  }, 0) / totalWeight;

  let consensusBonus = 0;
  if (variance < 0.01) {
    consensusBonus = 0.15;
  } else if (variance < 0.02) {
    consensusBonus = 0.10;
  } else if (variance < 0.05) {
    consensusBonus = 0.05;
  }

  const avgConfidence = totalWeight / estimates.length;
  const confidenceScore = Math.min(0.95, avgConfidence + consensusBonus);

  finalProbability = Math.max(0.05, Math.min(0.95, finalProbability));

  return {
    finalProbability,
    sources: estimates,
    confidenceWeightedAvg,
    confidenceScore,
    methodology: 'weighted_ensemble_with_consensus_bonus'
  };
}

export async function batchEstimateFairValues(
  markets: any[],
  useCorsProxy: boolean = false
): Promise<Map<string, CompositeEstimate>> {
  const estimates = new Map<string, CompositeEstimate>();

  for (const market of markets) {
    try {
      const estimate = await estimateFairValue(
        market.question || market.title,
        market.category,
        {
          closeTime: market.endDate,
          volume: market.volume,
          liquidity: market.liquidity
        }
      );

      estimates.set(market.id, estimate);
    } catch (error) {
      console.error(`Error estimating fair value for market ${market.id}:`, error);
    }
  }

  return estimates;
}

export function calibrateFairValueEstimates(
  historicalMarkets: Array<{ question: string; category: string; resolvedYes: boolean }>,
  estimates: FairValueEstimate[]
): { calibrationFactor: number; brierScore: number } {
  if (historicalMarkets.length === 0) {
    return { calibrationFactor: 1.0, brierScore: 0.25 };
  }

  let totalSquaredError = 0;

  for (const market of historicalMarkets) {
    const estimate = estimates.find(e => true);

    if (estimate) {
      const actualOutcome = market.resolvedYes ? 1 : 0;
      const forecastProb = estimate.probability;
      const squaredError = Math.pow(forecastProb - actualOutcome, 2);
      totalSquaredError += squaredError;
    }
  }

  const brierScore = totalSquaredError / historicalMarkets.length;

  const optimalBrier = 0.20;
  const calibrationFactor = optimalBrier / Math.max(brierScore, 0.01);

  return {
    calibrationFactor: Math.max(0.5, Math.min(1.5, calibrationFactor)),
    brierScore
  };
}

export {
  FairValueEstimate,
  CompositeEstimate
};
