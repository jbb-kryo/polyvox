/*
  # Auto-Execution Engine Tables

  1. New Tables
    - `auto_execution_settings`
      - Per-module auto-execution configuration
      - Enable/disable auto-trading
      - Execution criteria and thresholds
      - Position sizing settings
    
    - `execution_logs`
      - Complete audit trail of all executions
      - Success/failure tracking
      - Detailed metadata
      - Links to opportunities
    
    - `position_limits`
      - User-configurable risk limits
      - Per-market, per-module, and global limits
      - Daily/weekly exposure caps
    
    - `active_positions`
      - Real-time position tracking
      - Current exposure by market/module
      - Auto-updated on execution
    
    - `emergency_stop`
      - Emergency stop state per user
      - Reason and timestamp tracking
      - Auto-stop triggers

  2. Security
    - Enable RLS on all tables
    - Users can only access their own data
    - Strict authentication requirements

  3. Safety Features
    - Position limit checks
    - Balance verification
    - Daily exposure caps
    - Emergency stop enforcement
*/

-- Auto-execution settings table
CREATE TABLE IF NOT EXISTS auto_execution_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  module_type text NOT NULL CHECK (module_type IN ('valueminer', 'arbitrage', 'snipe', 'trend', 'whale')),
  
  -- Enable/disable
  is_enabled boolean NOT NULL DEFAULT false,
  
  -- Execution criteria
  min_edge_percent numeric NOT NULL DEFAULT 5,
  min_confidence_score numeric NOT NULL DEFAULT 0.7,
  min_priority_score numeric NOT NULL DEFAULT 0.6,
  min_liquidity numeric NOT NULL DEFAULT 10000,
  min_volume_24h numeric NOT NULL DEFAULT 10000,
  
  -- Position sizing
  position_size_mode text NOT NULL DEFAULT 'fixed' CHECK (position_size_mode IN ('fixed', 'kelly', 'percentage')),
  fixed_position_size numeric DEFAULT 100,
  kelly_fraction numeric DEFAULT 0.25,
  max_position_size numeric NOT NULL DEFAULT 1000,
  min_position_size numeric NOT NULL DEFAULT 10,
  
  -- Risk limits
  max_positions_per_market integer NOT NULL DEFAULT 1,
  max_daily_trades integer NOT NULL DEFAULT 20,
  max_daily_exposure numeric NOT NULL DEFAULT 5000,
  
  -- Execution behavior
  require_manual_approval boolean NOT NULL DEFAULT false,
  stop_on_loss boolean NOT NULL DEFAULT true,
  stop_loss_threshold numeric DEFAULT -500,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- One config per module per user
  UNIQUE (user_id, module_type)
);

-- Execution logs table (audit trail)
CREATE TABLE IF NOT EXISTS execution_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Execution details
  module_type text NOT NULL CHECK (module_type IN ('valueminer', 'arbitrage', 'snipe', 'trend', 'whale')),
  opportunity_id uuid REFERENCES scan_opportunities(id) ON DELETE SET NULL,
  market_id text NOT NULL,
  market_question text NOT NULL,
  
  -- Trade details
  side text NOT NULL CHECK (side IN ('YES', 'NO', 'BOTH')),
  position_size numeric NOT NULL,
  entry_price numeric NOT NULL,
  expected_edge numeric,
  
  -- Execution status
  execution_status text NOT NULL DEFAULT 'pending' CHECK (execution_status IN ('pending', 'submitted', 'filled', 'partial', 'failed', 'cancelled', 'rolled_back')),
  failure_reason text,
  
  -- Safety check results
  safety_checks_passed boolean NOT NULL DEFAULT false,
  safety_check_results jsonb DEFAULT '{}'::jsonb,
  
  -- Financial impact
  execution_cost numeric,
  gas_cost numeric,
  total_cost numeric,
  expected_profit numeric,
  actual_profit numeric,
  
  -- Order details
  order_id text,
  transaction_hash text,
  filled_amount numeric,
  average_fill_price numeric,
  
  -- Mode
  is_paper_trading boolean NOT NULL DEFAULT true,
  is_auto_executed boolean NOT NULL DEFAULT true,
  
  -- Metadata
  execution_metadata jsonb DEFAULT '{}'::jsonb,
  
  -- Timestamps
  evaluated_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  filled_at timestamptz,
  failed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Position limits table
CREATE TABLE IF NOT EXISTS position_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Limit type
  limit_type text NOT NULL CHECK (limit_type IN ('global', 'per_module', 'per_market', 'per_category')),
  limit_scope text NOT NULL,
  
  -- Limits
  max_position_size numeric NOT NULL DEFAULT 1000,
  max_total_exposure numeric NOT NULL DEFAULT 10000,
  max_open_positions integer NOT NULL DEFAULT 10,
  max_daily_trades integer NOT NULL DEFAULT 50,
  max_daily_exposure numeric NOT NULL DEFAULT 10000,
  max_loss_per_trade numeric NOT NULL DEFAULT 200,
  max_daily_loss numeric NOT NULL DEFAULT 1000,
  
  -- Status
  is_active boolean NOT NULL DEFAULT true,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Unique limit per scope
  UNIQUE (user_id, limit_type, limit_scope)
);

-- Active positions table
CREATE TABLE IF NOT EXISTS active_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  execution_log_id uuid REFERENCES execution_logs(id) ON DELETE CASCADE,
  
  -- Position details
  module_type text NOT NULL CHECK (module_type IN ('valueminer', 'arbitrage', 'snipe', 'trend', 'whale')),
  market_id text NOT NULL,
  market_question text NOT NULL,
  side text NOT NULL CHECK (side IN ('YES', 'NO', 'BOTH')),
  
  -- Financials
  position_size numeric NOT NULL,
  entry_price numeric NOT NULL,
  current_price numeric,
  unrealized_pnl numeric DEFAULT 0,
  
  -- Status
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'partial')),
  
  -- Risk tracking
  stop_loss_price numeric,
  take_profit_price numeric,
  
  -- Metadata
  position_metadata jsonb DEFAULT '{}'::jsonb,
  
  -- Timestamps
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  last_updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  
  -- Index for quick lookups
  CONSTRAINT active_positions_user_market_key UNIQUE (user_id, market_id, side, status)
);

-- Emergency stop table
CREATE TABLE IF NOT EXISTS emergency_stop (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Stop status
  is_stopped boolean NOT NULL DEFAULT false,
  stop_reason text,
  stopped_by text NOT NULL CHECK (stopped_by IN ('user', 'system', 'risk_manager')),
  
  -- Trigger details
  trigger_type text CHECK (trigger_type IN ('manual', 'loss_limit', 'position_limit', 'error_threshold', 'other')),
  trigger_metadata jsonb DEFAULT '{}'::jsonb,
  
  -- Timestamps
  stopped_at timestamptz,
  resumed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- One record per user
  UNIQUE (user_id)
);

-- Daily execution stats (for limit enforcement)
CREATE TABLE IF NOT EXISTS daily_execution_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  module_type text CHECK (module_type IN ('valueminer', 'arbitrage', 'snipe', 'trend', 'whale', 'all')),
  
  -- Stats
  total_trades integer NOT NULL DEFAULT 0,
  successful_trades integer NOT NULL DEFAULT 0,
  failed_trades integer NOT NULL DEFAULT 0,
  total_exposure numeric NOT NULL DEFAULT 0,
  total_profit_loss numeric NOT NULL DEFAULT 0,
  total_fees numeric NOT NULL DEFAULT 0,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- One record per user per date per module
  UNIQUE (user_id, date, module_type)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_auto_execution_settings_user 
  ON auto_execution_settings(user_id, is_enabled);

CREATE INDEX IF NOT EXISTS idx_execution_logs_user_module 
  ON execution_logs(user_id, module_type);

CREATE INDEX IF NOT EXISTS idx_execution_logs_status 
  ON execution_logs(execution_status, evaluated_at DESC);

CREATE INDEX IF NOT EXISTS idx_execution_logs_created 
  ON execution_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_position_limits_user 
  ON position_limits(user_id, is_active);

CREATE INDEX IF NOT EXISTS idx_active_positions_user 
  ON active_positions(user_id, status);

CREATE INDEX IF NOT EXISTS idx_active_positions_market 
  ON active_positions(market_id, status);

CREATE INDEX IF NOT EXISTS idx_emergency_stop_user 
  ON emergency_stop(user_id, is_stopped);

CREATE INDEX IF NOT EXISTS idx_daily_stats_user_date 
  ON daily_execution_stats(user_id, date DESC);

-- Enable Row Level Security
ALTER TABLE auto_execution_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE execution_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE position_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_stop ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_execution_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies for auto_execution_settings
CREATE POLICY "Users can view own auto-execution settings"
  ON auto_execution_settings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own auto-execution settings"
  ON auto_execution_settings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own auto-execution settings"
  ON auto_execution_settings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own auto-execution settings"
  ON auto_execution_settings FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for execution_logs
CREATE POLICY "Users can view own execution logs"
  ON execution_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own execution logs"
  ON execution_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own execution logs"
  ON execution_logs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for position_limits
CREATE POLICY "Users can view own position limits"
  ON position_limits FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own position limits"
  ON position_limits FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own position limits"
  ON position_limits FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own position limits"
  ON position_limits FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for active_positions
CREATE POLICY "Users can view own active positions"
  ON active_positions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own active positions"
  ON active_positions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own active positions"
  ON active_positions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own active positions"
  ON active_positions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for emergency_stop
CREATE POLICY "Users can view own emergency stop"
  ON emergency_stop FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own emergency stop"
  ON emergency_stop FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own emergency stop"
  ON emergency_stop FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for daily_execution_stats
CREATE POLICY "Users can view own daily stats"
  ON daily_execution_stats FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily stats"
  ON daily_execution_stats FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily stats"
  ON daily_execution_stats FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trigger functions for auto-updating timestamps
CREATE OR REPLACE FUNCTION update_auto_execution_settings_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER auto_execution_settings_updated_at
  BEFORE UPDATE ON auto_execution_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_auto_execution_settings_timestamp();

CREATE OR REPLACE FUNCTION update_position_limits_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER position_limits_updated_at
  BEFORE UPDATE ON position_limits
  FOR EACH ROW
  EXECUTE FUNCTION update_position_limits_timestamp();

CREATE OR REPLACE FUNCTION update_emergency_stop_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER emergency_stop_updated_at
  BEFORE UPDATE ON emergency_stop
  FOR EACH ROW
  EXECUTE FUNCTION update_emergency_stop_timestamp();

CREATE OR REPLACE FUNCTION update_active_positions_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.last_updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER active_positions_updated_at
  BEFORE UPDATE ON active_positions
  FOR EACH ROW
  EXECUTE FUNCTION update_active_positions_timestamp();

CREATE OR REPLACE FUNCTION update_daily_stats_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER daily_execution_stats_updated_at
  BEFORE UPDATE ON daily_execution_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_daily_stats_timestamp();

-- Function to initialize default limits for new users
CREATE OR REPLACE FUNCTION initialize_default_limits(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Global limits
  INSERT INTO position_limits (user_id, limit_type, limit_scope, max_position_size, max_total_exposure, max_open_positions, max_daily_trades, max_daily_exposure, max_loss_per_trade, max_daily_loss)
  VALUES (p_user_id, 'global', 'all', 1000, 10000, 10, 50, 10000, 200, 1000)
  ON CONFLICT (user_id, limit_type, limit_scope) DO NOTHING;
  
  -- Initialize emergency stop (not stopped)
  INSERT INTO emergency_stop (user_id, is_stopped, stopped_by)
  VALUES (p_user_id, false, 'user')
  ON CONFLICT (user_id) DO NOTHING;
END;
$$;

-- Function to check emergency stop status
CREATE OR REPLACE FUNCTION is_emergency_stopped(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_stopped boolean;
BEGIN
  SELECT is_stopped INTO v_is_stopped
  FROM emergency_stop
  WHERE user_id = p_user_id;
  
  RETURN COALESCE(v_is_stopped, false);
END;
$$;

-- Function to get current exposure
CREATE OR REPLACE FUNCTION get_current_exposure(p_user_id uuid, p_scope text DEFAULT 'all')
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_exposure numeric;
BEGIN
  SELECT COALESCE(SUM(position_size), 0) INTO v_exposure
  FROM active_positions
  WHERE user_id = p_user_id
    AND status = 'open'
    AND (p_scope = 'all' OR module_type = p_scope);
  
  RETURN v_exposure;
END;
$$;

-- Function to get daily trade count
CREATE OR REPLACE FUNCTION get_daily_trade_count(p_user_id uuid, p_module_type text DEFAULT 'all')
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer;
BEGIN
  SELECT COALESCE(total_trades, 0) INTO v_count
  FROM daily_execution_stats
  WHERE user_id = p_user_id
    AND date = CURRENT_DATE
    AND module_type = p_module_type;
  
  RETURN COALESCE(v_count, 0);
END;
$$;
