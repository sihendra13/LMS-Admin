-- 1. Perbaiki trigger notify_cert_status: employees.tenant_id bertipe uuid sedangkan
--    quiz_submissions.tenant_id bertipe text. Tanpa cast, SETIAP UPDATE pada
--    quiz_submissions gagal ("operator does not exist: uuid = text") — termasuk
--    approve/reject sertifikat dan retake kuis.
CREATE OR REPLACE FUNCTION notify_cert_status()
RETURNS trigger AS $$
DECLARE
  target text;
BEGIN
  SELECT lower(email) INTO target
  FROM employees
  WHERE name = NEW.employee_name
    AND tenant_id::text = NEW.tenant_id::text
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

-- 2. Hasil kuis lama tersimpan dengan tenant_id teks 'default' (bukan NULL), sehingga
--    migration isolasi tenant sebelumnya tidak memindahkannya ke tenant demo.
--    Akibatnya laporan & hasil kuis di akun demo tampil kosong.
UPDATE quiz_submissions
SET tenant_id = '3028d72b-be1e-4a97-8ceb-fd6dc5a825a9'
WHERE tenant_id = 'default' OR tenant_id IS NULL OR tenant_id = '';
