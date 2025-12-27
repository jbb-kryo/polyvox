/*
  # Risk Limits System

  1. New Tables
    - `risk_limits`
      - User-specific risk configuration
      - Position size limits
      - Market exposure limits
      - Portfolio limits
      - Daily loss limits
      - Enable/disable flags
      
    - `daily_loss_tracking`
      - Track daily P&L per user
      - Reset at market open/close
      - Cumulative loss tracking
      - Trading halt status
      
    - `risk_limit_breaches`
      - Audit trail of limit breaches
      - Breach type and severity
      - Actions taken
      - Timestamps
      
  2. Security
    - Enable RLS on all tables
    - Users can only access their own limits
    - Policies for authenticated users
    
  3. Functions
    - Check if daily loss limit breached
    - Check if position limits breached
    - Reset daily loss tracking
    - Get current risk status
*/

-- Risk limits configuration table
CREATE TABLE IF NOT EXISTS risk_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  
  -- Position size limits
  max_position_size numeric DEFAULT 1000,
  max_position_size_enabled boolean DEFAULT true,
  
  -- Market exposure limits
  max_positions_per_market integer DEFAULT 3,
  max_positions_per_market_enabled boolean DEFAULT true,
  
  -- Portfolio limits
  max_total_exposure numeric DEFAULT 10000,
  max_total_exposure_enabled boolean DEFAULT true,
  max_open_positions integer DEFAULT 20,
  max_open_positions_enabled boolean DEFAULT true,
  
  -- Daily loss limits
  max_daily_loss numeric DEFAULT 500,
  max_daily_loss_enabled boolean DEFAULT true,
  trading_halted boolean DEFAULT false,
  halt_reason text,
  halt_timestamp timestamptz,
  
  -- Risk percentage limits
  max_position_pct_of_portfolio numeric DEFAULT 10,
  max_risk_per_trade numeric DEFAULT 100,
  
  -- Other settings
  enforce_limits boolean DEFAULT true,
  alert_on_breach boolean DEFAULT true,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(user_id)
);

ALTER TABLE risk_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own risk limits"
  ON risk_limits FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own risk limits"
  ON risk_limits FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own risk limits"
  ON risk_limits FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Daily loss tracking table
CREATE TABLE IF NOT EXISTS daily_loss_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  trade_date date NOT NULL DEFAULT CURRENT_DATE,
  
  -- Daily metrics
  starting_balance numeric DEFAULT 0,
  current_balance numeric DEFAULT 0,
  realized_pnl numeric DEFAULT 0,
  unrealized_pnl numeric DEFAULT 0,
  total_pnl numeric DEFAULT 0,
  
  -- Trade counts
  total_trades integer DEFAULT 0,
  winning_trades integer DEFAULT 0,
  losing_trades integer DEFAULT 0,
  
  -- Limit tracking
  daily_loss_limit numeric,
  limit_breached boolean DEFAULT false,
  breach_timestamp timestamptz,
  trading_resumed_at timestamptz,
  
  -- Fees
  total_fees numeric DEFAULT 0,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(user_id, trade_date)
);

ALTER TABLE daily_loss_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own daily tracking"
  ON daily_loss_tracking FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own daily tracking"
  ON daily_loss_tracking FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily tracking"
  ON daily_loss_tracking FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Risk limit breaches audit table
CREATE TABLE IF NOT EXISTS risk_limit_breaches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  
  -- Breach details
  breach_type text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('warning', 'critical', 'halt')),
  limit_name text NOT NULL,
  limit_value numeric,
  current_value numeric,
  attempted_value numeric,
  
  -- Context
  market_id text,
  module_type text,
  position_id uuid,
  
  -- Action taken
  action_taken text NOT NULL,
  trade_blocked boolean DEFAULT false,
  trading_halted boolean DEFAULT false,
  
  -- Metadata
  breach_data jsonb,
  error_message text,
  
  created_at timestamptz DEFAULT now()
);

ALTER TABLE risk_limit_breaches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own breaches"
  ON risk_limit_breaches FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own breaches"
  ON risk_limit_breaches FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_risk_limits_user_id ON risk_limits(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_loss_tracking_user_date ON daily_loss_tracking(user_id, trade_date);
CREATE INDEX IF NOT EXISTS idx_daily_loss_tracking_breach ON daily_loss_tracking(user_id, limit_breached) WHERE limit_breached = true;
CREATE INDEX IF NOT EXISTS idx_risk_breaches_user_id ON risk_limit_breaches(user_id);
CREATE INDEX IF NOT EXISTS idx_risk_breaches_created_at ON risk_limit_breaches(created_at);
CREATE INDEX IF NOT EXISTS idx_risk_breaches_type ON risk_limit_breaches(breach_type);

-- Function to get or create risk limits for a user
CREATE OR REPLACE FUNCTION get_or_create_risk_limits(p_user_id uuid)
RETURNS risk_limits
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_limits risk_limits;
BEGIN
  SELECT * INTO v_limits
  FROM risk_limits
  WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    INSERT INTO risk_limits (user_id)
    VALUES (p_user_id)
    RETURNING * INTO v_limits;
  END IF;
  
  RETURN v_limits;
END;
$$;

-- Function to get or create daily loss tracking
CREATE OR REPLACE FUNCTION get_or_create_daily_tracking(
  p_user_id uuid,
  p_trade_date date DEFAULT CURRENT_DATE
)
RETURNS daily_loss_tracking
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tracking daily_loss_tracking;
  v_limit numeric;
BEGIN
  SELECT * INTO v_tracking
  FROM daily_loss_tracking
  WHERE user_id = p_user_id AND trade_date = p_trade_date;
  
  IF NOT FOUND THEN
    SELECT max_daily_loss INTO v_limit
    FROM risk_limits
    WHERE user_id = p_user_id;
    
    INSERT INTO daily_loss_tracking (
      user_id,
      trade_date,
      daily_loss_limit
    ) VALUES (
      p_user_id,
      p_trade_date,
      COALESCE(v_limit, 500)
    )
    RETURNING * INTO v_tracking;
  END IF;
  
  RETURN v_tracking;
END;
$$;

-- Function to check if trading is halted for a user
CREATE OR REPLACE FUNCTION is_trading_halted(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_halted boolean;
  v_daily_breach boolean;
BEGIN
  -- Check if manually halted
  SELECT trading_halted INTO v_halted
  FROM risk_limits
  WHERE user_id = p_user_id;
  
  IF v_halted THEN
    RETURN true;
  END IF;
  
  -- Check if daily loss limit breached
  SELECT limit_breached INTO v_daily_breach
  FROM daily_loss_tracking
  WHERE user_id = p_user_id AND trade_date = CURRENT_DATE;
  
  IF v_daily_breach THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- Function to update daily tracking with trade result
CREATE OR REPLACE FUNCTION update_daily_tracking(
  p_user_id uuid,
  p_pnl numeric,
  p_fees numeric DEFAULT 0,
  p_is_winning boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tracking daily_loss_tracking;
  v_new_total_pnl numeric;
  v_daily_loss_limit numeric;
BEGIN
  -- Get or create today's tracking
  v_tracking := get_or_create_daily_tracking(p_user_id, CURRENT_DATE);
  
  -- Calculate new totals
  v_new_total_pnl := v_tracking.total_pnl + p_pnl;
  
  -- Update tracking
  UPDATE daily_loss_tracking
  SET
    realized_pnl = realized_pnl + p_pnl,
    total_pnl = v_new_total_pnl,
    total_trades = total_trades + 1,
    winning_trades = winning_trades + (CASE WHEN p_is_winning THEN 1 ELSE 0 END),
    losing_trades = losing_trades + (CASE WHEN NOT p_is_winning AND p_pnl < 0 THEN 1 ELSE 0 END),
    total_fees = total_fees + p_fees,
    updated_at = now()
  WHERE user_id = p_user_id AND trade_date = CURRENT_DATE;
  
  -- Check if daily loss limit breached
  IF v_new_total_pnl < 0 AND ABS(v_new_total_pnl) >= v_tracking.daily_loss_limit THEN
    UPDATE daily_loss_tracking
    SET
      limit_breached = true,
      breach_timestamp = now()
    WHERE user_id = p_user_id AND trade_date = CURRENT_DATE;
    
    UPDATE risk_limits
    SET
      trading_halted = true,
      halt_reason = 'Daily loss limit exceeded',
      halt_timestamp = now()
    WHERE user_id = p_user_id;
  END IF;
END;
$$;

-- Function to check position size limit
CREATE OR REPLACE FUNCTION check_position_size_limit(
  p_user_id uuid,
  p_position_size numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_limits risk_limits;
  v_result jsonb;
BEGIN
  SELECT * INTO v_limits
  FROM risk_limits
  WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    v_limits := get_or_create_risk_limits(p_user_id);
  END IF;
  
  IF NOT v_limits.enforce_limits OR NOT v_limits.max_position_size_enabled THEN
    RETURN jsonb_build_object(
      'allowed', true,
      'reason', 'limit_disabled'
    );
  END IF;
  
  IF p_position_size > v_limits.max_position_size THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'position_size_exceeded',
      'limit', v_limits.max_position_size,
      'requested', p_position_size
    );
  END IF;
  
  RETURN jsonb_build_object(
    'allowed', true,
    'limit', v_limits.max_position_size,
    'requested', p_position_size
  );
END;
$$;

-- Function to check total exposure limit
CREATE OR REPLACE FUNCTION check_total_exposure_limit(
  p_user_id uuid,
  p_new_position_size numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_limits risk_limits;
  v_current_exposure numeric;
  v_new_exposure numeric;
BEGIN
  SELECT * INTO v_limits
  FROM risk_limits
  WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    v_limits := get_or_create_risk_limits(p_user_id);
  END IF;
  
  IF NOT v_limits.enforce_limits OR NOT v_limits.max_total_exposure_enabled THEN
    RETURN jsonb_build_object(
      'allowed', true,
      'reason', 'limit_disabled'
    );
  END IF;
  
  -- Calculate current exposure from open positions
  SELECT COALESCE(SUM(position_size * entry_price), 0)
  INTO v_current_exposure
  FROM active_positions
  WHERE user_id = p_user_id;
  
  v_new_exposure := v_current_exposure + p_new_position_size;
  
  IF v_new_exposure > v_limits.max_total_exposure THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'total_exposure_exceeded',
      'limit', v_limits.max_total_exposure,
      'current', v_current_exposure,
      'requested', p_new_position_size,
      'would_be', v_new_exposure
    );
  END IF;
  
  RETURN jsonb_build_object(
    'allowed', true,
    'limit', v_limits.max_total_exposure,
    'current', v_current_exposure,
    'requested', p_new_position_size,
    'would_be', v_new_exposure
  );
END;
$$;

-- Function to check positions per market limit
CREATE OR REPLACE FUNCTION check_positions_per_market_limit(
  p_user_id uuid,
  p_market_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_limits risk_limits;
  v_current_positions integer;
BEGIN
  SELECT * INTO v_limits
  FROM risk_limits
  WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    v_limits := get_or_create_risk_limits(p_user_id);
  END IF;
  
  IF NOT v_limits.enforce_limits OR NOT v_limits.max_positions_per_market_enabled THEN
    RETURN jsonb_build_object(
      'allowed', true,
      'reason', 'limit_disabled'
    );
  END IF;
  
  -- Count current positions in this market
  SELECT COUNT(*)::integer
  INTO v_current_positions
  FROM active_positions
  WHERE user_id = p_user_id AND market_id = p_market_id;
  
  IF v_current_positions >= v_limits.max_positions_per_market THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'market_position_limit_exceeded',
      'limit', v_limits.max_positions_per_market,
      'current', v_current_positions,
      'market_id', p_market_id
    );
  END IF;
  
  RETURN jsonb_build_object(
    'allowed', true,
    'limit', v_limits.max_positions_per_market,
    'current', v_current_positions
  );
END;
$$;

-- Function to perform comprehensive pre-trade checks
CREATE OR REPLACE FUNCTION check_all_risk_limits(
  p_user_id uuid,
  p_market_id text,
  p_position_size numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_halted boolean;
  v_position_check jsonb;
  v_exposure_check jsonb;
  v_market_check jsonb;
  v_result jsonb;
BEGIN
  -- Check if trading is halted
  v_halted := is_trading_halted(p_user_id);
  
  IF v_halted THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'trading_halted',
      'message', 'Trading is currently halted due to risk limits'
    );
  END IF;
  
  -- Check position size limit
  v_position_check := check_position_size_limit(p_user_id, p_position_size);
  IF NOT (v_position_check->>'allowed')::boolean THEN
    RETURN v_position_check;
  END IF;
  
  -- Check total exposure limit
  v_exposure_check := check_total_exposure_limit(p_user_id, p_position_size);
  IF NOT (v_exposure_check->>'allowed')::boolean THEN
    RETURN v_exposure_check;
  END IF;
  
  -- Check positions per market limit
  v_market_check := check_positions_per_market_limit(p_user_id, p_market_id);
  IF NOT (v_market_check->>'allowed')::boolean THEN
    RETURN v_market_check;
  END IF;
  
  -- All checks passed
  RETURN jsonb_build_object(
    'allowed', true,
    'checks', jsonb_build_object(
      'position_size', v_position_check,
      'total_exposure', v_exposure_check,
      'market_positions', v_market_check
    )
  );
END;
$$;

-- Function to resume trading after halt
CREATE OR REPLACE FUNCTION resume_trading(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE risk_limits
  SET
    trading_halted = false,
    halt_reason = NULL,
    halt_timestamp = NULL,
    updated_at = now()
  WHERE user_id = p_user_id;
  
  UPDATE daily_loss_tracking
  SET
    trading_resumed_at = now()
  WHERE user_id = p_user_id 
    AND trade_date = CURRENT_DATE 
    AND limit_breached = true;
END;
$$;
