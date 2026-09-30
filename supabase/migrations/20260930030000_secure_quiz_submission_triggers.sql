-- Trigger pada quiz_submissions menulis ke push_queue (notifikasi "SOP Selesai Dikerjakan",
-- "Perlu Remedial", dll). push_queue hanya boleh ditulis service role (RLS), sehingga
-- trigger yang berjalan dengan hak karyawan membuat INSERT hasil kuis GAGAL.
-- Jadikan semua fungsi trigger di tabel ini SECURITY DEFINER (berjalan dengan hak pemilik).
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT DISTINCT p.oid::regprocedure AS fn
    FROM pg_trigger t
    JOIN pg_proc p ON p.oid = t.tgfoid
    WHERE t.tgrelid = 'public.quiz_submissions'::regclass
      AND NOT t.tgisinternal
      AND NOT p.prosecdef
  LOOP
    EXECUTE format('ALTER FUNCTION %s SECURITY DEFINER SET search_path = public', r.fn);
    RAISE NOTICE 'Diamankan: %', r.fn;
  END LOOP;
END $$;

-- Daftar trigger pada quiz_submissions setelah perbaikan (untuk dicek)
SELECT t.tgname AS trigger, p.proname AS fungsi, p.prosecdef AS security_definer
FROM pg_trigger t
JOIN pg_proc p ON p.oid = t.tgfoid
WHERE t.tgrelid = 'public.quiz_submissions'::regclass
  AND NOT t.tgisinternal
ORDER BY 1;
