/*
  # Fix Database Security and Performance Issues

  ## Changes Made

  ### 1. Add Missing Foreign Key Indexes
  - Add indexes for all unindexed foreign key columns
  - Improves JOIN performance and referential integrity checks

  ### 2. Optimize RLS Policies
  - Wrap all `auth.uid()` calls with `(select auth.uid())`
  - Prevents re-evaluation for each row, dramatically improves query performance at scale

  ### 3. Remove Unused Indexes
  - Drop indexes that haven't been used
  - Reduces storage overhead and improves write performance

  ### 4. Remove Duplicate Indexes
  - Drop duplicate indexes to save storage and improve write performance

  ### 5. Fix Function Search Paths
  - Set immutable search paths for all functions
  - Prevents security vulnerabilities from search_path manipulation

  ## Security Improvements
  - Fixed RLS policy performance issues
  - Secured function search paths
  - Optimized database query performance
*/

-- ==============================================
-- 1. ADD MISSING FOREIGN KEY INDEXES
-- ==============================================

CREATE INDEX IF NOT EXISTS idx_active_positions_execution_log_id 
  ON public.active_positions(execution_log_id);

CREATE INDEX IF NOT EXISTS idx_arbitrage_positions_execution_id 
  ON public.arbitrage_positions(execution_id);

CREATE INDEX IF NOT EXISTS idx_arbitrage_trades_position_id 
  ON public.arbitrage_trades(position_id);

CREATE INDEX IF NOT EXISTS idx_execution_logs_opportunity_id 
  ON public.execution_logs(opportunity_id);

CREATE INDEX IF NOT EXISTS idx_external_data_sources_user_id 
  ON public.external_data_sources(user_id);

CREATE INDEX IF NOT EXISTS idx_position_history_execution_log_id 
  ON public.position_history(execution_log_id);

CREATE INDEX IF NOT EXISTS idx_risk_trigger_history_risk_setting_id 
  ON public.risk_trigger_history(risk_setting_id);

-- ==============================================
-- 2. DROP UNUSED AND DUPLICATE INDEXES
-- ==============================================

DROP INDEX IF EXISTS idx_whale_orders_wallet;
DROP INDEX IF EXISTS idx_whale_orders_timestamp;
DROP INDEX IF EXISTS idx_whale_orders_size;
DROP INDEX IF EXISTS idx_whale_orders_market;
DROP INDEX IF EXISTS idx_whale_stats_volume;
DROP INDEX IF EXISTS idx_whale_stats_win_rate;
DROP INDEX IF EXISTS idx_whale_stats_last_active;
DROP INDEX IF EXISTS idx_copied_positions_user;
DROP INDEX IF EXISTS idx_copied_positions_whale;
DROP INDEX IF EXISTS idx_copied_positions_status;
DROP INDEX IF EXISTS idx_copied_positions_market;
DROP INDEX IF EXISTS idx_whale_alerts_user;
DROP INDEX IF EXISTS idx_whale_alerts_read;
DROP INDEX IF EXISTS idx_whale_alerts_created;
DROP INDEX IF EXISTS idx_value_markets_edge;
DROP INDEX IF EXISTS idx_value_markets_category;
DROP INDEX IF EXISTS idx_value_markets_updated;
DROP INDEX IF EXISTS idx_value_positions_user;
DROP INDEX IF EXISTS idx_value_positions_status;
DROP INDEX IF EXISTS idx_value_positions_market;
DROP INDEX IF EXISTS idx_value_signals_edge;
DROP INDEX IF EXISTS idx_value_signals_created;
DROP INDEX IF EXISTS idx_performance_user;
DROP INDEX IF EXISTS idx_performance_period;
DROP INDEX IF EXISTS idx_order_execution_logs_order_id;
DROP INDEX IF EXISTS idx_order_execution_logs_timestamp;
DROP INDEX IF EXISTS idx_snipe_orders_user;
DROP INDEX IF EXISTS idx_snipe_positions_user;
DROP INDEX IF EXISTS idx_arbitrage_positions_user;
DROP INDEX IF EXISTS idx_trend_positions_user;
DROP INDEX IF EXISTS idx_module_performance_user;
DROP INDEX IF EXISTS idx_copied_positions_whale_order_id;
DROP INDEX IF EXISTS idx_snipe_positions_order_id;
DROP INDEX IF EXISTS idx_snipe_trades_closed;
DROP INDEX IF EXISTS idx_orders_user_id;
DROP INDEX IF EXISTS idx_orders_status;
DROP INDEX IF EXISTS idx_orders_market_id;
DROP INDEX IF EXISTS idx_orders_clob_order_id;
DROP INDEX IF EXISTS idx_orders_created_at;
DROP INDEX IF EXISTS idx_order_fills_order_id;
DROP INDEX IF EXISTS idx_trend_opps_strength;
DROP INDEX IF EXISTS idx_trend_opps_created;
DROP INDEX IF EXISTS idx_trend_opps_market;
DROP INDEX IF EXISTS idx_module_settings_user;
DROP INDEX IF EXISTS idx_watchlist_user;
DROP INDEX IF EXISTS idx_trade_analytics_user;
DROP INDEX IF EXISTS idx_trade_analytics_date;
DROP INDEX IF EXISTS idx_platform_metrics_name;
DROP INDEX IF EXISTS idx_user_profiles_email;
DROP INDEX IF EXISTS idx_arbitrage_opportunities_user_id;
DROP INDEX IF EXISTS idx_arbitrage_trades_user_id;
DROP INDEX IF EXISTS idx_trend_opportunities_user_id;
DROP INDEX IF EXISTS idx_trend_trades_user_id;
DROP INDEX IF EXISTS idx_snipe_trades_user_id;
DROP INDEX IF EXISTS idx_whale_orders_user_id;
DROP INDEX IF EXISTS idx_whale_stats_user_id;
DROP INDEX IF EXISTS idx_value_markets_user_id;
DROP INDEX IF EXISTS idx_value_signals_user_id;
DROP INDEX IF EXISTS idx_market_snapshots_market_id;
DROP INDEX IF EXISTS idx_market_snapshots_timestamp;
DROP INDEX IF EXISTS idx_market_snapshots_market_timestamp;
DROP INDEX IF EXISTS idx_order_book_market_id;
DROP INDEX IF EXISTS idx_order_book_timestamp;
DROP INDEX IF EXISTS idx_order_book_market_token;
DROP INDEX IF EXISTS idx_trade_activity_market_id;
DROP INDEX IF EXISTS idx_trade_activity_timestamp;
DROP INDEX IF EXISTS idx_trade_activity_market_timestamp;
DROP INDEX IF EXISTS idx_trade_activity_trade_id;
DROP INDEX IF EXISTS idx_subscriptions_user_id;
DROP INDEX IF EXISTS idx_subscriptions_market_id;
DROP INDEX IF EXISTS idx_subscriptions_active;
DROP INDEX IF EXISTS idx_rate_limits_endpoint;
DROP INDEX IF EXISTS idx_arbitrage_executions_user_id;
DROP INDEX IF EXISTS idx_arbitrage_executions_created_at;
DROP INDEX IF EXISTS idx_arbitrage_executions_market1_id;
DROP INDEX IF EXISTS idx_arbitrage_executions_market2_id;
DROP INDEX IF EXISTS idx_arbitrage_executions_success;
DROP INDEX IF EXISTS idx_arbitrage_executions_is_real;
DROP INDEX IF EXISTS idx_arbitrage_positions_is_real;
DROP INDEX IF EXISTS idx_arbitrage_positions_auto_close;
DROP INDEX IF EXISTS idx_arbitrage_trades_market1_id;
DROP INDEX IF EXISTS idx_arbitrage_trades_market2_id;
DROP INDEX IF EXISTS idx_arbitrage_trades_profit;
DROP INDEX IF EXISTS idx_arbitrage_trades_is_real;
DROP INDEX IF EXISTS idx_arbitrage_trades_entry_time;
DROP INDEX IF EXISTS idx_market_price_history_market_id;
DROP INDEX IF EXISTS idx_market_price_history_timestamp;
DROP INDEX IF EXISTS idx_market_price_history_user_id;
DROP INDEX IF EXISTS idx_market_price_history_market_timestamp;
DROP INDEX IF EXISTS idx_scan_opportunities_user_module;
DROP INDEX IF EXISTS idx_scan_opportunities_status;
DROP INDEX IF EXISTS idx_scan_opportunities_detected;
DROP INDEX IF EXISTS idx_scan_opportunities_dedup;
DROP INDEX IF EXISTS idx_scan_metrics_user_module;
DROP INDEX IF EXISTS idx_scan_metrics_created;
DROP INDEX IF EXISTS idx_opportunity_dedup_expires;
DROP INDEX IF EXISTS idx_opportunity_dedup_user;
DROP INDEX IF EXISTS idx_auto_execution_settings_user;
DROP INDEX IF EXISTS idx_execution_logs_user_module;
DROP INDEX IF EXISTS idx_execution_logs_status;
DROP INDEX IF EXISTS idx_execution_logs_created;
DROP INDEX IF EXISTS idx_position_limits_user;
DROP INDEX IF EXISTS idx_active_positions_market;
DROP INDEX IF EXISTS idx_daily_stats_user_date;
DROP INDEX IF EXISTS idx_position_history_market;
DROP INDEX IF EXISTS idx_position_snapshots_position;
DROP INDEX IF EXISTS idx_position_snapshots_user;
DROP INDEX IF EXISTS idx_position_events_position;
DROP INDEX IF EXISTS idx_position_events_user;
DROP INDEX IF EXISTS idx_active_positions_updated;
DROP INDEX IF EXISTS idx_risk_breaches_created_at;
DROP INDEX IF EXISTS idx_risk_breaches_type;
DROP INDEX IF EXISTS idx_position_risk_settings_user;
DROP INDEX IF EXISTS idx_position_risk_settings_position;
DROP INDEX IF EXISTS idx_position_risk_settings_status;
DROP INDEX IF EXISTS idx_position_risk_settings_user_active;
DROP INDEX IF EXISTS idx_risk_trigger_history_user;
DROP INDEX IF EXISTS idx_risk_trigger_history_position;
DROP INDEX IF EXISTS idx_risk_trigger_history_triggered_at;

-- Drop duplicate indexes
DROP INDEX IF EXISTS idx_arbitrage_trades_user;
DROP INDEX IF EXISTS idx_snipe_trades_user;
DROP INDEX IF EXISTS idx_trend_trades_user;

-- ==============================================
-- 3. OPTIMIZE RLS POLICIES
-- ==============================================

-- market_data_subscriptions
DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.market_data_subscriptions;
CREATE POLICY "Users can view own subscriptions"
  ON public.market_data_subscriptions FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can create own subscriptions" ON public.market_data_subscriptions;
CREATE POLICY "Users can create own subscriptions"
  ON public.market_data_subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own subscriptions" ON public.market_data_subscriptions;
CREATE POLICY "Users can update own subscriptions"
  ON public.market_data_subscriptions FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own subscriptions" ON public.market_data_subscriptions;
CREATE POLICY "Users can delete own subscriptions"
  ON public.market_data_subscriptions FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- user_profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
CREATE POLICY "Users can view own profile"
  ON public.user_profiles FOR SELECT
  TO authenticated
  USING (id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
CREATE POLICY "Users can insert own profile"
  ON public.user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile"
  ON public.user_profiles FOR UPDATE
  TO authenticated
  USING (id = (select auth.uid()))
  WITH CHECK (id = (select auth.uid()));

-- orders
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
CREATE POLICY "Users can view own orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can create own orders" ON public.orders;
CREATE POLICY "Users can create own orders"
  ON public.orders FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own orders" ON public.orders;
CREATE POLICY "Users can update own orders"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- order_fills
DROP POLICY IF EXISTS "Users can view fills for own orders" ON public.order_fills;
CREATE POLICY "Users can view fills for own orders"
  ON public.order_fills FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM orders 
    WHERE orders.id = order_fills.order_id 
    AND orders.user_id = (select auth.uid())
  ));

DROP POLICY IF EXISTS "System can insert fills" ON public.order_fills;
CREATE POLICY "System can insert fills"
  ON public.order_fills FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM orders 
    WHERE orders.id = order_fills.order_id 
    AND orders.user_id = (select auth.uid())
  ));

-- order_execution_logs
DROP POLICY IF EXISTS "Users can view logs for own orders" ON public.order_execution_logs;
CREATE POLICY "Users can view logs for own orders"
  ON public.order_execution_logs FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM orders 
    WHERE orders.id = order_execution_logs.order_id 
    AND orders.user_id = (select auth.uid())
  ));

DROP POLICY IF EXISTS "System can insert logs" ON public.order_execution_logs;
CREATE POLICY "System can insert logs"
  ON public.order_execution_logs FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM orders 
    WHERE orders.id = order_execution_logs.order_id 
    AND orders.user_id = (select auth.uid())
  ));

-- module_settings
DROP POLICY IF EXISTS "Users can view own module settings" ON public.module_settings;
CREATE POLICY "Users can view own module settings"
  ON public.module_settings FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own module settings" ON public.module_settings;
CREATE POLICY "Users can insert own module settings"
  ON public.module_settings FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own module settings" ON public.module_settings;
CREATE POLICY "Users can update own module settings"
  ON public.module_settings FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- arbitrage_executions
DROP POLICY IF EXISTS "Users can view own executions" ON public.arbitrage_executions;
CREATE POLICY "Users can view own executions"
  ON public.arbitrage_executions FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own executions" ON public.arbitrage_executions;
CREATE POLICY "Users can insert own executions"
  ON public.arbitrage_executions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

-- scan_opportunities
DROP POLICY IF EXISTS "Users can view own scan opportunities" ON public.scan_opportunities;
CREATE POLICY "Users can view own scan opportunities"
  ON public.scan_opportunities FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own scan opportunities" ON public.scan_opportunities;
CREATE POLICY "Users can insert own scan opportunities"
  ON public.scan_opportunities FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own scan opportunities" ON public.scan_opportunities;
CREATE POLICY "Users can update own scan opportunities"
  ON public.scan_opportunities FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own scan opportunities" ON public.scan_opportunities;
CREATE POLICY "Users can delete own scan opportunities"
  ON public.scan_opportunities FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- scan_metrics
DROP POLICY IF EXISTS "Users can view own scan metrics" ON public.scan_metrics;
CREATE POLICY "Users can view own scan metrics"
  ON public.scan_metrics FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own scan metrics" ON public.scan_metrics;
CREATE POLICY "Users can insert own scan metrics"
  ON public.scan_metrics FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

-- scan_configurations
DROP POLICY IF EXISTS "Users can view own scan configurations" ON public.scan_configurations;
CREATE POLICY "Users can view own scan configurations"
  ON public.scan_configurations FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own scan configurations" ON public.scan_configurations;
CREATE POLICY "Users can insert own scan configurations"
  ON public.scan_configurations FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own scan configurations" ON public.scan_configurations;
CREATE POLICY "Users can update own scan configurations"
  ON public.scan_configurations FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own scan configurations" ON public.scan_configurations;
CREATE POLICY "Users can delete own scan configurations"
  ON public.scan_configurations FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- opportunity_deduplication
DROP POLICY IF EXISTS "Users can view own deduplication entries" ON public.opportunity_deduplication;
CREATE POLICY "Users can view own deduplication entries"
  ON public.opportunity_deduplication FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own deduplication entries" ON public.opportunity_deduplication;
CREATE POLICY "Users can insert own deduplication entries"
  ON public.opportunity_deduplication FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own deduplication entries" ON public.opportunity_deduplication;
CREATE POLICY "Users can update own deduplication entries"
  ON public.opportunity_deduplication FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own deduplication entries" ON public.opportunity_deduplication;
CREATE POLICY "Users can delete own deduplication entries"
  ON public.opportunity_deduplication FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- auto_execution_settings
DROP POLICY IF EXISTS "Users can view own auto-execution settings" ON public.auto_execution_settings;
CREATE POLICY "Users can view own auto-execution settings"
  ON public.auto_execution_settings FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own auto-execution settings" ON public.auto_execution_settings;
CREATE POLICY "Users can insert own auto-execution settings"
  ON public.auto_execution_settings FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own auto-execution settings" ON public.auto_execution_settings;
CREATE POLICY "Users can update own auto-execution settings"
  ON public.auto_execution_settings FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own auto-execution settings" ON public.auto_execution_settings;
CREATE POLICY "Users can delete own auto-execution settings"
  ON public.auto_execution_settings FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- execution_logs
DROP POLICY IF EXISTS "Users can view own execution logs" ON public.execution_logs;
CREATE POLICY "Users can view own execution logs"
  ON public.execution_logs FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own execution logs" ON public.execution_logs;
CREATE POLICY "Users can insert own execution logs"
  ON public.execution_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own execution logs" ON public.execution_logs;
CREATE POLICY "Users can update own execution logs"
  ON public.execution_logs FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- position_limits
DROP POLICY IF EXISTS "Users can view own position limits" ON public.position_limits;
CREATE POLICY "Users can view own position limits"
  ON public.position_limits FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own position limits" ON public.position_limits;
CREATE POLICY "Users can insert own position limits"
  ON public.position_limits FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own position limits" ON public.position_limits;
CREATE POLICY "Users can update own position limits"
  ON public.position_limits FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own position limits" ON public.position_limits;
CREATE POLICY "Users can delete own position limits"
  ON public.position_limits FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- active_positions
DROP POLICY IF EXISTS "Users can view own active positions" ON public.active_positions;
CREATE POLICY "Users can view own active positions"
  ON public.active_positions FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own active positions" ON public.active_positions;
CREATE POLICY "Users can insert own active positions"
  ON public.active_positions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own active positions" ON public.active_positions;
CREATE POLICY "Users can update own active positions"
  ON public.active_positions FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own active positions" ON public.active_positions;
CREATE POLICY "Users can delete own active positions"
  ON public.active_positions FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- emergency_stop
DROP POLICY IF EXISTS "Users can view own emergency stop" ON public.emergency_stop;
CREATE POLICY "Users can view own emergency stop"
  ON public.emergency_stop FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own emergency stop" ON public.emergency_stop;
CREATE POLICY "Users can insert own emergency stop"
  ON public.emergency_stop FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own emergency stop" ON public.emergency_stop;
CREATE POLICY "Users can update own emergency stop"
  ON public.emergency_stop FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- daily_execution_stats
DROP POLICY IF EXISTS "Users can view own daily stats" ON public.daily_execution_stats;
CREATE POLICY "Users can view own daily stats"
  ON public.daily_execution_stats FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own daily stats" ON public.daily_execution_stats;
CREATE POLICY "Users can insert own daily stats"
  ON public.daily_execution_stats FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own daily stats" ON public.daily_execution_stats;
CREATE POLICY "Users can update own daily stats"
  ON public.daily_execution_stats FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- position_history
DROP POLICY IF EXISTS "Users can view own position history" ON public.position_history;
CREATE POLICY "Users can view own position history"
  ON public.position_history FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own position history" ON public.position_history;
CREATE POLICY "Users can insert own position history"
  ON public.position_history FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own position history" ON public.position_history;
CREATE POLICY "Users can update own position history"
  ON public.position_history FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- position_snapshots
DROP POLICY IF EXISTS "Users can view own position snapshots" ON public.position_snapshots;
CREATE POLICY "Users can view own position snapshots"
  ON public.position_snapshots FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own position snapshots" ON public.position_snapshots;
CREATE POLICY "Users can insert own position snapshots"
  ON public.position_snapshots FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

-- position_events
DROP POLICY IF EXISTS "Users can view own position events" ON public.position_events;
CREATE POLICY "Users can view own position events"
  ON public.position_events FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own position events" ON public.position_events;
CREATE POLICY "Users can insert own position events"
  ON public.position_events FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

-- risk_limits
DROP POLICY IF EXISTS "Users can view own risk limits" ON public.risk_limits;
CREATE POLICY "Users can view own risk limits"
  ON public.risk_limits FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own risk limits" ON public.risk_limits;
CREATE POLICY "Users can update own risk limits"
  ON public.risk_limits FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own risk limits" ON public.risk_limits;
CREATE POLICY "Users can insert own risk limits"
  ON public.risk_limits FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

-- daily_loss_tracking
DROP POLICY IF EXISTS "Users can view own daily tracking" ON public.daily_loss_tracking;
CREATE POLICY "Users can view own daily tracking"
  ON public.daily_loss_tracking FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own daily tracking" ON public.daily_loss_tracking;
CREATE POLICY "Users can update own daily tracking"
  ON public.daily_loss_tracking FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own daily tracking" ON public.daily_loss_tracking;
CREATE POLICY "Users can insert own daily tracking"
  ON public.daily_loss_tracking FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

-- risk_limit_breaches
DROP POLICY IF EXISTS "Users can view own breaches" ON public.risk_limit_breaches;
CREATE POLICY "Users can view own breaches"
  ON public.risk_limit_breaches FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own breaches" ON public.risk_limit_breaches;
CREATE POLICY "Users can insert own breaches"
  ON public.risk_limit_breaches FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

-- position_risk_settings
DROP POLICY IF EXISTS "Users can view own risk settings" ON public.position_risk_settings;
CREATE POLICY "Users can view own risk settings"
  ON public.position_risk_settings FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own risk settings" ON public.position_risk_settings;
CREATE POLICY "Users can insert own risk settings"
  ON public.position_risk_settings FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own risk settings" ON public.position_risk_settings;
CREATE POLICY "Users can update own risk settings"
  ON public.position_risk_settings FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own risk settings" ON public.position_risk_settings;
CREATE POLICY "Users can delete own risk settings"
  ON public.position_risk_settings FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- risk_trigger_history
DROP POLICY IF EXISTS "Users can view own trigger history" ON public.risk_trigger_history;
CREATE POLICY "Users can view own trigger history"
  ON public.risk_trigger_history FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own trigger history" ON public.risk_trigger_history;
CREATE POLICY "Users can insert own trigger history"
  ON public.risk_trigger_history FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

-- ==============================================
-- 4. FIX FUNCTION SEARCH PATHS (only existing functions)
-- ==============================================

DO $$
BEGIN
  -- Update search paths for all existing functions
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_orders_updated_at') THEN
    EXECUTE 'ALTER FUNCTION public.update_orders_updated_at() SET search_path = public, pg_temp';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'cleanup_old_market_data') THEN
    EXECUTE 'ALTER FUNCTION public.cleanup_old_market_data() SET search_path = public, pg_temp';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'delete_old_price_history') THEN
    EXECUTE 'ALTER FUNCTION public.delete_old_price_history() SET search_path = public, pg_temp';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'expire_old_opportunities') THEN
    EXECUTE 'ALTER FUNCTION public.expire_old_opportunities() SET search_path = public, pg_temp';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'cleanup_deduplication_entries') THEN
    EXECUTE 'ALTER FUNCTION public.cleanup_deduplication_entries() SET search_path = public, pg_temp';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_scan_configuration_timestamp') THEN
    EXECUTE 'ALTER FUNCTION public.update_scan_configuration_timestamp() SET search_path = public, pg_temp';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_opportunity_timestamp') THEN
    EXECUTE 'ALTER FUNCTION public.update_opportunity_timestamp() SET search_path = public, pg_temp';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_auto_execution_settings_timestamp') THEN
    EXECUTE 'ALTER FUNCTION public.update_auto_execution_settings_timestamp() SET search_path = public, pg_temp';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_position_limits_timestamp') THEN
    EXECUTE 'ALTER FUNCTION public.update_position_limits_timestamp() SET search_path = public, pg_temp';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_emergency_stop_timestamp') THEN
    EXECUTE 'ALTER FUNCTION public.update_emergency_stop_timestamp() SET search_path = public, pg_temp';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_active_positions_timestamp') THEN
    EXECUTE 'ALTER FUNCTION public.update_active_positions_timestamp() SET search_path = public, pg_temp';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_daily_stats_timestamp') THEN
    EXECUTE 'ALTER FUNCTION public.update_daily_stats_timestamp() SET search_path = public, pg_temp';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_position_risk_settings_updated_at') THEN
    EXECUTE 'ALTER FUNCTION public.update_position_risk_settings_updated_at() SET search_path = public, pg_temp';
  END IF;
END $$;
