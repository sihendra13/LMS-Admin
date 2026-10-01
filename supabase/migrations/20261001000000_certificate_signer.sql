-- Penanda tangan sertifikat per perusahaan (Pengaturan → Tanda Tangan Sertifikat).
-- Kosong = sertifikat memakai nama HRD yang menerbitkan & jabatan "HR Manager".
ALTER TABLE tenant_settings
  ADD COLUMN IF NOT EXISTS cert_signer_name   text,
  ADD COLUMN IF NOT EXISTS cert_signer_title  text,
  ADD COLUMN IF NOT EXISTS cert_signature_url text;
