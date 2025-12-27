/*
  # Initialize Platform Data and Performance Optimization

  1. Platform Configuration
    - Set application version to 1.1.0
    - Initialize platform metrics
    - Set up default configuration values

  2. Helper Functions
    - User statistics aggregation
    - Data cleanup utilities

  3. Performance Optimization
    - Add missing indexes for query performance
    - Update table statistics
*/

-- ==============================================
-- 1. INITIALIZE PLATFORM METRICS
-- ==============================================

INSERT INTO platform_metrics (metric_name, metric_value, updated_at)
VALUES
  ('app_version', '1.1.0', NOW()),
  ('total_transaction_volume', '0', NOW()),
  ('total_users', '0', NOW()),
  ('total_active_positions', '0', NOW())
ON CONFLICT (metric_name)
DO UPDATE SET
  metric_value = EXCLUDED.metric_value,
  updated_at = NOW();

-- ==============================================
-- 2. CREATE HELPER FUNCTIONS
-- ==============================================

-- Function to get user statistics
CREATE OR REPLACE FUNCTION get_user_stats(p_user_id uuid)
RETURNS TABLE (
  total_trades integer,
  total_positions integer,
  total_pnl numeric,
  win_rate numeric,
  active_modules text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH trade_stats AS (
    SELECT COUNT(*)::integer as trades, SUM(profit) as pnl
    FROM (
      SELECT profit FROM arbitrage_trades WHERE user_id = p_user_id
      UNION ALL
      SELECT profit FROM trend_trades WHERE user_id = p_user_id
      UNION ALL
      SELECT profit FROM snipe_trades WHERE user_id = p_user_id
    ) all_trades
  ),
  position_stats AS (
    SELECT COUNT(*)::integer as positions
    FROM (
      SELECT id FROM arbitrage_positions WHERE user_id = p_user_id AND status = 'open'
      UNION ALL
      SELECT id FROM trend_positions WHERE user_id = p_user_id AND status = 'open'
      UNION ALL
      SELECT id FROM snipe_positions WHERE user_id = p_user_id
      UNION ALL
      SELECT id FROM whale_copied_positions WHERE user_id = p_user_id AND status = 'open'
      UNION ALL
      SELECT id FROM value_positions WHERE user_id = p_user_id AND status = 'open'
    ) all_positions
  ),
  win_stats AS (
    SELECT
      COUNT(*) FILTER (WHERE profit > 0)::numeric / NULLIF(COUNT(*)::numeric, 0) * 100 as win_pct
    FROM (
      SELECT profit FROM arbitrage_trades WHERE user_id = p_user_id
      UNION ALL
      SELECT profit FROM trend_trades WHERE user_id = p_user_id
      UNION ALL
      SELECT profit FROM snipe_trades WHERE user_id = p_user_id
    ) all_trades
  ),
  active_mods AS (
    SELECT array_agg(module_id) as modules
    FROM module_settings
    WHERE user_id = p_user_id AND is_enabled = true
  )
  SELECT
    ts.trades,
    ps.positions,
    COALESCE(ts.pnl, 0),
    COALESCE(ws.win_pct, 0),
    COALESCE(am.modules, ARRAY[]::text[])
  FROM trade_stats ts
  CROSS JOIN position_stats ps
  CROSS JOIN win_stats ws
  CROSS JOIN active_mods am;
END;
$$;

-- Function to clean up old data
CREATE OR REPLACE FUNCTION cleanup_old_data(days_to_keep integer DEFAULT 90)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cutoff_date timestamp;
BEGIN
  cutoff_date := NOW() - (days_to_keep || ' days')::interval;

  -- Clean up old opportunities that weren't executed
  DELETE FROM arbitrage_opportunities
  WHERE created_at < cutoff_date AND is_executed = false;

  DELETE FROM trend_opportunities
  WHERE created_at < cutoff_date AND is_executed = false;

  DELETE FROM value_signals
  WHERE created_at < cutoff_date AND is_executed = false;

  -- Log cleanup
  RAISE NOTICE 'Cleaned up data older than % days', days_to_keep;
END;
$$;

-- ==============================================
-- 3. ADD MISSING INDEXES FOR PERFORMANCE
-- ==============================================

-- Add composite indexes for common position queries
CREATE INDEX IF NOT EXISTS idx_arbitrage_positions_user_status
  ON arbitrage_positions(user_id, status) WHERE status = 'open';

CREATE INDEX IF NOT EXISTS idx_trend_positions_user_status
  ON trend_positions(user_id, status) WHERE status = 'open';

CREATE INDEX IF NOT EXISTS idx_snipe_positions_user
  ON snipe_positions(user_id);

CREATE INDEX IF NOT EXISTS idx_whale_copied_positions_user_status
  ON whale_copied_positions(user_id, status) WHERE status = 'open';

CREATE INDEX IF NOT EXISTS idx_value_positions_user_status
  ON value_positions(user_id, status) WHERE status = 'open';

-- Add indexes for trade history queries
CREATE INDEX IF NOT EXISTS idx_arbitrage_trades_user_closed
  ON arbitrage_trades(user_id, closed_at DESC);

CREATE INDEX IF NOT EXISTS idx_trend_trades_user_closed
  ON trend_trades(user_id, closed_at DESC);

CREATE INDEX IF NOT EXISTS idx_snipe_trades_user_closed
  ON snipe_trades(user_id, closed_at DESC);

-- Add indexes for whale tracking
CREATE INDEX IF NOT EXISTS idx_whale_profiles_volume
  ON whale_profiles(total_volume DESC) WHERE is_tracked = true;

CREATE INDEX IF NOT EXISTS idx_whale_profiles_winrate
  ON whale_profiles(win_rate DESC) WHERE is_tracked = true;

-- Add indexes for orders
CREATE INDEX IF NOT EXISTS idx_orders_user_status
  ON orders(user_id, status);

CREATE INDEX IF NOT EXISTS idx_orders_market
  ON orders(market_id, created_at DESC);

-- Add indexes for module settings
CREATE INDEX IF NOT EXISTS idx_module_settings_user_enabled
  ON module_settings(user_id, is_enabled) WHERE is_enabled = true;

-- Add indexes for analytics
CREATE INDEX IF NOT EXISTS idx_module_performance_user_module
  ON module_performance(user_id, module_id, period);

CREATE INDEX IF NOT EXISTS idx_trade_analytics_user_time
  ON trade_analytics(user_id, entry_time DESC);

-- Add indexes for whale orders
CREATE INDEX IF NOT EXISTS idx_whale_orders_address_time
  ON whale_orders(whale_address, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_whale_orders_market
  ON whale_orders(market_id, timestamp DESC);

-- Add indexes for value markets
CREATE INDEX IF NOT EXISTS idx_value_markets_market
  ON value_markets(market_id);

CREATE INDEX IF NOT EXISTS idx_value_markets_edge
  ON value_markets(best_edge DESC) WHERE best_edge > 0;

-- Add indexes for snipe orders
CREATE INDEX IF NOT EXISTS idx_snipe_orders_user_status
  ON snipe_orders(user_id, status) WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_snipe_orders_market
  ON snipe_orders(market_id, created_at DESC);

-- ==============================================
-- 4. UPDATE TABLE STATISTICS
-- ==============================================

-- Analyze all tables for query planner optimization
ANALYZE arbitrage_opportunities;
ANALYZE arbitrage_positions;
ANALYZE arbitrage_trades;
ANALYZE trend_opportunities;
ANALYZE trend_positions;
ANALYZE trend_trades;
ANALYZE snipe_orders;
ANALYZE snipe_positions;
ANALYZE snipe_trades;
ANALYZE whale_orders;
ANALYZE whale_profiles;
ANALYZE whale_copied_positions;
ANALYZE whale_alerts;
ANALYZE value_markets;
ANALYZE value_signals;
ANALYZE value_positions;
ANALYZE performance_metrics;
ANALYZE orders;
ANALYZE order_fills;
ANALYZE module_settings;
ANALYZE module_performance;
ANALYZE trade_analytics;
ANALYZE market_watchlist;
ANALYZE user_profiles;
ANALYZE platform_metrics;
ANALYZE external_data_sources;

-- ==============================================
-- 5. GRANT PERMISSIONS
-- ==============================================

-- Ensure authenticated users can access helper functions
GRANT EXECUTE ON FUNCTION get_user_stats(uuid) TO authenticated;

-- Service role can run cleanup
GRANT EXECUTE ON FUNCTION cleanup_old_data(integer) TO service_role;