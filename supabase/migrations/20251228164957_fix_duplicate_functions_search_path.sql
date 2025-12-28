/*
  # Fix Duplicate Functions with Mutable Search Path

  1. Problem
    - Multiple versions of functions exist with different signatures
    - Old versions without secure search_path configuration still present
    - Supabase advisor detecting the old insecure versions

  2. Solution
    - Drop ALL versions of the three functions (regardless of signature)
    - Keep only the secure versions with search_path=""
    
  3. Functions Fixed
    - get_error_statistics (all overloads)
    - get_trading_log_statistics (all overloads)
    - get_trading_activity_timeline (all overloads)
*/

-- ============================================================================
-- DROP ALL VERSIONS OF FUNCTIONS
-- ============================================================================

-- Drop all overloaded versions of get_error_statistics
DROP FUNCTION IF EXISTS get_error_statistics(UUID, TIMESTAMP, TIMESTAMP) CASCADE;
DROP FUNCTION IF EXISTS get_error_statistics(INTERVAL) CASCADE;

-- Drop all overloaded versions of get_trading_log_statistics  
DROP FUNCTION IF EXISTS get_trading_log_statistics(UUID, TIMESTAMP, TIMESTAMP, TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_trading_log_statistics(UUID, INTERVAL) CASCADE;

-- Drop all overloaded versions of get_trading_activity_timeline
DROP FUNCTION IF EXISTS get_trading_activity_timeline(UUID, INTEGER, INTEGER, TEXT, TEXT, TEXT, TIMESTAMP, TIMESTAMP) CASCADE;
DROP FUNCTION IF EXISTS get_trading_activity_timeline(UUID, INTEGER, INTEGER, TEXT, TEXT, TEXT, TEXT) CASCADE;

-- ============================================================================
-- RECREATE FUNCTIONS WITH SECURE SEARCH PATH
-- ============================================================================

-- Function: get_error_statistics
CREATE FUNCTION get_error_statistics(
  p_user_id UUID,
  p_start_date TIMESTAMP DEFAULT NULL,
  p_end_date TIMESTAMP DEFAULT NULL
)
RETURNS TABLE (
  total_errors BIGINT,
  critical_errors BIGINT,
  error_errors BIGINT,
  warning_errors BIGINT,
  info_errors BIGINT,
  resolved_errors BIGINT,
  unresolved_errors BIGINT
)
SECURITY DEFINER
SET search_path = ''
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_errors,
    COUNT(*) FILTER (WHERE severity = 'critical')::BIGINT as critical_errors,
    COUNT(*) FILTER (WHERE severity = 'error')::BIGINT as error_errors,
    COUNT(*) FILTER (WHERE severity = 'warning')::BIGINT as warning_errors,
    COUNT(*) FILTER (WHERE severity = 'info')::BIGINT as info_errors,
    COUNT(*) FILTER (WHERE resolved = true)::BIGINT as resolved_errors,
    COUNT(*) FILTER (WHERE resolved = false)::BIGINT as unresolved_errors
  FROM public.error_logs
  WHERE user_id = p_user_id
    AND (p_start_date IS NULL OR created_at >= p_start_date)
    AND (p_end_date IS NULL OR created_at <= p_end_date);
END;
$$;

-- Function: get_trading_log_statistics
CREATE FUNCTION get_trading_log_statistics(
  p_user_id UUID,
  p_start_date TIMESTAMP DEFAULT NULL,
  p_end_date TIMESTAMP DEFAULT NULL,
  p_module TEXT DEFAULT NULL
)
RETURNS TABLE (
  total_logs BIGINT,
  debug_logs BIGINT,
  info_logs BIGINT,
  warn_logs BIGINT,
  error_logs BIGINT,
  successful_operations BIGINT,
  failed_operations BIGINT,
  avg_duration_ms NUMERIC
)
SECURITY DEFINER
SET search_path = ''
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_logs,
    COUNT(*) FILTER (WHERE log_level = 'debug')::BIGINT as debug_logs,
    COUNT(*) FILTER (WHERE log_level = 'info')::BIGINT as info_logs,
    COUNT(*) FILTER (WHERE log_level = 'warn')::BIGINT as warn_logs,
    COUNT(*) FILTER (WHERE log_level = 'error')::BIGINT as error_logs,
    COUNT(*) FILTER (WHERE success = true)::BIGINT as successful_operations,
    COUNT(*) FILTER (WHERE success = false)::BIGINT as failed_operations,
    AVG(duration_ms) as avg_duration_ms
  FROM public.trading_activity_logs
  WHERE user_id = p_user_id
    AND (p_start_date IS NULL OR created_at >= p_start_date)
    AND (p_end_date IS NULL OR created_at <= p_end_date)
    AND (p_module IS NULL OR module = p_module);
END;
$$;

-- Function: get_trading_activity_timeline
CREATE FUNCTION get_trading_activity_timeline(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0,
  p_module TEXT DEFAULT NULL,
  p_log_level TEXT DEFAULT NULL,
  p_activity_type TEXT DEFAULT NULL,
  p_start_date TIMESTAMP DEFAULT NULL,
  p_end_date TIMESTAMP DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  module TEXT,
  activity_type TEXT,
  log_level TEXT,
  message TEXT,
  success BOOLEAN,
  duration_ms INTEGER,
  market_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ
)
SECURITY DEFINER
SET search_path = ''
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.user_id,
    t.module,
    t.activity_type,
    t.log_level,
    t.message,
    t.success,
    t.duration_ms,
    t.market_id,
    t.metadata,
    t.created_at
  FROM public.trading_activity_logs t
  WHERE t.user_id = p_user_id
    AND (p_module IS NULL OR t.module = p_module)
    AND (p_log_level IS NULL OR t.log_level = p_log_level)
    AND (p_activity_type IS NULL OR t.activity_type = p_activity_type)
    AND (p_start_date IS NULL OR t.created_at >= p_start_date)
    AND (p_end_date IS NULL OR t.created_at <= p_end_date)
  ORDER BY t.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- All functions now have:
-- 1. SECURITY DEFINER for controlled execution
-- 2. SET search_path = '' for immutable search path security
-- 3. Explicit schema qualification (public.table_name) in all queries
