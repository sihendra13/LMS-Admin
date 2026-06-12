import React, { createContext, useState, useContext } from 'react';
import { PLANS } from '../utils/featureGates';

const TenantContext = createContext();

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};

export const TenantProvider = ({ children }) => {
  // Local storage synchronization key
  const DB_KEY = 'axara_lms_db';
  const getStoredDB = () => {
    try {
      const data = localStorage.getItem(DB_KEY);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  };

  const storedDB = getStoredDB() || {};

  const [tenant, setTenant] = useState({
    name: 'PT Maju Bersama',
    plan: PLANS.BUSINESS, // Default plan in mockup
    status: 'Aktif',
    avatar: 'MB',
  });

  const [activePage, setActivePage] = useState('dashboard'); // 'dashboard' | 'sop' | 'sertifikasi' | 'laporan' | 'karyawan' | 'departemen' | 'upload' | 'notifikasi' | 'pengaturan'

  // State for Dynamic Role Access Control
  const [currentUser, setCurrentUser] = useState({
    id: 1,
    name: 'Andi Saputra',
    role: 'admin',
    dept: 'HRD',
    avatar: 'AS'
  });

  const [supervisors, setSupervisors] = useState([
    { id: 1, name: 'Rini Wulandari', email: 'rini.w@majubersama.com', dept: 'Sales', status: 'Aktif' },
    { id: 2, name: 'Budi Pratama', email: 'budi.p@majubersama.com', dept: 'Finance', status: 'Aktif' }
  ]);

  const [invitations, setInvitations] = useState([
    { id: 1, email: 'hendra.f@majubersama.com', dept: 'Operasional', status: 'Pending', date: 'Hari ini' }
  ]);

  const [pendingEssays, setPendingEssays] = useState(() => storedDB.pendingEssays || [
    { 
      id: 101, 
      employeeName: 'Budi Pratama', 
      dept: 'Finance', 
      videoTitle: 'SOP Finance: Proses Reimbursement Karyawan', 
      date: 'Hari ini',
      questions: [
        { id: 1, question: 'Mengapa kuitansi fotokopi tidak dapat diklaim?', answer: 'Kuitansi fotokopi tidak dapat diklaim karena regulasi perpajakan mewajibkan bukti fisik asli untuk diaudit, serta mencegah klaim ganda.', score: 85 },
        { id: 2, question: 'Apa batas maksimum tanggal penyerahan kwitansi reimbursement setiap bulannya?', answer: 'Klaim reimbursement harus diserahkan selambat-lambatnya tanggal 25 setiap bulannya kepada bagian tim finance.', score: 90 },
        { id: 3, question: 'Siapa yang berwenang memberikan persetujuan jika nominal reimburse di atas Rp 5.000.000?', answer: 'Untuk nominal di atas 5 juta rupiah, wajib mendapatkan persetujuan langsung (tanda tangan) dari Direktur Keuangan.', score: null }
      ]
    },
    { 
      id: 102, 
      employeeName: 'Nina Putri', 
      dept: 'CS', 
      videoTitle: 'SOP Customer Service: Handling Komplain', 
      date: '1 hari lalu',
      questions: [
        { id: 1, question: 'Bagaimana langkah awal menangani pelanggan marah?', answer: 'Pertama-tama saya akan mendengarkan keluhan dengan empati tanpa memotong pembicaraannya, lalu memvalidasi emosinya dan menawarkan maaf atas ketidaknyamanan tersebut.', score: null },
        { id: 2, question: 'Apa batas waktu maksimal eskalasi tiket jika komplain tidak selesai di tingkat pertama?', answer: 'Eskalasi tiket harus dilakukan dalam waktu maksimal 2 jam setelah komplain pertama kali diterima dari nasabah.', score: null }
      ]
    }
  ]);

  const [passingScore, setPassingScore] = useState(() => storedDB.passingScore !== undefined ? storedDB.passingScore : 80);
  const [validityMonths, setValidityMonths] = useState(() => storedDB.validityMonths !== undefined ? storedDB.validityMonths : 12);

  // Mock initial data that can be updated dynamically
  const [employees, setEmployees] = useState(() => storedDB.employees || [
    { id: 1, name: 'Rini Wulandari', dept: 'Sales', city: 'Jakarta', score: 18 },
    { id: 2, name: 'Budi Pratama', dept: 'Finance', city: 'Surabaya', score: 15 },
    { id: 3, name: 'Sari Anggraeni', dept: 'HRD', city: 'Bandung', score: 14 },
    { id: 4, name: 'Dika Kurniawan', dept: 'IT', city: 'Jakarta', score: 12 },
    { id: 5, name: 'Nina Putri', dept: 'CS', city: 'Medan', score: 11 },
  ]);

  const [videos, setVideos] = useState(() => storedDB.videos || [
    { 
      id: 1, 
      title: 'SOP Sales: Proses Onboarding Klien Baru', 
      dept: 'Sales', 
      duration: '8:24', 
      progress: 82, 
      views: 156, 
      color: '#1e3a5f', 
      tagClass: 'dt-sales',
      preQuizzes: [
        { id: 1, question: "Apa tahapan awal sebelum klien baru melakukan pembayaran?", options: ["Kirim NDA", "Kirim Invoice", "Kirim Proposal Kerja", "Telepon Perkenalan"], answer: "D" },
        { id: 2, question: "Apakah tim CS perlu dilibatkan saat serah terima berkas?", options: ["Ya, wajib", "Tidak perlu", "Hanya jika klien meminta", "Tergantung ukuran proyek"], answer: "A" }
      ],
      postQuizzes: [
        { id: 1, question: "Berapa lama batas maksimal respon pertama ke leads klien baru?", options: ["5 menit", "30 menit", "1 jam", "24 jam"], answer: "A" },
        { id: 2, question: "Dokumen apa yang wajib dikirimkan di tahap awal onboarding?", options: ["Formulir KYC", "Invoice Pembayaran", "Company Profile & NDA", "Sertifikat Kelulusan"], answer: "C" }
      ]
    },
    { 
      id: 2, 
      title: 'SOP HRD: Rekrutmen & Seleksi Karyawan', 
      dept: 'HRD', 
      duration: '12:10', 
      progress: 65, 
      views: 48, 
      color: '#1a3d2b', 
      tagClass: 'dt-hrd',
      preQuizzes: [
        { id: 1, question: "Siapa yang membuat kriteria lowongan kerja?", options: ["User / Departemen terkait", "HRD saja", "Direktur Utama", "Karyawan magang"], answer: "A" }
      ],
      postQuizzes: [
        { id: 1, question: "Di mana formulir evaluasi wawancara disimpan?", options: ["Google Drive Pribadi", "Sistem HRIS Terpusat", "Grup WhatsApp", "Fisik Kertas saja"], answer: "B" }
      ]
    },
    { 
      id: 3, 
      title: 'SOP Operasional: K3 Gudang & Logistik', 
      dept: 'Operasional', 
      duration: '15:30', 
      progress: 45, 
      views: 72, 
      color: '#3d2200', 
      tagClass: 'dt-ops',
      preQuizzes: [
        { id: 1, question: "Alat pelindung diri apa yang wajib dipakai di gudang?", options: ["Helm & Sepatu Safety", "Masker saja", "Sarung tangan biasa", "Tidak ada yang wajib"], answer: "A" }
      ],
      postQuizzes: [
        { id: 1, question: "Berapa tinggi tumpukan kardus maksimal di area loading dock?", options: ["2 meter", "3.5 meter", "5 meter", "Tidak terbatas"], answer: "A" }
      ]
    },
    { 
      id: 4, 
      title: 'SOP Finance: Proses Reimbursement Karyawan', 
      dept: 'Finance', 
      duration: '6:45', 
      progress: 91, 
      views: 93, 
      color: '#2d1a4a', 
      tagClass: 'dt-fin',
      preQuizzes: [
        { id: 1, question: "Apakah reimbursement bisa diklaim menggunakan kwitansi fotokopi?", options: ["Bisa", "Tidak bisa, wajib asli", "Bisa jika disetujui direktur", "Hanya jika kwitansi hilang"], answer: "B" }
      ],
      postQuizzes: [
        { id: 1, question: "Batas tanggal penyerahan kwitansi reimbursement setiap bulannya adalah...", options: ["Tanggal 5", "Tanggal 15", "Tanggal 25", "Akhir bulan"], answer: "C" }
      ]
    },
    { id: 5, title: 'SOP Customer Service: Handling Komplain', dept: 'CS', duration: '10:15', progress: 58, views: 38, color: '#072a30', tagClass: 'dt-cs', preQuizzes: [], postQuizzes: [] },
    { id: 6, title: 'SOP IT: Keamanan Password & Akun', dept: 'IT', duration: '7:50', progress: 33, views: 112, color: '#2a1024', tagClass: 'dt-it', preQuizzes: [], postQuizzes: [] },
  ]);

  const [quizSubmissions, setQuizSubmissions] = useState(() => storedDB.quizSubmissions || [
    { id: 1, employeeName: 'Rini Wulandari', videoTitle: 'SOP Sales: Proses Onboarding Klien Baru', preScore: 40, postScore: 100, date: 'Hari ini', status: 'Lulus' },
    { id: 2, employeeName: 'Budi Pratama', videoTitle: 'SOP Finance: Proses Reimbursement Karyawan', preScore: 50, postScore: 100, date: 'Hari ini', status: 'Lulus' },
    { id: 3, employeeName: 'Sari Anggraeni', videoTitle: 'SOP HRD: Rekrutmen & Seleksi Karyawan', preScore: 30, postScore: 90, date: '1 hari lalu', status: 'Lulus' },
    { id: 4, employeeName: 'Dika Kurniawan', videoTitle: 'SOP IT: Keamanan Password & Akun', preScore: 60, postScore: 95, date: '2 hari lalu', status: 'Lulus' },
    { id: 5, employeeName: 'Nina Putri', videoTitle: 'SOP Customer Service: Handling Komplain', preScore: 20, postScore: 60, date: '3 hari lalu', status: 'Remedi (Butuh Ujian Ulang)' },
  ]);

  const [activities, setActivities] = useState(() => storedDB.activities || [
    { id: 1, text: '<strong>Rini W.</strong> menyelesaikan SOP Sales Onboarding', time: '5 menit lalu', type: 'green' },
    { id: 2, text: 'Video baru <strong>SOP IT Security</strong> diunggah', time: '32 menit lalu', type: 'blue' },
    { id: 3, text: '<strong>12 karyawan</strong> mendapat sertifikat Finance', time: '1 jam lalu', type: 'purple' },
    { id: 4, text: '<strong>SOP K3 Gudang</strong> deadline besok — 38 belum nonton', time: '2 jam lalu', type: 'amber' },
    { id: 5, text: '<strong>Dika K.</strong> lulus quiz SOP IT dengan skor 95', time: '3 jam lalu', type: 'cyan' },
  ]);

  // Persist state to local storage when state changes
  React.useEffect(() => {
    const db = {
      passingScore,
      validityMonths,
      currentUser: { id: 1, name: 'Rini Wulandari', role: 'employee', dept: 'Sales', city: 'Jakarta', avatar: 'RW', streak: 7 },
      employees,
      videos,
      quizSubmissions,
      pendingEssays,
      activities
    };
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  }, [passingScore, validityMonths, employees, videos, quizSubmissions, pendingEssays, activities]);

  // Actions
  const changePlan = (newPlan) => {
    setTenant(prev => ({ ...prev, plan: newPlan }));
  };

  const addSOP = (newVideo) => {
    setVideos(prev => [newVideo, ...prev]);
    
    // Auto-populate some mock submissions if the video has quizzes
    if ((newVideo.preQuizzes && newVideo.preQuizzes.length > 0) || (newVideo.postQuizzes && newVideo.postQuizzes.length > 0)) {
      const newSubmission = {
        id: Date.now() + 1,
        employeeName: 'Rini Wulandari',
        videoTitle: newVideo.title,
        preScore: 50,
        postScore: 100,
        date: 'Baru saja',
        status: 'Lulus'
      };
      setQuizSubmissions(prev => [newSubmission, ...prev]);
    }

    // Add activity
    const newAct = {
      id: Date.now(),
      text: `Video baru <strong>${newVideo.title}</strong> diunggah dengan ${newVideo.preQuizzes?.length || 0} soal Pre-Test & ${newVideo.postQuizzes?.length || 0} soal Post-Test`,
      time: 'Baru saja',
      type: 'blue'
    };
    setActivities(prev => [newAct, ...prev]);
  };

  const addEmployee = (newEmp) => {
    setEmployees(prev => [newEmp, ...prev]);
    // Add activity
    const newAct = {
      id: Date.now(),
      text: `Karyawan baru <strong>${newEmp.name}</strong> ditambahkan ke departemen ${newEmp.dept}`,
      time: 'Baru saja',
      type: 'green'
    };
    setActivities(prev => [newAct, ...prev]);
  };

  const inviteSupervisor = (email, deptName) => {
    const newInvite = {
      id: Date.now(),
      email,
      dept: deptName,
      status: 'Pending',
      date: 'Baru saja'
    };
    setInvitations(prev => [newInvite, ...prev]);

    // Add activity
    const newAct = {
      id: Date.now(),
      text: `Undangan supervisor untuk divisi <strong>${deptName}</strong> dikirim ke <strong>${email}</strong>`,
      time: 'Baru saja',
      type: 'purple'
    };
    setActivities(prev => [newAct, ...prev]);
  };

  const revokeSupervisor = (id, type = 'supervisor') => {
    if (type === 'supervisor') {
      setSupervisors(prev => prev.filter(s => s.id !== id));
    } else {
      setInvitations(prev => prev.filter(s => s.id !== id));
    }
  };

  const gradeEssay = (id, score) => {
    const essay = pendingEssays.find(e => e.id === id);
    if (!essay) return;

    const isPassed = score >= passingScore;
    const newSubmission = {
      id: Date.now(),
      employeeName: essay.employeeName,
      videoTitle: essay.videoTitle,
      preScore: 30,
      postScore: score,
      date: 'Baru saja',
      status: isPassed ? 'Lulus' : 'Remedi (Butuh Ujian Ulang)'
    };

    setQuizSubmissions(prev => [newSubmission, ...prev]);
    setPendingEssays(prev => prev.filter(e => e.id !== id));

    // Add activity
    const newAct = {
      id: Date.now(),
      text: `Kuis esai <strong>${essay.employeeName}</strong> dinilai oleh ${currentUser.name} dengan skor <strong>${score}%</strong> (${isPassed ? 'Lulus' : 'Remedi'})`,
      time: 'Baru saja',
      type: isPassed ? 'green' : 'amber'
    };
    setActivities(prev => [newAct, ...prev]);
  };

  const exportDBString = () => {
    const db = {
      passingScore,
      validityMonths,
      currentUser: { id: 1, name: 'Rini Wulandari', role: 'employee', dept: 'Sales', city: 'Jakarta', avatar: 'RW', streak: 7 },
      employees,
      videos,
      quizSubmissions,
      pendingEssays,
      activities
    };
    return JSON.stringify(db, null, 2);
  };

  const importDBString = (jsonStr) => {
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed && typeof parsed === 'object') {
        if (parsed.passingScore !== undefined) setPassingScore(parsed.passingScore);
        if (parsed.validityMonths !== undefined) setValidityMonths(parsed.validityMonths);
        if (parsed.employees) setEmployees(parsed.employees);
        if (parsed.videos) setVideos(parsed.videos);
        if (parsed.quizSubmissions) setQuizSubmissions(parsed.quizSubmissions);
        if (parsed.pendingEssays) setPendingEssays(parsed.pendingEssays);
        if (parsed.activities) setActivities(parsed.activities);
        localStorage.setItem(DB_KEY, JSON.stringify(parsed));
        return { success: true };
      }
      return { success: false, error: 'Format JSON database tidak valid.' };
    } catch (e) {
      return { success: false, error: 'Gagal parse JSON: ' + e.message };
    }
  };

  return (
    <TenantContext.Provider value={{
      tenant,
      changePlan,
      activePage,
      setActivePage,
      employees,
      addEmployee,
      videos,
      addSOP,
      activities,
      quizSubmissions,
      currentUser,
      setCurrentUser,
      supervisors,
      invitations,
      inviteSupervisor,
      revokeSupervisor,
      pendingEssays,
      gradeEssay,
      passingScore,
      setPassingScore,
      validityMonths,
      setValidityMonths,
      exportDBString,
      importDBString
    }}>
      {children}
    </TenantContext.Provider>
  );
};
