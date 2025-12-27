export interface ArbitrageOpportunity {
  id: string;
  marketPair: {
    market1: {
      id: string;
      question: string;
      price: number;
      tokenId?: string;
    };
    market2: {
      id: string;
      question: string;
      price: number;
      tokenId?: string;
    };
  };
  combinedProbability: number;
  profitPercent: number;
  timestamp: number;
}

export interface ArbitragePosition {
  id: string;
  marketPair: string;
  entryPrices: {
    market1: number;
    market2: number;
  };
  currentPrices: {
    market1: number;
    market2: number;
  };
  positionSize: number;
  entryTime: number;
  currentPnL: number;
  pnLPercent: number;
  isReal?: boolean;
  orderIds?: {
    market1: string;
    market2: string;
  };
  status?: 'pending' | 'open' | 'closing' | 'closed';
  txHashes?: string[];
}

export interface ArbitrageTrade {
  id: string;
  marketPair: string;
  entryPrices: {
    market1: number;
    market2: number;
  };
  exitPrices: {
    market1: number;
    market2: number;
  };
  positionSize: number;
  profit: number;
  profitPercent: number;
  entryTime: number;
  exitTime: number;
  duration: number;
  isReal?: boolean;
  fees?: number;
  gasCosts?: number;
  netProfit?: number;
  txHashes?: string[];
}

export interface ArbitrageSettings {
  minSpreadPercent: number;
  positionSize: number;
  maxConcurrentPositions: number;
  autoExecute: boolean;
  scanInterval: 30 | 60 | 120;
  isScanning: boolean;
  realTradingMode: boolean;
  dailyLossLimit: number;
}

export interface ArbitrageMetrics {
  totalTrades: number;
  winRate: number;
  avgProfitPerTrade: number;
  totalPnL: number;
  bestTrade: number;
  worstTrade: number;
  totalFees?: number;
  totalGasCosts?: number;
}

export interface TradingSafetyCheck {
  passed: boolean;
  errors: string[];
  warnings: string[];
  balanceCheck: boolean;
  marketActiveCheck: boolean;
  spreadStillExistsCheck: boolean;
  estimatedGas: number;
}
