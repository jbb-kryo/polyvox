/*
  # Rename demo_mode to paper_trading_mode
  
  ## Overview
  Renames the demo_mode column to paper_trading_mode in user_profiles table to better reflect
  that paper trading uses real market data without executing actual blockchain transactions.
  
  ## Changes
    1. Rename Column
      - `user_profiles.demo_mode` → `user_profiles.paper_trading_mode`
      - Maintains default value of true (paper trading enabled by default)
    
  ## Important Notes
    - Paper trading mode uses real market data from Polymarket
    - No blockchain transactions are executed in paper trading mode
    - Users must explicitly switch to live trading mode for real transactions
*/

-- Rename demo_mode to paper_trading_mode
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'demo_mode'
  ) THEN
    ALTER TABLE user_profiles RENAME COLUMN demo_mode TO paper_trading_mode;
  END IF;
END $$;
