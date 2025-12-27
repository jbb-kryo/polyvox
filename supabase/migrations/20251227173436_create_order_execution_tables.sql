/*
  # Order Execution System
  
  ## Overview
  Complete order execution tracking system for Polymarket trading with proper order lifecycle management.
  
  ## New Tables
  
  ### `orders`
  Stores all orders created by the system with full execution tracking.
  
  - `id` (uuid, primary key) - Unique order identifier
  - `user_id` (uuid, foreign key) - User who created the order
  - `module_type` (text) - Which trading module created this order
  - `market_id` (text) - Polymarket market ID
  - `token_id` (text) - Outcome token ID
  - `side` (text) - 'BUY' or 'SELL'
  - `order_type` (text) - 'LIMIT', 'MARKET', 'GTC', 'FOK', 'IOC'
  - `price` (numeric) - Order price
  - `size` (numeric) - Order size in tokens
  - `filled_size` (numeric) - Amount filled so far
  - `remaining_size` (numeric) - Amount still unfilled
  - `status` (text) - Order status
  - `clob_order_id` (text) - CLOB-assigned order ID
  - `signature` (text) - EIP-712 signature
  - `order_hash` (text) - Order hash for tracking
  - `paper_trading` (boolean) - Whether this is a paper trade
  - `created_at` (timestamptz) - Order creation time
  - `updated_at` (timestamptz) - Last status update
  - `submitted_at` (timestamptz) - When submitted to CLOB
  - `filled_at` (timestamptz) - When fully filled
  - `cancelled_at` (timestamptz) - When cancelled
  - `error_message` (text) - Error details if failed
  - `retry_count` (integer) - Number of retry attempts
  - `metadata` (jsonb) - Additional order data
  
  ### `order_fills`
  Tracks individual fill events for orders.
  
  - `id` (uuid, primary key) - Fill event identifier
  - `order_id` (uuid, foreign key) - Reference to orders table
  - `fill_id` (text) - CLOB fill identifier
  - `price` (numeric) - Fill price
  - `size` (numeric) - Fill size
  - `fee` (numeric) - Trading fee paid
  - `timestamp` (timestamptz) - When fill occurred
  - `transaction_hash` (text) - Blockchain transaction hash
  - `metadata` (jsonb) - Additional fill data
  
  ### `order_execution_logs`
  Detailed execution logs for debugging and auditing.
  
  - `id` (uuid, primary key) - Log entry identifier
  - `order_id` (uuid, foreign key) - Reference to orders table
  - `event_type` (text) - Type of event
  - `message` (text) - Log message
  - `data` (jsonb) - Event data
  - `timestamp` (timestamptz) - When event occurred
  
  ## Security
  - Enable RLS on all tables
  - Users can only access their own orders
  - Proper indexes for performance
  
  ## Status Values
  - PENDING: Order created but not yet submitted
  - SUBMITTED: Order submitted to CLOB
  - OPEN: Order active on orderbook
  - PARTIALLY_FILLED: Order partially executed
  - FILLED: Order completely filled
  - CANCELLED: Order cancelled by user
  - REJECTED: Order rejected by CLOB
  - FAILED: Order execution failed
  - EXPIRED: Order expired
*/

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  module_type text NOT NULL,
  market_id text NOT NULL,
  token_id text NOT NULL,
  side text NOT NULL CHECK (side IN ('BUY', 'SELL')),
  order_type text NOT NULL DEFAULT 'LIMIT',
  price numeric NOT NULL CHECK (price >= 0 AND price <= 1),
  size numeric NOT NULL CHECK (size > 0),
  filled_size numeric DEFAULT 0 CHECK (filled_size >= 0),
  remaining_size numeric NOT NULL CHECK (remaining_size >= 0),
  status text NOT NULL DEFAULT 'PENDING',
  clob_order_id text,
  signature text,
  order_hash text,
  paper_trading boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  submitted_at timestamptz,
  filled_at timestamptz,
  cancelled_at timestamptz,
  error_message text,
  retry_count integer DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Create order_fills table
CREATE TABLE IF NOT EXISTS order_fills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  fill_id text NOT NULL,
  price numeric NOT NULL CHECK (price >= 0 AND price <= 1),
  size numeric NOT NULL CHECK (size > 0),
  fee numeric DEFAULT 0 CHECK (fee >= 0),
  timestamp timestamptz DEFAULT now(),
  transaction_hash text,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Create order_execution_logs table
CREATE TABLE IF NOT EXISTS order_execution_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  message text NOT NULL,
  data jsonb DEFAULT '{}'::jsonb,
  timestamp timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_fills ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_execution_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'orders' AND policyname = 'Users can view own orders'
  ) THEN
    CREATE POLICY "Users can view own orders"
      ON orders
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'orders' AND policyname = 'Users can create own orders'
  ) THEN
    CREATE POLICY "Users can create own orders"
      ON orders
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'orders' AND policyname = 'Users can update own orders'
  ) THEN
    CREATE POLICY "Users can update own orders"
      ON orders
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- RLS Policies for order_fills
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'order_fills' AND policyname = 'Users can view fills for own orders'
  ) THEN
    CREATE POLICY "Users can view fills for own orders"
      ON order_fills
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM orders
          WHERE orders.id = order_fills.order_id
          AND orders.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'order_fills' AND policyname = 'System can insert fills'
  ) THEN
    CREATE POLICY "System can insert fills"
      ON order_fills
      FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM orders
          WHERE orders.id = order_fills.order_id
          AND orders.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- RLS Policies for order_execution_logs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'order_execution_logs' AND policyname = 'Users can view logs for own orders'
  ) THEN
    CREATE POLICY "Users can view logs for own orders"
      ON order_execution_logs
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM orders
          WHERE orders.id = order_execution_logs.order_id
          AND orders.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'order_execution_logs' AND policyname = 'System can insert logs'
  ) THEN
    CREATE POLICY "System can insert logs"
      ON order_execution_logs
      FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM orders
          WHERE orders.id = order_execution_logs.order_id
          AND orders.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_market_id ON orders(market_id);
CREATE INDEX IF NOT EXISTS idx_orders_clob_order_id ON orders(clob_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_fills_order_id ON order_fills(order_id);
CREATE INDEX IF NOT EXISTS idx_order_execution_logs_order_id ON order_execution_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_order_execution_logs_timestamp ON order_execution_logs(timestamp DESC);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS orders_updated_at_trigger ON orders;
CREATE TRIGGER orders_updated_at_trigger
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_orders_updated_at();
