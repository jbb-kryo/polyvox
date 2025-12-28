/*
  # Database Performance Optimization

  ## Overview
  Comprehensive database optimization with indexes for existing tables
  to ensure fast queries even with thousands of trades and positions.

  ## Changes

  ### 1. Orders Table Indexes
    - Composite indexes for user + status, user + created_at
    - Single indexes for market_id, module, paper_trading
    - Status + created_at for time-based filtering

  ### 2. Positions Tables Indexes
    - User + status composite indexes for all position types
    - Market ID indexes for market-specific queries
    - Created timestamp indexes for ordering

  ### 3. Module-Specific Tables Indexes
    - Whale tracking, value mining, trend riding, snipe hunting
    - User-based queries, status filtering, time ordering

  ### 4. Analytics and Performance
    - Module performance, trade analytics indexes

  ### 5. Notifications
    - User + read status, type filtering, time ordering

  ## Performance Impact
    - Expected query performance: < 100ms for typical queries
    - Efficient pagination with proper ordering
    - Fast filtering by user, status, module, market
*/

-- Orders table indexes (module column not module_type)
CREATE INDEX IF NOT EXISTS idx_orders_user_status ON orders(user_id, status) WHERE status IN ('pending', 'filled', 'partially_filled');
CREATE INDEX IF NOT EXISTS idx_orders_user_created ON orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_market_id ON orders(market_id);
CREATE INDEX IF NOT EXISTS idx_orders_module ON orders(module);
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_user_module_created ON orders(user_id, module, created_at DESC);

-- Order fills indexes
CREATE INDEX IF NOT EXISTS idx_order_fills_order_id ON order_fills(order_id);
CREATE INDEX IF NOT EXISTS idx_order_fills_timestamp ON order_fills(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_order_fills_order_timestamp ON order_fills(order_id, timestamp DESC);

-- Arbitrage positions indexes
CREATE INDEX IF NOT EXISTS idx_arbitrage_positions_user_status ON arbitrage_positions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_arbitrage_positions_markets ON arbitrage_positions(market1_id, market2_id);
CREATE INDEX IF NOT EXISTS idx_arbitrage_positions_created ON arbitrage_positions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_arbitrage_positions_user_created ON arbitrage_positions(user_id, created_at DESC);

-- Snipe positions indexes
CREATE INDEX IF NOT EXISTS idx_snipe_positions_user_status ON snipe_positions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_snipe_positions_market ON snipe_positions(market_id);
CREATE INDEX IF NOT EXISTS idx_snipe_positions_created ON snipe_positions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_snipe_positions_user_created ON snipe_positions(user_id, created_at DESC);

-- Snipe orders indexes
CREATE INDEX IF NOT EXISTS idx_snipe_orders_user_status ON snipe_orders(user_id, status);
CREATE INDEX IF NOT EXISTS idx_snipe_orders_market ON snipe_orders(market_id);
CREATE INDEX IF NOT EXISTS idx_snipe_orders_limit_price ON snipe_orders(limit_price) WHERE status = 'pending';

-- Trend positions indexes
CREATE INDEX IF NOT EXISTS idx_trend_positions_user_status ON trend_positions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_trend_positions_market ON trend_positions(market_id);
CREATE INDEX IF NOT EXISTS idx_trend_positions_created ON trend_positions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trend_positions_user_created ON trend_positions(user_id, created_at DESC);

-- Trend opportunities indexes
CREATE INDEX IF NOT EXISTS idx_trend_opportunities_market ON trend_opportunities(market_id);
CREATE INDEX IF NOT EXISTS idx_trend_opportunities_created ON trend_opportunities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trend_opportunities_strength ON trend_opportunities(trend_strength DESC) WHERE trend_strength > 0.6;

-- Value positions indexes
CREATE INDEX IF NOT EXISTS idx_value_positions_user_status ON value_positions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_value_positions_market ON value_positions(market_id);
CREATE INDEX IF NOT EXISTS idx_value_positions_created ON value_positions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_value_positions_user_created ON value_positions(user_id, created_at DESC);

-- Value markets indexes
CREATE INDEX IF NOT EXISTS idx_value_markets_market ON value_markets(market_id);
CREATE INDEX IF NOT EXISTS idx_value_markets_created ON value_markets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_value_markets_updated ON value_markets(last_updated DESC);

-- Value signals indexes
CREATE INDEX IF NOT EXISTS idx_value_signals_market ON value_signals(market_id);
CREATE INDEX IF NOT EXISTS idx_value_signals_edge ON value_signals(edge DESC);
CREATE INDEX IF NOT EXISTS idx_value_signals_created ON value_signals(created_at DESC);

-- Whale tracking indexes
CREATE INDEX IF NOT EXISTS idx_whale_orders_whale ON whale_orders(whale_address);
CREATE INDEX IF NOT EXISTS idx_whale_orders_market ON whale_orders(market_id);
CREATE INDEX IF NOT EXISTS idx_whale_orders_timestamp ON whale_orders(timestamp DESC);

-- Whale profiles indexes
CREATE INDEX IF NOT EXISTS idx_whale_profiles_address ON whale_profiles(wallet_address);
CREATE INDEX IF NOT EXISTS idx_whale_profiles_win_rate ON whale_profiles(win_rate DESC) WHERE total_trades > 10;
CREATE INDEX IF NOT EXISTS idx_whale_profiles_tracked ON whale_profiles(is_tracked) WHERE is_tracked = true;

-- Whale copied positions indexes
CREATE INDEX IF NOT EXISTS idx_whale_copied_positions_user_status ON whale_copied_positions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_whale_copied_positions_whale ON whale_copied_positions(whale_address);
CREATE INDEX IF NOT EXISTS idx_whale_copied_positions_market ON whale_copied_positions(market_id);
CREATE INDEX IF NOT EXISTS idx_whale_copied_positions_created ON whale_copied_positions(created_at DESC);

-- Whale alerts indexes
CREATE INDEX IF NOT EXISTS idx_whale_alerts_user_read ON whale_alerts(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_whale_alerts_created ON whale_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_whale_alerts_user_type ON whale_alerts(user_id, alert_type);

-- Analytics and performance indexes (module_id not module_type)
CREATE INDEX IF NOT EXISTS idx_module_performance_user_module ON module_performance(user_id, module_id);
CREATE INDEX IF NOT EXISTS idx_module_performance_calculated ON module_performance(calculated_at DESC);

-- Trade analytics indexes (module not module_type)
CREATE INDEX IF NOT EXISTS idx_trade_analytics_user ON trade_analytics(user_id, entry_time DESC);
CREATE INDEX IF NOT EXISTS idx_trade_analytics_module ON trade_analytics(module);
CREATE INDEX IF NOT EXISTS idx_trade_analytics_market ON trade_analytics(market_id);

-- User profiles indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_paper_trading ON user_profiles(paper_trading_mode);
CREATE INDEX IF NOT EXISTS idx_user_profiles_wallet ON user_profiles(wallet_address) WHERE wallet_address IS NOT NULL;

-- Module settings indexes (module_id not module_type)
CREATE INDEX IF NOT EXISTS idx_module_settings_user_module ON module_settings(user_id, module_id);
CREATE INDEX IF NOT EXISTS idx_module_settings_enabled ON module_settings(is_enabled) WHERE is_enabled = true;

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_type_read ON notifications(user_id, type, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_user_category ON notifications(user_id, category);

-- Update table statistics for better query planning
ANALYZE orders;
ANALYZE order_fills;
ANALYZE arbitrage_positions;
ANALYZE snipe_positions;
ANALYZE snipe_orders;
ANALYZE trend_positions;
ANALYZE trend_opportunities;
ANALYZE value_positions;
ANALYZE value_markets;
ANALYZE value_signals;
ANALYZE whale_orders;
ANALYZE whale_profiles;
ANALYZE whale_copied_positions;
ANALYZE whale_alerts;
ANALYZE module_performance;
ANALYZE trade_analytics;
ANALYZE user_profiles;
ANALYZE module_settings;
ANALYZE notifications;
