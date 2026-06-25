-- Add passing_score and validity_months to existing tenant_settings table
ALTER TABLE tenant_settings
  ADD COLUMN IF NOT EXISTS passing_score integer NOT NULL DEFAULT 80,
  ADD COLUMN IF NOT EXISTS validity_months integer NOT NULL DEFAULT 12,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Upsert a single settings row using a fixed sentinel UUID
INSERT INTO tenant_settings (id, passing_score, validity_months)
VALUES ('00000000-0000-0000-0000-000000000001', 80, 12)
ON CONFLICT (id) DO NOTHING;
