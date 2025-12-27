export interface ValueMinerSettings {
  minEdge: number;
  maxEdge: number;
  categoryFilters: string[];
  minVolume: number;
  autoTradeEnabled: boolean;
  autoTradeMinEdge: number;
  positionSizingMethod: 'kelly' | 'fixed_percent' | 'fixed_amount';
  kellyFraction: number;
  fixedPercent: number;
  fixedAmount: number;
  maxPositionPercent: number;
  maxCategoryPercent: number;
  diversificationRules: {
    maxPerMarket: number;
    maxPerCategory: number;
    maxCorrelation: number;
  };
  exitRules: {
    exitWhenEdgeGone: boolean;
    minEdgeToHold: number;
    autoExitOnExpiry: boolean;
    stopLossPercent: number;
  };
  dataSources: {
    use538: boolean;
    useWeather: boolean;
    useSportsOdds: boolean;
    useHistoricalRates: boolean;
    allowManualInputs: boolean;
  };
  realTradingMode: boolean;
}

export interface ValueMarket {
  id: string;
  market_id: string;
  market_question: string;
  category: string;
  pm_yes_odds: number;
  pm_no_odds: number;
  true_probability: number | null;
  edge_yes: number | null;
  edge_no: number | null;
  best_side: 'YES' | 'NO' | null;
  best_edge: number | null;
  volume_24h: number;
  data_source: string | null;
  confidence: number;
  last_updated: string;
  created_at: string;
}

export interface ValuePosition {
  id: string;
  user_id: string;
  market_id: string;
  market_question: string;
  side: 'YES' | 'NO';
  entry_odds: number;
  entry_edge: number;
  position_size: number;
  kelly_fraction: number | null;
  current_odds: number | null;
  current_edge: number | null;
  pnl: number;
  expected_value: number | null;
  status: 'open' | 'closed' | 'expired';
  exit_odds: number | null;
  exit_reason: string | null;
  opened_at: string;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ValueSignal {
  id: string;
  market_id: string;
  market_question: string;
  category: string;
  side: 'YES' | 'NO';
  edge: number;
  kelly_bet: number | null;
  pm_odds: number;
  true_prob: number;
  data_source: string | null;
  confidence: number;
  volume_24h: number;
  recommended_size: number | null;
  is_executed: boolean;
  created_at: string;
}

export interface ExternalDataSource {
  id: string;
  source_name: string;
  source_type: 'polls' | 'weather' | 'sports' | 'manual';
  api_key: string | null;
  is_enabled: boolean;
  last_fetch: string | null;
  fetch_status: string | null;
  config: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export interface PerformanceMetrics {
  id: string;
  user_id: string;
  period: 'daily' | 'weekly' | 'monthly' | 'all_time';
  total_bets: number;
  winning_bets: number;
  win_rate: number;
  total_staked: number;
  total_returns: number;
  total_pnl: number;
  roi: number;
  sharpe_ratio: number | null;
  kelly_accuracy: number | null;
  edge_accuracy: number | null;
  avg_edge: number | null;
  best_category: string | null;
  worst_category: string | null;
  calculated_at: string;
}

export interface PortfolioRecommendation {
  market_id: string;
  market_question: string;
  side: 'YES' | 'NO';
  edge: number;
  recommended_size: number;
  kelly_fraction: number;
  expected_value: number;
  risk_score: number;
  priority: number;
}

export interface CategoryPerformance {
  category: string;
  total_bets: number;
  winning_bets: number;
  win_rate: number;
  total_pnl: number;
  roi: number;
  avg_edge: number;
}

export interface ValueMinerMetrics {
  totalSignals: number;
  highEdgeSignals: number;
  openPositions: number;
  totalPnL: number;
  roi: number;
  winRate: number;
}
