CREATE TABLE IF NOT EXISTS app_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz DEFAULT now()
);

INSERT INTO app_settings (key, value) VALUES
  ('passing_score', '80'),
  ('validity_months', '12')
ON CONFLICT (key) DO NOTHING;

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read app settings"
  ON app_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can update app settings"
  ON app_settings FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
