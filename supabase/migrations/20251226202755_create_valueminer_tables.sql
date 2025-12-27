-- ValueMiner Schema for Value Betting
-- Creates tables for tracking market edges, positions, signals, and performance

CREATE TABLE IF NOT EXISTS value_markets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id text NOT NULL,
  market_question text NOT NULL,
  category text NOT NULL,
  pm_yes_odds numeric NOT NULL,
  pm_no_odds numeric NOT NULL,
  true_probability numeric,
  edge_yes numeric,
  edge_no numeric,
  best_side text,
  best_edge numeric,
  volume_24h numeric DEFAULT 0,
  data_source text,
  confidence numeric DEFAULT 0.5,
  last_updated timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_value_markets_edge ON value_markets(best_edge DESC);
CREATE INDEX IF NOT EXISTS idx_value_markets_category ON value_markets(category);
CREATE INDEX IF NOT EXISTS idx_value_markets_updated ON value_markets(last_updated DESC);

ALTER TABLE value_markets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Value markets viewable by authenticated users"
  ON value_markets FOR SELECT
  TO authenticated
  USING (true);

CREATE TABLE IF NOT EXISTS value_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  market_id text NOT NULL,
  market_question text NOT NULL,
  side text NOT NULL CHECK (side IN ('YES', 'NO')),
  entry_odds numeric NOT NULL,
  entry_edge numeric NOT NULL,
  position_size numeric NOT NULL,
  kelly_fraction numeric,
  current_odds numeric,
  current_edge numeric,
  pnl numeric DEFAULT 0,
  expected_value numeric,
  status text DEFAULT 'open' CHECK (status IN ('open', 'closed', 'expired')),
  exit_odds numeric,
  exit_reason text,
  opened_at timestamptz DEFAULT now(),
  closed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_value_positions_user ON value_positions(user_id);
CREATE INDEX IF NOT EXISTS idx_value_positions_status ON value_positions(status);
CREATE INDEX IF NOT EXISTS idx_value_positions_market ON value_positions(market_id);

ALTER TABLE value_positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own positions"
  ON value_positions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own positions"
  ON value_positions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own positions"
  ON value_positions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS value_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id text NOT NULL,
  market_question text NOT NULL,
  category text NOT NULL,
  side text NOT NULL CHECK (side IN ('YES', 'NO')),
  edge numeric NOT NULL,
  kelly_bet numeric,
  pm_odds numeric NOT NULL,
  true_prob numeric NOT NULL,
  data_source text,
  confidence numeric DEFAULT 0.5,
  volume_24h numeric DEFAULT 0,
  recommended_size numeric,
  is_executed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_value_signals_edge ON value_signals(edge DESC);
CREATE INDEX IF NOT EXISTS idx_value_signals_created ON value_signals(created_at DESC);

ALTER TABLE value_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Value signals viewable by authenticated users"
  ON value_signals FOR SELECT
  TO authenticated
  USING (true);

CREATE TABLE IF NOT EXISTS external_data_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name text UNIQUE NOT NULL,
  source_type text NOT NULL,
  api_key text,
  is_enabled boolean DEFAULT true,
  last_fetch timestamptz,
  fetch_status text,
  config jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE external_data_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Data sources viewable by authenticated users"
  ON external_data_sources FOR SELECT
  TO authenticated
  USING (true);

CREATE TABLE IF NOT EXISTS performance_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  period text NOT NULL,
  total_bets integer DEFAULT 0,
  winning_bets integer DEFAULT 0,
  win_rate numeric DEFAULT 0,
  total_staked numeric DEFAULT 0,
  total_returns numeric DEFAULT 0,
  total_pnl numeric DEFAULT 0,
  roi numeric DEFAULT 0,
  sharpe_ratio numeric,
  kelly_accuracy numeric,
  edge_accuracy numeric,
  avg_edge numeric,
  best_category text,
  worst_category text,
  calculated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_performance_user ON performance_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_performance_period ON performance_metrics(period);

ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own metrics"
  ON performance_metrics FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
