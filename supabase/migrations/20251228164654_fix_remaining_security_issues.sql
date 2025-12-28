/*
  # Fix Remaining Security Issues (v1.1.5)

  1. Missing Foreign Key Indexes
    - Add indexes for all remaining foreign keys without covering indexes:
      - arbitrage_positions.user_id
      - error_logs.user_id
      - notifications.user_id
      - order_fills.order_id
      - orders.user_id
      - snipe_orders.user_id
      - snipe_positions.user_id
      - trade_analytics.user_id
      - trading_activity_logs.user_id
      - trend_positions.user_id
      - whale_alerts.user_id
      - whale_copied_positions.user_id

  2. Remove Unused Indexes
    - Drop indexes that were created but are not being used
    - These indexes were redundant or not matching query patterns

  3. Fix Function Search Paths
    - Update functions to use immutable search_path pattern
    - Use explicit schema qualification to prevent search path attacks
*/

-- ============================================================================
-- 1. ADD MISSING FOREIGN KEY INDEXES
-- ============================================================================

-- Index for arbitrage_positions.user_id foreign key
CREATE INDEX IF NOT EXISTS idx_arbitrage_positions_user_id
ON arbitrage_positions(user_id);

-- Index for error_logs.user_id foreign key
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id
ON error_logs(user_id);

-- Index for notifications.user_id foreign key
CREATE INDEX IF NOT EXISTS idx_notifications_user_id
ON notifications(user_id);

-- Index for order_fills.order_id foreign key
CREATE INDEX IF NOT EXISTS idx_order_fills_order_id
ON order_fills(order_id);

-- Index for orders.user_id foreign key
CREATE INDEX IF NOT EXISTS idx_orders_user_id
ON orders(user_id);

-- Index for snipe_orders.user_id foreign key
CREATE INDEX IF NOT EXISTS idx_snipe_orders_user_id
ON snipe_orders(user_id);

-- Index for snipe_positions.user_id foreign key
CREATE INDEX IF NOT EXISTS idx_snipe_positions_user_id
ON snipe_positions(user_id);

-- Index for trade_analytics.user_id foreign key
CREATE INDEX IF NOT EXISTS idx_trade_analytics_user_id
ON trade_analytics(user_id);

-- Index for trading_activity_logs.user_id foreign key
CREATE INDEX IF NOT EXISTS idx_trading_activity_logs_user_id
ON trading_activity_logs(user_id);

-- Index for trend_positions.user_id foreign key
CREATE INDEX IF NOT EXISTS idx_trend_positions_user_id
ON trend_positions(user_id);

-- Index for whale_alerts.user_id foreign key
CREATE INDEX IF NOT EXISTS idx_whale_alerts_user_id
ON whale_alerts(user_id);

-- Index for whale_copied_positions.user_id foreign key
CREATE INDEX IF NOT EXISTS idx_whale_copied_positions_user_id
ON whale_copied_positions(user_id);

-- ============================================================================
-- 2. DROP UNUSED INDEXES
-- ============================================================================

-- These indexes were created but are not being used by any queries
DROP INDEX IF EXISTS idx_arbitrage_trades_user_id;
DROP INDEX IF EXISTS idx_error_logs_resolved_by;
DROP INDEX IF EXISTS idx_snipe_trades_user_id;
DROP INDEX IF EXISTS idx_trend_trades_user_id;

-- ============================================================================
-- 3. FIX FUNCTION SEARCH PATHS (IMMUTABLE PATTERN)
-- ============================================================================

-- Recreate functions with proper immutable search_path
-- Use empty string for search_path and explicit schema qualification

DROP FUNCTION IF EXISTS get_error_statistics(UUID, TIMESTAMP, TIMESTAMP) CASCADE;
CREATE FUNCTION get_error_statistics(
  p_user_id UUID,
  p_start_date TIMESTAMP DEFAULT NULL,
  p_end_date TIMESTAMP DEFAULT NULL
)
RETURNS TABLE (
  total_errors BIGINT,
  critical_errors BIGINT,
  error_errors BIGINT,
  warning_errors BIGINT,
  info_errors BIGINT,
  resolved_errors BIGINT,
  unresolved_errors BIGINT
)
SECURITY DEFINER
SET search_path = ''
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_errors,
    COUNT(*) FILTER (WHERE severity = 'critical')::BIGINT as critical_errors,
    COUNT(*) FILTER (WHERE severity = 'error')::BIGINT as error_errors,
    COUNT(*) FILTER (WHERE severity = 'warning')::BIGINT as warning_errors,
    COUNT(*) FILTER (WHERE severity = 'info')::BIGINT as info_errors,
    COUNT(*) FILTER (WHERE resolved = true)::BIGINT as resolved_errors,
    COUNT(*) FILTER (WHERE resolved = false)::BIGINT as unresolved_errors
  FROM public.error_logs
  WHERE user_id = p_user_id
    AND (p_start_date IS NULL OR created_at >= p_start_date)
    AND (p_end_date IS NULL OR created_at <= p_end_date);
END;
$$;

DROP FUNCTION IF EXISTS get_trading_log_statistics(UUID, TIMESTAMP, TIMESTAMP, TEXT) CASCADE;
CREATE FUNCTION get_trading_log_statistics(
  p_user_id UUID,
  p_start_date TIMESTAMP DEFAULT NULL,
  p_end_date TIMESTAMP DEFAULT NULL,
  p_module TEXT DEFAULT NULL
)
RETURNS TABLE (
  total_logs BIGINT,
  debug_logs BIGINT,
  info_logs BIGINT,
  warn_logs BIGINT,
  error_logs BIGINT,
  successful_operations BIGINT,
  failed_operations BIGINT,
  avg_duration_ms NUMERIC
)
SECURITY DEFINER
SET search_path = ''
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_logs,
    COUNT(*) FILTER (WHERE log_level = 'debug')::BIGINT as debug_logs,
    COUNT(*) FILTER (WHERE log_level = 'info')::BIGINT as info_logs,
    COUNT(*) FILTER (WHERE log_level = 'warn')::BIGINT as warn_logs,
    COUNT(*) FILTER (WHERE log_level = 'error')::BIGINT as error_logs,
    COUNT(*) FILTER (WHERE success = true)::BIGINT as successful_operations,
    COUNT(*) FILTER (WHERE success = false)::BIGINT as failed_operations,
    AVG(duration_ms) as avg_duration_ms
  FROM public.trading_activity_logs
  WHERE user_id = p_user_id
    AND (p_start_date IS NULL OR created_at >= p_start_date)
    AND (p_end_date IS NULL OR created_at <= p_end_date)
    AND (p_module IS NULL OR module = p_module);
END;
$$;

DROP FUNCTION IF EXISTS get_trading_activity_timeline(UUID, INTEGER, INTEGER, TEXT, TEXT, TEXT, TIMESTAMP, TIMESTAMP) CASCADE;
CREATE FUNCTION get_trading_activity_timeline(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0,
  p_module TEXT DEFAULT NULL,
  p_log_level TEXT DEFAULT NULL,
  p_activity_type TEXT DEFAULT NULL,
  p_start_date TIMESTAMP DEFAULT NULL,
  p_end_date TIMESTAMP DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  module TEXT,
  activity_type TEXT,
  log_level TEXT,
  message TEXT,
  success BOOLEAN,
  duration_ms INTEGER,
  market_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ
)
SECURITY DEFINER
SET search_path = ''
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.user_id,
    t.module,
    t.activity_type,
    t.log_level,
    t.message,
    t.success,
    t.duration_ms,
    t.market_id,
    t.metadata,
    t.created_at
  FROM public.trading_activity_logs t
  WHERE t.user_id = p_user_id
    AND (p_module IS NULL OR t.module = p_module)
    AND (p_log_level IS NULL OR t.log_level = p_log_level)
    AND (p_activity_type IS NULL OR t.activity_type = p_activity_type)
    AND (p_start_date IS NULL OR t.created_at >= p_start_date)
    AND (p_end_date IS NULL OR t.created_at <= p_end_date)
  ORDER BY t.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- ============================================================================
-- SUMMARY
-- ============================================================================

-- Performance improvements:
-- 1. Added 12 missing foreign key indexes for better join performance
-- 2. Removed 4 unused indexes to improve write performance
-- 3. Fixed 3 functions to use immutable search_path pattern for security

-- Remaining manual step:
-- Auth DB Connection Strategy needs manual adjustment in Supabase Dashboard
-- Go to Settings → Database → Connection Pooling and change to percentage-based allocation
