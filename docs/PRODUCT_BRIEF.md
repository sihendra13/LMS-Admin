# Axara LMS — Product Brief

Dokumen ini menjelaskan apa itu Axara LMS, untuk siapa, dan bagaimana cara kerjanya dari sudut pandang produk. Cocok dibaca oleh engineer baru, calon klien, atau co-founder yang baru bergabung.

---

## Apa itu Axara LMS?

**Axara LMS** adalah platform Learning Management System (LMS) berbasis SaaS yang dirancang khusus untuk perusahaan Indonesia skala menengah ke atas.

Fokus utama: membantu tim HRD mendistribusikan **pelatihan dan SOP (Standard Operating Procedure)** kepada seluruh karyawan secara digital — tanpa perlu WhatsApp, email, atau pertemuan fisik.

---

## Masalah yang Diselesaikan

| Masalah HRD | Solusi Axara LMS |
|-------------|-----------------|
| SOP hanya ada di Word/PDF, karyawan tidak baca | Konversi ke video/PPT interaktif dengan kuis wajib |
| Tidak tahu apakah karyawan sudah paham SOP | Sistem kuis otomatis dengan skor dan status lulus/remedi |
| Training manual butuh waktu & biaya besar | Distribusi digital ke semua karyawan sekaligus |
| Tidak ada bukti pelatihan untuk audit | Sertifikat digital per karyawan per materi |
| HRD biasa pakai PPT, susah diubah ke video | Upload PPT langsung, tampil sebagai slideshow interaktif |

---

## Siapa Penggunanya?

### 1. HRD Admin (LMS Admin)
- Upload video training atau file PPT
- Buat soal kuis pre-test dan post-test
- Pantau hasil kuis seluruh karyawan
- Kelola data karyawan per departemen
- Review dan terbitkan sertifikat

### 2. Karyawan (LMS Learner)
- Akses daftar materi training yang ditugaskan
- Tonton video atau baca PPT
- Kerjakan kuis sebelum dan sesudah materi
- Lihat sertifikat yang sudah diraih

### 3. Supervisor / Team Lead
- Pantau progress dan hasil kuis tim mereka
- Tidak bisa melihat data departemen lain

---

## Paket Langganan

### Starter — Untuk perusahaan yang baru mulai
- Materi training disediakan dan diproduksi oleh tim **Axara** (bukan upload mandiri)
- Maksimal 200 karyawan
- Kuis otomatis
- Laporan basic
- Cocok untuk: UMKM yang butuh sistem training sederhana

### Business — Untuk perusahaan yang butuh kontrol penuh
- **Upload video sendiri** tanpa batas
- **Upload PPT** (maksimal 30 file/bulan)
- Konfigurasi kuis sendiri (soal, jawaban, waktu trigger)
- Maksimal 500 karyawan
- Laporan compliance lengkap
- Cocok untuk: perusahaan 50-500 karyawan dengan HRD aktif

### Enterprise — Untuk grup perusahaan besar
- Semua fitur Business
- **Unlimited** karyawan dan PPT
- **HRIS Integration** (Mekari Talenta, SAP) — sinkronisasi data karyawan otomatis
- AI Video Generation (roadmap: HeyGen integration)
- Multi-cabang / multi-entitas
- Dedicated support
- Cocok untuk: grup perusahaan, retail chain, manufaktur besar

---

## Keunggulan vs LMS Lain

| Fitur | Axara LMS | Ruang Guru for Work | Moodle | TalentLMS |
|-------|-----------|---------------------|--------|-----------|
| Upload PPT → Slideshow + Kuis | ✅ | ❌ | ❌ | ❌ |
| Kuis muncul di tengah video (timestamp trigger) | ✅ | ❌ | ❌ | Terbatas |
| Antarmuka Bahasa Indonesia | ✅ | ✅ | ❌ | ❌ |
| Harga untuk UKM Indonesia | Terjangkau | Mahal | Gratis (self-host) | Mahal |
| Setup tanpa IT | ✅ | ✅ | ❌ | ✅ |

**Diferensiasi utama:** HRD Indonesia terbiasa dengan PPT. Axara LMS adalah satu-satunya LMS yang memungkinkan HRD **langsung upload PPT** dan karyawan bisa **mengerjakan kuis sebelum dan sesudah** membaca presentasi tersebut — tanpa perlu konversi ke video, tanpa biaya tambahan.

---

## Alur Kerja Utama

### Admin (HRD) membuat materi:
```
Login → Upload Training & SOP
  → Pilih tipe: Video atau PPT
  → Upload file
  → Isi judul, departemen target
  → Buat soal Pre-Test (sebelum materi)
  → Buat soal Post-Test (setelah materi)
  → Terbitkan
```

### Karyawan belajar:
```
Login → Daftar Materi → Pilih SOP
  → Kerjakan Pre-Test
  → Tonton Video / Baca PPT
  → Kerjakan Post-Test
  → Lihat Skor & Status (Lulus / Remedi)
  → Sertifikat diterbitkan HRD
```

---

## Model Bisnis

- **SaaS bulanan** per perusahaan (bukan per user)
- Pricing berbasis jumlah karyawan dan fitur
- Estimasi harga:
  - Starter: Rp 2-4 juta/bulan
  - Business: Rp 5-10 juta/bulan
  - Enterprise: Rp 15 juta+/bulan (custom)
- Margin sangat tinggi (78-93%) karena infrastruktur efisien

---

## Roadmap (Prioritas)

| Prioritas | Fitur | Status |
|-----------|-------|--------|
| 🔴 High | Sistem Auth nyata (Supabase Auth) | Planned |
| 🔴 High | PPT Viewer end-to-end test | In Progress |
| 🟡 Medium | Counter views real-time dari Supabase | Planned |
| 🟡 Medium | Notifikasi karyawan (email/WhatsApp) | Planned |
| 🟡 Medium | Laporan export PDF per karyawan | Planned |
| 🟢 Low | HRIS Integration (Mekari Talenta) | Enterprise roadmap |
| 🟢 Low | AI Video narasi dari PPT (HeyGen) | Enterprise roadmap |
| 🟢 Low | Mobile app (React Native) | Long-term |

---

## Arsitektur Singkat (untuk Non-Engineer)

```
[HRD Admin]                    [Karyawan]
     │                              │
     ↓                              ↓
LMS Admin (Web App)        LMS Learner (Web App)
     │                              │
     └──────────┬───────────────────┘
                │
         LocalStorage
         (data tenant)
                │
          Supabase
    (hasil kuis + file storage)
```

- **Tidak ada server backend** — semua berjalan di browser, lebih hemat biaya
- **Cloudflare Pages** untuk hosting — gratis, cepat, global CDN
- **Supabase** untuk database hasil kuis dan penyimpanan file video/PPT

---

## Nama Produk & Branding

- **Nama produk:** Axara LMS
- **Nama perusahaan:** PT Axara (atau sesuai entitas legal yang akan dibentuk)
- **Tagline (sementara):** "Sistematisasi pengetahuan perusahaan Anda"
- **Target pasar:** Perusahaan Indonesia 50-1000 karyawan, industri retail, manufaktur, jasa, FMCG

---

*Dokumen ini diperbarui per Juni 2026. Untuk pertanyaan teknis, lihat `ENGINEERING.md`.*
