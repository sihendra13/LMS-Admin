-- Notifikasi "SOP Selesai Dikerjakan" hanya terpasang pada INSERT, sehingga pengerjaan
-- ulang kuis (UPDATE: skor & retake_count berubah) tidak memicu notifikasi.
-- trigger_notify_sop_completed() sudah mengabaikan UPDATE yang tidak mengubah skor/retake.
DROP TRIGGER IF EXISTS on_sop_completed ON quiz_submissions;
CREATE TRIGGER on_sop_completed
  AFTER INSERT OR UPDATE ON quiz_submissions
  FOR EACH ROW EXECUTE FUNCTION trigger_notify_sop_completed();
