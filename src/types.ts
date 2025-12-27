export interface GlobalSettings {
  apiBaseUrl: string;
  walletAddress: string;
  walletPrivateKey: string;
  paperTradingMode: boolean;
  useCorsProxy: boolean;
}

export interface Module {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive' | 'not-configured';
  enabled: boolean;
}

export interface DashboardStats {
  totalCapital: number;
  todayPnL: number;
  activePositions: number;
  winRate: number;
}

export interface Activity {
  id: string;
  timestamp: Date;
  module: string;
  action: string;
  amount?: number;
  status: 'success' | 'error' | 'pending';
}

export interface PolymarketMarket {
  id: string;
  question: string;
  description?: string;
  outcomes: string[];
  category?: string;
  volume: number;
  liquidity: number;
  bestBid: number;
  bestAsk: number;
  spread: number;
  endDate?: string;
  active: boolean;
}

export interface OrderBookEntry {
  price: number;
  size: number;
}

export interface OrderBook {
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
  timestamp: number;
}

export interface MarketPrices {
  bestBid: number;
  bestAsk: number;
  spread: number;
  midPrice: number;
}

export interface MarketFilters {
  searchQuery: string;
  category: string;
  minVolume: number;
  maxSpread: number;
  minLiquidity?: number;
}
