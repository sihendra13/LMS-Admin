CREATE TABLE IF NOT EXISTS tenant_settings (
  id integer PRIMARY KEY DEFAULT 1,
  passing_score integer NOT NULL DEFAULT 80,
  validity_months integer NOT NULL DEFAULT 12,
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT tenant_settings_single_row CHECK (id = 1)
);

INSERT INTO tenant_settings (id, passing_score, validity_months)
VALUES (1, 80, 12)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE tenant_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read tenant settings"
  ON tenant_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can update tenant settings"
  ON tenant_settings FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
