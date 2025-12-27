/*
  # Background Scanning System Tables

  1. New Tables
    - `scan_opportunities`
      - Stores all detected opportunities from background scans
      - Includes deduplication key and metadata
      - Tracks opportunity lifecycle (active, executed, expired, dismissed)
    
    - `scan_metrics`
      - Tracks scan performance metrics
      - Stores duration, markets scanned, opportunities found
      - Enables performance monitoring and optimization
    
    - `scan_configurations`
      - Stores per-module scan settings
      - Configurable intervals, filters, and preferences
      - User-specific configurations
    
    - `opportunity_deduplication`
      - Fast lookup table for deduplication
      - Prevents duplicate alerts for same opportunity
      - Time-windowed deduplication (24 hours)

  2. Security
    - Enable RLS on all tables
    - Users can only access their own data
    - Strict authentication requirements

  3. Indexes
    - Performance indexes for fast querying
    - Deduplication lookup optimization
    - Time-based filtering optimization
*/

-- Scan opportunities table
CREATE TABLE IF NOT EXISTS scan_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  module_type text NOT NULL CHECK (module_type IN ('valueminer', 'arbitrage', 'snipe', 'trend', 'whale')),
  market_id text NOT NULL,
  market_question text NOT NULL,
  opportunity_type text NOT NULL,
  dedup_key text NOT NULL,
  
  -- Opportunity details
  side text CHECK (side IN ('YES', 'NO', 'BOTH')),
  edge_percent numeric,
  expected_value numeric,
  confidence_score numeric,
  priority_score numeric,
  
  -- Position sizing
  recommended_size numeric,
  kelly_fraction numeric,
  
  -- Market data
  market_odds_yes numeric,
  market_odds_no numeric,
  volume_24h numeric,
  liquidity numeric,
  category text,
  
  -- Status tracking
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'executed', 'expired', 'dismissed', 'invalid')),
  executed_at timestamptz,
  dismissed_at timestamptz,
  expires_at timestamptz,
  
  -- Metadata
  scan_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  
  -- Timestamps
  detected_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Constraints
  UNIQUE (user_id, dedup_key)
);

-- Scan metrics table
CREATE TABLE IF NOT EXISTS scan_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  module_type text NOT NULL CHECK (module_type IN ('valueminer', 'arbitrage', 'snipe', 'trend', 'whale', 'all')),
  
  -- Performance metrics
  scan_duration_ms integer NOT NULL,
  markets_scanned integer NOT NULL DEFAULT 0,
  opportunities_found integer NOT NULL DEFAULT 0,
  high_priority_found integer NOT NULL DEFAULT 0,
  errors_count integer NOT NULL DEFAULT 0,
  
  -- Status
  scan_status text NOT NULL DEFAULT 'success' CHECK (scan_status IN ('success', 'partial', 'failed')),
  error_message text,
  
  -- Configuration snapshot
  config_snapshot jsonb DEFAULT '{}'::jsonb,
  
  -- Timestamps
  scan_started_at timestamptz NOT NULL,
  scan_completed_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Scan configurations table
CREATE TABLE IF NOT EXISTS scan_configurations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  module_type text NOT NULL CHECK (module_type IN ('valueminer', 'arbitrage', 'snipe', 'trend', 'whale')),
  
  -- Scan settings
  is_enabled boolean NOT NULL DEFAULT false,
  scan_interval_seconds integer NOT NULL DEFAULT 60,
  priority_level text NOT NULL DEFAULT 'medium' CHECK (priority_level IN ('low', 'medium', 'high')),
  
  -- Filters and thresholds
  min_edge_percent numeric DEFAULT 5,
  min_confidence numeric DEFAULT 0.5,
  min_volume numeric DEFAULT 10000,
  max_opportunities integer DEFAULT 50,
  
  -- Module-specific settings
  module_settings jsonb DEFAULT '{}'::jsonb,
  
  -- Notification preferences
  notify_on_opportunity boolean DEFAULT false,
  notify_high_priority_only boolean DEFAULT true,
  
  -- Timestamps
  last_scan_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- One config per module per user
  UNIQUE (user_id, module_type)
);

-- Opportunity deduplication table (for fast lookups)
CREATE TABLE IF NOT EXISTS opportunity_deduplication (
  dedup_key text PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  module_type text NOT NULL,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  occurrence_count integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  
  -- Expires after 24 hours for cleanup
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours')
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_scan_opportunities_user_module 
  ON scan_opportunities(user_id, module_type);

CREATE INDEX IF NOT EXISTS idx_scan_opportunities_status 
  ON scan_opportunities(user_id, status) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_scan_opportunities_detected 
  ON scan_opportunities(detected_at DESC);

CREATE INDEX IF NOT EXISTS idx_scan_opportunities_dedup 
  ON scan_opportunities(dedup_key);

CREATE INDEX IF NOT EXISTS idx_scan_metrics_user_module 
  ON scan_metrics(user_id, module_type);

CREATE INDEX IF NOT EXISTS idx_scan_metrics_created 
  ON scan_metrics(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_scan_configurations_user 
  ON scan_configurations(user_id);

CREATE INDEX IF NOT EXISTS idx_opportunity_dedup_expires 
  ON opportunity_deduplication(expires_at) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_opportunity_dedup_user 
  ON opportunity_deduplication(user_id, module_type);

-- Enable Row Level Security
ALTER TABLE scan_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunity_deduplication ENABLE ROW LEVEL SECURITY;

-- RLS Policies for scan_opportunities
CREATE POLICY "Users can view own scan opportunities"
  ON scan_opportunities FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own scan opportunities"
  ON scan_opportunities FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own scan opportunities"
  ON scan_opportunities FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own scan opportunities"
  ON scan_opportunities FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for scan_metrics
CREATE POLICY "Users can view own scan metrics"
  ON scan_metrics FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own scan metrics"
  ON scan_metrics FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for scan_configurations
CREATE POLICY "Users can view own scan configurations"
  ON scan_configurations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own scan configurations"
  ON scan_configurations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own scan configurations"
  ON scan_configurations FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own scan configurations"
  ON scan_configurations FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for opportunity_deduplication
CREATE POLICY "Users can view own deduplication entries"
  ON opportunity_deduplication FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own deduplication entries"
  ON opportunity_deduplication FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own deduplication entries"
  ON opportunity_deduplication FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own deduplication entries"
  ON opportunity_deduplication FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to auto-expire old opportunities
CREATE OR REPLACE FUNCTION expire_old_opportunities()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE scan_opportunities
  SET status = 'expired', updated_at = now()
  WHERE status = 'active'
    AND expires_at IS NOT NULL
    AND expires_at < now();
END;
$$;

-- Function to cleanup old deduplication entries
CREATE OR REPLACE FUNCTION cleanup_deduplication_entries()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM opportunity_deduplication
  WHERE expires_at < now();
END;
$$;

-- Function to update scan configuration timestamp
CREATE OR REPLACE FUNCTION update_scan_configuration_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Trigger to update scan configuration timestamp
CREATE TRIGGER scan_configurations_updated_at
  BEFORE UPDATE ON scan_configurations
  FOR EACH ROW
  EXECUTE FUNCTION update_scan_configuration_timestamp();

-- Function to update opportunity timestamp
CREATE OR REPLACE FUNCTION update_opportunity_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Trigger to update opportunity timestamp
CREATE TRIGGER scan_opportunities_updated_at
  BEFORE UPDATE ON scan_opportunities
  FOR EACH ROW
  EXECUTE FUNCTION update_opportunity_timestamp();
