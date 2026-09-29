-- ============================================================================
-- Isolasi data per tenant + dukungan akun trial
--
-- Semua data lama (sebelum multi-tenant) dimiliki tenant demo "PT Demo Axara".
-- Jalankan sekali di Supabase SQL Editor. Aman dijalankan ulang (idempotent).
-- ============================================================================

-- Tenant demo milik Axara (dipakai untuk presentasi, satu-satunya yang boleh
-- melihat switcher simulasi paket)
DO $$
DECLARE
  demo_tenant uuid := '3028d72b-be1e-4a97-8ceb-fd6dc5a825a9';
BEGIN

  -- ── tenants: flag demo + masa trial ───────────────────────────────────────
  ALTER TABLE tenants
    ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;

  UPDATE tenants SET is_demo = true WHERE id = demo_tenant;

  -- ── sop_videos: tambah tenant_id ──────────────────────────────────────────
  ALTER TABLE sop_videos
    ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE;

  UPDATE sop_videos SET tenant_id = demo_tenant WHERE tenant_id IS NULL;

  -- ── employees & quiz_submissions: isi tenant_id yang masih kosong ─────────
  UPDATE employees        SET tenant_id = demo_tenant WHERE tenant_id IS NULL;
  UPDATE quiz_submissions SET tenant_id = demo_tenant WHERE tenant_id IS NULL;

  -- ── tenant_settings: simpan daftar departemen/jabatan/cabang per tenant ───
  ALTER TABLE tenant_settings
    ADD COLUMN IF NOT EXISTS departments jsonb,
    ADD COLUMN IF NOT EXISTS job_titles  jsonb,
    ADD COLUMN IF NOT EXISTS cities      jsonb;

  -- Pastikan tenant demo punya baris settings, lalu salin daftar global lama
  INSERT INTO tenant_settings (tenant_id, passing_score, validity_months)
  SELECT demo_tenant,
         COALESCE((SELECT value::int FROM app_settings WHERE key = 'passing_score'), 80),
         COALESCE((SELECT value::int FROM app_settings WHERE key = 'validity_months'), 12)
  WHERE NOT EXISTS (SELECT 1 FROM tenant_settings WHERE tenant_id = demo_tenant);

  UPDATE tenant_settings SET
    departments = COALESCE(departments, (SELECT value::jsonb FROM app_settings WHERE key = 'departments_list')),
    job_titles  = COALESCE(job_titles,  (SELECT value::jsonb FROM app_settings WHERE key = 'jabatan_list')),
    cities      = COALESCE(cities,      (SELECT value::jsonb FROM app_settings WHERE key = 'cabang_list'))
  WHERE tenant_id = demo_tenant;

END $$;

CREATE INDEX IF NOT EXISTS sop_videos_tenant_id_idx       ON sop_videos (tenant_id);
CREATE INDEX IF NOT EXISTS employees_tenant_id_idx        ON employees (tenant_id);
CREATE INDEX IF NOT EXISTS quiz_submissions_tenant_id_idx ON quiz_submissions (tenant_id);
