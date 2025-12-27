/*
  # Enhance Arbitrage Tables

  ## Summary
  Adds new columns and features to existing arbitrage tables and creates new execution tracking table.

  ## Changes

  1. Create arbitrage_executions table for detailed execution logging
  2. Add new columns to arbitrage_positions for real-time tracking
  3. Add new columns to arbitrage_trades for complete performance metrics
  4. Add indexes for performance
  5. Add triggers for automatic P&L calculation
*/

-- Create arbitrage_executions table
CREATE TABLE IF NOT EXISTS arbitrage_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  opportunity_id text NOT NULL,
  market1_id text NOT NULL,
  market2_id text NOT NULL,
  entry_price_1 numeric NOT NULL,
  entry_price_2 numeric NOT NULL,
  actual_price_1 numeric NOT NULL,
  actual_price_2 numeric NOT NULL,
  position_size numeric NOT NULL,
  expected_profit numeric NOT NULL,
  expected_profit_percent numeric NOT NULL,
  execution_time_ms integer NOT NULL,
  success boolean NOT NULL DEFAULT false,
  is_real boolean NOT NULL DEFAULT false,
  order_id_1 text,
  order_id_2 text,
  tx_hash_1 text,
  tx_hash_2 text,
  errors jsonb,
  execution_plan jsonb,
  opportunity_data jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Add new columns to arbitrage_positions if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'arbitrage_positions' AND column_name = 'execution_id') THEN
    ALTER TABLE arbitrage_positions ADD COLUMN execution_id uuid REFERENCES arbitrage_executions(id) ON DELETE SET NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'arbitrage_positions' AND column_name = 'market1_question') THEN
    ALTER TABLE arbitrage_positions ADD COLUMN market1_question text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'arbitrage_positions' AND column_name = 'market2_question') THEN
    ALTER TABLE arbitrage_positions ADD COLUMN market2_question text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'arbitrage_positions' AND column_name = 'entry_price_1') THEN
    ALTER TABLE arbitrage_positions ADD COLUMN entry_price_1 numeric;
    UPDATE arbitrage_positions SET entry_price_1 = entry_price_m1 WHERE entry_price_1 IS NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'arbitrage_positions' AND column_name = 'entry_price_2') THEN
    ALTER TABLE arbitrage_positions ADD COLUMN entry_price_2 numeric;
    UPDATE arbitrage_positions SET entry_price_2 = entry_price_m2 WHERE entry_price_2 IS NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'arbitrage_positions' AND column_name = 'current_price_1') THEN
    ALTER TABLE arbitrage_positions ADD COLUMN current_price_1 numeric;
    UPDATE arbitrage_positions SET current_price_1 = current_price_m1 WHERE current_price_1 IS NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'arbitrage_positions' AND column_name = 'current_price_2') THEN
    ALTER TABLE arbitrage_positions ADD COLUMN current_price_2 numeric;
    UPDATE arbitrage_positions SET current_price_2 = current_price_m2 WHERE current_price_2 IS NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'arbitrage_positions' AND column_name = 'exit_price_1') THEN
    ALTER TABLE arbitrage_positions ADD COLUMN exit_price_1 numeric;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'arbitrage_positions' AND column_name = 'exit_price_2') THEN
    ALTER TABLE arbitrage_positions ADD COLUMN exit_price_2 numeric;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'arbitrage_positions' AND column_name = 'entry_fees') THEN
    ALTER TABLE arbitrage_positions ADD COLUMN entry_fees numeric DEFAULT 0 NOT NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'arbitrage_positions' AND column_name = 'current_pnl') THEN
    ALTER TABLE arbitrage_positions ADD COLUMN current_pnl numeric DEFAULT 0 NOT NULL;
    UPDATE arbitrage_positions SET current_pnl = pnl WHERE current_pnl = 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'arbitrage_positions' AND column_name = 'current_pnl_percent') THEN
    ALTER TABLE arbitrage_positions ADD COLUMN current_pnl_percent numeric DEFAULT 0 NOT NULL;
    UPDATE arbitrage_positions SET current_pnl_percent = pnl_percent WHERE current_pnl_percent = 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'arbitrage_positions' AND column_name = 'realized_profit') THEN
    ALTER TABLE arbitrage_positions ADD COLUMN realized_profit numeric;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'arbitrage_positions' AND column_name = 'is_real') THEN
    ALTER TABLE arbitrage_positions ADD COLUMN is_real boolean DEFAULT false NOT NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'arbitrage_positions' AND column_name = 'order_id_1') THEN
    ALTER TABLE arbitrage_positions ADD COLUMN order_id_1 text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'arbitrage_positions' AND column_name = 'order_id_2') THEN
    ALTER TABLE arbitrage_positions ADD COLUMN order_id_2 text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'arbitrage_positions' AND column_name = 'tx_hashes') THEN
    ALTER TABLE arbitrage_positions ADD COLUMN tx_hashes jsonb;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'arbitrage_positions' AND column_name = 'risks') THEN
    ALTER TABLE arbitrage_positions ADD COLUMN risks jsonb;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'arbitrage_positions' AND column_name = 'auto_close_enabled') THEN
    ALTER TABLE arbitrage_positions ADD COLUMN auto_close_enabled boolean DEFAULT false NOT NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'arbitrage_positions' AND column_name = 'target_profit_percent') THEN
    ALTER TABLE arbitrage_positions ADD COLUMN target_profit_percent numeric DEFAULT 5 NOT NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'arbitrage_positions' AND column_name = 'stop_loss_percent') THEN
    ALTER TABLE arbitrage_positions ADD COLUMN stop_loss_percent numeric DEFAULT -10 NOT NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'arbitrage_positions' AND column_name = 'last_checked_at') THEN
    ALTER TABLE arbitrage_positions ADD COLUMN last_checked_at timestamptz;
  END IF;
END $$;

-- Add new columns to arbitrage_trades if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'arbitrage_trades' AND column_name = 'position_id') THEN
    ALTER TABLE arbitrage_trades ADD COLUMN position_id uuid REFERENCES arbitrage_positions(id) ON DELETE SET NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'arbitrage_trades' AND column_name = 'market1_id') THEN
    ALTER TABLE arbitrage_trades ADD COLUMN market1_id text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'arbitrage_trades' AND column_name = 'market2_id') THEN
    ALTER TABLE arbitrage_trades ADD COLUMN market2_id text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'arbitrage_trades' AND column_name = 'market1_question') THEN
    ALTER TABLE arbitrage_trades ADD COLUMN market1_question text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'arbitrage_trades' AND column_name = 'market2_question') THEN
    ALTER TABLE arbitrage_trades ADD COLUMN market2_question text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'arbitrage_trades' AND column_name = 'entry_price_1') THEN
    ALTER TABLE arbitrage_trades ADD COLUMN entry_price_1 numeric;
    UPDATE arbitrage_trades SET entry_price_1 = entry_price_m1 WHERE entry_price_1 IS NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'arbitrage_trades' AND column_name = 'entry_price_2') THEN
    ALTER TABLE arbitrage_trades ADD COLUMN entry_price_2 numeric;
    UPDATE arbitrage_trades SET entry_price_2 = entry_price_m2 WHERE entry_price_2 IS NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'arbitrage_trades' AND column_name = 'exit_price_1') THEN
    ALTER TABLE arbitrage_trades ADD COLUMN exit_price_1 numeric;
    UPDATE arbitrage_trades SET exit_price_1 = exit_price_m1 WHERE exit_price_1 IS NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'arbitrage_trades' AND column_name = 'exit_price_2') THEN
    ALTER TABLE arbitrage_trades ADD COLUMN exit_price_2 numeric;
    UPDATE arbitrage_trades SET exit_price_2 = exit_price_m2 WHERE exit_price_2 IS NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'arbitrage_trades' AND column_name = 'gross_profit') THEN
    ALTER TABLE arbitrage_trades ADD COLUMN gross_profit numeric;
    UPDATE arbitrage_trades SET gross_profit = profit + fees WHERE gross_profit IS NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'arbitrage_trades' AND column_name = 'gas_costs') THEN
    ALTER TABLE arbitrage_trades ADD COLUMN gas_costs numeric DEFAULT 0 NOT NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'arbitrage_trades' AND column_name = 'slippage_cost') THEN
    ALTER TABLE arbitrage_trades ADD COLUMN slippage_cost numeric DEFAULT 0 NOT NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'arbitrage_trades' AND column_name = 'duration_ms') THEN
    ALTER TABLE arbitrage_trades ADD COLUMN duration_ms bigint;
    UPDATE arbitrage_trades SET duration_ms = duration_minutes * 60000 WHERE duration_ms IS NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'arbitrage_trades' AND column_name = 'is_real') THEN
    ALTER TABLE arbitrage_trades ADD COLUMN is_real boolean DEFAULT false NOT NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'arbitrage_trades' AND column_name = 'close_reason') THEN
    ALTER TABLE arbitrage_trades ADD COLUMN close_reason text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'arbitrage_trades' AND column_name = 'tx_hashes') THEN
    ALTER TABLE arbitrage_trades ADD COLUMN tx_hashes jsonb;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'arbitrage_trades' AND column_name = 'entry_time') THEN
    ALTER TABLE arbitrage_trades ADD COLUMN entry_time timestamptz;
    UPDATE arbitrage_trades SET entry_time = opened_at WHERE entry_time IS NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'arbitrage_trades' AND column_name = 'exit_time') THEN
    ALTER TABLE arbitrage_trades ADD COLUMN exit_time timestamptz;
    UPDATE arbitrage_trades SET exit_time = closed_at WHERE exit_time IS NULL;
  END IF;
END $$;

-- Create indexes for arbitrage_executions
CREATE INDEX IF NOT EXISTS idx_arbitrage_executions_user_id ON arbitrage_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_arbitrage_executions_created_at ON arbitrage_executions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_arbitrage_executions_market1_id ON arbitrage_executions(market1_id);
CREATE INDEX IF NOT EXISTS idx_arbitrage_executions_market2_id ON arbitrage_executions(market2_id);
CREATE INDEX IF NOT EXISTS idx_arbitrage_executions_success ON arbitrage_executions(success);
CREATE INDEX IF NOT EXISTS idx_arbitrage_executions_is_real ON arbitrage_executions(is_real);

-- Create additional indexes for arbitrage_positions
CREATE INDEX IF NOT EXISTS idx_arbitrage_positions_is_real ON arbitrage_positions(is_real);
CREATE INDEX IF NOT EXISTS idx_arbitrage_positions_auto_close ON arbitrage_positions(auto_close_enabled) WHERE status = 'open';

-- Create additional indexes for arbitrage_trades
CREATE INDEX IF NOT EXISTS idx_arbitrage_trades_market1_id ON arbitrage_trades(market1_id);
CREATE INDEX IF NOT EXISTS idx_arbitrage_trades_market2_id ON arbitrage_trades(market2_id);
CREATE INDEX IF NOT EXISTS idx_arbitrage_trades_profit ON arbitrage_trades(profit DESC);
CREATE INDEX IF NOT EXISTS idx_arbitrage_trades_is_real ON arbitrage_trades(is_real);
CREATE INDEX IF NOT EXISTS idx_arbitrage_trades_entry_time ON arbitrage_trades(entry_time DESC);

-- Enable RLS on arbitrage_executions
ALTER TABLE arbitrage_executions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for arbitrage_executions
CREATE POLICY "Users can view own executions"
  ON arbitrage_executions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own executions"
  ON arbitrage_executions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);