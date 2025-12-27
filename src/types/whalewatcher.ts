export interface WhaleOrder {
  id: string;
  timestamp: Date;
  walletAddress: string;
  walletLabel?: string;
  market: string;
  marketId: string;
  side: 'YES' | 'NO';
  size: number;
  price: number;
  priceImpact: number;
  status: 'detected' | 'copied' | 'ignored';
}

export interface WhaleProfile {
  walletAddress: string;
  label?: string;
  totalVolume: number;
  totalOrders: number;
  winRate: number;
  avgOrderSize: number;
  profitLoss: number;
  lastActive: Date;
  isWhitelisted: boolean;
  isBlacklisted: boolean;
}

export interface CopiedPosition {
  id: string;
  whaleOrderId: string;
  whaleWallet: string;
  market: string;
  marketId: string;
  side: 'YES' | 'NO';
  entryPrice: number;
  currentPrice: number;
  positionSize: number;
  whaleOrderSize: number;
  entryTime: Date;
  exitTime?: Date;
  exitPrice?: number;
  pnl: number;
  pnlPercent: number;
  status: 'open' | 'closed' | 'pending';
  exitReason?: 'whale_exit' | 'take_profit' | 'stop_loss' | 'timeout' | 'manual';
}

export interface WhaleWatcherSettings {
  realTradingMode: boolean;
  minWhaleOrderSize: number;
  copyPositionMode: 'fixed' | 'percentage';
  copyPositionSize: number;
  copyPositionPercent: number;
  monitorAllMarkets: boolean;
  categoryWhitelist: string[];
  whaleWhitelist: string[];
  whaleBlacklist: string[];
  exitStrategy: 'follow_whale' | 'independent' | 'hybrid';
  takeProfitPercent: number;
  stopLossPercent: number;
  maxConcurrentCopies: number;
  maxCopiesPerWhale: number;
  dailyLossLimit: number;
  autoExecute: boolean;
  alerts: {
    browser: boolean;
    sound: boolean;
    email: boolean;
    telegram: boolean;
    webhookUrl?: string;
  };
  scanInterval: 10 | 30 | 60;
}

export interface WhaleAlert {
  id: string;
  type: 'whale_detected' | 'position_copied' | 'position_closed' | 'whale_exit';
  timestamp: Date;
  message: string;
  whaleOrder?: WhaleOrder;
  position?: CopiedPosition;
  read: boolean;
}

export interface WhaleAnalytics {
  totalCopied: number;
  successfulCopies: number;
  winRate: number;
  totalPnL: number;
  avgPnL: number;
  bestWhale: {
    wallet: string;
    winRate: number;
    pnl: number;
  };
  bestCategory: {
    category: string;
    winRate: number;
    pnl: number;
  };
  hourlyActivity: Array<{
    hour: number;
    orderCount: number;
    avgSize: number;
  }>;
  performanceByWhale: Array<{
    wallet: string;
    copied: number;
    winRate: number;
    pnl: number;
  }>;
  performanceByCategory: Array<{
    category: string;
    copied: number;
    winRate: number;
    pnl: number;
  }>;
}

export interface WhaleWatcherMetrics {
  activeWhales: number;
  ordersToday: number;
  copiedToday: number;
  totalPnL: number;
  winRate: number;
  avgWhaleSize: number;
  largestWhaleToday: number;
  activeCopies: number;
}
