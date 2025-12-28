/*
  # Error Tracking System

  1. New Tables
    - `error_logs`
      - `id` (uuid, primary key) - Unique error log identifier
      - `user_id` (uuid, foreign key) - User who experienced the error (nullable for unauthenticated)
      - `error_type` (text) - Type of error (runtime, network, validation, etc.)
      - `error_message` (text) - Error message
      - `error_stack` (text) - Full stack trace
      - `error_code` (text, nullable) - Error code if available
      - `severity` (text) - Error severity: critical, error, warning, info
      - `component_name` (text, nullable) - React component where error occurred
      - `user_action` (text, nullable) - What the user was doing
      - `url` (text) - Page URL where error occurred
      - `user_agent` (text) - Browser user agent
      - `context` (jsonb) - Additional context data
      - `resolved` (boolean) - Whether error has been addressed
      - `resolved_at` (timestamptz, nullable) - When error was resolved
      - `resolved_by` (uuid, nullable) - User who resolved the error
      - `created_at` (timestamptz) - When error occurred
      
    - `error_rate_metrics`
      - `id` (uuid, primary key)
      - `time_bucket` (timestamptz) - Time bucket (hourly)
      - `total_errors` (integer) - Total number of errors in this bucket
      - `unique_users` (integer) - Number of unique users affected
      - `critical_count` (integer) - Number of critical errors
      - `error_count` (integer) - Number of regular errors
      - `warning_count` (integer) - Number of warnings
      - `info_count` (integer) - Number of info logs
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Authenticated users can view their own errors
    - Anonymous users can insert errors (for pre-login error capture)
    - All authenticated users can view aggregate metrics

  3. Indexes
    - Index on user_id for fast user error lookups
    - Index on created_at for time-based queries
    - Index on severity for filtering critical errors
    - Index on error_type for categorization
    - Index on resolved for filtering unresolved errors
*/

-- Create error_logs table
CREATE TABLE IF NOT EXISTS error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  error_type text NOT NULL,
  error_message text NOT NULL,
  error_stack text,
  error_code text,
  severity text NOT NULL CHECK (severity IN ('critical', 'error', 'warning', 'info')),
  component_name text,
  user_action text,
  url text NOT NULL,
  user_agent text,
  context jsonb DEFAULT '{}'::jsonb,
  resolved boolean DEFAULT false,
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create error_rate_metrics table
CREATE TABLE IF NOT EXISTS error_rate_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  time_bucket timestamptz NOT NULL,
  total_errors integer DEFAULT 0,
  unique_users integer DEFAULT 0,
  critical_count integer DEFAULT 0,
  error_count integer DEFAULT 0,
  warning_count integer DEFAULT 0,
  info_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(time_bucket)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON error_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON error_logs(severity);
CREATE INDEX IF NOT EXISTS idx_error_logs_error_type ON error_logs(error_type);
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved ON error_logs(resolved);
CREATE INDEX IF NOT EXISTS idx_error_logs_user_created ON error_logs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_error_rate_metrics_time_bucket ON error_rate_metrics(time_bucket DESC);

-- Enable Row Level Security
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_rate_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for error_logs

-- Allow users to insert their own errors
CREATE POLICY "Users can insert their own error logs"
  ON error_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- Allow anonymous users to insert errors
CREATE POLICY "Anonymous users can insert error logs"
  ON error_logs
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Users can view their own errors
CREATE POLICY "Users can view their own error logs"
  ON error_logs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can update resolution status on their own errors
CREATE POLICY "Users can update their own error logs"
  ON error_logs
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for error_rate_metrics

-- All authenticated users can view error rate metrics
CREATE POLICY "Authenticated users can view error rate metrics"
  ON error_rate_metrics
  FOR SELECT
  TO authenticated
  USING (true);

-- System can insert/update metrics
CREATE POLICY "System can manage error rate metrics"
  ON error_rate_metrics
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Function to update error rate metrics
CREATE OR REPLACE FUNCTION update_error_rate_metrics()
RETURNS trigger AS $$
DECLARE
  bucket timestamptz;
BEGIN
  bucket := date_trunc('hour', NEW.created_at);
  
  INSERT INTO error_rate_metrics (
    time_bucket,
    total_errors,
    unique_users,
    critical_count,
    error_count,
    warning_count,
    info_count
  )
  VALUES (
    bucket,
    1,
    CASE WHEN NEW.user_id IS NOT NULL THEN 1 ELSE 0 END,
    CASE WHEN NEW.severity = 'critical' THEN 1 ELSE 0 END,
    CASE WHEN NEW.severity = 'error' THEN 1 ELSE 0 END,
    CASE WHEN NEW.severity = 'warning' THEN 1 ELSE 0 END,
    CASE WHEN NEW.severity = 'info' THEN 1 ELSE 0 END
  )
  ON CONFLICT (time_bucket) DO UPDATE SET
    total_errors = error_rate_metrics.total_errors + 1,
    unique_users = error_rate_metrics.unique_users + 
      CASE WHEN NEW.user_id IS NOT NULL AND NEW.user_id NOT IN (
        SELECT DISTINCT user_id FROM error_logs 
        WHERE date_trunc('hour', created_at) = bucket 
        AND user_id IS NOT NULL
        AND id != NEW.id
      ) THEN 1 ELSE 0 END,
    critical_count = error_rate_metrics.critical_count + 
      CASE WHEN NEW.severity = 'critical' THEN 1 ELSE 0 END,
    error_count = error_rate_metrics.error_count + 
      CASE WHEN NEW.severity = 'error' THEN 1 ELSE 0 END,
    warning_count = error_rate_metrics.warning_count + 
      CASE WHEN NEW.severity = 'warning' THEN 1 ELSE 0 END,
    info_count = error_rate_metrics.info_count + 
      CASE WHEN NEW.severity = 'info' THEN 1 ELSE 0 END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update metrics on new errors
DROP TRIGGER IF EXISTS update_error_metrics_trigger ON error_logs;
CREATE TRIGGER update_error_metrics_trigger
  AFTER INSERT ON error_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_error_rate_metrics();

-- Function to get error statistics
CREATE OR REPLACE FUNCTION get_error_statistics(
  time_range interval DEFAULT '24 hours'::interval
)
RETURNS TABLE (
  total_errors bigint,
  critical_errors bigint,
  regular_errors bigint,
  warnings bigint,
  unique_users bigint,
  most_common_error text,
  most_affected_component text,
  error_rate_trend numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::bigint as total_errors,
    COUNT(*) FILTER (WHERE severity = 'critical')::bigint as critical_errors,
    COUNT(*) FILTER (WHERE severity = 'error')::bigint as regular_errors,
    COUNT(*) FILTER (WHERE severity = 'warning')::bigint as warnings,
    COUNT(DISTINCT user_id)::bigint as unique_users,
    (
      SELECT error_type 
      FROM error_logs 
      WHERE created_at >= now() - time_range
      GROUP BY error_type 
      ORDER BY COUNT(*) DESC 
      LIMIT 1
    ) as most_common_error,
    (
      SELECT component_name 
      FROM error_logs 
      WHERE created_at >= now() - time_range 
        AND component_name IS NOT NULL
      GROUP BY component_name 
      ORDER BY COUNT(*) DESC 
      LIMIT 1
    ) as most_affected_component,
    (
      SELECT 
        CASE 
          WHEN COUNT(*) FILTER (WHERE created_at >= now() - time_range/2) = 0 THEN 0
          WHEN COUNT(*) FILTER (WHERE created_at < now() - time_range/2) = 0 THEN 100
          ELSE (
            (COUNT(*) FILTER (WHERE created_at >= now() - time_range/2)::numeric / 
             COUNT(*) FILTER (WHERE created_at < now() - time_range/2)::numeric - 1) * 100
          )
        END
      FROM error_logs
      WHERE created_at >= now() - time_range
    ) as error_rate_trend
  FROM error_logs
  WHERE created_at >= now() - time_range;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
