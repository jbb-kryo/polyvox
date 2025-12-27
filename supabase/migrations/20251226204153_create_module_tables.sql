/*
  # Create Trading Module Tables

  1. New Tables
    - `arbitrage_opportunities` - Detected arbitrage opportunities
      - `id` (uuid, primary key)
      - `market1_id` (text)
      - `market1_question` (text)
      - `market1_price` (numeric)
      - `market2_id` (text)
      - `market2_question` (text)
      - `market2_price` (numeric)
      - `combined_probability` (numeric)
      - `profit_percent` (numeric)
      - `is_executed` (boolean)
      - `created_at` (timestamptz)
    
    - `arbitrage_positions` - Active arbitrage positions
      - `id` (uuid, primary key)
      - `user_id` (uuid)
      - `market_pair` (text)
      - `market1_id` (text)
      - `market2_id` (text)
      - `entry_price_m1` (numeric)
      - `entry_price_m2` (numeric)
      - `current_price_m1` (numeric)
      - `current_price_m2` (numeric)
      - `position_size` (numeric)
      - `pnl` (numeric)
      - `pnl_percent` (numeric)
      - `status` (text: open, closed)
      - `opened_at` (timestamptz)
      - `closed_at` (timestamptz, nullable)
    
    - `arbitrage_trades` - Completed arbitrage trades
      - `id` (uuid, primary key)
      - `user_id` (uuid)
      - `market_pair` (text)
      - `entry_price_m1` (numeric)
      - `entry_price_m2` (numeric)
      - `exit_price_m1` (numeric)
      - `exit_price_m2` (numeric)
      - `position_size` (numeric)
      - `profit` (numeric)
      - `profit_percent` (numeric)
      - `duration_minutes` (integer)
      - `fees` (numeric)
      - `opened_at` (timestamptz)
      - `closed_at` (timestamptz)
    
    - `trend_positions` - Active trend riding positions
      - `id` (uuid, primary key)
      - `user_id` (uuid)
      - `market_id` (text)
      - `market_question` (text)
      - `direction` (text: long, short)
      - `entry_price` (numeric)
      - `current_price` (numeric)
      - `position_size` (numeric)
      - `profit_target` (numeric)
      - `stop_loss` (numeric)
      - `pnl` (numeric)
      - `pnl_percent` (numeric)
      - `highest_price` (numeric)
      - `lowest_price` (numeric)
      - `status` (text: open, closed)
      - `opened_at` (timestamptz)
      - `closed_at` (timestamptz, nullable)
    
    - `trend_trades` - Completed trend trades
      - `id` (uuid, primary key)
      - `user_id` (uuid)
      - `market_id` (text)
      - `market_question` (text)
      - `direction` (text: long, short)
      - `entry_price` (numeric)
      - `exit_price` (numeric)
      - `position_size` (numeric)
      - `profit` (numeric)
      - `profit_percent` (numeric)
      - `exit_reason` (text: profit_target, stop_loss, manual, time_limit)
      - `duration_minutes` (integer)
      - `fees` (numeric)
      - `max_drawdown` (numeric)
      - `opened_at` (timestamptz)
      - `closed_at` (timestamptz)
    
    - `snipe_orders` - Active snipe orders
      - `id` (uuid, primary key)
      - `user_id` (uuid)
      - `market_id` (text)
      - `market_title` (text)
      - `side` (text: YES, NO)
      - `current_price` (numeric)
      - `limit_price` (numeric)
      - `discount_percent` (numeric)
      - `size` (numeric)
      - `status` (text: pending, filled, cancelled, expired)
      - `created_at` (timestamptz)
      - `filled_at` (timestamptz, nullable)
      - `expires_at` (timestamptz, nullable)
    
    - `snipe_positions` - Active snipe positions
      - `id` (uuid, primary key)
      - `user_id` (uuid)
      - `order_id` (uuid, references snipe_orders)
      - `market_id` (text)
      - `market_title` (text)
      - `side` (text: YES, NO)
      - `entry_price` (numeric)
      - `current_price` (numeric)
      - `size` (numeric)
      - `pnl` (numeric)
      - `pnl_percent` (numeric)
      - `opened_at` (timestamptz)
    
    - `module_performance` - Aggregated performance by module
      - `id` (uuid, primary key)
      - `user_id` (uuid)
      - `module_name` (text: arbitrage, trend, snipe, whale, value)
      - `period` (text: daily, weekly, monthly, all_time)
      - `date` (date)
      - `total_trades` (integer)
      - `winning_trades` (integer)
      - `win_rate` (numeric)
      - `total_pnl` (numeric)
      - `total_fees` (numeric)
      - `roi` (numeric)
      - `sharpe_ratio` (numeric)
      - `max_drawdown` (numeric)
      - `avg_trade_duration` (integer)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
*/

-- Arbitrage Opportunities
CREATE TABLE IF NOT EXISTS arbitrage_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  market1_id text NOT NULL,
  market1_question text NOT NULL,
  market1_price numeric NOT NULL,
  market2_id text NOT NULL,
  market2_question text NOT NULL,
  market2_price numeric NOT NULL,
  combined_probability numeric NOT NULL,
  profit_percent numeric NOT NULL,
  is_executed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE arbitrage_opportunities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view arbitrage opportunities"
  ON arbitrage_opportunities FOR SELECT
  TO authenticated
  USING (true);

-- Arbitrage Positions
CREATE TABLE IF NOT EXISTS arbitrage_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  market_pair text NOT NULL,
  market1_id text NOT NULL,
  market2_id text NOT NULL,
  entry_price_m1 numeric NOT NULL,
  entry_price_m2 numeric NOT NULL,
  current_price_m1 numeric,
  current_price_m2 numeric,
  position_size numeric NOT NULL,
  pnl numeric DEFAULT 0,
  pnl_percent numeric DEFAULT 0,
  status text DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  opened_at timestamptz DEFAULT now(),
  closed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE arbitrage_positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own arbitrage positions"
  ON arbitrage_positions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own arbitrage positions"
  ON arbitrage_positions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own arbitrage positions"
  ON arbitrage_positions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Arbitrage Trades
CREATE TABLE IF NOT EXISTS arbitrage_trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  market_pair text NOT NULL,
  entry_price_m1 numeric NOT NULL,
  entry_price_m2 numeric NOT NULL,
  exit_price_m1 numeric NOT NULL,
  exit_price_m2 numeric NOT NULL,
  position_size numeric NOT NULL,
  profit numeric NOT NULL,
  profit_percent numeric NOT NULL,
  duration_minutes integer DEFAULT 0,
  fees numeric DEFAULT 0,
  opened_at timestamptz NOT NULL,
  closed_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE arbitrage_trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own arbitrage trades"
  ON arbitrage_trades FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own arbitrage trades"
  ON arbitrage_trades FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Trend Positions
CREATE TABLE IF NOT EXISTS trend_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  market_id text NOT NULL,
  market_question text NOT NULL,
  direction text NOT NULL CHECK (direction IN ('long', 'short')),
  entry_price numeric NOT NULL,
  current_price numeric,
  position_size numeric NOT NULL,
  profit_target numeric NOT NULL,
  stop_loss numeric NOT NULL,
  pnl numeric DEFAULT 0,
  pnl_percent numeric DEFAULT 0,
  highest_price numeric,
  lowest_price numeric,
  status text DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  opened_at timestamptz DEFAULT now(),
  closed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE trend_positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own trend positions"
  ON trend_positions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own trend positions"
  ON trend_positions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trend positions"
  ON trend_positions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trend Trades
CREATE TABLE IF NOT EXISTS trend_trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  market_id text NOT NULL,
  market_question text NOT NULL,
  direction text NOT NULL CHECK (direction IN ('long', 'short')),
  entry_price numeric NOT NULL,
  exit_price numeric NOT NULL,
  position_size numeric NOT NULL,
  profit numeric NOT NULL,
  profit_percent numeric NOT NULL,
  exit_reason text NOT NULL CHECK (exit_reason IN ('profit_target', 'stop_loss', 'manual', 'time_limit')),
  duration_minutes integer DEFAULT 0,
  fees numeric DEFAULT 0,
  max_drawdown numeric DEFAULT 0,
  opened_at timestamptz NOT NULL,
  closed_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE trend_trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own trend trades"
  ON trend_trades FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own trend trades"
  ON trend_trades FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Snipe Orders
CREATE TABLE IF NOT EXISTS snipe_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  market_id text NOT NULL,
  market_title text NOT NULL,
  side text NOT NULL CHECK (side IN ('YES', 'NO')),
  current_price numeric NOT NULL,
  limit_price numeric NOT NULL,
  discount_percent numeric NOT NULL,
  size numeric NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'filled', 'cancelled', 'expired')),
  created_at timestamptz DEFAULT now(),
  filled_at timestamptz,
  expires_at timestamptz
);

ALTER TABLE snipe_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own snipe orders"
  ON snipe_orders FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own snipe orders"
  ON snipe_orders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own snipe orders"
  ON snipe_orders FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Snipe Positions
CREATE TABLE IF NOT EXISTS snipe_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  order_id uuid REFERENCES snipe_orders(id),
  market_id text NOT NULL,
  market_title text NOT NULL,
  side text NOT NULL CHECK (side IN ('YES', 'NO')),
  entry_price numeric NOT NULL,
  current_price numeric,
  size numeric NOT NULL,
  pnl numeric DEFAULT 0,
  pnl_percent numeric DEFAULT 0,
  opened_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE snipe_positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own snipe positions"
  ON snipe_positions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own snipe positions"
  ON snipe_positions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own snipe positions"
  ON snipe_positions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Module Performance
CREATE TABLE IF NOT EXISTS module_performance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  module_name text NOT NULL CHECK (module_name IN ('arbitrage', 'trend', 'snipe', 'whale', 'value')),
  period text NOT NULL CHECK (period IN ('daily', 'weekly', 'monthly', 'all_time')),
  date date NOT NULL,
  total_trades integer DEFAULT 0,
  winning_trades integer DEFAULT 0,
  win_rate numeric DEFAULT 0,
  total_pnl numeric DEFAULT 0,
  total_fees numeric DEFAULT 0,
  roi numeric DEFAULT 0,
  sharpe_ratio numeric,
  max_drawdown numeric,
  avg_trade_duration integer DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, module_name, period, date)
);

ALTER TABLE module_performance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own module performance"
  ON module_performance FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own module performance"
  ON module_performance FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own module performance"
  ON module_performance FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_arbitrage_positions_user ON arbitrage_positions(user_id);
CREATE INDEX IF NOT EXISTS idx_arbitrage_trades_user ON arbitrage_trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trend_positions_user ON trend_positions(user_id);
CREATE INDEX IF NOT EXISTS idx_trend_trades_user ON trend_trades(user_id);
CREATE INDEX IF NOT EXISTS idx_snipe_orders_user ON snipe_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_snipe_positions_user ON snipe_positions(user_id);
CREATE INDEX IF NOT EXISTS idx_module_performance_user ON module_performance(user_id, module_name, period);
