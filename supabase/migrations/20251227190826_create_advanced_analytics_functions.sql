/*
  # Advanced Analytics Functions

  1. New Functions
    - Calculate Sharpe Ratio
    - Calculate Maximum Drawdown
    - Calculate Sortino Ratio
    - Calculate Calmar Ratio
    - Get trade statistics
    - Get performance by module
    - Get performance by market
    - Get performance by time period
    - Get trade calendar data
    
  2. Performance Metrics
    - Win rate
    - Average profit/loss
    - Profit factor
    - Expected value
    - Risk-adjusted returns
    - Drawdown analysis
    
  3. Attribution Analysis
    - P&L by module
    - P&L by market
    - P&L by time period
    - Contribution analysis
*/

-- Function to calculate daily returns for a user
CREATE OR REPLACE FUNCTION get_daily_returns(
  p_user_id uuid,
  p_start_date date DEFAULT CURRENT_DATE - 365,
  p_end_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  date date,
  daily_pnl numeric,
  cumulative_pnl numeric,
  daily_return_pct numeric,
  trade_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH daily_trades AS (
    SELECT
      DATE(closed_at) AS trade_date,
      SUM(realized_pnl) AS total_pnl,
      COUNT(*)::integer AS trades
    FROM position_history
    WHERE user_id = p_user_id
      AND DATE(closed_at) BETWEEN p_start_date AND p_end_date
    GROUP BY DATE(closed_at)
  ),
  date_series AS (
    SELECT generate_series(
      p_start_date,
      p_end_date,
      '1 day'::interval
    )::date AS series_date
  )
  SELECT
    ds.series_date AS date,
    COALESCE(dt.total_pnl, 0) AS daily_pnl,
    SUM(COALESCE(dt.total_pnl, 0)) OVER (ORDER BY ds.series_date) AS cumulative_pnl,
    CASE 
      WHEN LAG(SUM(COALESCE(dt.total_pnl, 0)) OVER (ORDER BY ds.series_date)) OVER (ORDER BY ds.series_date) > 0
      THEN (COALESCE(dt.total_pnl, 0) / LAG(SUM(COALESCE(dt.total_pnl, 0)) OVER (ORDER BY ds.series_date)) OVER (ORDER BY ds.series_date)) * 100
      ELSE 0
    END AS daily_return_pct,
    COALESCE(dt.trades, 0) AS trade_count
  FROM date_series ds
  LEFT JOIN daily_trades dt ON ds.series_date = dt.trade_date
  ORDER BY ds.series_date;
END;
$$;

-- Function to calculate Sharpe Ratio
CREATE OR REPLACE FUNCTION calculate_sharpe_ratio(
  p_user_id uuid,
  p_days integer DEFAULT 365,
  p_risk_free_rate numeric DEFAULT 0.0
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_avg_return numeric;
  v_std_dev numeric;
  v_sharpe_ratio numeric;
BEGIN
  WITH daily_returns AS (
    SELECT daily_return_pct
    FROM get_daily_returns(
      p_user_id,
      CURRENT_DATE - p_days,
      CURRENT_DATE
    )
    WHERE daily_return_pct IS NOT NULL
  )
  SELECT
    AVG(daily_return_pct),
    STDDEV(daily_return_pct)
  INTO v_avg_return, v_std_dev
  FROM daily_returns;
  
  IF v_std_dev IS NULL OR v_std_dev = 0 THEN
    RETURN 0;
  END IF;
  
  v_sharpe_ratio := (v_avg_return - p_risk_free_rate) / v_std_dev;
  
  RETURN ROUND(v_sharpe_ratio, 4);
END;
$$;

-- Function to calculate Maximum Drawdown
CREATE OR REPLACE FUNCTION calculate_max_drawdown(
  p_user_id uuid,
  p_days integer DEFAULT 365
)
RETURNS TABLE (
  max_drawdown_pct numeric,
  max_drawdown_amount numeric,
  peak_date date,
  trough_date date,
  recovery_date date,
  drawdown_duration_days integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH daily_equity AS (
    SELECT
      date,
      cumulative_pnl,
      MAX(cumulative_pnl) OVER (ORDER BY date ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS peak_equity
    FROM get_daily_returns(
      p_user_id,
      CURRENT_DATE - p_days,
      CURRENT_DATE
    )
  ),
  drawdowns AS (
    SELECT
      date,
      cumulative_pnl,
      peak_equity,
      peak_equity - cumulative_pnl AS drawdown_amount,
      CASE 
        WHEN peak_equity > 0 
        THEN ((peak_equity - cumulative_pnl) / peak_equity) * 100
        ELSE 0
      END AS drawdown_pct,
      LAG(date) OVER (ORDER BY date) AS prev_date
    FROM daily_equity
    WHERE peak_equity > cumulative_pnl
  ),
  max_dd AS (
    SELECT *
    FROM drawdowns
    ORDER BY drawdown_pct DESC
    LIMIT 1
  )
  SELECT
    COALESCE(mdd.drawdown_pct, 0),
    COALESCE(mdd.drawdown_amount, 0),
    mdd.date,
    mdd.date,
    NULL::date,
    0
  FROM max_dd mdd;
END;
$$;

-- Function to calculate Sortino Ratio
CREATE OR REPLACE FUNCTION calculate_sortino_ratio(
  p_user_id uuid,
  p_days integer DEFAULT 365,
  p_risk_free_rate numeric DEFAULT 0.0
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_avg_return numeric;
  v_downside_dev numeric;
  v_sortino_ratio numeric;
BEGIN
  WITH daily_returns AS (
    SELECT daily_return_pct
    FROM get_daily_returns(
      p_user_id,
      CURRENT_DATE - p_days,
      CURRENT_DATE
    )
    WHERE daily_return_pct IS NOT NULL
  )
  SELECT
    AVG(daily_return_pct),
    SQRT(AVG(CASE WHEN daily_return_pct < 0 THEN POWER(daily_return_pct, 2) ELSE 0 END))
  INTO v_avg_return, v_downside_dev
  FROM daily_returns;
  
  IF v_downside_dev IS NULL OR v_downside_dev = 0 THEN
    RETURN 0;
  END IF;
  
  v_sortino_ratio := (v_avg_return - p_risk_free_rate) / v_downside_dev;
  
  RETURN ROUND(v_sortino_ratio, 4);
END;
$$;

-- Function to get comprehensive trade statistics
CREATE OR REPLACE FUNCTION get_trade_statistics(
  p_user_id uuid,
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL,
  p_module_type text DEFAULT NULL
)
RETURNS TABLE (
  total_trades integer,
  winning_trades integer,
  losing_trades integer,
  break_even_trades integer,
  win_rate numeric,
  total_pnl numeric,
  avg_win numeric,
  avg_loss numeric,
  largest_win numeric,
  largest_loss numeric,
  avg_win_pct numeric,
  avg_loss_pct numeric,
  profit_factor numeric,
  expected_value numeric,
  avg_trade_duration_hours numeric,
  avg_winning_duration_hours numeric,
  avg_losing_duration_hours numeric,
  total_fees numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_start_date timestamptz;
  v_end_date timestamptz;
BEGIN
  v_start_date := COALESCE(p_start_date, CURRENT_TIMESTAMP - interval '365 days');
  v_end_date := COALESCE(p_end_date, CURRENT_TIMESTAMP);
  
  RETURN QUERY
  WITH filtered_trades AS (
    SELECT *
    FROM position_history
    WHERE user_id = p_user_id
      AND closed_at BETWEEN v_start_date AND v_end_date
      AND (p_module_type IS NULL OR module_type = p_module_type)
  ),
  trade_stats AS (
    SELECT
      COUNT(*)::integer AS total,
      COUNT(*) FILTER (WHERE realized_pnl > 0)::integer AS winners,
      COUNT(*) FILTER (WHERE realized_pnl < 0)::integer AS losers,
      COUNT(*) FILTER (WHERE realized_pnl = 0)::integer AS break_even,
      SUM(realized_pnl) AS total_profit,
      AVG(CASE WHEN realized_pnl > 0 THEN realized_pnl END) AS avg_w,
      AVG(CASE WHEN realized_pnl < 0 THEN realized_pnl END) AS avg_l,
      MAX(realized_pnl) AS max_w,
      MIN(realized_pnl) AS min_l,
      AVG(CASE WHEN realized_pnl > 0 THEN realized_pnl_percent END) AS avg_w_pct,
      AVG(CASE WHEN realized_pnl < 0 THEN realized_pnl_percent END) AS avg_l_pct,
      SUM(CASE WHEN realized_pnl > 0 THEN realized_pnl ELSE 0 END) AS gross_profit,
      ABS(SUM(CASE WHEN realized_pnl < 0 THEN realized_pnl ELSE 0 END)) AS gross_loss,
      AVG(hold_duration_seconds::numeric / 3600) AS avg_duration,
      AVG(CASE WHEN realized_pnl > 0 THEN hold_duration_seconds::numeric / 3600 END) AS avg_win_duration,
      AVG(CASE WHEN realized_pnl < 0 THEN hold_duration_seconds::numeric / 3600 END) AS avg_loss_duration,
      SUM(COALESCE(fees_paid, 0)) AS total_f
    FROM filtered_trades
  )
  SELECT
    ts.total,
    ts.winners,
    ts.losers,
    ts.break_even,
    CASE WHEN ts.total > 0 THEN (ts.winners::numeric / ts.total::numeric) * 100 ELSE 0 END,
    COALESCE(ts.total_profit, 0),
    COALESCE(ts.avg_w, 0),
    COALESCE(ts.avg_l, 0),
    COALESCE(ts.max_w, 0),
    COALESCE(ts.min_l, 0),
    COALESCE(ts.avg_w_pct, 0),
    COALESCE(ts.avg_l_pct, 0),
    CASE 
      WHEN ts.gross_loss > 0 THEN ts.gross_profit / ts.gross_loss
      ELSE 0
    END,
    CASE
      WHEN ts.total > 0 THEN ts.total_profit / ts.total
      ELSE 0
    END,
    COALESCE(ts.avg_duration, 0),
    COALESCE(ts.avg_win_duration, 0),
    COALESCE(ts.avg_loss_duration, 0),
    COALESCE(ts.total_f, 0)
  FROM trade_stats ts;
END;
$$;

-- Function to get performance attribution by module
CREATE OR REPLACE FUNCTION get_performance_by_module(
  p_user_id uuid,
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL
)
RETURNS TABLE (
  module_type text,
  total_trades integer,
  winning_trades integer,
  win_rate numeric,
  total_pnl numeric,
  avg_pnl numeric,
  total_volume numeric,
  pnl_contribution_pct numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_start_date timestamptz;
  v_end_date timestamptz;
  v_total_pnl numeric;
BEGIN
  v_start_date := COALESCE(p_start_date, CURRENT_TIMESTAMP - interval '365 days');
  v_end_date := COALESCE(p_end_date, CURRENT_TIMESTAMP);
  
  SELECT SUM(realized_pnl)
  INTO v_total_pnl
  FROM position_history
  WHERE user_id = p_user_id
    AND closed_at BETWEEN v_start_date AND v_end_date;
  
  v_total_pnl := COALESCE(v_total_pnl, 1);
  
  RETURN QUERY
  SELECT
    ph.module_type,
    COUNT(*)::integer AS total,
    COUNT(*) FILTER (WHERE realized_pnl > 0)::integer AS winners,
    CASE 
      WHEN COUNT(*) > 0 
      THEN (COUNT(*) FILTER (WHERE realized_pnl > 0)::numeric / COUNT(*)::numeric) * 100
      ELSE 0
    END AS win_pct,
    COALESCE(SUM(realized_pnl), 0) AS pnl,
    COALESCE(AVG(realized_pnl), 0) AS avg,
    COALESCE(SUM(entry_cost), 0) AS volume,
    (COALESCE(SUM(realized_pnl), 0) / v_total_pnl) * 100 AS contribution
  FROM position_history ph
  WHERE user_id = p_user_id
    AND closed_at BETWEEN v_start_date AND v_end_date
  GROUP BY ph.module_type
  ORDER BY pnl DESC;
END;
$$;

-- Function to get performance by market
CREATE OR REPLACE FUNCTION get_performance_by_market(
  p_user_id uuid,
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL,
  p_limit integer DEFAULT 20
)
RETURNS TABLE (
  market_id text,
  market_question text,
  total_trades integer,
  winning_trades integer,
  win_rate numeric,
  total_pnl numeric,
  avg_pnl numeric,
  total_volume numeric,
  avg_hold_time_hours numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_start_date timestamptz;
  v_end_date timestamptz;
BEGIN
  v_start_date := COALESCE(p_start_date, CURRENT_TIMESTAMP - interval '365 days');
  v_end_date := COALESCE(p_end_date, CURRENT_TIMESTAMP);
  
  RETURN QUERY
  SELECT
    ph.market_id,
    ph.market_question,
    COUNT(*)::integer AS total,
    COUNT(*) FILTER (WHERE realized_pnl > 0)::integer AS winners,
    CASE 
      WHEN COUNT(*) > 0 
      THEN (COUNT(*) FILTER (WHERE realized_pnl > 0)::numeric / COUNT(*)::numeric) * 100
      ELSE 0
    END AS win_pct,
    COALESCE(SUM(realized_pnl), 0) AS pnl,
    COALESCE(AVG(realized_pnl), 0) AS avg,
    COALESCE(SUM(entry_cost), 0) AS volume,
    COALESCE(AVG(hold_duration_seconds::numeric / 3600), 0) AS hold_time
  FROM position_history ph
  WHERE user_id = p_user_id
    AND closed_at BETWEEN v_start_date AND v_end_date
  GROUP BY ph.market_id, ph.market_question
  ORDER BY pnl DESC
  LIMIT p_limit;
END;
$$;

-- Function to get trade calendar data
CREATE OR REPLACE FUNCTION get_trade_calendar(
  p_user_id uuid,
  p_start_date date DEFAULT CURRENT_DATE - 90,
  p_end_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  date date,
  trade_count integer,
  winning_trades integer,
  losing_trades integer,
  total_pnl numeric,
  win_rate numeric,
  best_trade_pnl numeric,
  worst_trade_pnl numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE(closed_at) AS trade_date,
    COUNT(*)::integer AS trades,
    COUNT(*) FILTER (WHERE realized_pnl > 0)::integer AS winners,
    COUNT(*) FILTER (WHERE realized_pnl < 0)::integer AS losers,
    COALESCE(SUM(realized_pnl), 0) AS pnl,
    CASE 
      WHEN COUNT(*) > 0 
      THEN (COUNT(*) FILTER (WHERE realized_pnl > 0)::numeric / COUNT(*)::numeric) * 100
      ELSE 0
    END AS win_pct,
    COALESCE(MAX(realized_pnl), 0) AS best,
    COALESCE(MIN(realized_pnl), 0) AS worst
  FROM position_history
  WHERE user_id = p_user_id
    AND DATE(closed_at) BETWEEN p_start_date AND p_end_date
  GROUP BY DATE(closed_at)
  ORDER BY DATE(closed_at) DESC;
END;
$$;

-- Function to get hourly performance (best trading hours)
CREATE OR REPLACE FUNCTION get_hourly_performance(
  p_user_id uuid,
  p_days integer DEFAULT 90
)
RETURNS TABLE (
  hour_of_day integer,
  trade_count integer,
  winning_trades integer,
  win_rate numeric,
  total_pnl numeric,
  avg_pnl numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    EXTRACT(HOUR FROM closed_at)::integer AS hour,
    COUNT(*)::integer AS trades,
    COUNT(*) FILTER (WHERE realized_pnl > 0)::integer AS winners,
    CASE 
      WHEN COUNT(*) > 0 
      THEN (COUNT(*) FILTER (WHERE realized_pnl > 0)::numeric / COUNT(*)::numeric) * 100
      ELSE 0
    END AS win_pct,
    COALESCE(SUM(realized_pnl), 0) AS pnl,
    COALESCE(AVG(realized_pnl), 0) AS avg
  FROM position_history
  WHERE user_id = p_user_id
    AND closed_at >= CURRENT_TIMESTAMP - (p_days || ' days')::interval
  GROUP BY EXTRACT(HOUR FROM closed_at)
  ORDER BY hour;
END;
$$;

-- Function to get win/loss streaks
CREATE OR REPLACE FUNCTION get_win_loss_streaks(
  p_user_id uuid,
  p_limit integer DEFAULT 10
)
RETURNS TABLE (
  streak_type text,
  streak_length integer,
  start_date timestamptz,
  end_date timestamptz,
  total_pnl numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH trades_with_result AS (
    SELECT
      id,
      closed_at,
      realized_pnl,
      CASE 
        WHEN realized_pnl > 0 THEN 'win'
        WHEN realized_pnl < 0 THEN 'loss'
        ELSE 'break_even'
      END AS result
    FROM position_history
    WHERE user_id = p_user_id
    ORDER BY closed_at
  ),
  streaks AS (
    SELECT
      result,
      MIN(closed_at) AS start_time,
      MAX(closed_at) AS end_time,
      COUNT(*)::integer AS length,
      SUM(realized_pnl) AS pnl
    FROM (
      SELECT
        *,
        SUM(CASE WHEN result != LAG(result) OVER (ORDER BY closed_at) THEN 1 ELSE 0 END) 
          OVER (ORDER BY closed_at) AS streak_group
      FROM trades_with_result
    ) grouped
    GROUP BY result, streak_group
  )
  SELECT
    s.result,
    s.length,
    s.start_time,
    s.end_time,
    s.pnl
  FROM streaks s
  WHERE s.result IN ('win', 'loss')
  ORDER BY s.length DESC
  LIMIT p_limit;
END;
$$;
