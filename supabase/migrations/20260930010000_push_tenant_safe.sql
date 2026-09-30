-- ============================================================================
-- Push notification aman untuk multi-tenant
--
-- 1. Matikan trigger SOP baru yang menyiarkan notifikasi ke SEMUA subscriber
--    (target_emails kosong = broadcast lintas perusahaan). Notifikasi SOP baru
--    sudah dikirim backend (/api/v1/notifications/push) hanya ke karyawan tenant.
-- 2. Perbaiki trigger status sertifikat: kolom yang benar (video_title,
--    employee_name) dan kirim ke email karyawan di tenant yang sama.
-- 3. Fungsi register_push_subscription: perangkat didaftarkan atas nama user yang
--    sedang login (email dari JWT). Satu perangkat = satu endpoint, jadi endpoint
--    dipindahkan ke user terakhir yang login di perangkat itu.
-- ============================================================================

DROP TRIGGER IF EXISTS trg_notify_new_sop ON sop_videos;
DROP FUNCTION IF EXISTS notify_new_sop();

CREATE OR REPLACE FUNCTION notify_cert_status()
RETURNS trigger AS $$
DECLARE
  target text;
BEGIN
  SELECT lower(email) INTO target
  FROM employees
  WHERE name = NEW.employee_name
    AND tenant_id = NEW.tenant_id
    AND deleted_at IS NULL
  LIMIT 1;

  IF target IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.cert_status = 'approved' AND (OLD.cert_status IS NULL OR OLD.cert_status <> 'approved') THEN
    INSERT INTO push_queue (title, body, page, target_emails)
    VALUES ('Sertifikat Disetujui!',
            'Selamat! Sertifikat Anda untuk ' || coalesce(NEW.video_title, 'materi') || ' telah disetujui.',
            'sertifikasi', ARRAY[target]);
  ELSIF NEW.cert_status = 'remedial' AND (OLD.cert_status IS NULL OR OLD.cert_status <> 'remedial') THEN
    INSERT INTO push_queue (title, body, page, target_emails)
    VALUES ('Perlu Remedial',
            'Anda perlu mengulang kuis untuk ' || coalesce(NEW.video_title, 'materi') || '.',
            'sop', ARRAY[target]);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION register_push_subscription(p_endpoint text, p_p256dh text, p_auth text)
RETURNS void AS $$
DECLARE
  v_email text := lower(auth.jwt() ->> 'email');
BEGIN
  IF v_email IS NULL OR v_email = '' THEN
    RAISE EXCEPTION 'Harus login untuk mendaftarkan notifikasi';
  END IF;

  INSERT INTO push_subscriptions (user_email, endpoint, keys_p256dh, keys_auth)
  VALUES (v_email, p_endpoint, p_p256dh, p_auth)
  ON CONFLICT (endpoint) DO UPDATE
    SET user_email  = EXCLUDED.user_email,
        keys_p256dh = EXCLUDED.keys_p256dh,
        keys_auth   = EXCLUDED.keys_auth;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION register_push_subscription(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION register_push_subscription(text, text, text) TO authenticated;
