import React, { useState } from 'react';
import { useTenant } from '../context/TenantContext';
import { PLANS } from '../utils/featureGates';

export const Settings = () => {
  const { tenant, currentUser, changePlan, updateTenantLogo } = useTenant();
  
  const isHRDAdmin = currentUser.role === 'admin';

  // Branding/Integration states
  const [syncStatus, setSyncStatus] = useState('Terakhir disinkronisasi: Hari ini, 09:30');
  const [isSyncing, setIsSyncing] = useState(false);
  const [logoStatus, setLogoStatus] = useState('idle'); // 'idle' | 'processing' | 'saved' | 'error'

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
                <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginBottom: '24px', background: '#f8fafc', padding: '18px', borderRadius: '12px', border: '1px dashed var(--border)' }}>
                  <div style={{
                    width: '120px',
                    height: '60px',
                    background: '#ffffff',
                    borderRadius: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    border: '1px solid var(--border)',
                    flexShrink: 0
                  }}>
                    {tenant.logo ? (
                      <img src={tenant.logo} alt="Logo Perusahaan" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                    ) : (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                      </svg>
                    )}
                  </div>
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <label style={{ display: 'block', fontSize: '10px', fontWeight: '800', color: 'var(--text2)', marginBottom: '8px', letterSpacing: '0.05em' }}>
                      LOGO PERUSAHAAN (WHITE-LABEL BRANDING)
                    </label>
                    
                    {/* CUSTOM STYLED FILE UPLOAD TRIGGER */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="btn-sec"
                        style={{
                          padding: '6px 14px',
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
                          transition: 'all 0.2s',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                        }}
                        onClick={() => document.getElementById('company-logo-input').click()}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="17 8 12 3 7 8" />
                          <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                        Pilih File Gambar
                      </button>
                      
                      {tenant.logo && logoStatus === 'idle' && (
                        <button
                          type="button"
                          style={{
                            padding: '6px 14px',
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
                            transition: 'all 0.2s'
                          }}
                          onClick={() => { updateTenantLogo(null); }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

              {/* HRIS SYNC INTEGRATION */}
              <div className="card" style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text1)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  🔄 Sinkronisasi Karyawan (HRIS Integration)
                </h3>
                <p style={{ color: 'var(--text3)', fontSize: '13px', margin: '0 0 16px 0' }}>
                  Hubungkan dengan HRIS internal Anda untuk otomatis menyinkronkan data karyawan, penugasan divisi, dan status aktif/nonaktif.
                </p>

                <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
                  <div style={{ 
                    border: '1px solid var(--border)', 
                    borderRadius: '8px', 
                    padding: '12px 16px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '12px',
                    background: '#f8fafc',
                    flex: 1,
                    minWidth: '200px'
                  }}>
                    <div style={{ fontSize: '24px' }}>💼</div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '13px', fontWeight: '700' }}>Mekari Talenta</h4>
                      <span style={{ fontSize: '11px', color: 'var(--green)', fontWeight: '600' }}>Tersambung (API Key)</span>
                    </div>
                  </div>
                  <div style={{ 
                    border: '1px solid var(--border)', 
                    borderRadius: '8px', 
                    padding: '12px 16px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '12px',
                    background: '#f8fafc',
                    flex: 1,
                    minWidth: '200px'
                  }}>
                    <div style={{ fontSize: '24px' }}>🧩</div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '13px', fontWeight: '700' }}>SAP SuccessFactors</h4>
                      <span style={{ fontSize: '11px', color: 'var(--text3)' }}>Belum Terhubung</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f1f5f9', padding: '12px 16px', borderRadius: '8px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text2)', fontWeight: '500' }}>{syncStatus}</span>
                  <button 
                    type="button" 
                    className="btn-primary" 
                    style={{ fontSize: '12px', padding: '6px 14px' }}
                    onClick={handleSyncHRIS}
                    disabled={isSyncing}
                  >
                    {isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}
                  </button>
                </div>
              </div>
            </>
          ) : (
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
            <h3 style={{ fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text2)', borderBottom: '1px solid var(--border)', paddingBottom: '10px', marginBottom: '16px' }}>
              💳 Paket Berlangganan
            </h3>
            <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '14px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text3)', fontWeight: '600' }}>PAKET SAAT INI</div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--accent)', marginTop: '2px' }}>
                {tenant.plan.toUpperCase()}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--green)', fontWeight: '600', marginTop: '4px' }}>
                Aktif · Autopay Terdaftar
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px', color: 'var(--text2)' }}>
              <div>💳 Visa Akhiran **8890</div>
              <div>📅 Kedaluwarsa: Des 2027</div>
              <div>💵 Biaya: Rp 2.500.000 / bln</div>
            </div>
            
            <div style={{ marginTop: '20px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
              <button 
                type="button" 
                className="btn-sec" 
                style={{ width: '100%', fontSize: '12px', padding: '8px' }}
                onClick={() => changePlan(PLANS.ENTERPRISE)}
              >
                Upgrade ke Enterprise
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
