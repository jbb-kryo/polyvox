export interface ModulePerformance {
  moduleName: 'arbitrage' | 'trend' | 'snipe' | 'whale' | 'value';
  totalTrades: number;
  winningTrades: number;
  winRate: number;
  totalPnL: number;
  totalFees: number;
  roi: number;
  sharpeRatio: number | null;
  maxDrawdown: number | null;
  avgTradeDuration: number;
}

export interface RiskMetrics {
  sharpeRatio: number | null;
  maxDrawdown: number | null;
  maxDrawdownPercent: number | null;
  volatility: number | null;
  calmarRatio: number | null;
  sortinoRatio: number | null;
  valueAtRisk: number | null;
  expectedShortfall: number | null;
}

export interface TradeCalendarDay {
  date: string;
  pnl: number;
  trades: number;
  winRate: number;
}

export interface ProfitAttribution {
  module: string;
  profit: number;
  profitPercent: number;
  trades: number;
  avgProfit: number;
  contribution: number;
}

export interface AnalyticsTimeframe {
  label: string;
  days: number;
}

export interface ModuleComparison {
  module: string;
  totalPnL: number;
  winRate: number;
  trades: number;
  avgProfit: number;
  sharpeRatio: number | null;
  roi: number;
}

export interface PerformanceChart {
  date: string;
  cumulative_pnl: number;
  daily_pnl: number;
  trades: number;
}

export interface CategoryPerformance {
  category: string;
  totalPnL: number;
  trades: number;
  winRate: number;
  avgProfit: number;
}
