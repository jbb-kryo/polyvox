interface ScanRequest {
  type: 'scan';
  moduleType: 'valueminer' | 'arbitrage' | 'snipe' | 'trend' | 'whale';
  userId: string;
  config: {
    minEdge?: number;
    minConfidence?: number;
    minVolume?: number;
    maxOpportunities?: number;
    moduleSettings?: any;
  };
  supabaseUrl: string;
  supabaseAnonKey: string;
  useCorsProxy: boolean;
}

interface ScanResponse {
  type: 'scan-complete' | 'scan-error' | 'scan-progress';
  moduleType: string;
  opportunities?: any[];
  metrics?: {
    duration: number;
    marketsScanned: number;
    opportunitiesFound: number;
    highPriorityFound: number;
  };
  error?: string;
  progress?: number;
}

let isScanning = false;
let currentScanAbortController: AbortController | null = null;

self.onmessage = async (e: MessageEvent<ScanRequest | { type: 'stop' }>) => {
  const message = e.data;

  if (message.type === 'stop') {
    if (currentScanAbortController) {
      currentScanAbortController.abort();
      currentScanAbortController = null;
    }
    isScanning = false;
    return;
  }

  if (message.type === 'scan') {
    if (isScanning) {
      self.postMessage({
        type: 'scan-error',
        moduleType: message.moduleType,
        error: 'Scan already in progress'
      } as ScanResponse);
      return;
    }

    isScanning = true;
    currentScanAbortController = new AbortController();

    try {
      const startTime = Date.now();

      const opportunities = await performScan(message, currentScanAbortController.signal);

      const duration = Date.now() - startTime;

      const highPriority = opportunities.filter((opp: any) =>
        opp.priorityScore >= 0.7 || opp.edgePercent >= (message.config.minEdge || 10) * 1.5
      );

      self.postMessage({
        type: 'scan-complete',
        moduleType: message.moduleType,
        opportunities,
        metrics: {
          duration,
          marketsScanned: opportunities.length > 0 ? 100 : 0,
          opportunitiesFound: opportunities.length,
          highPriorityFound: highPriority.length
        }
      } as ScanResponse);
    } catch (error: any) {
      if (error.name === 'AbortError') {
        self.postMessage({
          type: 'scan-error',
          moduleType: message.moduleType,
          error: 'Scan was cancelled'
        } as ScanResponse);
      } else {
        self.postMessage({
          type: 'scan-error',
          moduleType: message.moduleType,
          error: error.message || 'Unknown error during scan'
        } as ScanResponse);
      }
    } finally {
      isScanning = false;
      currentScanAbortController = null;
    }
  }
};

async function performScan(
  request: ScanRequest,
  signal: AbortSignal
): Promise<any[]> {
  const { moduleType, config, useCorsProxy } = request;

  self.postMessage({
    type: 'scan-progress',
    moduleType,
    progress: 10
  } as ScanResponse);

  const markets = await fetchMarkets(100, useCorsProxy, signal);

  if (signal.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }

  self.postMessage({
    type: 'scan-progress',
    moduleType,
    progress: 40
  } as ScanResponse);

  const opportunities = await analyzeMarkets(markets, moduleType, config, signal);

  self.postMessage({
    type: 'scan-progress',
    moduleType,
    progress: 80
  } as ScanResponse);

  const filtered = opportunities.filter(opp => {
    if (config.minEdge && opp.edgePercent < config.minEdge) return false;
    if (config.minConfidence && opp.confidenceScore < config.minConfidence) return false;
    if (config.minVolume && opp.volume24h < config.minVolume) return false;
    return true;
  });

  const sorted = filtered.sort((a, b) => b.priorityScore - a.priorityScore);

  const limited = config.maxOpportunities
    ? sorted.slice(0, config.maxOpportunities)
    : sorted;

  return limited;
}

async function fetchMarkets(
  limit: number,
  useCorsProxy: boolean,
  signal: AbortSignal
): Promise<any[]> {
  try {
    const proxyUrl = useCorsProxy
      ? 'https://corsproxy.io/?'
      : '';

    const response = await fetch(
      `${proxyUrl}https://gamma-api.polymarket.com/markets?limit=${limit}&active=true`,
      { signal }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return data || [];
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw error;
    }
    console.error('Error fetching markets in worker:', error);
    return [];
  }
}

async function analyzeMarkets(
  markets: any[],
  moduleType: string,
  config: any,
  signal: AbortSignal
): Promise<any[]> {
  const opportunities: any[] = [];

  for (let i = 0; i < markets.length; i++) {
    if (signal.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    const market = markets[i];

    if (i % 20 === 0) {
      const progress = 40 + Math.floor((i / markets.length) * 40);
      self.postMessage({
        type: 'scan-progress',
        moduleType,
        progress
      } as ScanResponse);
    }

    try {
      const opportunity = await analyzeMarketForModule(market, moduleType, config);
      if (opportunity) {
        opportunities.push(opportunity);
      }
    } catch (error) {
      console.error(`Error analyzing market ${market.id}:`, error);
    }
  }

  return opportunities;
}

async function analyzeMarketForModule(
  market: any,
  moduleType: string,
  config: any
): Promise<any | null> {
  const yesPrice = parseFloat(market.outcomePrices?.[0] || '0.5');
  const noPrice = parseFloat(market.outcomePrices?.[1] || '0.5');
  const volume = market.volume24hr || 0;
  const liquidity = market.liquidity || 0;

  switch (moduleType) {
    case 'valueminer':
      return analyzeValueOpportunity(market, yesPrice, noPrice, volume, config);

    case 'arbitrage':
      return analyzeArbitrageOpportunity(market, yesPrice, noPrice, volume, config);

    case 'snipe':
      return analyzeSnipeOpportunity(market, yesPrice, noPrice, liquidity, config);

    case 'trend':
      return analyzeTrendOpportunity(market, yesPrice, noPrice, volume, config);

    case 'whale':
      return analyzeWhaleOpportunity(market, volume, config);

    default:
      return null;
  }
}

function analyzeValueOpportunity(
  market: any,
  yesPrice: number,
  noPrice: number,
  volume: number,
  config: any
): any | null {
  const fairValue = estimateFairValue(market.question || market.title, market.category);

  const yesEdge = (fairValue - yesPrice) * 100;
  const noEdge = ((1 - fairValue) - noPrice) * 100;

  const bestSide = yesEdge > noEdge ? 'YES' : 'NO';
  const bestEdge = Math.max(yesEdge, noEdge);

  if (bestEdge < (config.minEdge || 5)) {
    return null;
  }

  const confidence = calculateConfidence(market.category, volume);
  const priorityScore = (bestEdge / 20) * confidence;

  return {
    moduleType: 'valueminer',
    marketId: market.id,
    marketQuestion: market.question || market.title,
    opportunityType: 'value_bet',
    side: bestSide,
    edgePercent: bestEdge,
    confidenceScore: confidence,
    priorityScore,
    marketOddsYes: yesPrice,
    marketOddsNo: noPrice,
    volume24h: volume,
    liquidity: market.liquidity || 0,
    category: market.category,
    fairValue,
    dedupKey: `value_${market.id}_${bestSide}_${Math.floor(bestEdge)}`
  };
}

function analyzeArbitrageOpportunity(
  market: any,
  yesPrice: number,
  noPrice: number,
  volume: number,
  config: any
): any | null {
  const sum = yesPrice + noPrice;

  if (sum >= 1.0) {
    return null;
  }

  const profit = 1.0 - sum;
  const profitPercent = profit * 100;

  if (profitPercent < (config.minEdge || 2)) {
    return null;
  }

  const confidence = volume > 50000 ? 0.9 : volume > 20000 ? 0.7 : 0.5;
  const priorityScore = profitPercent * confidence;

  return {
    moduleType: 'arbitrage',
    marketId: market.id,
    marketQuestion: market.question || market.title,
    opportunityType: 'arbitrage',
    side: 'BOTH',
    edgePercent: profitPercent,
    confidenceScore: confidence,
    priorityScore,
    marketOddsYes: yesPrice,
    marketOddsNo: noPrice,
    volume24h: volume,
    liquidity: market.liquidity || 0,
    category: market.category,
    profitPercent,
    yesSize: 0.5 / sum,
    noSize: 0.5 / sum,
    dedupKey: `arb_${market.id}_${Math.floor(profitPercent * 10)}`
  };
}

function analyzeSnipeOpportunity(
  market: any,
  yesPrice: number,
  noPrice: number,
  liquidity: number,
  config: any
): any | null {
  const isNewMarket = market.createdAt &&
    (Date.now() - new Date(market.createdAt).getTime()) < 3600000;

  if (!isNewMarket && liquidity > 50000) {
    return null;
  }

  const volatility = Math.abs(yesPrice - 0.5);

  if (volatility < 0.15) {
    return null;
  }

  const edge = volatility * 100;
  const confidence = isNewMarket ? 0.8 : 0.6;
  const priorityScore = edge * confidence * (isNewMarket ? 1.5 : 1.0);

  const bestSide = yesPrice < 0.5 ? 'YES' : 'NO';

  return {
    moduleType: 'snipe',
    marketId: market.id,
    marketQuestion: market.question || market.title,
    opportunityType: isNewMarket ? 'new_market' : 'low_liquidity',
    side: bestSide,
    edgePercent: edge,
    confidenceScore: confidence,
    priorityScore,
    marketOddsYes: yesPrice,
    marketOddsNo: noPrice,
    volume24h: market.volume24hr || 0,
    liquidity,
    category: market.category,
    isNewMarket,
    volatility,
    dedupKey: `snipe_${market.id}_${bestSide}_${Date.now()}`
  };
}

function analyzeTrendOpportunity(
  market: any,
  yesPrice: number,
  noPrice: number,
  volume: number,
  config: any
): any | null {
  if (volume < 10000) {
    return null;
  }

  const momentum = Math.abs(yesPrice - 0.5) * (volume / 50000);

  if (momentum < 0.1) {
    return null;
  }

  const edge = momentum * 100;
  const confidence = Math.min(volume / 100000, 0.9);
  const priorityScore = edge * confidence;

  const bestSide = yesPrice > 0.5 ? 'YES' : 'NO';

  return {
    moduleType: 'trend',
    marketId: market.id,
    marketQuestion: market.question || market.title,
    opportunityType: 'momentum',
    side: bestSide,
    edgePercent: edge,
    confidenceScore: confidence,
    priorityScore,
    marketOddsYes: yesPrice,
    marketOddsNo: noPrice,
    volume24h: volume,
    liquidity: market.liquidity || 0,
    category: market.category,
    momentum,
    dedupKey: `trend_${market.id}_${bestSide}_${Math.floor(edge)}`
  };
}

function analyzeWhaleOpportunity(
  market: any,
  volume: number,
  config: any
): any | null {
  if (volume < 100000) {
    return null;
  }

  const yesPrice = parseFloat(market.outcomePrices?.[0] || '0.5');
  const priceChange = Math.abs(yesPrice - 0.5);

  if (priceChange < 0.1) {
    return null;
  }

  const edge = (priceChange * volume) / 10000;
  const confidence = 0.7;
  const priorityScore = edge * confidence;

  const bestSide = yesPrice > 0.5 ? 'YES' : 'NO';

  return {
    moduleType: 'whale',
    marketId: market.id,
    marketQuestion: market.question || market.title,
    opportunityType: 'whale_activity',
    side: bestSide,
    edgePercent: Math.min(edge, 20),
    confidenceScore: confidence,
    priorityScore,
    marketOddsYes: yesPrice,
    marketOddsNo: parseFloat(market.outcomePrices?.[1] || '0.5'),
    volume24h: volume,
    liquidity: market.liquidity || 0,
    category: market.category,
    whaleVolume: volume,
    priceChange,
    dedupKey: `whale_${market.id}_${Date.now()}`
  };
}

function estimateFairValue(question: string, category: string): number {
  const lowerQuestion = question.toLowerCase();
  const lowerCategory = category.toLowerCase();

  let fairValue = 0.50;

  if (lowerCategory.includes('politics')) {
    fairValue = 0.48;
  } else if (lowerCategory.includes('crypto')) {
    fairValue = 0.45;
  } else if (lowerCategory.includes('sports')) {
    fairValue = 0.50;
  } else if (lowerCategory.includes('weather')) {
    fairValue = 0.50;
  }

  if (lowerQuestion.includes('will')) {
    fairValue *= 0.95;
  }

  if (lowerQuestion.includes('not') || lowerQuestion.includes('won\'t')) {
    fairValue = 1 - fairValue;
  }

  if (lowerQuestion.includes('record') || lowerQuestion.includes('highest')) {
    fairValue *= 0.7;
  }

  return Math.max(0.1, Math.min(0.9, fairValue));
}

function calculateConfidence(category: string, volume: number): number {
  const lowerCategory = category.toLowerCase();

  let baseConfidence = 0.5;

  if (lowerCategory.includes('weather')) {
    baseConfidence = 0.85;
  } else if (lowerCategory.includes('sports')) {
    baseConfidence = 0.75;
  } else if (lowerCategory.includes('politics')) {
    baseConfidence = 0.65;
  } else if (lowerCategory.includes('crypto')) {
    baseConfidence = 0.45;
  }

  if (volume > 100000) {
    baseConfidence += 0.1;
  } else if (volume > 50000) {
    baseConfidence += 0.05;
  } else if (volume < 10000) {
    baseConfidence -= 0.1;
  }

  return Math.max(0.1, Math.min(0.95, baseConfidence));
}

export {};
