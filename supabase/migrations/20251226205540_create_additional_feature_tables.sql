/*
  # Additional Feature Support Tables

  1. New Tables
    - `snipe_trades` - Completed snipe trades history
      - `id` (uuid, primary key)
      - `user_id` (uuid) - User who made the trade
      - `market_id` (text) - Market ID
      - `market_title` (text) - Market question
      - `side` (text: YES, NO) - Trade side
      - `entry_price` (numeric) - Entry price
      - `exit_price` (numeric) - Exit price
      - `size` (numeric) - Position size
      - `profit` (numeric) - Profit amount
      - `profit_percent` (numeric) - Profit percentage
      - `entry_discount` (numeric) - Discount at entry
      - `duration_minutes` (integer) - How long position was held
      - `fees` (numeric) - Trading fees
      - `opened_at` (timestamptz) - When position opened
      - `closed_at` (timestamptz) - When position closed
    
    - `trend_opportunities` - Detected momentum opportunities
      - `id` (uuid, primary key)
      - `market_id` (text) - Market ID
      - `market_question` (text) - Market question
      - `category` (text) - Market category
      - `current_price` (numeric) - Current market price
      - `previous_price` (numeric) - Previous price
      - `price_change` (numeric) - Price change amount
      - `price_change_percent` (numeric) - Price change percentage
      - `velocity` (numeric) - Price velocity indicator
      - `volume` (numeric) - 24h volume
      - `direction` (text: bullish, bearish) - Momentum direction
      - `strength` (numeric) - Signal strength
      - `is_executed` (boolean) - Whether trade was executed
      - `created_at` (timestamptz)
    
    - `user_module_settings` - User-specific module configurations
      - `id` (uuid, primary key)
      - `user_id` (uuid) - User ID
      - `module_name` (text) - Module identifier
      - `settings` (jsonb) - JSON settings object
      - `is_enabled` (boolean) - Whether module is active
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `market_watchlist` - User market watchlist
      - `id` (uuid, primary key)
      - `user_id` (uuid) - User ID
      - `market_id` (text) - Market ID
      - `market_question` (text) - Market question
      - `notes` (text, nullable) - User notes
      - `alert_price` (numeric, nullable) - Price alert threshold
      - `created_at` (timestamptz)
    
    - `trade_analytics` - Aggregated trade analytics
      - `id` (uuid, primary key)
      - `user_id` (uuid) - User ID
      - `date` (date) - Analytics date
      - `total_trades` (integer) - Total trades
      - `winning_trades` (integer) - Winning trades
      - `total_pnl` (numeric) - Total P&L
      - `total_fees` (numeric) - Total fees paid
      - `best_trade` (numeric) - Best trade profit
      - `worst_trade` (numeric) - Worst trade loss
      - `avg_hold_time` (integer) - Average hold time in minutes
      - `module_breakdown` (jsonb) - Breakdown by module
      - `category_breakdown` (jsonb) - Breakdown by category
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Users can only access their own data
    - Opportunities viewable by all authenticated users
*/

-- Snipe Trades
CREATE TABLE IF NOT EXISTS snipe_trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  market_id text NOT NULL,
  market_title text NOT NULL,
  side text NOT NULL CHECK (side IN ('YES', 'NO')),
  entry_price numeric NOT NULL,
  exit_price numeric NOT NULL,
  size numeric NOT NULL,
  profit numeric NOT NULL,
  profit_percent numeric NOT NULL,
  entry_discount numeric DEFAULT 0,
  duration_minutes integer DEFAULT 0,
  fees numeric DEFAULT 0,
  opened_at timestamptz NOT NULL,
  closed_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_snipe_trades_user ON snipe_trades(user_id);
CREATE INDEX IF NOT EXISTS idx_snipe_trades_closed ON snipe_trades(closed_at DESC);

ALTER TABLE snipe_trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own snipe trades"
  ON snipe_trades FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own snipe trades"
  ON snipe_trades FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Trend Opportunities
CREATE TABLE IF NOT EXISTS trend_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id text NOT NULL,
  market_question text NOT NULL,
  category text NOT NULL,
  current_price numeric NOT NULL,
  previous_price numeric NOT NULL,
  price_change numeric NOT NULL,
  price_change_percent numeric NOT NULL,
  velocity numeric NOT NULL,
  volume numeric DEFAULT 0,
  direction text NOT NULL CHECK (direction IN ('bullish', 'bearish')),
  strength numeric NOT NULL,
  is_executed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trend_opps_strength ON trend_opportunities(strength DESC);
CREATE INDEX IF NOT EXISTS idx_trend_opps_created ON trend_opportunities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trend_opps_market ON trend_opportunities(market_id);

ALTER TABLE trend_opportunities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trend opportunities viewable by authenticated users"
  ON trend_opportunities FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can insert trend opportunities"
  ON trend_opportunities FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- User Module Settings
CREATE TABLE IF NOT EXISTS user_module_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  module_name text NOT NULL CHECK (module_name IN ('arbitrage', 'trend', 'snipe', 'whale', 'value')),
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, module_name)
);

CREATE INDEX IF NOT EXISTS idx_module_settings_user ON user_module_settings(user_id);

ALTER TABLE user_module_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own module settings"
  ON user_module_settings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own module settings"
  ON user_module_settings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own module settings"
  ON user_module_settings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Market Watchlist
CREATE TABLE IF NOT EXISTS market_watchlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  market_id text NOT NULL,
  market_question text NOT NULL,
  notes text,
  alert_price numeric,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, market_id)
);

CREATE INDEX IF NOT EXISTS idx_watchlist_user ON market_watchlist(user_id);

ALTER TABLE market_watchlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own watchlist"
  ON market_watchlist FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own watchlist items"
  ON market_watchlist FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own watchlist items"
  ON market_watchlist FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own watchlist items"
  ON market_watchlist FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Trade Analytics
CREATE TABLE IF NOT EXISTS trade_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  date date NOT NULL,
  total_trades integer DEFAULT 0,
  winning_trades integer DEFAULT 0,
  total_pnl numeric DEFAULT 0,
  total_fees numeric DEFAULT 0,
  best_trade numeric DEFAULT 0,
  worst_trade numeric DEFAULT 0,
  avg_hold_time integer DEFAULT 0,
  module_breakdown jsonb DEFAULT '{}'::jsonb,
  category_breakdown jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_trade_analytics_user ON trade_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_trade_analytics_date ON trade_analytics(date DESC);

ALTER TABLE trade_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own trade analytics"
  ON trade_analytics FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own trade analytics"
  ON trade_analytics FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trade analytics"
  ON trade_analytics FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
