export interface TrendIndicators {
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

export interface MomentumOpportunity {
  id: string;
  market: {
    id: string;
    question: string;
    currentPrice: number;
    previousPrice: number;
    priceChange: number;
    priceChangePercent: number;
    velocity: number;
    volume?: number;
    spread?: number;
    category?: string;
    tokenId?: string;
  };
  direction: 'bullish' | 'bearish';
  strength: number;
  timestamp: number;
  indicators?: TrendIndicators;
  trendConfirmed?: boolean;
  volumeTrend?: 'increasing' | 'decreasing' | 'stable';
}

export interface TrendPosition {
  id: string;
  marketQuestion: string;
  marketId: string;
  direction: 'long' | 'short';
  entryPrice: number;
  currentPrice: number;
  positionSize: number;
  entryTime: number;
  currentPnL: number;
  pnLPercent: number;
  profitTarget: number;
  stopLoss: number;
  isReal?: boolean;
  orderId?: string;
  status?: 'pending' | 'open' | 'closing' | 'closed';
  txHashes?: string[];
  highestPrice?: number;
  lowestPrice?: number;
}

export interface TrendTrade {
  id: string;
  marketQuestion: string;
  direction: 'long' | 'short';
  entryPrice: number;
  exitPrice: number;
  positionSize: number;
  profit: number;
  profitPercent: number;
  entryTime: number;
  exitTime: number;
  duration: number;
  exitReason: 'profit_target' | 'stop_loss' | 'manual' | 'time_limit';
  isReal?: boolean;
  fees?: number;
  gasCosts?: number;
  netProfit?: number;
  txHashes?: string[];
  maxDrawdown?: number;
}

export interface MarketFilters {
  minVolume: number;
  maxSpread: number;
  categoryWhitelist: string[];
}

export interface TrendRiderSettings {
  minMomentumPercent: number;
  positionSize: number;
  positionSizeMode: 'fixed' | 'percent';
  positionSizePercent: number;
  totalCapital: number;
  maxConcurrentPositions: number;
  profitTargetPercent: number;
  stopLossPercent: number;
  trailingStopEnabled: boolean;
  trailingStopPercent: number;
  maxHoldTime: number;
  autoExecute: boolean;
  scanInterval: 30 | 60 | 120;
  isScanning: boolean;
  realTradingMode: boolean;
  dailyLossLimit: number;
  momentumWindow: 5 | 10 | 15 | 60;
  marketFilters: MarketFilters;
  cooldownEnabled: boolean;
  cooldownMinutes: number;
  lastLossTime: number | null;
}

export interface TrendRiderMetrics {
  totalTrades: number;
  winRate: number;
  avgProfitPerTrade: number;
  totalPnL: number;
  bestTrade: number;
  worstTrade: number;
  avgHoldTime: number;
  profitTargetHits: number;
  stopLossHits: number;
  totalFees?: number;
  totalGasCosts?: number;
  sharpeRatio?: number;
}

export interface PriceHistoryPoint {
  timestamp: number;
  price: number;
  volume?: number;
}

export interface MarketMomentumData {
  marketId: string;
  priceHistory: PriceHistoryPoint[];
  currentVelocity: number;
  averageVelocity: number;
  lastUpdate: number;
}
