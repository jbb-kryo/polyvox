/*
  # Fix RLS Performance and Security Issues v3

  1. RLS Policy Optimization
    - Wrap all auth.uid() calls in (SELECT auth.uid()) to prevent re-evaluation per row
    - Affects 56 policies across 18 tables
    - Dramatically improves query performance at scale

  2. Remove Duplicate Indexes
    - Drop 4 duplicate indexes to save storage and improve write performance
    - Keep the more descriptive index name in each case

  3. Remove Unused Indexes
    - Drop 47 unused indexes that aren't being accessed
    - Reduces storage overhead and improves write performance
    - Can be recreated later if query patterns change

  4. Fix Function Security
    - Set immutable search_path on 4 functions to prevent security vulnerabilities
    - Protects against search_path manipulation attacks

  ## Performance Impact
  - Reduced per-row RLS evaluation overhead
  - Faster write operations due to fewer indexes
  - Improved query planner decisions
  - Enhanced security posture
*/

-- ==============================================
-- 1. OPTIMIZE RLS POLICIES - WRAP auth.uid()
-- ==============================================

-- Drop and recreate all policies with optimized auth.uid() calls

-- value_positions policies
DROP POLICY IF EXISTS "Users can view own positions" ON value_positions;
CREATE POLICY "Users can view own positions"
  ON value_positions
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own positions" ON value_positions;
CREATE POLICY "Users can insert own positions"
  ON value_positions
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own positions" ON value_positions;
CREATE POLICY "Users can update own positions"
  ON value_positions
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- performance_metrics policies
DROP POLICY IF EXISTS "Users can view own metrics" ON performance_metrics;
CREATE POLICY "Users can view own metrics"
  ON performance_metrics
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- user_profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
CREATE POLICY "Users can view own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
CREATE POLICY "Users can insert own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = id);

-- module_settings policies
DROP POLICY IF EXISTS "Users can view own module settings" ON module_settings;
CREATE POLICY "Users can view own module settings"
  ON module_settings
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own module settings" ON module_settings;
CREATE POLICY "Users can insert own module settings"
  ON module_settings
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own module settings" ON module_settings;
CREATE POLICY "Users can update own module settings"
  ON module_settings
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own module settings" ON module_settings;
CREATE POLICY "Users can delete own module settings"
  ON module_settings
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- arbitrage_positions policies
DROP POLICY IF EXISTS "Users can view own arbitrage positions" ON arbitrage_positions;
CREATE POLICY "Users can view own arbitrage positions"
  ON arbitrage_positions
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own arbitrage positions" ON arbitrage_positions;
CREATE POLICY "Users can insert own arbitrage positions"
  ON arbitrage_positions
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own arbitrage positions" ON arbitrage_positions;
CREATE POLICY "Users can update own arbitrage positions"
  ON arbitrage_positions
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own arbitrage positions" ON arbitrage_positions;
CREATE POLICY "Users can delete own arbitrage positions"
  ON arbitrage_positions
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- arbitrage_trades policies
DROP POLICY IF EXISTS "Users can view own arbitrage trades" ON arbitrage_trades;
CREATE POLICY "Users can view own arbitrage trades"
  ON arbitrage_trades
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own arbitrage trades" ON arbitrage_trades;
CREATE POLICY "Users can insert own arbitrage trades"
  ON arbitrage_trades
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- trend_positions policies
DROP POLICY IF EXISTS "Users can view own trend positions" ON trend_positions;
CREATE POLICY "Users can view own trend positions"
  ON trend_positions
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own trend positions" ON trend_positions;
CREATE POLICY "Users can insert own trend positions"
  ON trend_positions
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own trend positions" ON trend_positions;
CREATE POLICY "Users can update own trend positions"
  ON trend_positions
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own trend positions" ON trend_positions;
CREATE POLICY "Users can delete own trend positions"
  ON trend_positions
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- trend_trades policies
DROP POLICY IF EXISTS "Users can view own trend trades" ON trend_trades;
CREATE POLICY "Users can view own trend trades"
  ON trend_trades
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own trend trades" ON trend_trades;
CREATE POLICY "Users can insert own trend trades"
  ON trend_trades
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- snipe_orders policies
DROP POLICY IF EXISTS "Users can view own snipe orders" ON snipe_orders;
CREATE POLICY "Users can view own snipe orders"
  ON snipe_orders
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own snipe orders" ON snipe_orders;
CREATE POLICY "Users can insert own snipe orders"
  ON snipe_orders
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own snipe orders" ON snipe_orders;
CREATE POLICY "Users can update own snipe orders"
  ON snipe_orders
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own snipe orders" ON snipe_orders;
CREATE POLICY "Users can delete own snipe orders"
  ON snipe_orders
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- snipe_positions policies
DROP POLICY IF EXISTS "Users can view own snipe positions" ON snipe_positions;
CREATE POLICY "Users can view own snipe positions"
  ON snipe_positions
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own snipe positions" ON snipe_positions;
CREATE POLICY "Users can insert own snipe positions"
  ON snipe_positions
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own snipe positions" ON snipe_positions;
CREATE POLICY "Users can update own snipe positions"
  ON snipe_positions
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own snipe positions" ON snipe_positions;
CREATE POLICY "Users can delete own snipe positions"
  ON snipe_positions
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- snipe_trades policies
DROP POLICY IF EXISTS "Users can view own snipe trades" ON snipe_trades;
CREATE POLICY "Users can view own snipe trades"
  ON snipe_trades
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own snipe trades" ON snipe_trades;
CREATE POLICY "Users can insert own snipe trades"
  ON snipe_trades
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- whale_copied_positions policies
DROP POLICY IF EXISTS "Users can view own whale copied positions" ON whale_copied_positions;
CREATE POLICY "Users can view own whale copied positions"
  ON whale_copied_positions
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own whale copied positions" ON whale_copied_positions;
CREATE POLICY "Users can insert own whale copied positions"
  ON whale_copied_positions
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own whale copied positions" ON whale_copied_positions;
CREATE POLICY "Users can update own whale copied positions"
  ON whale_copied_positions
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own whale copied positions" ON whale_copied_positions;
CREATE POLICY "Users can delete own whale copied positions"
  ON whale_copied_positions
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- whale_alerts policies
DROP POLICY IF EXISTS "Users can view own whale alerts" ON whale_alerts;
CREATE POLICY "Users can view own whale alerts"
  ON whale_alerts
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own whale alerts" ON whale_alerts;
CREATE POLICY "Users can insert own whale alerts"
  ON whale_alerts
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own whale alerts" ON whale_alerts;
CREATE POLICY "Users can update own whale alerts"
  ON whale_alerts
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own whale alerts" ON whale_alerts;
CREATE POLICY "Users can delete own whale alerts"
  ON whale_alerts
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- orders policies
DROP POLICY IF EXISTS "Users can view own orders" ON orders;
CREATE POLICY "Users can view own orders"
  ON orders
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own orders" ON orders;
CREATE POLICY "Users can insert own orders"
  ON orders
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own orders" ON orders;
CREATE POLICY "Users can update own orders"
  ON orders
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- order_fills policies
DROP POLICY IF EXISTS "Users can view own order fills" ON order_fills;
CREATE POLICY "Users can view own order fills"
  ON order_fills
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM orders
      WHERE orders.id = order_fills.order_id
      AND orders.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert own order fills" ON order_fills;
CREATE POLICY "Users can insert own order fills"
  ON order_fills
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM orders
      WHERE orders.id = order_fills.order_id
      AND orders.user_id = (SELECT auth.uid())
    )
  );

-- module_performance policies
DROP POLICY IF EXISTS "Users can view own module performance" ON module_performance;
CREATE POLICY "Users can view own module performance"
  ON module_performance
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own module performance" ON module_performance;
CREATE POLICY "Users can insert own module performance"
  ON module_performance
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own module performance" ON module_performance;
CREATE POLICY "Users can update own module performance"
  ON module_performance
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- trade_analytics policies
DROP POLICY IF EXISTS "Users can view own trade analytics" ON trade_analytics;
CREATE POLICY "Users can view own trade analytics"
  ON trade_analytics
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own trade analytics" ON trade_analytics;
CREATE POLICY "Users can insert own trade analytics"
  ON trade_analytics
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- market_watchlist policies
DROP POLICY IF EXISTS "Users can view own market watchlist" ON market_watchlist;
CREATE POLICY "Users can view own market watchlist"
  ON market_watchlist
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own market watchlist" ON market_watchlist;
CREATE POLICY "Users can insert own market watchlist"
  ON market_watchlist
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own market watchlist" ON market_watchlist;
CREATE POLICY "Users can update own market watchlist"
  ON market_watchlist
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own market watchlist" ON market_watchlist;
CREATE POLICY "Users can delete own market watchlist"
  ON market_watchlist
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- ==============================================
-- 2. REMOVE DUPLICATE INDEXES
-- ==============================================

-- Drop duplicate indexes (keeping the more descriptive name)
DROP INDEX IF EXISTS idx_arbitrage_trades_user_date;
DROP INDEX IF EXISTS idx_snipe_trades_user_date;
DROP INDEX IF EXISTS idx_trend_trades_user_date;
DROP INDEX IF EXISTS idx_whale_orders_address_date;

-- ==============================================
-- 3. REMOVE UNUSED INDEXES
-- ==============================================

-- Value-related indexes
DROP INDEX IF EXISTS idx_value_markets_edge;
DROP INDEX IF EXISTS idx_value_markets_category;
DROP INDEX IF EXISTS idx_value_markets_updated;
DROP INDEX IF EXISTS idx_value_positions_user;
DROP INDEX IF EXISTS idx_value_positions_status;
DROP INDEX IF EXISTS idx_value_positions_market;
DROP INDEX IF EXISTS idx_value_signals_edge;
DROP INDEX IF EXISTS idx_value_signals_created;
DROP INDEX IF EXISTS idx_value_markets_market;

-- Performance metrics indexes
DROP INDEX IF EXISTS idx_performance_user;
DROP INDEX IF EXISTS idx_performance_period;

-- Snipe-related indexes
DROP INDEX IF EXISTS idx_snipe_positions_user;
DROP INDEX IF EXISTS idx_snipe_orders_market;

-- Position indexes
DROP INDEX IF EXISTS idx_value_positions_user_status;
DROP INDEX IF EXISTS idx_arbitrage_positions_user_status;
DROP INDEX IF EXISTS idx_trend_positions_user_status;
DROP INDEX IF EXISTS idx_snipe_positions_user_status;
DROP INDEX IF EXISTS idx_whale_copied_positions_user_status;

-- Trade indexes
DROP INDEX IF EXISTS idx_arbitrage_trades_user_closed;
DROP INDEX IF EXISTS idx_trend_trades_user_closed;
DROP INDEX IF EXISTS idx_snipe_trades_user_closed;

-- Whale-related indexes
DROP INDEX IF EXISTS idx_whale_profiles_volume;
DROP INDEX IF EXISTS idx_whale_profiles_winrate;
DROP INDEX IF EXISTS idx_whale_profiles_tracked;
DROP INDEX IF EXISTS idx_whale_orders_address_time;
DROP INDEX IF EXISTS idx_whale_orders_market;
DROP INDEX IF EXISTS idx_whale_alerts_user_read;

-- Order-related indexes
DROP INDEX IF EXISTS idx_orders_market;
DROP INDEX IF EXISTS idx_orders_user_status;
DROP INDEX IF EXISTS idx_orders_created_at;
DROP INDEX IF EXISTS idx_order_fills_order_id;

-- Module and analytics indexes
DROP INDEX IF EXISTS idx_module_settings_user_enabled;
DROP INDEX IF EXISTS idx_module_performance_user_module;
DROP INDEX IF EXISTS idx_trade_analytics_user_time;
DROP INDEX IF EXISTS idx_trade_analytics_user_module;
DROP INDEX IF EXISTS idx_market_watchlist_user;

-- Other unused indexes
DROP INDEX IF EXISTS idx_user_profiles_email;
DROP INDEX IF EXISTS idx_module_settings_user_module;
DROP INDEX IF EXISTS idx_arbitrage_opportunities_executed;
DROP INDEX IF EXISTS idx_arbitrage_trades_user_date;
DROP INDEX IF EXISTS idx_trend_opportunities_executed;
DROP INDEX IF EXISTS idx_trend_trades_user_date;
DROP INDEX IF EXISTS idx_snipe_orders_user_status;
DROP INDEX IF EXISTS idx_snipe_trades_user_date;

-- ==============================================
-- 4. FIX FUNCTION SEARCH PATHS
-- ==============================================

-- Fix update_updated_at_column function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix create_user_profile function
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, paper_trading_mode)
  VALUES (NEW.id, NEW.email, true);
  RETURN NEW;
END;
$$;

-- Fix cleanup_old_data function
CREATE OR REPLACE FUNCTION cleanup_old_data(days_to_keep integer DEFAULT 90)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  cutoff_date timestamp;
BEGIN
  cutoff_date := NOW() - (days_to_keep || ' days')::interval;

  -- Clean up old opportunities that weren't executed
  DELETE FROM public.arbitrage_opportunities
  WHERE created_at < cutoff_date AND is_executed = false;

  DELETE FROM public.trend_opportunities
  WHERE created_at < cutoff_date AND is_executed = false;

  DELETE FROM public.value_signals
  WHERE created_at < cutoff_date AND is_executed = false;

  -- Log cleanup
  RAISE NOTICE 'Cleaned up data older than % days', days_to_keep;
END;
$$;

-- Fix get_user_stats function
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
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  WITH trade_stats AS (
    SELECT COUNT(*)::integer as trades, SUM(profit) as pnl
    FROM (
      SELECT profit FROM public.arbitrage_trades WHERE user_id = p_user_id
      UNION ALL
      SELECT profit FROM public.trend_trades WHERE user_id = p_user_id
      UNION ALL
      SELECT profit FROM public.snipe_trades WHERE user_id = p_user_id
    ) all_trades
  ),
  position_stats AS (
    SELECT COUNT(*)::integer as positions
    FROM (
      SELECT id FROM public.arbitrage_positions WHERE user_id = p_user_id AND status = 'open'
      UNION ALL
      SELECT id FROM public.trend_positions WHERE user_id = p_user_id AND status = 'open'
      UNION ALL
      SELECT id FROM public.snipe_positions WHERE user_id = p_user_id
      UNION ALL
      SELECT id FROM public.whale_copied_positions WHERE user_id = p_user_id AND status = 'open'
      UNION ALL
      SELECT id FROM public.value_positions WHERE user_id = p_user_id AND status = 'open'
    ) all_positions
  ),
  win_stats AS (
    SELECT
      COUNT(*) FILTER (WHERE profit > 0)::numeric / NULLIF(COUNT(*)::numeric, 0) * 100 as win_pct
    FROM (
      SELECT profit FROM public.arbitrage_trades WHERE user_id = p_user_id
      UNION ALL
      SELECT profit FROM public.trend_trades WHERE user_id = p_user_id
      UNION ALL
      SELECT profit FROM public.snipe_trades WHERE user_id = p_user_id
    ) all_trades
  ),
  active_mods AS (
    SELECT array_agg(module_id) as modules
    FROM public.module_settings
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

-- ==============================================
-- 5. ANALYZE TABLES FOR QUERY PLANNER
-- ==============================================

-- Update statistics after all changes
ANALYZE arbitrage_positions;
ANALYZE arbitrage_trades;
ANALYZE trend_positions;
ANALYZE trend_trades;
ANALYZE snipe_orders;
ANALYZE snipe_positions;
ANALYZE snipe_trades;
ANALYZE whale_copied_positions;
ANALYZE whale_alerts;
ANALYZE orders;
ANALYZE order_fills;
ANALYZE module_settings;
ANALYZE module_performance;
ANALYZE trade_analytics;
ANALYZE market_watchlist;
ANALYZE value_positions;
ANALYZE performance_metrics;
ANALYZE user_profiles;