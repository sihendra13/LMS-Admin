# Axara LMS — Engineering Guide

Panduan teknis untuk engineer yang baru bergabung ke project Axara LMS. Baca dokumen ini dari awal sampai akhir sebelum mulai coding.

---

## 1. Gambaran Umum Project

Axara LMS adalah platform SaaS multi-tenant untuk manajemen pelatihan karyawan korporat. Sistem ini terdiri dari **dua aplikasi terpisah**:

| Aplikasi | Repo | URL Production | Pengguna |
|----------|------|----------------|----------|
| LMS Admin | `sihendra13/LMS-Admin` | `lms-admin-6wg.pages.dev` | HRD / HR Manager |
| LMS Learner | `sihendra13/LMS-Learner` | `lms-learner.pages.dev` | Karyawan |

Keduanya **berjalan sepenuhnya di frontend** — tidak ada backend server. State disimpan di `localStorage` dan file media di Supabase Storage.

---

## 2. Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Framework | React 19 + Vite |
| State Management | Context API + localStorage |
| Database / Auth | Supabase (PostgreSQL + Storage) |
| Hosting | Cloudflare Pages (auto-deploy dari GitHub) |
| PPTX Processing | JSZip (client-side, baca jumlah slide) |
| PPT Viewer | Microsoft Office Online Viewer (iframe, gratis) |
| Styling | CSS custom (variabel CSS via `index.css`) |

---

## 3. Setup Lokal

```bash
# Clone kedua repo
git clone https://github.com/sihendra13/LMS-Admin.git
git clone https://github.com/sihendra13/LMS-Learner.git

# Install dependencies
cd LMS-Admin && npm install
cd ../LMS-Learner && npm install

# Jalankan dev server
# LMS Admin
cd LMS-Admin && npm run dev   # http://localhost:5173

# LMS Learner (terminal baru)
cd LMS-Learner && npm run dev  # http://localhost:5174
```

Tidak perlu file `.env` — Supabase URL dan anon key sudah hardcoded di `src/utils/supabase.js` (acceptable untuk MVP/demo, perlu di-migrate ke env var sebelum produksi penuh).

---

## 4. Struktur Folder

### LMS-Admin

```
src/
├── components/
│   └── Sidebar.jsx          # Navigasi utama, role-aware
├── context/
│   └── TenantContext.jsx    # ⭐ State management utama (baca dulu!)
├── pages/
│   ├── Dashboard.jsx        # Halaman ringkasan statistik
│   ├── SOPManager.jsx       # Daftar video/PPT yang sudah diupload
│   ├── UploadSOP.jsx        # Form upload video/PPT + konfigurasi kuis
│   ├── QuizGrading.jsx      # Hasil penilaian kuis semua karyawan
│   ├── Employees.jsx        # Manajemen daftar karyawan
│   ├── Settings.jsx         # Pengaturan tenant (logo, profil, HRIS)
│   ├── Reports.jsx          # Laporan compliance
│   └── Certificates.jsx     # Review sertifikat
└── utils/
    ├── featureGates.js      # ⭐ Logika gating fitur per plan
    └── supabase.js          # Supabase client
```

### LMS-Learner

```
src/
├── components/
│   └── QuizModal.jsx        # ⭐ Wizard belajar: pre-test → video/PPT → post-test → result
├── context/
│   └── TenantContext.jsx    # Membaca localStorage yang sama dengan Admin
├── pages/
│   ├── SOPManager.jsx       # Daftar materi untuk karyawan
│   ├── Certificates.jsx     # Sertifikat karyawan
│   └── Profile.jsx          # Profil karyawan
└── utils/
    └── supabase.js          # Supabase client (sama persis dengan Admin)
```

---

## 5. Konsep Inti: TenantContext

`TenantContext.jsx` adalah jantung dari aplikasi. Semua state global di-manage di sini.

### Storage Keys

```javascript
const DB_KEY   = 'axara_lms_db';   // Semua data tenant (videos, employees, submissions, dll)
const LOGO_KEY = 'axara_lms_logo'; // Logo perusahaan (base64)
```

### State yang Tersedia via `useTenant()`

```javascript
const {
  tenant,           // { name, plan, dept, ... } — info perusahaan
  currentUser,      // { name, role, dept } — user yang sedang login
  videos,           // Array materi SOP yang sudah diupload
  employees,        // Array karyawan terdaftar
  quizSubmissions,  // Array hasil kuis dari Supabase
  passingScore,     // Nilai minimum lulus (default: 70)
  addSOP,           // Fungsi tambah materi baru
  addSubmission,    // Fungsi simpan hasil kuis ke Supabase
  updateProgress,   // Fungsi update progress tonton karyawan
  setActivePage,    // Navigasi antar halaman
} = useTenant();
```

### Alur Data

```
LocalStorage (axara_lms_db)
    ↓ dibaca saat app mount
TenantContext (in-memory state)
    ↓ digunakan oleh semua komponen
Component (read/write via useTenant())
    ↓ setiap perubahan
LocalStorage (disimpan ulang via useEffect)
```

**LMS Admin dan LMS Learner berbagi localStorage yang sama** — jadi ketika admin upload video baru, karyawan langsung bisa melihatnya tanpa sync server (selama dibuka di browser yang sama).

---

## 6. Role & Akses

```javascript
// Di dalam komponen
const { currentUser } = useTenant();
const isSupervisor = currentUser.role !== 'admin';
```

| Role | Akses |
|------|-------|
| `admin` (HRD Admin) | Full akses semua departemen |
| supervisor (Lead/Manager) | Hanya melihat data departemennya sendiri |

Role disimulasikan via **simulator widget** (pojok kanan bawah di dev/demo). Di produksi nyata, ini akan digantikan dengan sistem auth Supabase.

---

## 7. Feature Gating (Paket Langganan)

Semua pembatasan fitur berdasarkan plan dikelola di `src/utils/featureGates.js`:

```javascript
import { canUploadSOP, canUploadPPT, getPPTLimit, getEmployeeLimit } from '../utils/featureGates';

// Contoh penggunaan di komponen
if (!canUploadSOP(tenant.plan)) {
  return <LockedFeatureScreen />;
}
```

### Tabel Fitur per Plan

| Fitur | Starter | Business | Enterprise |
|-------|---------|----------|------------|
| Upload Video SOP | ❌ (Axara only) | ✅ Unlimited | ✅ Unlimited |
| Upload PPT | ❌ | ✅ Maks 30/bln | ✅ Unlimited |
| Kuis otomatis | ❌ | ✅ | ✅ |
| Jumlah karyawan | 200 | 500 | Unlimited |
| Laporan compliance | Basic | Full | Full |
| HRIS Integration | ❌ | ❌ | ✅ (locked UI) |
| AI HeyGen | ❌ | ❌ | ✅ (future) |

---

## 8. Upload Materi & Objek `newVideo`

Semua materi (video/PPT) disimpan sebagai objek dengan struktur ini:

```javascript
const newVideo = {
  id: Date.now(),           // Unique ID
  title: "Judul SOP",       // Judul materi
  dept: "Sales",            // Target departemen
  duration: "5:30",         // Untuk video: "MM:SS", untuk PPT: "X slide"
  progress: 0,              // Progress tonton karyawan (0-100)
  views: 0,                 // Jumlah penonton (TODO: ambil dari Supabase)
  color: "#1e3a5f",         // Warna card berdasarkan dept
  tagClass: "dt-sales",     // CSS class untuk dept badge
  videoUrl: "https://...",  // Public URL Supabase Storage
  filePath: "filename.mp4", // Path di bucket Supabase
  archived: false,          // Soft delete
  type: "video",            // "video" | "ppt"
  slideCount: null,         // Jumlah slide (khusus PPT)
  preQuizzes: [...],        // Array soal pre-test
  postQuizzes: [...],       // Array soal post-test
};
```

### Struktur Soal Kuis

```javascript
const question = {
  id: 1,
  question: "Teks pertanyaan",
  type: "multiple",           // Saat ini hanya multiple choice
  triggerTime: 120,           // Detik ke berapa video dijeda (0 = tidak ada trigger)
  options: ["A", "B", "C", "D"],
  answer: "A",                // Jawaban benar (huruf kapital)
};
```

**Untuk PPT:** `triggerTime` selalu 0 karena tidak ada timestamp trigger.

---

## 9. Alur Kuis (QuizModal — LMS Learner)

```
Materi dibuka
    ↓
[hasPreTest?] → Pre-Test (soal sebelum konten)
    ↓
[type === 'ppt'?]
  → 'presentation' step: iframe Office Online Viewer
       ↓ klik "Selesai"
  → 'video' step: HTML5 video player
       ↓ progress 100%
    ↓
[hasPostTest?] → Post-Test (soal evaluasi)
    ↓
Result screen → addSubmission() → Supabase
```

### Mid-Video Trigger (khusus Video)

Soal yang memiliki `triggerTime > 0` akan menjeda video secara otomatis:

```javascript
// Di QuizModal.jsx
const isMidTrigger = (q) => Number(q.triggerTime) > 0;
const midVideoTriggers = video.preQuizzes.filter(isMidTrigger);

// Event handler di <video> element
const handleTimeUpdate = () => {
  for (const q of midVideoTriggers) {
    if (!triggered.has(q.id) && currentTime >= q.triggerTime) {
      videoEl.pause();
      setActiveTrigger(q); // Tampilkan modal kuis
    }
  }
};
```

---

## 10. Supabase

### Quiz Submissions

```javascript
// Simpan hasil kuis
const { error } = await supabase
  .from('quiz_submissions')
  .insert([submissionObject]);

// Baca semua hasil
const { data } = await supabase
  .from('quiz_submissions')
  .select('*');
```

### Storage (Video & PPT)

```javascript
// Upload file
const { data, error } = await supabase.storage
  .from('videos')          // Nama bucket (dipakai untuk video DAN pptx)
  .upload(fileName, file, { cacheControl: '3600', upsert: false });

// Ambil public URL
const { data: urlData } = supabase.storage
  .from('videos')
  .getPublicUrl(data.path);
const publicUrl = urlData.publicUrl;
```

> **Catatan:** Bucket `videos` digunakan untuk semua tipe file (mp4 dan pptx). Pertimbangkan membuat bucket terpisah `presentations` sebelum go-live.

---

## 11. PPT Viewer

File PPTX ditampilkan menggunakan **Microsoft Office Online Viewer** — gratis, tidak perlu API key:

```javascript
// URL format
const viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(pptxPublicUrl)}`;

// Dirender sebagai iframe di QuizModal.jsx
<iframe src={viewerUrl} style={{ width: '100%', height: '100%' }} />
```

**Syarat:** URL file PPTX harus **publicly accessible** (Supabase Storage bucket harus public).

---

## 12. Deployment

Kedua repo menggunakan **Cloudflare Pages** dengan auto-deploy:

- Push ke branch `main` → Cloudflare otomatis trigger build
- Build command: `npm run build`
- Output directory: `dist`
- Build time: ~1-3 menit

Tidak ada environment variable yang perlu dikonfigurasi di Cloudflare (Supabase credentials hardcoded untuk sekarang).

### Commit Convention

```
feat: tambah fitur baru
fix: perbaiki bug
style: perubahan UI/styling tanpa logika
chore: dependency, config, non-functional
refactor: restruktur kode tanpa fitur baru
```

Setiap commit harus menggunakan author:
```bash
git commit --author="Hendra Fitriadi <hendra@axara.id>" -m "pesan commit"
```

---

## 13. Hal-hal yang Perlu Diperhatikan

### TODO / Technical Debt

- [ ] **Counter "Dilihat oleh"** — saat ini statis dari localStorage, belum real-time dari Supabase
- [ ] **Auth sistem** — login saat ini disimulasikan via widget, belum Supabase Auth
- [ ] **Supabase credentials** — hardcoded di `supabase.js`, harus dipindah ke `.env` sebelum enterprise go-live
- [ ] **Bucket terpisah** — video dan PPT masih dalam satu bucket `videos`
- [ ] **PPT belum ditest** end-to-end di production (Office Online Viewer butuh URL publik)

### Gotchas

- `isSupervisor = currentUser.role !== 'admin'` — semua bukan admin dianggap supervisor
- LMS Admin dan LMS Learner berbagi localStorage — kalau dikosongkan di satu tab, keduanya terpengaruh
- `triggerTime: 0` artinya soal tampil di pre/post-test biasa, bukan mid-video
- Quiz submission disimpan ke Supabase, tapi data video/employee masih di localStorage

---

## 14. Kontak & Akses

| Resource | Info |
|----------|------|
| GitHub Org | `sihendra13` |
| Cloudflare | Login dengan email `kontesku1374@gmail.com` |
| Supabase Project | Cek di `src/utils/supabase.js` untuk URL |
| Design Reference | Tanya langsung ke Hendra/tim |
