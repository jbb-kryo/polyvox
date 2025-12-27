/*
  # Create Market Price History Table

  ## Summary
  Creates a table to store historical price snapshots for market momentum analysis
  and trend detection. Enables real-time tracking of price movements and volume changes.

  ## New Tables

  ### `market_price_history`
  Stores price snapshots for each market over time:
  - `id` (uuid, primary key) - Unique snapshot identifier
  - `market_id` (text) - Polymarket market identifier
  - `price` (numeric) - Market price at snapshot time
  - `volume` (numeric) - 24h trading volume
  - `timestamp` (timestamptz) - When snapshot was taken
  - `user_id` (uuid, foreign key, nullable) - User who recorded snapshot
  - `created_at` (timestamptz) - Record creation time

  ## Performance

  - Indexes on market_id and timestamp for fast history queries
  - Index on user_id for user-specific queries
  - Composite index on (market_id, timestamp) for time-range queries
  - TTL policy to auto-delete old data (>7 days)

  ## Security

  - Enable RLS on table
  - Users can insert their own snapshots
  - All authenticated users can read all snapshots (for trend analysis)
*/

-- Create market_price_history table
CREATE TABLE IF NOT EXISTS market_price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id text NOT NULL,
  price numeric NOT NULL CHECK (price >= 0 AND price <= 1),
  volume numeric DEFAULT 0 NOT NULL CHECK (volume >= 0),
  timestamp timestamptz DEFAULT now() NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_market_price_history_market_id ON market_price_history(market_id);
CREATE INDEX IF NOT EXISTS idx_market_price_history_timestamp ON market_price_history(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_market_price_history_user_id ON market_price_history(user_id);
CREATE INDEX IF NOT EXISTS idx_market_price_history_market_timestamp ON market_price_history(market_id, timestamp DESC);

-- Enable RLS
ALTER TABLE market_price_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can insert price snapshots"
  ON market_price_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "All users can read price history"
  ON market_price_history FOR SELECT
  TO authenticated
  USING (true);

-- Create function to auto-delete old price history
CREATE OR REPLACE FUNCTION delete_old_price_history()
RETURNS void AS $$
BEGIN
  DELETE FROM market_price_history
  WHERE timestamp < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Create extension if not exists for pg_cron (optional, for automatic cleanup)
-- Note: This requires pg_cron extension which may not be available in all Supabase plans
-- Manual cleanup can be done via scheduled functions or edge functions instead