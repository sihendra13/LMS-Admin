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
  const [tenant, setTenant] = useState({
    name: 'PT Maju Bersama',
    plan: PLANS.BUSINESS, // Default plan in mockup
    status: 'Aktif',
    avatar: 'MB',
  });

  const [activePage, setActivePage] = useState('dashboard'); // 'dashboard' | 'sop' | 'sertifikasi' | 'laporan' | 'karyawan' | 'departemen' | 'upload' | 'notifikasi' | 'pengaturan'

  // Mock initial data that can be updated dynamically
  const [employees, setEmployees] = useState([
    { id: 1, name: 'Rini Wulandari', dept: 'Sales', city: 'Jakarta', score: 18 },
    { id: 2, name: 'Budi Pratama', dept: 'Finance', city: 'Surabaya', score: 15 },
    { id: 3, name: 'Sari Anggraeni', dept: 'HRD', city: 'Bandung', score: 14 },
    { id: 4, name: 'Dika Kurniawan', dept: 'IT', city: 'Jakarta', score: 12 },
    { id: 5, name: 'Nina Putri', dept: 'CS', city: 'Medan', score: 11 },
  ]);

  const [videos, setVideos] = useState([
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

  const [quizSubmissions, setQuizSubmissions] = useState([
    { id: 1, employeeName: 'Rini Wulandari', videoTitle: 'SOP Sales: Proses Onboarding Klien Baru', preScore: 40, postScore: 100, date: 'Hari ini', status: 'Lulus' },
    { id: 2, employeeName: 'Budi Pratama', videoTitle: 'SOP Finance: Proses Reimbursement Karyawan', preScore: 50, postScore: 100, date: 'Hari ini', status: 'Lulus' },
    { id: 3, employeeName: 'Sari Anggraeni', videoTitle: 'SOP HRD: Rekrutmen & Seleksi Karyawan', preScore: 30, postScore: 90, date: '1 hari lalu', status: 'Lulus' },
    { id: 4, employeeName: 'Dika Kurniawan', videoTitle: 'SOP IT: Keamanan Password & Akun', preScore: 60, postScore: 95, date: '2 hari lalu', status: 'Lulus' },
    { id: 5, employeeName: 'Nina Putri', videoTitle: 'SOP Customer Service: Handling Komplain', preScore: 20, postScore: 60, date: '3 hari lalu', status: 'Remedi (Butuh Ujian Ulang)' },
  ]);

  const [activities, setActivities] = useState([
    { id: 1, text: '<strong>Rini W.</strong> menyelesaikan SOP Sales Onboarding', time: '5 menit lalu', type: 'green' },
    { id: 2, text: 'Video baru <strong>SOP IT Security</strong> diunggah', time: '32 menit lalu', type: 'blue' },
    { id: 3, text: '<strong>12 karyawan</strong> mendapat sertifikat Finance', time: '1 jam lalu', type: 'purple' },
    { id: 4, text: '<strong>SOP K3 Gudang</strong> deadline besok — 38 belum nonton', time: '2 jam lalu', type: 'amber' },
    { id: 5, text: '<strong>Dika K.</strong> lulus quiz SOP IT dengan skor 95', time: '3 jam lalu', type: 'cyan' },
  ]);

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
    }}>
      {children}
    </TenantContext.Provider>
  );
};
