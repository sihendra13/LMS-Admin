-- Hasil kuis lama tersimpan dengan tenant_id teks 'default' (bukan NULL), sehingga
-- migration isolasi tenant sebelumnya tidak memindahkannya ke tenant demo.
-- Akibatnya laporan & hasil kuis di akun demo tampil kosong.
UPDATE quiz_submissions
SET tenant_id = '3028d72b-be1e-4a97-8ceb-fd6dc5a825a9'
WHERE tenant_id = 'default' OR tenant_id IS NULL OR tenant_id = '';
