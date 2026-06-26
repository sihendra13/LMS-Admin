# Axara LMS — Backlog & Catatan Proyek

## Backlog Fitur

### 1. Upgrade Request Flow (Enterprise)
**Prioritas:** High — implementasi bareng Superadmin Axara

Fitur upgrade request Enterprise saat user hit kuota karyawan.

**Flow:**
1. User import Excel melebihi kuota → muncul modal upgrade (bukan alert browser)
2. Modal berisi form pre-filled: Nama Admin, Perusahaan, Email, Jumlah Karyawan Dibutuhkan, Paket Saat Ini
3. User klik "Kirim Permintaan" → simpan ke Supabase tabel `upgrade_requests`
4. User lihat konfirmasi: "Tim Axara akan menghubungi Anda dalam 1x24 jam"
5. User TETAP BISA klik "Lanjut dengan Paket Business" → import sesuai sisa kuota
6. Data request masuk ke **dashboard Superadmin Axara**

**Referensi:** Mengikuti pola Docebo (modal → form → email + callback) & SAP Litmos (contact form pre-filled dari akun user).

**Tabel Supabase:** `upgrade_requests` — kolom: tenant_name, admin_name, admin_email, current_plan, employee_needed, status, created_at

---

### 2. Migrasi Backend (Security — WAJIB sebelum klien enterprise)
**Prioritas:** Critical

**Status RLS per 2026-06-24:**
- **Opsi A — DONE:** RLS aktif di semua 15 tabel public, policy anon ALL sudah ada
- **Opsi B — BELUM:** Frontend masih pakai `anon key` langsung di browser (terlihat di DevTools)

**Yang harus dilakukan:**
- Pindahkan semua query dari TenantContext ke backend Render
- Backend pakai `service_role key` (bukan anon key)
- File yang kena: `LMS-Admin/src/context/TenantContext.jsx`, `LMS-Learner/src/context/TenantContext.jsx`

**Why:** Data karyawan perusahaan enterprise sensitif — tidak boleh bisa diakses dengan anon key yang publik.

---

### 3. Superadmin Dashboard Axara
**Prioritas:** Medium — dibutuhkan saat mulai onboard klien

Dashboard internal Axara untuk:
- Melihat semua tenant (klien) aktif
- Melihat upgrade requests masuk
- Monitoring penggunaan storage/bandwidth per tenant
- Manage paket & billing per tenant

---

## Catatan Proyek

### Target Market
Target Axara LMS adalah perusahaan **menengah dan enterprise** di Indonesia (contoh: Astra, Suzuki). Bukan UKM. Fitur yang dibangun harus relevan untuk skala enterprise (banyak karyawan, departemen, compliance, reporting).

### Video Views Counter
**Status: Selesai.** Counter "Dilihat oleh" sudah real dari Supabase via RPC `increment_video_views`. Bukan localStorage.

---

## Layanan Pihak Ketiga

| Layanan | Fungsi | Biaya Saat Ini | Biaya Saat Klien Aktif |
|---|---|---|---|
| **Supabase** | Database PostgreSQL + Storage | $0 (Free) | $25/bulan (Pro) |
| **Cloudflare Pages** | Hosting frontend | $0 | $0 |
| **Render.com** | Backend API | $0 (Free) | $7/bulan (Starter) |
| **GitHub** | Source code + auto-deploy | $0 | $0 |
| **Bunny.net** | CDN & video streaming | ~$0 | $10–30/bulan |
| **CloudConvert** | Konversi PPTX → PNG | Belum aktif | $8/bulan (jika >25 PPT/hari) |
| **Total** | | **$0/bulan** | **~$50–70/bulan** |

### Akun & URL
- **Supabase**: env var `VITE_SUPABASE_URL` — akun kontesku1374@gmail.com
- **Cloudflare Admin**: https://lms-admin-6wg.pages.dev
- **Cloudflare Learner**: https://lms-learner.pages.dev
- **Render Backend**: https://axara-lms-backend.onrender.com
- **GitHub**: github.com/sihendra13 (LMS-Admin, LMS-Learner, axara-lms-backend)
