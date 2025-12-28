/*
  # Trading Activity Logs System

  1. New Tables
    - `trading_activity_logs`
      - `id` (uuid, primary key) - Unique log entry identifier
      - `user_id` (uuid, foreign key) - User who performed the action
      - `log_level` (text) - Log level: debug, info, warn, error
      - `module` (text) - Trading module: arbitrage_hunter, snipe_master, etc.
      - `activity_type` (text) - Type of activity: scan, execution, order, position, etc.
      - `message` (text) - Human-readable log message
      - `details` (jsonb) - Additional structured data
      - `market_id` (text, nullable) - Associated market ID
      - `order_id` (text, nullable) - Associated order ID
      - `position_id` (uuid, nullable) - Associated position ID
      - `duration_ms` (integer, nullable) - Operation duration in milliseconds
      - `success` (boolean, nullable) - Whether operation succeeded
      - `created_at` (timestamptz) - When log was created

  2. Security
    - Enable RLS on trading_activity_logs
    - Users can view their own logs
    - Users can insert their own logs
    - Automated cleanup of old logs (retention policy)

  3. Indexes
    - Index on user_id for user-specific queries
    - Index on created_at for time-based queries
    - Index on log_level for filtering by severity
    - Index on module for module-specific logs
    - Index on activity_type for activity filtering
    - Composite index on user_id + created_at for efficient pagination

  4. Functions
    - Function to clean up old logs (retention policy)
    - Function to get log statistics
*/

-- Create trading_activity_logs table
CREATE TABLE IF NOT EXISTS trading_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  log_level text NOT NULL CHECK (log_level IN ('debug', 'info', 'warn', 'error')),
  module text NOT NULL,
  activity_type text NOT NULL,
  message text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  market_id text,
  order_id text,
  position_id uuid,
  duration_ms integer,
  success boolean,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_trading_logs_user_id ON trading_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_trading_logs_created_at ON trading_activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trading_logs_log_level ON trading_activity_logs(log_level);
CREATE INDEX IF NOT EXISTS idx_trading_logs_module ON trading_activity_logs(module);
CREATE INDEX IF NOT EXISTS idx_trading_logs_activity_type ON trading_activity_logs(activity_type);
CREATE INDEX IF NOT EXISTS idx_trading_logs_user_created ON trading_activity_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trading_logs_market_id ON trading_activity_logs(market_id) WHERE market_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_trading_logs_success ON trading_activity_logs(success) WHERE success IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE trading_activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for trading_activity_logs

-- Users can insert their own logs
CREATE POLICY "Users can insert their own trading activity logs"
  ON trading_activity_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can view their own logs
CREATE POLICY "Users can view their own trading activity logs"
  ON trading_activity_logs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can delete their own old logs
CREATE POLICY "Users can delete their own old trading activity logs"
  ON trading_activity_logs
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Function to clean up old logs (retention policy)
CREATE OR REPLACE FUNCTION cleanup_old_trading_logs(
  retention_days integer DEFAULT 90
)
RETURNS TABLE (
  deleted_count bigint
) AS $$
DECLARE
  cutoff_date timestamptz;
  rows_deleted bigint;
BEGIN
  cutoff_date := now() - (retention_days || ' days')::interval;
  
  DELETE FROM trading_activity_logs
  WHERE created_at < cutoff_date;
  
  GET DIAGNOSTICS rows_deleted = ROW_COUNT;
  
  RETURN QUERY SELECT rows_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get log statistics
CREATE OR REPLACE FUNCTION get_trading_log_statistics(
  p_user_id uuid,
  time_range interval DEFAULT '24 hours'::interval
)
RETURNS TABLE (
  total_logs bigint,
  debug_count bigint,
  info_count bigint,
  warn_count bigint,
  error_count bigint,
  success_count bigint,
  failure_count bigint,
  avg_duration_ms numeric,
  most_active_module text,
  most_common_activity text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::bigint as total_logs,
    COUNT(*) FILTER (WHERE log_level = 'debug')::bigint as debug_count,
    COUNT(*) FILTER (WHERE log_level = 'info')::bigint as info_count,
    COUNT(*) FILTER (WHERE log_level = 'warn')::bigint as warn_count,
    COUNT(*) FILTER (WHERE log_level = 'error')::bigint as error_count,
    COUNT(*) FILTER (WHERE success = true)::bigint as success_count,
    COUNT(*) FILTER (WHERE success = false)::bigint as failure_count,
    AVG(duration_ms)::numeric as avg_duration_ms,
    (
      SELECT module
      FROM trading_activity_logs
      WHERE user_id = p_user_id
        AND created_at >= now() - time_range
      GROUP BY module
      ORDER BY COUNT(*) DESC
      LIMIT 1
    ) as most_active_module,
    (
      SELECT activity_type
      FROM trading_activity_logs
      WHERE user_id = p_user_id
        AND created_at >= now() - time_range
      GROUP BY activity_type
      ORDER BY COUNT(*) DESC
      LIMIT 1
    ) as most_common_activity
  FROM trading_activity_logs
  WHERE user_id = p_user_id
    AND created_at >= now() - time_range;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get activity timeline
CREATE OR REPLACE FUNCTION get_trading_activity_timeline(
  p_user_id uuid,
  p_limit integer DEFAULT 100,
  p_offset integer DEFAULT 0,
  p_log_level text DEFAULT NULL,
  p_module text DEFAULT NULL,
  p_activity_type text DEFAULT NULL,
  p_search text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  log_level text,
  module text,
  activity_type text,
  message text,
  details jsonb,
  market_id text,
  order_id text,
  duration_ms integer,
  success boolean,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.id,
    l.log_level,
    l.module,
    l.activity_type,
    l.message,
    l.details,
    l.market_id,
    l.order_id,
    l.duration_ms,
    l.success,
    l.created_at
  FROM trading_activity_logs l
  WHERE l.user_id = p_user_id
    AND (p_log_level IS NULL OR l.log_level = p_log_level)
    AND (p_module IS NULL OR l.module = p_module)
    AND (p_activity_type IS NULL OR l.activity_type = p_activity_type)
    AND (p_search IS NULL OR l.message ILIKE '%' || p_search || '%')
  ORDER BY l.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments to table
COMMENT ON TABLE trading_activity_logs IS 'Comprehensive audit trail of all trading activities for debugging and compliance';
COMMENT ON COLUMN trading_activity_logs.log_level IS 'Severity level: debug, info, warn, error';
COMMENT ON COLUMN trading_activity_logs.module IS 'Trading module that generated the log';
COMMENT ON COLUMN trading_activity_logs.activity_type IS 'Type of activity: scan, execution, order, position, etc.';
COMMENT ON COLUMN trading_activity_logs.details IS 'Structured additional data in JSON format';
COMMENT ON COLUMN trading_activity_logs.duration_ms IS 'Operation duration in milliseconds for performance tracking';
