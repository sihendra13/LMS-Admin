-- Trigger notifikasi hasil kuis mencari email karyawan HANYA berdasarkan nama, sehingga
-- karyawan bernama sama di perusahaan lain ikut/menggantikan menerima notifikasi.
-- Versi ini mencari karyawan berdasarkan nama + tenant yang sama. Judul notifikasi tetap.
-- (employees.tenant_id = uuid, quiz_submissions.tenant_id = text → dibandingkan sebagai text)

CREATE OR REPLACE FUNCTION public.employee_email_in_tenant(p_name text, p_tenant text)
RETURNS text AS $$
  SELECT lower(email)
  FROM employees
  WHERE name = p_name
    AND tenant_id::text = p_tenant
    AND deleted_at IS NULL
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Karyawan mengirim hasil kuis (baru atau mengulang)
CREATE OR REPLACE FUNCTION public.trigger_notify_sop_completed()
RETURNS trigger AS $$
DECLARE
  v_email text;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.post_score IS NOT DISTINCT FROM OLD.post_score
     AND NEW.retake_count IS NOT DISTINCT FROM OLD.retake_count THEN
    RETURN NEW; -- bukan pengiriman kuis baru
  END IF;

  v_email := employee_email_in_tenant(NEW.employee_name, NEW.tenant_id::text);
  IF v_email IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO push_queue (title, body, page, target_emails)
  VALUES ('SOP Selesai Dikerjakan ✅',
          'Hasil kuis ' || coalesce(NEW.video_title, 'SOP') || ' sudah tercatat dengan skor ' || coalesce(NEW.post_score::text, '0') || '%.',
          'sop', ARRAY[v_email]);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- HRD / sistem menandai remedial
CREATE OR REPLACE FUNCTION public.trigger_notify_remedial()
RETURNS trigger AS $$
DECLARE
  v_email text;
BEGIN
  IF OLD.cert_status IS NOT DISTINCT FROM 'remedial' OR NEW.cert_status IS DISTINCT FROM 'remedial' THEN
    RETURN NEW;
  END IF;

  v_email := employee_email_in_tenant(NEW.employee_name, NEW.tenant_id::text);
  IF v_email IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO push_queue (title, body, page, target_emails)
  VALUES ('Perlu Remedial ⚠️',
          'Anda perlu mengulang kuis ' || coalesce(NEW.video_title, 'SOP') || '. Silakan pelajari kembali materinya.',
          'sop', ARRAY[v_email]);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- HRD menyetujui sertifikat
CREATE OR REPLACE FUNCTION public.trigger_notify_cert_approved()
RETURNS trigger AS $$
DECLARE
  v_email text;
BEGIN
  IF OLD.cert_status IS NOT DISTINCT FROM 'approved' OR NEW.cert_status IS DISTINCT FROM 'approved' THEN
    RETURN NEW;
  END IF;

  v_email := employee_email_in_tenant(NEW.employee_name, NEW.tenant_id::text);
  IF v_email IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO push_queue (title, body, page, target_emails)
  VALUES ('Sertifikat Diterbitkan! 🎓',
          'Selamat! Sertifikat Anda untuk ' || coalesce(NEW.video_title, 'SOP') || ' telah diterbitkan.',
          'sertifikasi', ARRAY[v_email]);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
