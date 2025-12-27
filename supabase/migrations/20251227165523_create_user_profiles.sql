/*
  # User Profiles and Authentication Setup

  ## Overview
  Sets up user profiles table for PolyVOX with secure authentication and RLS policies.

  ## New Tables
    - `user_profiles`
      - `id` (uuid, primary key, references auth.users)
      - `email` (text, not null)
      - `wallet_address` (text)
      - `encrypted_private_key` (text) - Client-side encrypted
      - `demo_mode` (boolean, default true)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `last_login_at` (timestamptz)

  ## Security
    - Enable RLS on user_profiles
    - Users can only read/update their own profile
    - Auto-create profile on user signup via trigger

  ## Updates to Existing Tables
    - Add user_id column to tables that don't have it
*/

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  wallet_address text,
  encrypted_private_key text,
  demo_mode boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_login_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_profiles' AND policyname = 'Users can view own profile'
  ) THEN
    CREATE POLICY "Users can view own profile"
      ON user_profiles
      FOR SELECT
      TO authenticated
      USING (auth.uid() = id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_profiles' AND policyname = 'Users can update own profile'
  ) THEN
    CREATE POLICY "Users can update own profile"
      ON user_profiles
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = id)
      WITH CHECK (auth.uid() = id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_profiles' AND policyname = 'Users can insert own profile'
  ) THEN
    CREATE POLICY "Users can insert own profile"
      ON user_profiles
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Add user_id to tables that don't have it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'arbitrage_opportunities' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE arbitrage_opportunities ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'arbitrage_trades' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE arbitrage_trades ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trend_opportunities' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE trend_opportunities ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trend_trades' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE trend_trades ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'snipe_trades' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE snipe_trades ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'whale_orders' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE whale_orders ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'whale_stats' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE whale_stats ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'value_markets' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE value_markets ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'value_signals' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE value_signals ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'external_data_sources' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE external_data_sources ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_arbitrage_opportunities_user_id ON arbitrage_opportunities(user_id);
CREATE INDEX IF NOT EXISTS idx_arbitrage_trades_user_id ON arbitrage_trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trend_opportunities_user_id ON trend_opportunities(user_id);
CREATE INDEX IF NOT EXISTS idx_trend_trades_user_id ON trend_trades(user_id);
CREATE INDEX IF NOT EXISTS idx_snipe_trades_user_id ON snipe_trades(user_id);
CREATE INDEX IF NOT EXISTS idx_whale_orders_user_id ON whale_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_whale_stats_user_id ON whale_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_value_markets_user_id ON value_markets(user_id);
CREATE INDEX IF NOT EXISTS idx_value_signals_user_id ON value_signals(user_id);
