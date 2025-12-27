/*
  # Real-time Market Data System
  
  ## Overview
  Caching and persistence layer for real-time market data streaming from Polymarket.
  Reduces API calls, improves performance, and enables historical analysis.
  
  ## New Tables
  
  ### `market_snapshots`
  Stores periodic snapshots of market state including prices and volumes.
  
  - `id` (uuid, primary key) - Snapshot identifier
  - `market_id` (text) - Polymarket market ID
  - `question` (text) - Market question
  - `yes_price` (numeric) - Yes outcome price (0-1)
  - `no_price` (numeric) - No outcome price (0-1)
  - `yes_bid` (numeric) - Best yes bid price
  - `yes_ask` (numeric) - Best yes ask price
  - `no_bid` (numeric) - Best no bid price
  - `no_ask` (numeric) - Best no ask price
  - `volume_24h` (numeric) - 24-hour trading volume
  - `liquidity` (numeric) - Total liquidity
  - `open_interest` (numeric) - Open interest
  - `last_trade_price` (numeric) - Most recent trade price
  - `last_trade_time` (timestamptz) - Most recent trade timestamp
  - `active` (boolean) - Whether market is active
  - `closed` (boolean) - Whether market is closed
  - `timestamp` (timestamptz) - Snapshot timestamp
  - `metadata` (jsonb) - Additional market data
  
  ### `order_book_snapshots`
  Stores order book depth at different price levels.
  
  - `id` (uuid, primary key) - Snapshot identifier
  - `market_id` (text) - Polymarket market ID
  - `token_id` (text) - Outcome token ID
  - `side` (text) - BUY or SELL
  - `price` (numeric) - Price level
  - `size` (numeric) - Total size at price level
  - `orders_count` (integer) - Number of orders at level
  - `timestamp` (timestamptz) - Snapshot timestamp
  
  ### `trade_activity`
  Records recent trade activity for analysis.
  
  - `id` (uuid, primary key) - Trade identifier
  - `market_id` (text) - Polymarket market ID
  - `token_id` (text) - Outcome token ID
  - `side` (text) - BUY or SELL
  - `price` (numeric) - Execution price
  - `size` (numeric) - Trade size
  - `maker` (text) - Maker address
  - `taker` (text) - Taker address
  - `trade_id` (text) - Polymarket trade ID
  - `timestamp` (timestamptz) - Trade timestamp
  - `metadata` (jsonb) - Additional trade data
  
  ### `market_data_subscriptions`
  Tracks which markets users are actively monitoring.
  
  - `id` (uuid, primary key) - Subscription identifier
  - `user_id` (uuid, foreign key) - User subscribing
  - `market_id` (text) - Market being monitored
  - `module_type` (text) - Which module is monitoring
  - `active` (boolean) - Whether subscription is active
  - `created_at` (timestamptz) - Subscription start
  - `last_accessed` (timestamptz) - Last data fetch
  
  ### `api_rate_limits`
  Tracks API usage to prevent rate limit violations.
  
  - `id` (uuid, primary key) - Record identifier
  - `endpoint` (text) - API endpoint
  - `request_count` (integer) - Number of requests
  - `window_start` (timestamptz) - Rate limit window start
  - `window_end` (timestamptz) - Rate limit window end
  - `last_request` (timestamptz) - Most recent request
  
  ## Indexes
  - Market ID indexes for fast lookups
  - Timestamp indexes for time-series queries
  - Composite indexes for common query patterns
  
  ## Security
  - Enable RLS on subscription tables
  - Public read access for market data (cached)
  - Users can only manage their own subscriptions
*/

-- Create market_snapshots table
CREATE TABLE IF NOT EXISTS market_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id text NOT NULL,
  question text,
  yes_price numeric CHECK (yes_price >= 0 AND yes_price <= 1),
  no_price numeric CHECK (no_price >= 0 AND no_price <= 1),
  yes_bid numeric CHECK (yes_bid >= 0 AND yes_bid <= 1),
  yes_ask numeric CHECK (yes_ask >= 0 AND yes_ask <= 1),
  no_bid numeric CHECK (no_bid >= 0 AND no_bid <= 1),
  no_ask numeric CHECK (no_ask >= 0 and no_ask <= 1),
  volume_24h numeric DEFAULT 0,
  liquidity numeric DEFAULT 0,
  open_interest numeric DEFAULT 0,
  last_trade_price numeric,
  last_trade_time timestamptz,
  active boolean DEFAULT true,
  closed boolean DEFAULT false,
  timestamp timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Create order_book_snapshots table
CREATE TABLE IF NOT EXISTS order_book_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id text NOT NULL,
  token_id text NOT NULL,
  side text NOT NULL CHECK (side IN ('BUY', 'SELL')),
  price numeric NOT NULL CHECK (price >= 0 AND price <= 1),
  size numeric NOT NULL CHECK (size >= 0),
  orders_count integer DEFAULT 1,
  timestamp timestamptz DEFAULT now()
);

-- Create trade_activity table
CREATE TABLE IF NOT EXISTS trade_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id text NOT NULL,
  token_id text NOT NULL,
  side text NOT NULL CHECK (side IN ('BUY', 'SELL')),
  price numeric NOT NULL CHECK (price >= 0 AND price <= 1),
  size numeric NOT NULL CHECK (size > 0),
  maker text,
  taker text,
  trade_id text UNIQUE,
  timestamp timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Create market_data_subscriptions table
CREATE TABLE IF NOT EXISTS market_data_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  market_id text NOT NULL,
  module_type text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  last_accessed timestamptz DEFAULT now(),
  UNIQUE(user_id, market_id, module_type)
);

-- Create api_rate_limits table
CREATE TABLE IF NOT EXISTS api_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint text NOT NULL,
  request_count integer DEFAULT 0,
  window_start timestamptz DEFAULT now(),
  window_end timestamptz DEFAULT now() + interval '1 minute',
  last_request timestamptz DEFAULT now(),
  UNIQUE(endpoint, window_start)
);

-- Enable RLS
ALTER TABLE market_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_book_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_data_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_rate_limits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for market_snapshots (public read)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'market_snapshots' AND policyname = 'Anyone can view market snapshots'
  ) THEN
    CREATE POLICY "Anyone can view market snapshots"
      ON market_snapshots
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'market_snapshots' AND policyname = 'System can insert market snapshots'
  ) THEN
    CREATE POLICY "System can insert market snapshots"
      ON market_snapshots
      FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;
END $$;

-- RLS Policies for order_book_snapshots (public read)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'order_book_snapshots' AND policyname = 'Anyone can view order book snapshots'
  ) THEN
    CREATE POLICY "Anyone can view order book snapshots"
      ON order_book_snapshots
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'order_book_snapshots' AND policyname = 'System can insert order book snapshots'
  ) THEN
    CREATE POLICY "System can insert order book snapshots"
      ON order_book_snapshots
      FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;
END $$;

-- RLS Policies for trade_activity (public read)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'trade_activity' AND policyname = 'Anyone can view trade activity'
  ) THEN
    CREATE POLICY "Anyone can view trade activity"
      ON trade_activity
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'trade_activity' AND policyname = 'System can insert trade activity'
  ) THEN
    CREATE POLICY "System can insert trade activity"
      ON trade_activity
      FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;
END $$;

-- RLS Policies for market_data_subscriptions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'market_data_subscriptions' AND policyname = 'Users can view own subscriptions'
  ) THEN
    CREATE POLICY "Users can view own subscriptions"
      ON market_data_subscriptions
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'market_data_subscriptions' AND policyname = 'Users can create own subscriptions'
  ) THEN
    CREATE POLICY "Users can create own subscriptions"
      ON market_data_subscriptions
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'market_data_subscriptions' AND policyname = 'Users can update own subscriptions'
  ) THEN
    CREATE POLICY "Users can update own subscriptions"
      ON market_data_subscriptions
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'market_data_subscriptions' AND policyname = 'Users can delete own subscriptions'
  ) THEN
    CREATE POLICY "Users can delete own subscriptions"
      ON market_data_subscriptions
      FOR DELETE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- RLS Policies for api_rate_limits (system only)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'api_rate_limits' AND policyname = 'System can manage rate limits'
  ) THEN
    CREATE POLICY "System can manage rate limits"
      ON api_rate_limits
      FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_market_snapshots_market_id ON market_snapshots(market_id);
CREATE INDEX IF NOT EXISTS idx_market_snapshots_timestamp ON market_snapshots(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_market_snapshots_market_timestamp ON market_snapshots(market_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_order_book_market_id ON order_book_snapshots(market_id);
CREATE INDEX IF NOT EXISTS idx_order_book_timestamp ON order_book_snapshots(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_order_book_market_token ON order_book_snapshots(market_id, token_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_trade_activity_market_id ON trade_activity(market_id);
CREATE INDEX IF NOT EXISTS idx_trade_activity_timestamp ON trade_activity(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_trade_activity_market_timestamp ON trade_activity(market_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_trade_activity_trade_id ON trade_activity(trade_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON market_data_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_market_id ON market_data_subscriptions(market_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_active ON market_data_subscriptions(active) WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_rate_limits_endpoint ON api_rate_limits(endpoint, window_start);

-- Function to clean old snapshots (keep only last 24 hours)
CREATE OR REPLACE FUNCTION cleanup_old_market_data()
RETURNS void AS $$
BEGIN
  DELETE FROM market_snapshots WHERE timestamp < now() - interval '24 hours';
  DELETE FROM order_book_snapshots WHERE timestamp < now() - interval '24 hours';
  DELETE FROM trade_activity WHERE timestamp < now() - interval '7 days';
  DELETE FROM api_rate_limits WHERE window_end < now() - interval '1 hour';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
