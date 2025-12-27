/*
  # Create Module Settings Table

  1. New Tables
    - `module_settings` - Persistent settings for each trading module
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `module_name` (text: arbitrage, trend, snipe, whale, value)
      - `is_active` (boolean) - Whether the module is currently running
      - `settings` (jsonb) - All module-specific settings
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - UNIQUE constraint on (user_id, module_name)

  2. Security
    - Enable RLS
    - Users can only view/modify their own settings
*/

CREATE TABLE IF NOT EXISTS module_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
  module_name text NOT NULL CHECK (module_name IN ('arbitrage', 'trend', 'snipe', 'whale', 'value')),
  is_active boolean DEFAULT false,
  settings jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, module_name)
);

ALTER TABLE module_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own module settings"
  ON module_settings FOR SELECT
  TO authenticated, anon
  USING (user_id = COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'));

CREATE POLICY "Users can insert own module settings"
  ON module_settings FOR INSERT
  TO authenticated, anon
  WITH CHECK (user_id = COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'));

CREATE POLICY "Users can update own module settings"
  ON module_settings FOR UPDATE
  TO authenticated, anon
  USING (user_id = COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'))
  WITH CHECK (user_id = COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'));

CREATE INDEX IF NOT EXISTS idx_module_settings_user_module ON module_settings(user_id, module_name);