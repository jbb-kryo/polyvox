export interface SnipeMasterSettings {
  enabled: boolean;
  minProfitPercent: number;
  maxPositionSize: number;
  targetDiscount: number;
  timeoutMinutes: number;
  autoExecute: boolean;
  realTradingMode: boolean;
  dailyLossLimit: number;
  scanInterval: number;
  maxConcurrentOrders: number;
  enableLaddering: boolean;
  ladderOrders: number;
  resubmitAfterCancel: boolean;
  maxResubmits: number;
  minLiquidity: number;
  maxSpread: number;
}

export interface SnipeOrder {
  id: string;
  marketId: string;
  marketTitle: string;
  side: 'yes' | 'no';
  currentPrice: number;
  limitPrice: number;
  discount: number;
  size: number;
  status: 'pending' | 'filled' | 'cancelled' | 'expired';
  createdAt: Date;
  filledAt?: Date;
  confidence?: number;
  expectedFillTime?: number;
  orderBookScore?: number;
  resubmitCount?: number;
  ladderIndex?: number;
}

export interface SnipePosition {
  id: string;
  marketId: string;
  marketTitle: string;
  side: 'yes' | 'no';
  entryPrice: number;
  currentPrice: number;
  size: number;
  pnl: number;
  pnlPercent: number;
  openedAt: Date;
}

export interface SnipeMetrics {
  totalOrders: number;
  filledOrders: number;
  avgDiscount: number;
  totalPnL: number;
  fillRate?: number;
  avgFillTime?: number;
  cancelledOrders?: number;
  expiredOrders?: number;
}
