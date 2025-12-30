/*
  # Rate Limiting System

  1. New Tables
    - `rate_limit_configs`
      - Stores rate limit configurations per user and action type
      - Configurable limits for different actions (trades, API calls, module toggles)
      - Supports multiple time windows (per minute, hour, day)

    - `rate_limit_tracking`
      - Tracks rate limit usage in real-time
      - Records timestamp of each action for sliding window calculations
      - Auto-cleanup of old records

    - `rate_limit_violations`
      - Logs when rate limits are exceeded
      - Helps identify abuse patterns
      - Used for security monitoring

  2. Security
    - Enable RLS on all tables
    - Users can only access their own rate limit data
    - Authenticated users only

  3. Performance
    - Indexes on user_id, action_type, and timestamp
    - Automatic cleanup of old tracking records
    - Efficient sliding window queries
*/

-- Rate limit configurations table
CREATE TABLE IF NOT EXISTS rate_limit_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  action_type text NOT NULL,
  limit_per_minute integer DEFAULT 10,
  limit_per_hour integer DEFAULT 100,
  limit_per_day integer DEFAULT 1000,
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, action_type)
);

-- Rate limit tracking table (sliding window)
CREATE TABLE IF NOT EXISTS rate_limit_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  action_type text NOT NULL,
  timestamp timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Rate limit violations table
CREATE TABLE IF NOT EXISTS rate_limit_violations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  action_type text NOT NULL,
  limit_type text NOT NULL,
  limit_value integer NOT NULL,
  attempted_action jsonb DEFAULT '{}'::jsonb,
  timestamp timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_rate_limit_configs_user_action
  ON rate_limit_configs(user_id, action_type);

CREATE INDEX IF NOT EXISTS idx_rate_limit_tracking_user_action
  ON rate_limit_tracking(user_id, action_type);

CREATE INDEX IF NOT EXISTS idx_rate_limit_tracking_timestamp
  ON rate_limit_tracking(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_rate_limit_violations_user
  ON rate_limit_violations(user_id, timestamp DESC);

-- Enable Row Level Security
ALTER TABLE rate_limit_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_violations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for rate_limit_configs
CREATE POLICY "Users can view own rate limit configs"
  ON rate_limit_configs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own rate limit configs"
  ON rate_limit_configs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own rate limit configs"
  ON rate_limit_configs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for rate_limit_tracking
CREATE POLICY "Users can view own rate limit tracking"
  ON rate_limit_tracking FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own rate limit tracking"
  ON rate_limit_tracking FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for rate_limit_violations
CREATE POLICY "Users can view own rate limit violations"
  ON rate_limit_violations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own rate limit violations"
  ON rate_limit_violations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Function to cleanup old tracking records (older than 24 hours)
CREATE OR REPLACE FUNCTION cleanup_old_rate_limit_tracking()
RETURNS void AS $$
BEGIN
  DELETE FROM rate_limit_tracking
  WHERE timestamp < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current rate limit usage
CREATE OR REPLACE FUNCTION get_rate_limit_usage(
  p_user_id uuid,
  p_action_type text,
  p_window_minutes integer DEFAULT 1
)
RETURNS integer AS $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*)
  INTO v_count
  FROM rate_limit_tracking
  WHERE user_id = p_user_id
    AND action_type = p_action_type
    AND timestamp > NOW() - (p_window_minutes || ' minutes')::interval;

  RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if action is rate limited
CREATE OR REPLACE FUNCTION is_rate_limited(
  p_user_id uuid,
  p_action_type text
)
RETURNS jsonb AS $$
DECLARE
  v_config record;
  v_count_minute integer;
  v_count_hour integer;
  v_count_day integer;
  v_result jsonb;
BEGIN
  -- Get rate limit config
  SELECT * INTO v_config
  FROM rate_limit_configs
  WHERE user_id = p_user_id
    AND action_type = p_action_type
    AND enabled = true;

  -- If no config exists or not enabled, allow
  IF NOT FOUND OR v_config.enabled = false THEN
    RETURN jsonb_build_object(
      'limited', false,
      'reason', null
    );
  END IF;

  -- Check per-minute limit
  v_count_minute := get_rate_limit_usage(p_user_id, p_action_type, 1);
  IF v_count_minute >= v_config.limit_per_minute THEN
    RETURN jsonb_build_object(
      'limited', true,
      'reason', 'per_minute',
      'limit', v_config.limit_per_minute,
      'current', v_count_minute,
      'reset_in_seconds', 60
    );
  END IF;

  -- Check per-hour limit
  v_count_hour := get_rate_limit_usage(p_user_id, p_action_type, 60);
  IF v_count_hour >= v_config.limit_per_hour THEN
    RETURN jsonb_build_object(
      'limited', true,
      'reason', 'per_hour',
      'limit', v_config.limit_per_hour,
      'current', v_count_hour,
      'reset_in_seconds', 3600
    );
  END IF;

  -- Check per-day limit
  v_count_day := get_rate_limit_usage(p_user_id, p_action_type, 1440);
  IF v_count_day >= v_config.limit_per_day THEN
    RETURN jsonb_build_object(
      'limited', true,
      'reason', 'per_day',
      'limit', v_config.limit_per_day,
      'current', v_count_day,
      'reset_in_seconds', 86400
    );
  END IF;

  -- Not limited
  RETURN jsonb_build_object(
    'limited', false,
    'reason', null,
    'usage', jsonb_build_object(
      'per_minute', v_count_minute,
      'per_hour', v_count_hour,
      'per_day', v_count_day
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record action and check rate limit
CREATE OR REPLACE FUNCTION record_and_check_rate_limit(
  p_user_id uuid,
  p_action_type text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb AS $$
DECLARE
  v_check_result jsonb;
BEGIN
  -- Check if rate limited
  v_check_result := is_rate_limited(p_user_id, p_action_type);

  -- If limited, record violation
  IF (v_check_result->>'limited')::boolean = true THEN
    INSERT INTO rate_limit_violations (
      user_id,
      action_type,
      limit_type,
      limit_value,
      attempted_action,
      timestamp
    ) VALUES (
      p_user_id,
      p_action_type,
      v_check_result->>'reason',
      (v_check_result->>'limit')::integer,
      p_metadata,
      NOW()
    );

    RETURN v_check_result;
  END IF;

  -- Not limited, record the action
  INSERT INTO rate_limit_tracking (
    user_id,
    action_type,
    timestamp,
    metadata
  ) VALUES (
    p_user_id,
    p_action_type,
    NOW(),
    p_metadata
  );

  RETURN v_check_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert default rate limit configs for common actions
-- These will be created when a user first uses the system
CREATE OR REPLACE FUNCTION initialize_user_rate_limits(p_user_id uuid)
RETURNS void AS $$
BEGIN
  -- Trade execution limits
  INSERT INTO rate_limit_configs (user_id, action_type, limit_per_minute, limit_per_hour, limit_per_day)
  VALUES (p_user_id, 'trade_execution', 5, 100, 500)
  ON CONFLICT (user_id, action_type) DO NOTHING;

  -- Module activation limits
  INSERT INTO rate_limit_configs (user_id, action_type, limit_per_minute, limit_per_hour, limit_per_day)
  VALUES (p_user_id, 'module_toggle', 10, 50, 200)
  ON CONFLICT (user_id, action_type) DO NOTHING;

  -- API call limits
  INSERT INTO rate_limit_configs (user_id, action_type, limit_per_minute, limit_per_hour, limit_per_day)
  VALUES (p_user_id, 'api_call', 30, 500, 5000)
  ON CONFLICT (user_id, action_type) DO NOTHING;

  -- Market data fetch limits
  INSERT INTO rate_limit_configs (user_id, action_type, limit_per_minute, limit_per_hour, limit_per_day)
  VALUES (p_user_id, 'market_data_fetch', 60, 1000, 10000)
  ON CONFLICT (user_id, action_type) DO NOTHING;

  -- Position updates limits
  INSERT INTO rate_limit_configs (user_id, action_type, limit_per_minute, limit_per_hour, limit_per_day)
  VALUES (p_user_id, 'position_update', 20, 200, 1000)
  ON CONFLICT (user_id, action_type) DO NOTHING;

  -- Wallet operations limits
  INSERT INTO rate_limit_configs (user_id, action_type, limit_per_minute, limit_per_hour, limit_per_day)
  VALUES (p_user_id, 'wallet_operation', 5, 30, 100)
  ON CONFLICT (user_id, action_type) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;