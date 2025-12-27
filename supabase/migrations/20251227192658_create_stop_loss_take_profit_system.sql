/*
  # Stop Loss and Take Profit System

  1. New Tables
    - `position_risk_settings`
      - Links to positions with stop loss and take profit configurations
      - Supports trailing stops with activation price and trail distance
      - Tracks highest/lowest prices for trailing logic
      - Status tracking (active, triggered, cancelled)
    
    - `risk_trigger_history`
      - Audit trail of all stop loss and take profit triggers
      - Records execution details and P&L at trigger time
      - Tracks whether auto-execution succeeded

  2. Security
    - Enable RLS on all tables
    - Users can only access their own risk settings
    - Users can only view their own trigger history

  3. Indexes
    - Efficient lookups by position_id and user_id
    - Fast filtering by status for active monitoring
    - Quick access to trigger history

  4. Functions
    - Auto-update highest_price and lowest_price on position updates
    - Calculate trailing stop levels dynamically
*/

-- Position Risk Settings Table
CREATE TABLE IF NOT EXISTS position_risk_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  position_id uuid NOT NULL,
  
  -- Stop Loss Configuration
  stop_loss_enabled boolean DEFAULT false,
  stop_loss_type text CHECK (stop_loss_type IN ('percentage', 'fixed_price', 'trailing')),
  stop_loss_percentage numeric,
  stop_loss_price numeric,
  
  -- Take Profit Configuration
  take_profit_enabled boolean DEFAULT false,
  take_profit_type text CHECK (take_profit_type IN ('percentage', 'fixed_price')),
  take_profit_percentage numeric,
  take_profit_price numeric,
  
  -- Trailing Stop Configuration
  trailing_stop_enabled boolean DEFAULT false,
  trailing_activation_price numeric,
  trailing_distance_percentage numeric,
  highest_price numeric,
  lowest_price numeric,
  trailing_stop_activated boolean DEFAULT false,
  
  -- Status and Tracking
  status text DEFAULT 'active' CHECK (status IN ('active', 'triggered', 'cancelled', 'expired')),
  trigger_type text CHECK (trigger_type IN ('stop_loss', 'take_profit', 'trailing_stop')),
  triggered_at timestamptz,
  triggered_price numeric,
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(position_id)
);

-- Risk Trigger History Table
CREATE TABLE IF NOT EXISTS risk_trigger_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  position_id uuid NOT NULL,
  risk_setting_id uuid REFERENCES position_risk_settings(id),
  
  -- Trigger Details
  trigger_type text NOT NULL CHECK (trigger_type IN ('stop_loss', 'take_profit', 'trailing_stop')),
  trigger_price numeric NOT NULL,
  position_size numeric NOT NULL,
  entry_price numeric NOT NULL,
  
  -- Execution Details
  execution_attempted boolean DEFAULT false,
  execution_successful boolean DEFAULT false,
  execution_error text,
  order_id text,
  
  -- P&L at Trigger
  realized_pnl numeric,
  realized_pnl_percentage numeric,
  total_fees numeric,
  
  -- Market Context
  market_id text NOT NULL,
  market_question text,
  outcome text,
  
  -- Metadata
  triggered_at timestamptz DEFAULT now(),
  executed_at timestamptz
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_position_risk_settings_user 
  ON position_risk_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_position_risk_settings_position 
  ON position_risk_settings(position_id);
CREATE INDEX IF NOT EXISTS idx_position_risk_settings_status 
  ON position_risk_settings(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_position_risk_settings_user_active 
  ON position_risk_settings(user_id, status) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_risk_trigger_history_user 
  ON risk_trigger_history(user_id);
CREATE INDEX IF NOT EXISTS idx_risk_trigger_history_position 
  ON risk_trigger_history(position_id);
CREATE INDEX IF NOT EXISTS idx_risk_trigger_history_triggered_at 
  ON risk_trigger_history(triggered_at DESC);

-- Enable RLS
ALTER TABLE position_risk_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_trigger_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for position_risk_settings
CREATE POLICY "Users can view own risk settings"
  ON position_risk_settings
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own risk settings"
  ON position_risk_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own risk settings"
  ON position_risk_settings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own risk settings"
  ON position_risk_settings
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for risk_trigger_history
CREATE POLICY "Users can view own trigger history"
  ON risk_trigger_history
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own trigger history"
  ON risk_trigger_history
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_position_risk_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER position_risk_settings_updated_at
  BEFORE UPDATE ON position_risk_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_position_risk_settings_updated_at();

-- Function to calculate current trailing stop price
CREATE OR REPLACE FUNCTION get_trailing_stop_price(
  p_risk_setting_id uuid,
  p_current_price numeric
) RETURNS numeric AS $$
DECLARE
  v_settings record;
  v_trail_price numeric;
BEGIN
  SELECT * INTO v_settings
  FROM position_risk_settings
  WHERE id = p_risk_setting_id;
  
  IF NOT FOUND OR NOT v_settings.trailing_stop_enabled THEN
    RETURN NULL;
  END IF;
  
  -- Check if trailing stop is activated
  IF NOT v_settings.trailing_stop_activated THEN
    IF p_current_price >= v_settings.trailing_activation_price THEN
      -- Activation price reached
      RETURN p_current_price * (1 - v_settings.trailing_distance_percentage / 100.0);
    ELSE
      RETURN NULL;
    END IF;
  END IF;
  
  -- Calculate trail from highest price
  v_trail_price := v_settings.highest_price * (1 - v_settings.trailing_distance_percentage / 100.0);
  
  RETURN v_trail_price;
END;
$$ LANGUAGE plpgsql;
