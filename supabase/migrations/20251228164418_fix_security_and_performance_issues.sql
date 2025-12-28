/*
  # Fix Security and Performance Issues (v1.1.5)

  1. Missing Foreign Key Indexes
    - Add indexes for foreign keys to improve query performance:
      - arbitrage_trades.user_id
      - error_logs.resolved_by
      - snipe_trades.user_id
      - trend_trades.user_id

  2. RLS Policy Optimization
    - Fix all RLS policies to use (select auth.uid()) pattern
    - This prevents re-evaluation of auth.uid() for each row
    - Affects: notifications, notification_preferences, error_logs, trading_activity_logs

  3. Remove Unused Indexes
    - Drop indexes that are not being used to improve write performance
    - Affects multiple tables with unused indexes

  4. Fix Multiple Permissive Policies
    - Consolidate duplicate policies on error_rate_metrics table

  5. Fix Function Search Paths
    - Set explicit search_path on all functions for security
    - Affects: notification functions, error tracking functions, trading log functions
*/

-- ============================================================================
-- 1. ADD MISSING FOREIGN KEY INDEXES
-- ============================================================================

-- Index for arbitrage_trades.user_id foreign key
CREATE INDEX IF NOT EXISTS idx_arbitrage_trades_user_id
ON arbitrage_trades(user_id);

-- Index for error_logs.resolved_by foreign key
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved_by
ON error_logs(resolved_by)
WHERE resolved_by IS NOT NULL;

-- Index for snipe_trades.user_id foreign key
CREATE INDEX IF NOT EXISTS idx_snipe_trades_user_id
ON snipe_trades(user_id);

-- Index for trend_trades.user_id foreign key
CREATE INDEX IF NOT EXISTS idx_trend_trades_user_id
ON trend_trades(user_id);

-- ============================================================================
-- 2. FIX RLS POLICIES - NOTIFICATION_PREFERENCES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own preferences" ON notification_preferences;
CREATE POLICY "Users can view own preferences"
ON notification_preferences FOR SELECT
TO authenticated
USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own preferences" ON notification_preferences;
CREATE POLICY "Users can insert own preferences"
ON notification_preferences FOR INSERT
TO authenticated
WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own preferences" ON notification_preferences;
CREATE POLICY "Users can update own preferences"
ON notification_preferences FOR UPDATE
TO authenticated
USING (user_id = (select auth.uid()))
WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own preferences" ON notification_preferences;
CREATE POLICY "Users can delete own preferences"
ON notification_preferences FOR DELETE
TO authenticated
USING (user_id = (select auth.uid()));

-- ============================================================================
-- 3. FIX RLS POLICIES - NOTIFICATIONS
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications"
ON notifications FOR SELECT
TO authenticated
USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own notifications" ON notifications;
CREATE POLICY "Users can insert own notifications"
ON notifications FOR INSERT
TO authenticated
WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications"
ON notifications FOR UPDATE
TO authenticated
USING (user_id = (select auth.uid()))
WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;
CREATE POLICY "Users can delete own notifications"
ON notifications FOR DELETE
TO authenticated
USING (user_id = (select auth.uid()));

-- ============================================================================
-- 4. FIX RLS POLICIES - ERROR_LOGS
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own error logs" ON error_logs;
CREATE POLICY "Users can view their own error logs"
ON error_logs FOR SELECT
TO authenticated
USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert their own error logs" ON error_logs;
CREATE POLICY "Users can insert their own error logs"
ON error_logs FOR INSERT
TO authenticated
WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update their own error logs" ON error_logs;
CREATE POLICY "Users can update their own error logs"
ON error_logs FOR UPDATE
TO authenticated
USING (user_id = (select auth.uid()))
WITH CHECK (user_id = (select auth.uid()));

-- ============================================================================
-- 5. FIX RLS POLICIES - TRADING_ACTIVITY_LOGS
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own trading activity logs" ON trading_activity_logs;
CREATE POLICY "Users can view their own trading activity logs"
ON trading_activity_logs FOR SELECT
TO authenticated
USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert their own trading activity logs" ON trading_activity_logs;
CREATE POLICY "Users can insert their own trading activity logs"
ON trading_activity_logs FOR INSERT
TO authenticated
WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own old trading activity logs" ON trading_activity_logs;
CREATE POLICY "Users can delete their own old trading activity logs"
ON trading_activity_logs FOR DELETE
TO authenticated
USING (
  user_id = (select auth.uid()) AND
  created_at < (CURRENT_TIMESTAMP - INTERVAL '365 days')
);

-- ============================================================================
-- 6. FIX MULTIPLE PERMISSIVE POLICIES - ERROR_RATE_METRICS
-- ============================================================================

-- Drop the duplicate policy and consolidate
DROP POLICY IF EXISTS "Authenticated users can view error rate metrics" ON error_rate_metrics;
DROP POLICY IF EXISTS "System can manage error rate metrics" ON error_rate_metrics;

-- Create a single comprehensive policy
CREATE POLICY "Users can manage error rate metrics"
ON error_rate_metrics FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- ============================================================================
-- 7. DROP UNUSED INDEXES
-- ============================================================================

-- Orders table unused indexes
DROP INDEX IF EXISTS idx_orders_user_status;
DROP INDEX IF EXISTS idx_orders_user_created;
DROP INDEX IF EXISTS idx_orders_market_id;
DROP INDEX IF EXISTS idx_orders_module;
DROP INDEX IF EXISTS idx_orders_status_created;
DROP INDEX IF EXISTS idx_orders_user_module_created;

-- Order fills table unused indexes
DROP INDEX IF EXISTS idx_order_fills_order_id;
DROP INDEX IF EXISTS idx_order_fills_timestamp;
DROP INDEX IF EXISTS idx_order_fills_order_timestamp;

-- Arbitrage positions table unused indexes
DROP INDEX IF EXISTS idx_arbitrage_positions_user_status;
DROP INDEX IF EXISTS idx_arbitrage_positions_markets;
DROP INDEX IF EXISTS idx_arbitrage_positions_created;
DROP INDEX IF EXISTS idx_arbitrage_positions_user_created;

-- Snipe positions table unused indexes
DROP INDEX IF EXISTS idx_snipe_positions_user_status;
DROP INDEX IF EXISTS idx_snipe_positions_market;
DROP INDEX IF EXISTS idx_snipe_positions_created;
DROP INDEX IF EXISTS idx_snipe_positions_user_created;

-- Snipe orders table unused indexes
DROP INDEX IF EXISTS idx_snipe_orders_user_status;
DROP INDEX IF EXISTS idx_snipe_orders_market;
DROP INDEX IF EXISTS idx_snipe_orders_limit_price;

-- Trend positions table unused indexes
DROP INDEX IF EXISTS idx_trend_positions_user_status;
DROP INDEX IF EXISTS idx_trend_positions_market;
DROP INDEX IF EXISTS idx_trend_positions_created;
DROP INDEX IF EXISTS idx_trend_positions_user_created;

-- Trend opportunities table unused indexes
DROP INDEX IF EXISTS idx_trend_opportunities_market;
DROP INDEX IF EXISTS idx_trend_opportunities_created;
DROP INDEX IF EXISTS idx_trend_opportunities_strength;

-- Value positions table unused indexes
DROP INDEX IF EXISTS idx_value_positions_user_status;
DROP INDEX IF EXISTS idx_value_positions_market;
DROP INDEX IF EXISTS idx_value_positions_created;
DROP INDEX IF EXISTS idx_value_positions_user_created;

-- Value markets table unused indexes
DROP INDEX IF EXISTS idx_value_markets_market;
DROP INDEX IF EXISTS idx_value_markets_created;
DROP INDEX IF EXISTS idx_value_markets_updated;

-- Value signals table unused indexes
DROP INDEX IF EXISTS idx_value_signals_market;
DROP INDEX IF EXISTS idx_value_signals_edge;
DROP INDEX IF EXISTS idx_value_signals_created;

-- Whale orders table unused indexes
DROP INDEX IF EXISTS idx_whale_orders_whale;
DROP INDEX IF EXISTS idx_whale_orders_market;
DROP INDEX IF EXISTS idx_whale_orders_timestamp;

-- Whale profiles table unused indexes
DROP INDEX IF EXISTS idx_whale_profiles_address;
DROP INDEX IF EXISTS idx_whale_profiles_win_rate;
DROP INDEX IF EXISTS idx_whale_profiles_tracked;

-- Whale copied positions table unused indexes
DROP INDEX IF EXISTS idx_whale_copied_positions_user_status;
DROP INDEX IF EXISTS idx_whale_copied_positions_whale;
DROP INDEX IF EXISTS idx_whale_copied_positions_market;
DROP INDEX IF EXISTS idx_whale_copied_positions_created;

-- Whale alerts table unused indexes
DROP INDEX IF EXISTS idx_whale_alerts_user_read;
DROP INDEX IF EXISTS idx_whale_alerts_created;
DROP INDEX IF EXISTS idx_whale_alerts_user_type;

-- Module performance table unused indexes
DROP INDEX IF EXISTS idx_module_performance_user_module;
DROP INDEX IF EXISTS idx_module_performance_calculated;

-- Trade analytics table unused indexes
DROP INDEX IF EXISTS idx_trade_analytics_user;
DROP INDEX IF EXISTS idx_trade_analytics_module;
DROP INDEX IF EXISTS idx_trade_analytics_market;

-- User profiles table unused indexes
DROP INDEX IF EXISTS idx_user_profiles_paper_trading;
DROP INDEX IF EXISTS idx_user_profiles_wallet;

-- Module settings table unused indexes
DROP INDEX IF EXISTS idx_module_settings_user_module;
DROP INDEX IF EXISTS idx_module_settings_enabled;

-- Notifications table unused indexes
DROP INDEX IF EXISTS idx_notifications_user_id;
DROP INDEX IF EXISTS idx_notifications_user_created;
DROP INDEX IF EXISTS idx_notifications_user_unread;
DROP INDEX IF EXISTS idx_notifications_type;
DROP INDEX IF EXISTS idx_notifications_user_read;
DROP INDEX IF EXISTS idx_notifications_created;
DROP INDEX IF EXISTS idx_notifications_user_type_read;
DROP INDEX IF EXISTS idx_notifications_user_category;

-- Notification preferences table unused indexes
DROP INDEX IF EXISTS idx_notification_preferences_user_id;

-- Error logs table unused indexes
DROP INDEX IF EXISTS idx_error_logs_user_id;
DROP INDEX IF EXISTS idx_error_logs_created_at;
DROP INDEX IF EXISTS idx_error_logs_severity;
DROP INDEX IF EXISTS idx_error_logs_error_type;
DROP INDEX IF EXISTS idx_error_logs_resolved;
DROP INDEX IF EXISTS idx_error_logs_user_created;

-- Error rate metrics table unused indexes
DROP INDEX IF EXISTS idx_error_rate_metrics_time_bucket;

-- Trading activity logs table unused indexes
DROP INDEX IF EXISTS idx_trading_logs_user_id;
DROP INDEX IF EXISTS idx_trading_logs_created_at;
DROP INDEX IF EXISTS idx_trading_logs_log_level;
DROP INDEX IF EXISTS idx_trading_logs_module;
DROP INDEX IF EXISTS idx_trading_logs_activity_type;
DROP INDEX IF EXISTS idx_trading_logs_user_created;
DROP INDEX IF EXISTS idx_trading_logs_market_id;
DROP INDEX IF EXISTS idx_trading_logs_success;

-- ============================================================================
-- 8. FIX FUNCTION SEARCH PATHS
-- ============================================================================

-- Drop triggers first before functions
DROP TRIGGER IF EXISTS trigger_update_notification_preferences_updated_at ON notification_preferences;
DROP TRIGGER IF EXISTS update_notification_preferences_updated_at_trigger ON notification_preferences;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_notification_prefs ON auth.users;
DROP TRIGGER IF EXISTS update_error_rate_metrics_trigger ON error_logs;
DROP TRIGGER IF EXISTS on_error_log_created ON error_logs;

-- Drop existing functions
DROP FUNCTION IF EXISTS update_notification_preferences_updated_at() CASCADE;
DROP FUNCTION IF EXISTS create_default_notification_preferences() CASCADE;
DROP FUNCTION IF EXISTS update_error_rate_metrics() CASCADE;
DROP FUNCTION IF EXISTS get_error_statistics(UUID, TIMESTAMP, TIMESTAMP);
DROP FUNCTION IF EXISTS cleanup_old_trading_logs(INTEGER);
DROP FUNCTION IF EXISTS get_trading_log_statistics(UUID, TIMESTAMP, TIMESTAMP, TEXT);
DROP FUNCTION IF EXISTS get_trading_activity_timeline(UUID, INTEGER, INTEGER, TEXT, TEXT, TEXT, TIMESTAMP, TIMESTAMP);

-- Recreate functions with proper search_path

CREATE FUNCTION update_notification_preferences_updated_at()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

CREATE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE FUNCTION update_error_rate_metrics()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  time_bucket TIMESTAMP;
BEGIN
  time_bucket := date_trunc('hour', NEW.created_at);

  INSERT INTO error_rate_metrics (time_bucket, error_count, user_id)
  VALUES (time_bucket, 1, NEW.user_id)
  ON CONFLICT (time_bucket, COALESCE(user_id, '00000000-0000-0000-0000-000000000000'::uuid))
  DO UPDATE SET
    error_count = error_rate_metrics.error_count + 1,
    updated_at = CURRENT_TIMESTAMP;

  RETURN NEW;
END;
$$;

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
SET search_path = public
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
  FROM error_logs
  WHERE user_id = p_user_id
    AND (p_start_date IS NULL OR created_at >= p_start_date)
    AND (p_end_date IS NULL OR created_at <= p_end_date);
END;
$$;

CREATE FUNCTION cleanup_old_trading_logs(retention_days INTEGER DEFAULT 365)
RETURNS INTEGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM trading_activity_logs
  WHERE created_at < (CURRENT_TIMESTAMP - (retention_days || ' days')::INTERVAL);

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

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
SET search_path = public
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
  FROM trading_activity_logs
  WHERE user_id = p_user_id
    AND (p_start_date IS NULL OR created_at >= p_start_date)
    AND (p_end_date IS NULL OR created_at <= p_end_date)
    AND (p_module IS NULL OR module = p_module);
END;
$$;

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
SET search_path = public
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
  FROM trading_activity_logs t
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

-- Recreate triggers
CREATE TRIGGER trigger_update_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_preferences_updated_at();

CREATE TRIGGER on_auth_user_created_notification_prefs
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_notification_preferences();

CREATE TRIGGER update_error_rate_metrics_trigger
  AFTER INSERT ON error_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_error_rate_metrics();
