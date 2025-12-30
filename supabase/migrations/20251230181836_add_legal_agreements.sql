/*
  # Add Legal Agreements Tracking

  1. Changes to user_profiles
    - Add `terms_accepted_at` (timestamptz) - When user accepted Terms of Service
    - Add `privacy_accepted_at` (timestamptz) - When user accepted Privacy Policy
    - Add `terms_version` (text) - Version of ToS accepted
    - Add `privacy_version` (text) - Version of Privacy Policy accepted
    - Add `risk_disclaimer_acknowledged` (boolean) - Whether risk disclaimer was shown

  2. New Table: legal_agreements
    - `id` (uuid, primary key)
    - `user_id` (uuid, foreign key to user_profiles)
    - `agreement_type` (text) - 'terms', 'privacy', 'risk_disclaimer'
    - `version` (text) - Version number of the agreement
    - `accepted_at` (timestamptz) - When it was accepted
    - `ip_address` (text) - IP address at time of acceptance (optional)
    - `user_agent` (text) - Browser/device info (optional)
    
  3. Security
    - Enable RLS on legal_agreements table
    - Users can read their own agreements
    - Only system can insert agreements
*/

-- Add columns to user_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'terms_accepted_at'
  ) THEN
    ALTER TABLE user_profiles 
    ADD COLUMN terms_accepted_at timestamptz,
    ADD COLUMN privacy_accepted_at timestamptz,
    ADD COLUMN terms_version text DEFAULT '1.0.0',
    ADD COLUMN privacy_version text DEFAULT '1.0.0',
    ADD COLUMN risk_disclaimer_acknowledged boolean DEFAULT false;
  END IF;
END $$;

-- Create legal_agreements table
CREATE TABLE IF NOT EXISTS legal_agreements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  agreement_type text NOT NULL CHECK (agreement_type IN ('terms', 'privacy', 'risk_disclaimer')),
  version text NOT NULL DEFAULT '1.0.0',
  accepted_at timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_legal_agreements_user_id 
  ON legal_agreements(user_id);

CREATE INDEX IF NOT EXISTS idx_legal_agreements_type 
  ON legal_agreements(agreement_type);

-- Enable RLS
ALTER TABLE legal_agreements ENABLE ROW LEVEL SECURITY;

-- Users can read their own agreements
DROP POLICY IF EXISTS "Users can read own legal agreements" ON legal_agreements;
CREATE POLICY "Users can read own legal agreements"
  ON legal_agreements
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Only authenticated users can insert their own agreements
DROP POLICY IF EXISTS "Users can record own legal agreements" ON legal_agreements;
CREATE POLICY "Users can record own legal agreements"
  ON legal_agreements
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create function to check if user has accepted latest agreements
CREATE OR REPLACE FUNCTION check_legal_agreements(
  p_user_id uuid,
  p_current_terms_version text DEFAULT '1.0.0',
  p_current_privacy_version text DEFAULT '1.0.0'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile record;
  v_result jsonb;
BEGIN
  SELECT 
    terms_accepted_at,
    privacy_accepted_at,
    terms_version,
    privacy_version,
    risk_disclaimer_acknowledged
  INTO v_profile
  FROM user_profiles
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'needs_terms', true,
      'needs_privacy', true,
      'needs_risk_disclaimer', true
    );
  END IF;

  v_result := jsonb_build_object(
    'needs_terms', v_profile.terms_accepted_at IS NULL OR v_profile.terms_version != p_current_terms_version,
    'needs_privacy', v_profile.privacy_accepted_at IS NULL OR v_profile.privacy_version != p_current_privacy_version,
    'needs_risk_disclaimer', NOT COALESCE(v_profile.risk_disclaimer_acknowledged, false),
    'last_terms_acceptance', v_profile.terms_accepted_at,
    'last_privacy_acceptance', v_profile.privacy_accepted_at,
    'current_terms_version', v_profile.terms_version,
    'current_privacy_version', v_profile.privacy_version
  );

  RETURN v_result;
END;
$$;

-- Create function to record agreement acceptance
CREATE OR REPLACE FUNCTION record_legal_agreement(
  p_user_id uuid,
  p_agreement_type text,
  p_version text DEFAULT '1.0.0',
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_agreement_id uuid;
BEGIN
  -- Verify user exists
  IF NOT EXISTS (SELECT 1 FROM user_profiles WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  -- Verify agreement type
  IF p_agreement_type NOT IN ('terms', 'privacy', 'risk_disclaimer') THEN
    RAISE EXCEPTION 'Invalid agreement type';
  END IF;

  -- Insert agreement record
  INSERT INTO legal_agreements (
    user_id,
    agreement_type,
    version,
    ip_address,
    user_agent
  )
  VALUES (
    p_user_id,
    p_agreement_type,
    p_version,
    p_ip_address,
    p_user_agent
  )
  RETURNING id INTO v_agreement_id;

  -- Update user_profiles
  IF p_agreement_type = 'terms' THEN
    UPDATE user_profiles
    SET terms_accepted_at = now(),
        terms_version = p_version
    WHERE id = p_user_id;
  ELSIF p_agreement_type = 'privacy' THEN
    UPDATE user_profiles
    SET privacy_accepted_at = now(),
        privacy_version = p_version
    WHERE id = p_user_id;
  ELSIF p_agreement_type = 'risk_disclaimer' THEN
    UPDATE user_profiles
    SET risk_disclaimer_acknowledged = true
    WHERE id = p_user_id;
  END IF;

  RETURN v_agreement_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION check_legal_agreements(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION record_legal_agreement(uuid, text, text, text, text) TO authenticated;