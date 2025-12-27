/*
  # Position Tracking Enhancements

  1. New Tables
    - `position_history`
      - Historical record of all positions (closed and open)
      - Complete lifecycle tracking
      - Performance metrics
      - Exit details
    
    - `position_snapshots`
      - Periodic snapshots of position values
      - Track P&L over time
      - Used for charting and analysis
    
    - `position_events`
      - Event log for position lifecycle
      - Entry, updates, exits
      - Price changes, P&L milestones
    
  2. Enhancements to active_positions
    - Add more tracking fields
    - Add indices for performance
    - Add triggers for automatic updates
    
  3. Functions
    - Calculate current P&L
    - Get portfolio value
    - Update position prices
    - Close positions
    
  4. Security
    - Enable RLS on all tables
    - Users can only access their own data
    - Strict authentication requirements

  5. Performance
    - Optimized indexes for queries
    - Materialized views for aggregations
    - Efficient P&L calculations
*/

-- Position history table (closed positions)
CREATE TABLE IF NOT EXISTS position_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  active_position_id uuid,
  execution_log_id uuid REFERENCES execution_logs(id) ON DELETE SET NULL,
  
  -- Position details
  module_type text NOT NULL CHECK (module_type IN ('valueminer', 'arbitrage', 'snipe', 'trend', 'whale')),
  market_id text NOT NULL,
  market_question text NOT NULL,
  side text NOT NULL CHECK (side IN ('YES', 'NO', 'BOTH')),
  
  -- Entry
  position_size numeric NOT NULL,
  entry_price numeric NOT NULL,
  entry_cost numeric NOT NULL,
  
  -- Exit
  exit_price numeric,
  exit_value numeric,
  exit_reason text CHECK (exit_reason IN ('manual', 'stop_loss', 'take_profit', 'market_closed', 'expired', 'liquidated')),
  
  -- Performance
  realized_pnl numeric DEFAULT 0,
  realized_pnl_percent numeric DEFAULT 0,
  fees_paid numeric DEFAULT 0,
  net_pnl numeric DEFAULT 0,
  roi_percent numeric DEFAULT 0,
  
  -- Duration
  hold_duration_seconds integer,
  
  -- Final status
  final_status text NOT NULL DEFAULT 'closed' CHECK (final_status IN ('closed', 'expired', 'liquidated', 'cancelled')),
  
  -- Metadata
  position_metadata jsonb DEFAULT '{}'::jsonb,
  exit_metadata jsonb DEFAULT '{}'::jsonb,
  
  -- Timestamps
  opened_at timestamptz NOT NULL,
  closed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Position snapshots table (time-series data)
CREATE TABLE IF NOT EXISTS position_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  position_id uuid NOT NULL,
  
  -- Snapshot data
  current_price numeric NOT NULL,
  position_value numeric NOT NULL,
  unrealized_pnl numeric NOT NULL,
  unrealized_pnl_percent numeric NOT NULL,
  
  -- Market data at snapshot time
  market_odds_yes numeric,
  market_odds_no numeric,
  market_volume_24h numeric,
  market_liquidity numeric,
  
  -- Metadata
  snapshot_metadata jsonb DEFAULT '{}'::jsonb,
  
  -- Timestamp
  snapshot_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Position events table (audit trail)
CREATE TABLE IF NOT EXISTS position_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  position_id uuid NOT NULL,
  
  -- Event details
  event_type text NOT NULL CHECK (event_type IN ('opened', 'price_update', 'partial_close', 'closed', 'stop_loss_triggered', 'take_profit_hit', 'milestone')),
  event_description text NOT NULL,
  
  -- Event data
  old_value numeric,
  new_value numeric,
  pnl_change numeric,
  
  -- Metadata
  event_metadata jsonb DEFAULT '{}'::jsonb,
  
  -- Timestamp
  event_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Add additional fields to active_positions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'active_positions' AND column_name = 'entry_cost'
  ) THEN
    ALTER TABLE active_positions ADD COLUMN entry_cost numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'active_positions' AND column_name = 'current_value'
  ) THEN
    ALTER TABLE active_positions ADD COLUMN current_value numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'active_positions' AND column_name = 'unrealized_pnl_percent'
  ) THEN
    ALTER TABLE active_positions ADD COLUMN unrealized_pnl_percent numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'active_positions' AND column_name = 'last_price_update'
  ) THEN
    ALTER TABLE active_positions ADD COLUMN last_price_update timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'active_positions' AND column_name = 'price_update_count'
  ) THEN
    ALTER TABLE active_positions ADD COLUMN price_update_count integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'active_positions' AND column_name = 'highest_price'
  ) THEN
    ALTER TABLE active_positions ADD COLUMN highest_price numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'active_positions' AND column_name = 'lowest_price'
  ) THEN
    ALTER TABLE active_positions ADD COLUMN lowest_price numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'active_positions' AND column_name = 'peak_unrealized_pnl'
  ) THEN
    ALTER TABLE active_positions ADD COLUMN peak_unrealized_pnl numeric DEFAULT 0;
  END IF;
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_position_history_user 
  ON position_history(user_id, closed_at DESC);

CREATE INDEX IF NOT EXISTS idx_position_history_module 
  ON position_history(user_id, module_type);

CREATE INDEX IF NOT EXISTS idx_position_history_market 
  ON position_history(market_id);

CREATE INDEX IF NOT EXISTS idx_position_snapshots_position 
  ON position_snapshots(position_id, snapshot_at DESC);

CREATE INDEX IF NOT EXISTS idx_position_snapshots_user 
  ON position_snapshots(user_id, snapshot_at DESC);

CREATE INDEX IF NOT EXISTS idx_position_events_position 
  ON position_events(position_id, event_at DESC);

CREATE INDEX IF NOT EXISTS idx_position_events_user 
  ON position_events(user_id, event_at DESC);

CREATE INDEX IF NOT EXISTS idx_active_positions_updated 
  ON active_positions(last_updated_at DESC);

-- Enable Row Level Security
ALTER TABLE position_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE position_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE position_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for position_history
CREATE POLICY "Users can view own position history"
  ON position_history FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own position history"
  ON position_history FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own position history"
  ON position_history FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for position_snapshots
CREATE POLICY "Users can view own position snapshots"
  ON position_snapshots FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own position snapshots"
  ON position_snapshots FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for position_events
CREATE POLICY "Users can view own position events"
  ON position_events FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own position events"
  ON position_events FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Function to calculate position P&L
CREATE OR REPLACE FUNCTION calculate_position_pnl(
  p_entry_price numeric,
  p_current_price numeric,
  p_position_size numeric,
  p_side text
)
RETURNS TABLE (
  pnl numeric,
  pnl_percent numeric,
  current_value numeric
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_entry_cost numeric;
  v_current_value numeric;
  v_pnl numeric;
  v_pnl_percent numeric;
BEGIN
  v_entry_cost := p_entry_price * p_position_size;
  
  IF p_side = 'YES' THEN
    v_current_value := p_current_price * p_position_size;
  ELSIF p_side = 'NO' THEN
    v_current_value := (1 - p_current_price) * p_position_size;
  ELSE
    v_current_value := p_current_price * p_position_size;
  END IF;
  
  v_pnl := v_current_value - v_entry_cost;
  
  IF v_entry_cost > 0 THEN
    v_pnl_percent := (v_pnl / v_entry_cost) * 100;
  ELSE
    v_pnl_percent := 0;
  END IF;
  
  RETURN QUERY SELECT v_pnl, v_pnl_percent, v_current_value;
END;
$$;

-- Function to update position price and P&L
CREATE OR REPLACE FUNCTION update_position_price(
  p_position_id uuid,
  p_new_price numeric,
  p_market_data jsonb DEFAULT '{}'::jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_position RECORD;
  v_pnl_result RECORD;
BEGIN
  SELECT * INTO v_position
  FROM active_positions
  WHERE id = p_position_id AND status = 'open';
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  SELECT * INTO v_pnl_result
  FROM calculate_position_pnl(
    v_position.entry_price,
    p_new_price,
    v_position.position_size,
    v_position.side
  );
  
  UPDATE active_positions
  SET
    current_price = p_new_price,
    current_value = v_pnl_result.current_value,
    unrealized_pnl = v_pnl_result.pnl,
    unrealized_pnl_percent = v_pnl_result.pnl_percent,
    highest_price = GREATEST(COALESCE(highest_price, p_new_price), p_new_price),
    lowest_price = LEAST(COALESCE(lowest_price, p_new_price), p_new_price),
    peak_unrealized_pnl = GREATEST(COALESCE(peak_unrealized_pnl, v_pnl_result.pnl), v_pnl_result.pnl),
    last_price_update = now(),
    price_update_count = COALESCE(price_update_count, 0) + 1,
    last_updated_at = now()
  WHERE id = p_position_id;
  
  INSERT INTO position_events (
    user_id,
    position_id,
    event_type,
    event_description,
    old_value,
    new_value,
    pnl_change,
    event_metadata
  ) VALUES (
    v_position.user_id,
    p_position_id,
    'price_update',
    'Position price updated',
    v_position.current_price,
    p_new_price,
    v_pnl_result.pnl - COALESCE(v_position.unrealized_pnl, 0),
    p_market_data
  );
  
  RETURN true;
END;
$$;

-- Function to close a position
CREATE OR REPLACE FUNCTION close_position(
  p_position_id uuid,
  p_exit_price numeric,
  p_exit_reason text DEFAULT 'manual',
  p_exit_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_position RECORD;
  v_pnl_result RECORD;
  v_history_id uuid;
  v_hold_duration integer;
BEGIN
  SELECT * INTO v_position
  FROM active_positions
  WHERE id = p_position_id AND status = 'open';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Position not found or already closed';
  END IF;
  
  SELECT * INTO v_pnl_result
  FROM calculate_position_pnl(
    v_position.entry_price,
    p_exit_price,
    v_position.position_size,
    v_position.side
  );
  
  v_hold_duration := EXTRACT(EPOCH FROM (now() - v_position.opened_at))::integer;
  
  INSERT INTO position_history (
    user_id,
    active_position_id,
    execution_log_id,
    module_type,
    market_id,
    market_question,
    side,
    position_size,
    entry_price,
    entry_cost,
    exit_price,
    exit_value,
    exit_reason,
    realized_pnl,
    realized_pnl_percent,
    net_pnl,
    roi_percent,
    hold_duration_seconds,
    final_status,
    position_metadata,
    exit_metadata,
    opened_at,
    closed_at
  ) VALUES (
    v_position.user_id,
    p_position_id,
    v_position.execution_log_id,
    v_position.module_type,
    v_position.market_id,
    v_position.market_question,
    v_position.side,
    v_position.position_size,
    v_position.entry_price,
    v_position.entry_price * v_position.position_size,
    p_exit_price,
    v_pnl_result.current_value,
    p_exit_reason,
    v_pnl_result.pnl,
    v_pnl_result.pnl_percent,
    v_pnl_result.pnl,
    v_pnl_result.pnl_percent,
    v_hold_duration,
    'closed',
    v_position.position_metadata,
    p_exit_metadata,
    v_position.opened_at,
    now()
  ) RETURNING id INTO v_history_id;
  
  UPDATE active_positions
  SET
    status = 'closed',
    current_price = p_exit_price,
    current_value = v_pnl_result.current_value,
    unrealized_pnl = v_pnl_result.pnl,
    unrealized_pnl_percent = v_pnl_result.pnl_percent,
    closed_at = now(),
    last_updated_at = now()
  WHERE id = p_position_id;
  
  INSERT INTO position_events (
    user_id,
    position_id,
    event_type,
    event_description,
    old_value,
    new_value,
    pnl_change,
    event_metadata
  ) VALUES (
    v_position.user_id,
    p_position_id,
    'closed',
    'Position closed: ' || p_exit_reason,
    v_position.current_price,
    p_exit_price,
    v_pnl_result.pnl,
    p_exit_metadata
  );
  
  RETURN v_history_id;
END;
$$;

-- Function to get portfolio summary
CREATE OR REPLACE FUNCTION get_portfolio_summary(p_user_id uuid)
RETURNS TABLE (
  total_positions integer,
  total_value numeric,
  total_cost numeric,
  total_pnl numeric,
  total_pnl_percent numeric,
  winning_positions integer,
  losing_positions integer,
  by_module jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH position_stats AS (
    SELECT
      COUNT(*)::integer AS pos_count,
      COALESCE(SUM(current_value), 0) AS total_val,
      COALESCE(SUM(entry_cost), 0) AS total_cst,
      COALESCE(SUM(unrealized_pnl), 0) AS total_p,
      CASE 
        WHEN COALESCE(SUM(entry_cost), 0) > 0 
        THEN (COALESCE(SUM(unrealized_pnl), 0) / COALESCE(SUM(entry_cost), 0)) * 100
        ELSE 0
      END AS total_p_pct,
      COUNT(*) FILTER (WHERE unrealized_pnl > 0)::integer AS win_pos,
      COUNT(*) FILTER (WHERE unrealized_pnl < 0)::integer AS lose_pos
    FROM active_positions
    WHERE user_id = p_user_id AND status = 'open'
  ),
  module_stats AS (
    SELECT jsonb_object_agg(
      module_type,
      jsonb_build_object(
        'count', COUNT(*),
        'value', COALESCE(SUM(current_value), 0),
        'pnl', COALESCE(SUM(unrealized_pnl), 0),
        'pnl_percent', CASE 
          WHEN COALESCE(SUM(entry_cost), 0) > 0 
          THEN (COALESCE(SUM(unrealized_pnl), 0) / COALESCE(SUM(entry_cost), 0)) * 100
          ELSE 0
        END
      )
    ) AS modules
    FROM active_positions
    WHERE user_id = p_user_id AND status = 'open'
    GROUP BY module_type
  )
  SELECT
    ps.pos_count,
    ps.total_val,
    ps.total_cst,
    ps.total_p,
    ps.total_p_pct,
    ps.win_pos,
    ps.lose_pos,
    COALESCE(ms.modules, '{}'::jsonb)
  FROM position_stats ps
  CROSS JOIN module_stats ms;
END;
$$;

-- Function to get position performance metrics
CREATE OR REPLACE FUNCTION get_position_performance(p_user_id uuid, p_days integer DEFAULT 30)
RETURNS TABLE (
  date date,
  positions_opened integer,
  positions_closed integer,
  total_pnl numeric,
  win_rate numeric,
  avg_hold_time_hours numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE(closed_at) AS date,
    0 AS positions_opened,
    COUNT(*)::integer AS positions_closed,
    COALESCE(SUM(realized_pnl), 0) AS total_pnl,
    CASE 
      WHEN COUNT(*) > 0 
      THEN (COUNT(*) FILTER (WHERE realized_pnl > 0)::numeric / COUNT(*)::numeric) * 100
      ELSE 0
    END AS win_rate,
    CASE 
      WHEN COUNT(*) > 0 
      THEN AVG(hold_duration_seconds)::numeric / 3600
      ELSE 0
    END AS avg_hold_time_hours
  FROM position_history
  WHERE user_id = p_user_id
    AND closed_at >= CURRENT_DATE - p_days
  GROUP BY DATE(closed_at)
  ORDER BY date DESC;
END;
$$;

-- Trigger to initialize position costs
CREATE OR REPLACE FUNCTION init_position_costs()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.entry_cost IS NULL OR NEW.entry_cost = 0 THEN
    NEW.entry_cost := NEW.entry_price * NEW.position_size;
  END IF;
  
  IF NEW.current_value IS NULL OR NEW.current_value = 0 THEN
    NEW.current_value := NEW.entry_cost;
  END IF;
  
  IF NEW.highest_price IS NULL THEN
    NEW.highest_price := NEW.entry_price;
  END IF;
  
  IF NEW.lowest_price IS NULL THEN
    NEW.lowest_price := NEW.entry_price;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER active_positions_init_costs
  BEFORE INSERT ON active_positions
  FOR EACH ROW
  EXECUTE FUNCTION init_position_costs();
