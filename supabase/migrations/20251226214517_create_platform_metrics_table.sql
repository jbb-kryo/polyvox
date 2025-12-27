/*
  # Create Platform Metrics Table
  
  1. New Tables
    - `platform_metrics`
      - `id` (uuid, primary key)
      - `metric_name` (text) - Name of the metric (e.g., 'total_transaction_volume', 'app_version')
      - `metric_value` (text) - Value of the metric
      - `updated_at` (timestamptz) - Last update timestamp
      - `created_at` (timestamptz) - Creation timestamp
  
  2. Security
    - Enable RLS on `platform_metrics` table
    - Add policy for public read access (metrics are anonymized)
    - Add policy for system updates (authenticated users can update)
  
  3. Initial Data
    - Insert initial transaction volume metric set to 0.00
    - Insert initial app version set to 1.0.0
*/

-- Create platform_metrics table
CREATE TABLE IF NOT EXISTS platform_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name text UNIQUE NOT NULL,
  metric_value text NOT NULL DEFAULT '0',
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE platform_metrics ENABLE ROW LEVEL SECURITY;

-- Policy for public read access (anonymized data)
CREATE POLICY "Anyone can read platform metrics"
  ON platform_metrics
  FOR SELECT
  TO public
  USING (true);

-- Policy for authenticated users to update metrics
CREATE POLICY "Authenticated users can update metrics"
  ON platform_metrics
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy for inserting new metrics
CREATE POLICY "Authenticated users can insert metrics"
  ON platform_metrics
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Insert initial metrics
INSERT INTO platform_metrics (metric_name, metric_value)
VALUES 
  ('total_transaction_volume', '0.00'),
  ('app_version', '1.0.0')
ON CONFLICT (metric_name) DO NOTHING;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_platform_metrics_name ON platform_metrics(metric_name);

-- Create function to update timestamp automatically
CREATE OR REPLACE FUNCTION update_platform_metrics_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-updating timestamp
DROP TRIGGER IF EXISTS update_platform_metrics_timestamp_trigger ON platform_metrics;
CREATE TRIGGER update_platform_metrics_timestamp_trigger
  BEFORE UPDATE ON platform_metrics
  FOR EACH ROW
  EXECUTE FUNCTION update_platform_metrics_timestamp();