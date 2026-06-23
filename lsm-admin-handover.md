# Serah Terima Implementasi Fitur AXA Assistant - LSM Admin

Dokumen ini ditujukan untuk agen pengembang berikutnya agar dapat melanjutkan implementasi fitur pada **AXA Assistant** di halaman Dashboard (`src/pages/Dashboard.jsx`) tanpa merusak struktur layout grid yang sensitif.

---

## 1. Status Terakhir & Target Fitur
Seluruh perubahan sebelumnya telah di-revert secara bersih ke commit stabil terakhir (**`de91ef1`**). Lingkungan kerja saat ini dalam keadaan bersih (*clean working tree*).

Berikut adalah 4 fitur utama yang harus diimplementasikan pada **AXA Assistant**:
1. **Input Textarea Dinamis**: Mengubah input teks biasa menjadi `<textarea>` yang tingginya otomatis menyesuaikan isi pesan (seperti WhatsApp) dengan menyembunyikan scrollbar bawaan (`overflowY: 'hidden'`).
2. **Menu Dropdown "..." (Titik Tiga)**: Menghidupkan tombol menu di sebelah kanan header AXA Assistant untuk memunculkan dropdown berisi:
   - **Bersihkan Chat** (mereset state pesan ke sapaan awal).
   - **Layar Penuh / Fullscreen** (mengaktifkan modal fullscreen).
   - *Dropdown ini harus otomatis menutup jika pengguna mengklik di luar area menu (Click-outside listener).*
3. **Modal Fullscreen (Layar Penuh)**: Menampilkan modal khusus berukuran layar penuh agar mengetik/membaca pesan lebih leluasa. Ini juga mencegah rusaknya susunan *sticky layout* pada kolom kanan (`.side-col`).
4. **Greeting Awal Interaktif (Opsi C)**: Memperbarui sapaan pertama AXA Assistant agar dinamis berdasarkan waktu (pagi/siang/sore/malam), menampilkan statistik progres training yang dihitung langsung dari data real-time, serta memberikan tombol saran pertanyaan interaktif yang dapat diklik langsung oleh pengguna.

---

## 2. Struktur Layout Grid yang Sangat Sensitif (PENTING!)
Tata letak halaman Dashboard menggunakan CSS Grid yang sangat rentan bergeser (*break layout*) jika ada kesalahan penutupan tag `div`. 

> [!IMPORTANT]
> - Kolom kanan (`.side-col`) harus menjadi **anak langsung (sibling)** dari grid utama `.main-grid`.
> - Tag penutup `div` untuk kolom kiri (`.main-col` / pembungkus konten utama) harus ditutup tepat **sebelum** tag pembuka `<div className="side-col">`.
> - **Jangan memindahkan posisi komponen AXA Assistant** keluar dari kolom kanan atau membungkusnya dengan elemen tambahan yang merusak sifat `position: sticky; top: 80px` pada `.side-col`.

---

## 3. Detail Implementasi Langkah-Demi-Langkah

### Langkah 1: Greeting Awal Dinamis (`buildInitialMessage`)
Ubah fungsi `buildInitialMessage` di [Dashboard.jsx](file:///Users/kayuwangi/Desktop/Axara/LMS-Admin/src/pages/Dashboard.jsx) agar menghitung data statistik secara dinamis:
```javascript
const buildInitialMessage = () => {
  const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const firstName = currentUser?.name?.split(' ')[0] || 'HR';
  
  // Waktu sapaan dinamis
  const hour = new Date().getHours();
  const waktu = hour < 11 ? 'pagi' : hour < 15 ? 'siang' : hour < 18 ? 'sore' : 'malam';

  // Hitung progres training real-time
  const totalLulus = quizSubmissions.filter(s => (s.postScore ?? 0) >= passingScore).length;
  const totalWajib = employees.length * videos.length;
  const avgProgress = totalWajib > 0 ? Math.round((totalLulus / totalWajib) * 100) : 0;

  // Temukan divisi dengan progres tertinggi & terendah
  const depts = [...new Set(employees.map(e => e.dept))];
  let lowestDept = null, lowestPct = 101;
  let highestDept = null, highestPct = -1;

  depts.forEach(dept => {
    const deptEmps = employees.filter(e => e.dept === dept);
    if (deptEmps.length === 0) return;
    const lulus = quizSubmissions.filter(s => 
      deptEmps.some(e => e.name === s.employeeName) && (s.postScore ?? 0) >= passingScore
    ).length;
    const pct = Math.round((lulus / deptEmps.length) * 100);
    
    if (pct < lowestPct) { lowestPct = pct; lowestDept = dept; }
    if (pct > highestPct) { highestPct = pct; highestDept = dept; }
  });

  // Susun template pesan Opsi C
  let text = `Halo ${firstName}! Selamat ${waktu}.\n\n`;
  text += `Progres **Training** secara keseluruhan berada di angka **${avgProgress}%**. Sebagian besar divisi menunjukkan performa baik`;
  
  if (highestDept && highestPct >= 0) {
    text += `, dipimpin oleh **${highestDept} (${highestPct}%)**`;
  }
  
  if (lowestDept && lowestPct < 101) {
    if (lowestPct === 0) {
      text += `, sedangkan divisi **${lowestDept}** masih berada di angka **0%**.\n\n`;
    } else {
      text += `, sedangkan divisi **${lowestDept}** berada di angka terendah yaitu **${lowestPct}%**.\n\n`;
    }
  } else {
    text += `.\n\n`;
  }

  text += `Anda bisa menanyakan hal seperti:\n\n`;
  text += `* *'Mengapa progres ${lowestDept || 'Sales'} masih ${lowestPct === 101 ? 0 : lowestPct}%?'*\n`;
  text += `* *'Buatkan soal kuis baru untuk SOP Customer Service'*\n`;
  text += `* *'Tampilkan daftar karyawan yang belum lulus kuis'*\n\n`;
  text += `Apa yang bisa saya bantu analisis hari ini?`;

  return [{ id: 1, sender: 'ai', name: 'AXA', text, time: now }];
};
```

### Langkah 2: State Baru & Click-Outside Ref
Tambahkan state untuk kontrol fullscreen (`isExpanded`), menu dropdown (`showMenu`), dan `useRef` untuk menu ref (tambahkan impor `useRef` di atas jika belum ada):
```javascript
const [isExpanded, setIsExpanded] = useState(false);
const [showMenu, setShowMenu] = useState(false);
const menuRef = useRef(null);

// Click-outside listener untuk dropdown
useEffect(() => {
  const handleClickOutside = (event) => {
    if (menuRef.current && !menuRef.current.contains(event.target)) {
      setShowMenu(false);
    }
  };
  document.addEventListener('mousedown', handleClickOutside);
  return () => document.removeEventListener('mousedown', handleClickOutside);
}, []);
```

### Langkah 3: Handle Auto-Resize Textarea
Gunakan fungsi helper berikut untuk mengubah tinggi textarea secara dinamis sesuai teks input:
```javascript
const handleTextareaChange = (e) => {
  setChatInput(e.target.value);
  e.target.style.height = 'auto';
  e.target.style.height = `${e.target.scrollHeight}px`;
};
```
*Pastikan menambahkan style `resize: 'none'` and `overflowY: 'hidden'` pada elemen `<textarea>`. Balikkan tinggi textarea ke default (`'auto'`) setelah tombol kirim diklik.*

### Langkah 4: Markup & Posisi JSX
Implementasikan modal fullscreen tepat di bagian bawah return JSX (di luar `.main-grid`) agar tidak merusak tatanan CSS Grid.
- **Header AXA Assistant**: Tambahkan tombol titik tiga (`...`) yang memicu `setShowMenu(!showMenu)`.
- **Dropdown Menu**: Render menu dropdown secara absolut di dekat tombol titik tiga menggunakan pembungkus `ref={menuRef}`.

---

## 4. Verifikasi setelah Koding
Setelah menerapkan kode di atas:
1. Jalankan `npm run build` untuk memastikan tidak ada error kompilasi/sintaksis JSX.
2. Uji fungsionalitas:
   - Ketik pesan yang panjang di input chat AXA Assistant, pastikan tingginya bertambah otomatis dan tidak memunculkan scrollbar abu-auto bawaan browser.
   - Klik tombol "Layar Penuh" di menu dropdown, pastikan modal muncul menutupi layar dan chat tetap berfungsi.
   - Klik di luar area dropdown menu untuk memastikan menu menutup sendiri.
