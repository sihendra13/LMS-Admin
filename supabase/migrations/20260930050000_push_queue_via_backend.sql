-- Notifikasi dari push_queue (SOP Selesai Dikerjakan, Perlu Remedial, Sertifikat Diterbitkan)
-- sebelumnya dikirim lewat edge function send-push yang GAGAL mengirim (sent 0) walau
-- menandai sent=true. Arahkan ke backend Render yang terbukti berhasil mengirim.
-- Backend hanya menerima queue_id, lalu membaca isi & penerima dari push_queue.
CREATE OR REPLACE FUNCTION public.process_push_queue()
RETURNS trigger AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://axara-lms-backend.onrender.com/api/v1/push-queue/process',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object('queue_id', NEW.id),
    timeout_milliseconds := 60000 -- Render free bisa cold start ~30-60 detik
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;
