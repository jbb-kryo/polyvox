/*
  # Fix Security and Performance Issues
  
  1. Add Missing Indexes
    - Add index for `copied_positions.whale_order_id` foreign key
    - Add index for `snipe_positions.order_id` foreign key
  
  2. Optimize RLS Policies
    - Update all RLS policies to use `(select auth.uid())` instead of `auth.uid()`
    - This prevents re-evaluation for each row and improves query performance at scale
  
  3. Fix Function Search Path
    - Update `update_platform_metrics_timestamp` function to have immutable search path
  
  Tables affected:
  - copied_positions
  - whale_alerts
  - value_positions
  - performance_metrics
  - arbitrage_positions
  - arbitrage_trades
  - trend_positions
  - trend_trades
  - snipe_orders
  - snipe_positions
  - module_performance
  - snipe_trades
  - user_module_settings
  - market_watchlist
  - trade_analytics
*/

-- =====================================================
-- 1. ADD MISSING INDEXES FOR FOREIGN KEYS
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_copied_positions_whale_order_id 
  ON copied_positions(whale_order_id);

CREATE INDEX IF NOT EXISTS idx_snipe_positions_order_id 
  ON snipe_positions(order_id);

-- =====================================================
-- 2. FIX RLS POLICIES - COPIED_POSITIONS
-- =====================================================

DROP POLICY IF EXISTS "Users can view own copied positions" ON copied_positions;
CREATE POLICY "Users can view own copied positions"
  ON copied_positions
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own copied positions" ON copied_positions;
CREATE POLICY "Users can insert own copied positions"
  ON copied_positions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own copied positions" ON copied_positions;
CREATE POLICY "Users can update own copied positions"
  ON copied_positions
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- =====================================================
-- 3. FIX RLS POLICIES - WHALE_ALERTS
-- =====================================================

DROP POLICY IF EXISTS "Users can view own alerts" ON whale_alerts;
CREATE POLICY "Users can view own alerts"
  ON whale_alerts
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own alerts" ON whale_alerts;
CREATE POLICY "Users can insert own alerts"
  ON whale_alerts
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own alerts" ON whale_alerts;
CREATE POLICY "Users can update own alerts"
  ON whale_alerts
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- =====================================================
-- 4. FIX RLS POLICIES - VALUE_POSITIONS
-- =====================================================

DROP POLICY IF EXISTS "Users can view own positions" ON value_positions;
CREATE POLICY "Users can view own positions"
  ON value_positions
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own positions" ON value_positions;
CREATE POLICY "Users can insert own positions"
  ON value_positions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own positions" ON value_positions;
CREATE POLICY "Users can update own positions"
  ON value_positions
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- =====================================================
-- 5. FIX RLS POLICIES - PERFORMANCE_METRICS
-- =====================================================

DROP POLICY IF EXISTS "Users can view own metrics" ON performance_metrics;
CREATE POLICY "Users can view own metrics"
  ON performance_metrics
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

-- =====================================================
-- 6. FIX RLS POLICIES - ARBITRAGE_POSITIONS
-- =====================================================

DROP POLICY IF EXISTS "Users can view own arbitrage positions" ON arbitrage_positions;
CREATE POLICY "Users can view own arbitrage positions"
  ON arbitrage_positions
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own arbitrage positions" ON arbitrage_positions;
CREATE POLICY "Users can insert own arbitrage positions"
  ON arbitrage_positions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own arbitrage positions" ON arbitrage_positions;
CREATE POLICY "Users can update own arbitrage positions"
  ON arbitrage_positions
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- =====================================================
-- 7. FIX RLS POLICIES - ARBITRAGE_TRADES
-- =====================================================

DROP POLICY IF EXISTS "Users can view own arbitrage trades" ON arbitrage_trades;
CREATE POLICY "Users can view own arbitrage trades"
  ON arbitrage_trades
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own arbitrage trades" ON arbitrage_trades;
CREATE POLICY "Users can insert own arbitrage trades"
  ON arbitrage_trades
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

-- =====================================================
-- 8. FIX RLS POLICIES - TREND_POSITIONS
-- =====================================================

DROP POLICY IF EXISTS "Users can view own trend positions" ON trend_positions;
CREATE POLICY "Users can view own trend positions"
  ON trend_positions
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own trend positions" ON trend_positions;
CREATE POLICY "Users can insert own trend positions"
  ON trend_positions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own trend positions" ON trend_positions;
CREATE POLICY "Users can update own trend positions"
  ON trend_positions
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- =====================================================
-- 9. FIX RLS POLICIES - TREND_TRADES
-- =====================================================

DROP POLICY IF EXISTS "Users can view own trend trades" ON trend_trades;
CREATE POLICY "Users can view own trend trades"
  ON trend_trades
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own trend trades" ON trend_trades;
CREATE POLICY "Users can insert own trend trades"
  ON trend_trades
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

-- =====================================================
-- 10. FIX RLS POLICIES - SNIPE_ORDERS
-- =====================================================

DROP POLICY IF EXISTS "Users can view own snipe orders" ON snipe_orders;
CREATE POLICY "Users can view own snipe orders"
  ON snipe_orders
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own snipe orders" ON snipe_orders;
CREATE POLICY "Users can insert own snipe orders"
  ON snipe_orders
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own snipe orders" ON snipe_orders;
CREATE POLICY "Users can update own snipe orders"
  ON snipe_orders
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- =====================================================
-- 11. FIX RLS POLICIES - SNIPE_POSITIONS
-- =====================================================

DROP POLICY IF EXISTS "Users can view own snipe positions" ON snipe_positions;
CREATE POLICY "Users can view own snipe positions"
  ON snipe_positions
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own snipe positions" ON snipe_positions;
CREATE POLICY "Users can insert own snipe positions"
  ON snipe_positions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own snipe positions" ON snipe_positions;
CREATE POLICY "Users can update own snipe positions"
  ON snipe_positions
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- =====================================================
-- 12. FIX RLS POLICIES - MODULE_PERFORMANCE
-- =====================================================

DROP POLICY IF EXISTS "Users can view own module performance" ON module_performance;
CREATE POLICY "Users can view own module performance"
  ON module_performance
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own module performance" ON module_performance;
CREATE POLICY "Users can insert own module performance"
  ON module_performance
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own module performance" ON module_performance;
CREATE POLICY "Users can update own module performance"
  ON module_performance
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- =====================================================
-- 13. FIX RLS POLICIES - SNIPE_TRADES
-- =====================================================

DROP POLICY IF EXISTS "Users can view own snipe trades" ON snipe_trades;
CREATE POLICY "Users can view own snipe trades"
  ON snipe_trades
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own snipe trades" ON snipe_trades;
CREATE POLICY "Users can insert own snipe trades"
  ON snipe_trades
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

-- =====================================================
-- 14. FIX RLS POLICIES - USER_MODULE_SETTINGS
-- =====================================================

DROP POLICY IF EXISTS "Users can view own module settings" ON user_module_settings;
CREATE POLICY "Users can view own module settings"
  ON user_module_settings
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own module settings" ON user_module_settings;
CREATE POLICY "Users can insert own module settings"
  ON user_module_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own module settings" ON user_module_settings;
CREATE POLICY "Users can update own module settings"
  ON user_module_settings
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- =====================================================
-- 15. FIX RLS POLICIES - MARKET_WATCHLIST
-- =====================================================

DROP POLICY IF EXISTS "Users can view own watchlist" ON market_watchlist;
CREATE POLICY "Users can view own watchlist"
  ON market_watchlist
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own watchlist items" ON market_watchlist;
CREATE POLICY "Users can insert own watchlist items"
  ON market_watchlist
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own watchlist items" ON market_watchlist;
CREATE POLICY "Users can update own watchlist items"
  ON market_watchlist
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own watchlist items" ON market_watchlist;
CREATE POLICY "Users can delete own watchlist items"
  ON market_watchlist
  FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- =====================================================
-- 16. FIX RLS POLICIES - TRADE_ANALYTICS
-- =====================================================

DROP POLICY IF EXISTS "Users can view own trade analytics" ON trade_analytics;
CREATE POLICY "Users can view own trade analytics"
  ON trade_analytics
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own trade analytics" ON trade_analytics;
CREATE POLICY "Users can insert own trade analytics"
  ON trade_analytics
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own trade analytics" ON trade_analytics;
CREATE POLICY "Users can update own trade analytics"
  ON trade_analytics
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- =====================================================
-- 17. FIX FUNCTION SEARCH PATH
-- =====================================================

CREATE OR REPLACE FUNCTION update_platform_metrics_timestamp()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;