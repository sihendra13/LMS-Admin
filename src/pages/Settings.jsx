import React, { useState } from 'react';
import { useTenant } from '../context/TenantContext';
import { PLANS } from '../utils/featureGates';
import { supabase } from '../utils/supabase';

export const Settings = () => {
  const { tenant, currentUser, changePlan, updateTenantLogo } = useTenant();
  
  const isHRDAdmin = currentUser.role === 'admin';

  // Branding/Integration states
  const [syncStatus, setSyncStatus] = useState('Terakhir disinkronisasi: Hari ini, 09:30');
  const [isSyncing, setIsSyncing] = useState(false);
  const [logoStatus, setLogoStatus] = useState('idle'); // 'idle' | 'processing' | 'saved' | 'error'

  // Demo reset state
  const [resetStatus, setResetStatus] = useState('idle'); // 'idle' | 'confirm' | 'loading' | 'done' | 'error'

  const handleResetDemo = async () => {
    setResetStatus('loading');
    try {
      await supabase.from('quiz_submissions').delete().neq('id', 0);
      await supabase.from('sop_videos').update({ progress: 0 }).neq('id', 0);
      setResetStatus('done');
      setTimeout(() => setResetStatus('idle'), 3000);
    } catch {
      setResetStatus('error');
      setTimeout(() => setResetStatus('idle'), 3000);
    }
  };

  const handleSyncHRIS = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      setSyncStatus(`Terakhir disinkronisasi: Baru saja (Sukses)`);
    }, 1500);
  };

  return (
    <div className="content">
      {/* HEADER */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text1)', marginBottom: '6px' }}>Pengaturan</h2>
        <p style={{ color: 'var(--text3)', fontSize: '13px' }}>
          {isHRDAdmin 
            ? 'Kelola profil perusahaan, branding LMS, integrasi HRIS, dan akun supervisor.'
            : 'Kelola informasi profil personal Anda.'
          }
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isHRDAdmin ? '1fr 300px' : '1fr', gap: '24px', alignItems: 'start' }}>
        
        {/* MAIN SETTINGS FORM */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* PROFILE CARD (VISIBLE FOR BOTH) */}
          <div className="card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text1)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              👤 Informasi Profil Pengguna
            </h3>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
              <div style={{ 
                width: '64px', 
                height: '64px', 
                borderRadius: '50%', 
                background: 'var(--accent)', 
                color: '#ffffff', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                fontWeight: '700',
                fontSize: '24px'
              }}>
                {currentUser.avatar}
              </div>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '700', color: 'var(--text1)' }}>{currentUser.name}</h4>
                <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: 'var(--text2)' }}>
                  Peran: <strong style={{ color: 'var(--accent)' }}>{currentUser.role === 'admin' ? 'HRD Admin' : 'Supervisor / Lead'}</strong>
                </p>
                <div style={{ display: 'inline-block', fontSize: '11px', background: '#e2e8f0', color: 'var(--text1)', padding: '2px 8px', borderRadius: '4px', fontWeight: '600' }}>
                  Departemen: {currentUser.dept}
                </div>
              </div>
            </div>
            
            {/* PROFILE DATA (READ-ONLY / SYNCED FROM HRIS TO PREVENT OUT-OF-SYNC ISSUES) */}
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid var(--border)', marginTop: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--text3)', fontWeight: '700', display: 'block', textTransform: 'uppercase' }}>Nama Lengkap</span>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text1)', display: 'block', marginTop: '6px' }}>
                    {currentUser.name}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--text3)', fontWeight: '700', display: 'block', textTransform: 'uppercase' }}>Alamat Email</span>
                  <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text2)', display: 'block', marginTop: '6px' }}>
                    {currentUser.role === 'admin' ? 'andi.s@majubersama.com' : `${currentUser.name.toLowerCase().replace(' ', '.')}@majubersama.com`}
                  </span>
                </div>
              </div>
              
              <div style={{ borderTop: '1px solid var(--border)', marginTop: '14px', paddingTop: '10px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--green)', fontWeight: '600' }}>
                <span>🔄 Akun terhubung dengan Mekari Talenta (HRIS)</span>
              </div>
            </div>
          </div>

          {/* ADMIN-ONLY BRANDING & BILLING SETTINGS */}
          {isHRDAdmin ? (
            <>
              {/* COMPANY DETAILS (LOCKED COMPANY NAME - FLAT TEXT INSTEAD OF BOX) */}
              <div className="card" style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text1)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text2)' }}>
                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                  </svg>
                  Detail Perusahaan & Informasi Billing
                </h3>
                
                {/* LOCKED ENTITY WARNING */}
                <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '8px', padding: '12px 16px', marginBottom: '18px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#b45309" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px' }}>
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <div style={{ fontSize: '12px', color: '#b45309', lineHeight: '1.5' }}>
                    <strong>Entitas Hukum Terkunci:</strong> Untuk menjaga legalitas kontrak berlangganan dan kesesuaian faktur pajak, nama entitas utama perusahaan tidak dapat diubah secara langsung dari dasbor ini. Silakan hubungi Account Manager Anda jika terdapat perubahan nama hukum.
                  </div>
                </div>

                {/* LOGO UPLOAD AREA */}
                <div style={{ marginBottom: '24px', background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px dashed var(--border)' }}>
                  <label style={{ display: 'block', fontSize: '10px', fontWeight: '800', color: 'var(--text2)', marginBottom: '14px', letterSpacing: '0.05em' }}>
                    LOGO PERUSAHAAN (WHITE-LABEL BRANDING)
                  </label>

                  {/* PREVIEW BOX */}
                  <div style={{
                    width: '100%',
                    height: '90px',
                    background: '#ffffff',
                    borderRadius: '10px',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '14px',
                    overflow: 'hidden',
                  }}>
                    {tenant.logo ? (
                      <img src={tenant.logo} alt="Logo Perusahaan" style={{ maxWidth: '240px', maxHeight: '64px', objectFit: 'contain' }} />
                    ) : (
                      <div style={{ textAlign: 'center', color: '#94a3b8' }}>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', margin: '0 auto 6px' }}>
                          <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                        </svg>
                        <span style={{ fontSize: '11px' }}>Belum ada logo</span>
                      </div>
                    )}
                  </div>

                  {/* BUTTONS */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="btn-sec"
                      style={{
                        padding: '7px 14px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '600',
                        border: '1px solid var(--border)',
                        background: '#ffffff',
                        color: 'var(--text2)',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                      }}
                      onClick={() => document.getElementById('company-logo-input').click()}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                      {tenant.logo ? 'Ganti Logo' : 'Pilih File Gambar'}
                    </button>

                    {tenant.logo && logoStatus === 'idle' && (
                      <button
                        type="button"
                        style={{
                          padding: '7px 14px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '600',
                          border: '1px solid #fee2e2',
                          background: '#fff5f5',
                          color: '#ef4444',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                        onClick={() => { updateTenantLogo(null); }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                        Hapus Logo
                      </button>
                    )}
                  </div>

                    <input
                      id="company-logo-input"
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (!file) return;
                        setLogoStatus('processing');
                        const reader = new FileReader();
                        reader.onloadend = () => {
                           if (reader.error || !reader.result) {
                             setLogoStatus('error');
                             return;
                           }
                           updateTenantLogo(reader.result);
                           setLogoStatus('saved');
                           setTimeout(() => setLogoStatus('idle'), 3000);
                        };
                        reader.readAsDataURL(file);
                      }}
                      style={{ display: 'none' }}
                    />
                    
                    <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '6px' }}>
                      Format: JPG, PNG · Otomatis dikompres · Rasio landscape direkomendasikan
                    </div>
                    
                    {logoStatus === 'processing' && (
                      <div style={{ fontSize: '12px', color: '#0369a1', marginTop: '8px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className="animate-spin" style={{ display: 'inline-block', width: '12px', height: '12px', border: '2px solid #0369a1', borderTopColor: 'transparent', borderRadius: '50%' }} />
                        Memproses logo...
                      </div>
                    )}
                    {logoStatus === 'saved' && (
                      <div style={{ fontSize: '12px', color: '#16a34a', marginTop: '8px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        Logo berhasil disimpan! Sidebar sudah diperbarui.
                      </div>
                    )}
                    {logoStatus === 'error' && (
                      <div style={{ fontSize: '12px', color: '#dc2626', marginTop: '8px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                        Gagal memproses gambar. Coba format JPG atau PNG lain.
                      </div>
                    )}
                </div>

                {/* FLAT TEXT VALUE CARDS TO PREVENT BOXY DEFAULT INPUT LOOKS */}
                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                  <div style={{ marginBottom: '18px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text3)', fontWeight: '700', display: 'block', textTransform: 'uppercase' }}>Nama Perusahaan (Entitas Billing)</span>
                    <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text1)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                      PT Maju Bersama Tbk <span style={{ fontSize: '14px' }} title="Terkunci secara hukum">🔒</span>
                    </span>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', borderTop: '1px solid var(--border)', paddingTop: '14px' }}>
                    <div>
                      <span style={{ fontSize: '11px', color: 'var(--text3)', fontWeight: '700', display: 'block', textTransform: 'uppercase' }}>Nomor Pokok Wajib Pajak (NPWP)</span>
                      <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text2)', display: 'block', marginTop: '6px' }}>
                        01.234.567.8-901.000
                      </span>
                    </div>
                    <div>
                      <span style={{ fontSize: '11px', color: 'var(--text3)', fontWeight: '700', display: 'block', textTransform: 'uppercase' }}>Alamat Kantor Pusat</span>
                      <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text2)', display: 'block', marginTop: '6px' }}>
                        Gedung Cyber 2, Lt. 18, Jakarta Selatan
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* HRIS SYNC INTEGRATION - ENTERPRISE LOCKED */}
              <div className="card" style={{ padding: '24px', position: 'relative', overflow: 'hidden', border: '1px solid var(--border)' }}>
                {/* ENTERPRISE BADGE */}
                <div style={{ position: 'absolute', top: '16px', right: '16px', background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', color: '#fff', fontSize: '10px', fontWeight: '800', padding: '4px 12px', borderRadius: '20px', letterSpacing: '0.05em', boxShadow: '0 2px 4px rgba(124, 58, 237, 0.15)' }}>
                  ENTERPRISE
                </div>

                <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text1)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
                  </svg>
                  Sinkronisasi Karyawan (HRIS Integration)
                </h3>
                <p style={{ color: 'var(--text3)', fontSize: '13px', margin: '0 0 24px 0' }}>
                  Hubungkan LMS dengan sistem HRIS perusahaan untuk sinkronisasi data karyawan secara otomatis.
                </p>

                {/* BLURRED PREVIEW */}
                <div style={{ position: 'relative' }}>
                  <div style={{ filter: 'blur(4px)', pointerEvents: 'none', userSelect: 'none', opacity: 0.35 }}>
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
                      <div style={{ border: '1px solid var(--border)', borderRadius: '10px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px', background: '#ffffff', flex: 1, minWidth: '180px' }}>
                        <div style={{ width: '36px', height: '36px', background: '#eff6ff', borderRadius: '8px', display: 'flex', alignItems: 'center', justify: 'center', color: 'var(--accent)' }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                          </svg>
                        </div>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text1)' }}>Mekari Talenta</div>
                          <div style={{ fontSize: '11px', color: 'var(--text3)' }}>Belum Terhubung</div>
                        </div>
                      </div>
                      <div style={{ border: '1px solid var(--border)', borderRadius: '10px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px', background: '#ffffff', flex: 1, minWidth: '180px' }}>
                        <div style={{ width: '36px', height: '36px', background: '#f5f3ff', borderRadius: '8px', display: 'flex', alignItems: 'center', justify: 'center', color: '#7c3aed' }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                            <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                            <line x1="12" y1="22.08" x2="12" y2="12"/>
                          </svg>
                        </div>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text1)' }}>SAP SuccessFactors</div>
                          <div style={{ fontSize: '11px', color: 'var(--text3)' }}>Belum Terhubung</div>
                        </div>
                      </div>
                    </div>
                    <div style={{ background: '#f8fafc', padding: '14px 18px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--border)' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text2)' }}>Belum pernah disinkronisasi</span>
                      <div style={{ background: 'var(--accent)', color: '#fff', fontSize: '12px', padding: '6px 14px', borderRadius: '6px', fontWeight: '600' }}>Sinkronkan Sekarang</div>
                    </div>
                  </div>

                  {/* LOCK OVERLAY */}
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                    <div style={{ width: '48px', height: '48px', background: '#ffffff', borderRadius: '50%', display: 'flex', alignItems: 'center', justify: 'center', border: '1px solid var(--border)', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                      </svg>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text1)', marginBottom: '4px' }}>Fitur Eksklusif Enterprise</div>
                      <div style={{ fontSize: '12px', color: 'var(--text3)', maxWidth: '300px', lineHeight: '1.6' }}>
                        Sinkronisasi otomatis karyawan baru, penugasan divisi, dan status aktif dari Mekari Talenta atau SAP SuccessFactors.
                      </div>
                    </div>
                    <button
                      type="button"
                      style={{ marginTop: '6px', padding: '9px 22px', background: 'var(--navy)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 10px rgba(11, 22, 40, 0.15)', transition: 'all 0.2s ease' }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.background = 'var(--accent)';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.background = 'var(--navy)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                      onClick={() => alert('Hubungi tim Axara untuk upgrade ke Enterprise dan aktifkan HRIS Integration.')}
                    >
                      Hubungi Axara untuk Upgrade
                    </button>
                  </div>
                </div>
              </div>
              {/* RESET DATA DEMO */}
              <div className="card" style={{ padding: '24px', border: '1px solid #fee2e2', background: '#fffafa' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#b91c1c', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#b91c1c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="1 4 1 10 7 10"/>
                    <path d="M3.51 15a9 9 0 1 0 .49-4.5"/>
                  </svg>
                  Reset Data Demo
                </h3>
                <p style={{ color: 'var(--text3)', fontSize: '13px', margin: '0 0 16px 0', lineHeight: '1.6' }}>
                  Reset semua <strong>progress learner</strong> ke 0% dan hapus semua <strong>hasil kuis & sertifikat</strong>. File PPT, video, dan pertanyaan kuis <strong>tidak akan terhapus</strong> — hanya aktivitas learner yang dikosongkan sehingga flow demo bisa dijalankan ulang dari awal.
                </p>

                {resetStatus === 'idle' && (
                  <button
                    type="button"
                    onClick={() => setResetStatus('confirm')}
                    style={{ padding: '9px 20px', background: '#fff', border: '1.5px solid #fca5a5', borderRadius: '8px', color: '#b91c1c', fontSize: '13px', fontWeight: '700', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="1 4 1 10 7 10"/>
                      <path d="M3.51 15a9 9 0 1 0 .49-4.5"/>
                    </svg>
                    Reset Data Demo
                  </button>
                )}

                {resetStatus === 'confirm' && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '16px' }}>
                    <p style={{ margin: '0 0 14px 0', fontSize: '13px', color: '#991b1b', fontWeight: '600' }}>
                      ⚠️ Yakin ingin reset? Semua progress dan hasil kuis learner akan dihapus permanen. File SOP tetap aman.
                    </p>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        type="button"
                        onClick={handleResetDemo}
                        style={{ padding: '8px 18px', background: '#dc2626', border: 'none', borderRadius: '7px', color: '#fff', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}
                      >
                        Ya, Reset Sekarang
                      </button>
                      <button
                        type="button"
                        onClick={() => setResetStatus('idle')}
                        style={{ padding: '8px 18px', background: '#fff', border: '1px solid var(--border)', borderRadius: '7px', color: 'var(--text2)', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
                      >
                        Batal
                      </button>
                    </div>
                  </div>
                )}

                {resetStatus === 'loading' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#b91c1c', fontWeight: '600' }}>
                    <span style={{ display: 'inline-block', width: '16px', height: '16px', border: '2px solid #b91c1c', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    Mereset data demo...
                  </div>
                )}

                {resetStatus === 'done' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#15803d', fontWeight: '700' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    Berhasil direset! LMS siap untuk demo baru.
                  </div>
                )}

                {resetStatus === 'error' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#dc2626', fontWeight: '700' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                    Gagal reset. Coba lagi.
                  </div>
                )}
              </div>
            </>
            /* SUPERVISOR VIEW ACCESS NOTE & POLICY */
            <div className="card" style={{ padding: '24px', borderLeft: '4px solid var(--accent)' }}>
              <h4 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text1)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                🔒 Akses Administratif Terbatas
              </h4>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text3)', lineHeight: '1.6' }}>
                Halaman pengaturan tingkat lanjut seperti *Detail Entitas Perusahaan*, *Branding Warna/Logo LMS*, dan *Integrasi HRIS (Mekari Talenta/SAP)* dikunci untuk akun Supervisor/Lead. Hanya administrator utama **HRD Admin** (Andi Saputra) yang memiliki otoritas penuh untuk mengubah konfigurasi billing dan integrasi platform LMS ini.
              </p>
            </div>
          )}

        </div>

        {/* SIDE BAR FOR BILLING STATE IN ADMIN */}
        {isHRDAdmin && (
          <div className="card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text2)', borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                <line x1="1" y1="10" x2="23" y2="10"/>
              </svg>
              Paket Berlangganan
            </h3>
            <div style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border)', marginBottom: '16px' }}>
              <div style={{ fontSize: '10px', color: 'var(--text3)', fontWeight: '700', letterSpacing: '0.05em' }}>PAKET SAAT INI</div>
              <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--accent)', marginTop: '4px', letterSpacing: '0.02em' }}>
                {tenant.plan.toUpperCase()}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--green)', fontWeight: '600', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '6px', height: '6px', background: 'var(--green)', borderRadius: '50%' }}></span>
                Aktif · Autopay Terdaftar
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12px', color: 'var(--text2)', padding: '4px 2px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                  <line x1="1" y1="10" x2="23" y2="10"/>
                </svg>
                <span>Visa Akhiran <strong>**8890</strong></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                <span>Kedaluwarsa: <strong>Des 2027</strong></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2">
                  <line x1="12" y1="1" x2="12" y2="23"/>
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                </svg>
                <span>Biaya: <strong>Rp 2.500.000 / bln</strong></span>
              </div>
            </div>
            
            <div style={{ marginTop: '20px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
              <button 
                type="button" 
                style={{
                  width: '100%',
                  fontSize: '12px',
                  padding: '10px 16px',
                  background: 'var(--navy)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 10px rgba(11, 22, 40, 0.12)',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'var(--accent)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 6px 14px rgba(47, 123, 255, 0.2)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'var(--navy)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 10px rgba(11, 22, 40, 0.12)';
                }}
                onClick={() => changePlan(PLANS.ENTERPRISE)}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polygon points="12 2 2 7 12 12 22 7 12 2"/>
                  <polyline points="2 17 12 22 22 17"/>
                  <polyline points="2 12 12 17 22 12"/>
                </svg>
                Upgrade ke Enterprise
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
