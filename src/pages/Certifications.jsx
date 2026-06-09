import React, { useState } from 'react';
import { useTenant } from '../context/TenantContext';
import { PLANS } from '../utils/featureGates';

export const Certifications = () => {
  const { tenant, quizSubmissions, changePlan } = useTenant();

  // Settings states for Business plan simulation
  const [passingScore, setPassingScore] = useState(80);
  const [validityMonths, setValidityMonths] = useState(12);
  const [selectedTemplate, setSelectedTemplate] = useState('modern-navy');
  const [autoEmail, setAutoEmail] = useState(true);

  // Modal preview state
  const [previewCert, setPreviewCert] = useState(null);

  // If Starter, show a beautiful upgrade promotion overlay
  if (tenant.plan === PLANS.STARTER) {
    return (
      <div className="content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '70vh', textAlign: 'center', padding: '40px' }}>
        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          background: '#fef3c7',
          color: '#d97706',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: '24px'
        }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '36px', height: '36px' }}>
            <circle cx="12" cy="8" r="6"/>
            <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/>
            <rect x="10" y="7" width="4" height="2" rx="0.5" fill="currentColor"/>
          </svg>
        </div>
        <h2 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text1)', marginBottom: '12px' }}>Manajemen Sertifikasi Karyawan</h2>
        <p style={{ color: 'var(--text3)', maxWidth: '480px', fontSize: '14px', lineHeight: '1.6', marginBottom: '32px' }}>
          Fitur penerbitan sertifikat kelulusan otomatis, pengaturan masa berlaku (expired), dan kustomisasi branding sertifikat hanya tersedia pada paket **Business** dan **Enterprise**.
        </p>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            type="button" 
            className="btn-primary" 
            style={{ padding: '10px 24px', background: '#002D72', border: '1px solid #002D72' }}
            onClick={() => changePlan(PLANS.BUSINESS)}
          >
            Upgrade ke Paket Business
          </button>
        </div>
      </div>
    );
  }

  // Filter only passed submissions for certificates list
  const certificates = quizSubmissions.map((sub, idx) => {
    // Generate dates based on submission
    const issueDate = sub.date === 'Hari ini' ? '09 Jun 2026' : 
                      sub.date === '1 hari lalu' ? '08 Jun 2026' : 
                      sub.date === '2 hari lalu' ? '07 Jun 2026' : '05 Jun 2026';
    
    // Calculate expiry
    const expiryDate = validityMonths === 999 ? 'Selamanya' : `09 Jun ${2026 + Math.floor(validityMonths / 12)}`;

    return {
      id: `CERT-${2026}${100 + idx}`,
      employeeName: sub.employeeName,
      videoTitle: sub.videoTitle,
      score: sub.postScore,
      issueDate,
      expiryDate,
      status: sub.status === 'Lulus' ? 'Aktif' : 'Kedaluwarsa'
    };
  }).filter(c => c.score >= passingScore);

  return (
    <div className="content">
      {/* HEADER */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text1)', marginBottom: '6px' }}>Manajemen Sertifikasi</h2>
        <p style={{ color: 'var(--text3)', fontSize: '13px' }}>
          Terbitkan sertifikat kompetensi otomatis setelah karyawan menyelesaikan video SOP & ujian dengan nilai kelulusan.
        </p>
      </div>

      {/* STATS OVERVIEW */}
      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card blue">
          <div className="stat-icon blue">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/>
            </svg>
          </div>
          <div className="stat-label">Sertifikat Aktif</div>
          <div className="stat-value">{certificates.length}</div>
          <div className="stat-change info">Diperbarui real-time</div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon green">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <div className="stat-label">Standar Kelulusan</div>
          <div className="stat-value">{passingScore}%</div>
          <div className="stat-change up">Minimal Jawaban Benar</div>
        </div>
        <div className="stat-card amber">
          <div className="stat-icon amber">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <div className="stat-label">Masa Berlaku</div>
          <div className="stat-value">{validityMonths === 999 ? 'Selamanya' : `${validityMonths} Bulan`}</div>
          <div className="stat-change up">Siklus Recertification</div>
        </div>
      </div>

      {/* CONFIG & LIST GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '24px', alignItems: 'start' }}>
        
        {/* SIDE CONFIGURATION CARD */}
        <div className="card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text2)', borderBottom: '1px solid var(--border)', paddingBottom: '10px', marginBottom: '16px' }}>
            ⚙️ Aturan Sertifikat
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* PASSING SCORE */}
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '11px', fontWeight: '600' }}>NILAI KELULUSAN MINIMAL</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
                <input 
                  type="range" 
                  min="60" 
                  max="100" 
                  step="5"
                  value={passingScore}
                  onChange={(e) => setPassingScore(Number(e.target.value))}
                  style={{ flex: 1, cursor: 'pointer' }}
                />
                <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--accent)', minWidth: '35px' }}>{passingScore}%</span>
              </div>
            </div>

            {/* EXPIRY/VALIDITY */}
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '11px', fontWeight: '600' }}>MASA BERLAKU SERTIFIKAT</label>
              <select 
                className="form-select"
                style={{ fontSize: '12px', marginTop: '4px' }}
                value={validityMonths}
                onChange={(e) => setValidityMonths(Number(e.target.value))}
              >
                <option value={3}>3 Bulan (Operasional Cepat)</option>
                <option value={6}>6 Bulan (SOP Dinamis)</option>
                <option value={12}>12 Bulan (1 Tahun - Rekomendasi)</option>
                <option value={24}>24 Bulan (2 Tahun)</option>
                <option value={999}>Selamanya (Tidak Expired)</option>
              </select>
            </div>

            {/* BRANDING TEMPLATE */}
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '11px', fontWeight: '600' }}>DESAIN TEMPLATE</label>
              <select 
                className="form-select"
                style={{ fontSize: '12px', marginTop: '4px' }}
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
              >
                <option value="modern-navy">Elegant Navy (Corporate)</option>
                <option value="luxury-gold">Luxury Gold (Premium)</option>
                <option value="emerald-green">Emerald Compliance (Formal)</option>
              </select>
            </div>

            {/* OPTIONS TOGGLES */}
            <div style={{ marginTop: '6px', borderTop: '1px solid var(--border)', paddingTop: '14px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', color: 'var(--text2)' }}>
                <input 
                  type="checkbox" 
                  checked={autoEmail}
                  onChange={(e) => setAutoEmail(e.target.checked)}
                />
                Kirim otomatis via Email / WA
              </label>
            </div>

            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '11px', color: 'var(--text3)', lineHeight: '1.4' }}>
              ℹ️ <strong>Paket Business:</strong> Template sertifikat otomatis menyertakan Logo <strong>{tenant.name}</strong> dan Tanda Tangan Manajer HRD.
            </div>
          </div>
        </div>

        {/* ISSUED CERTIFICATES TABLE */}
        <div className="card">
          <div className="card-head" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <div className="card-title">Daftar Sertifikat Terbit</div>
          </div>
          
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '12px 20px', fontWeight: '600', color: 'var(--text2)' }}>ID</th>
                  <th style={{ padding: '12px 20px', fontWeight: '600', color: 'var(--text2)' }}>Nama Karyawan</th>
                  <th style={{ padding: '12px 20px', fontWeight: '600', color: 'var(--text2)' }}>Materi SOP</th>
                  <th style={{ padding: '12px 20px', fontWeight: '600', color: 'var(--text2)' }}>Skor</th>
                  <th style={{ padding: '12px 20px', fontWeight: '600', color: 'var(--text2)' }}>Tgl Terbit</th>
                  <th style={{ padding: '12px 20px', fontWeight: '600', color: 'var(--text2)' }}>Berlaku S.d</th>
                  <th style={{ padding: '12px 20px', fontWeight: '600', color: 'var(--text2)' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {certificates.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: 'var(--text3)' }}>
                      Belum ada sertifikat yang diterbitkan sesuai kriteria kelulusan.
                    </td>
                  </tr>
                ) : (
                  certificates.map((cert) => (
                    <tr key={cert.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px 20px', fontWeight: '500', color: 'var(--text3)' }}>{cert.id}</td>
                      <td style={{ padding: '12px 20px', fontWeight: '600', color: 'var(--text1)' }}>{cert.employeeName}</td>
                      <td style={{ padding: '12px 20px', color: 'var(--text2)' }}>{cert.videoTitle}</td>
                      <td style={{ padding: '12px 20px', fontWeight: '600', color: 'var(--green)' }}>{cert.score}%</td>
                      <td style={{ padding: '12px 20px', color: 'var(--text3)' }}>{cert.issueDate}</td>
                      <td style={{ padding: '12px 20px', color: 'var(--text3)' }}>
                        <span className={`dept-tag dt-sales`} style={{ background: cert.expiryDate === 'Selamanya' ? '#ecfdf5' : '#fef2f2', color: cert.expiryDate === 'Selamanya' ? '#10b981' : '#ef4444', fontWeight: '500' }}>
                          {cert.expiryDate}
                        </span>
                      </td>
                      <td style={{ padding: '12px 20px' }}>
                        <button
                          type="button"
                          className="btn-primary"
                          style={{ padding: '6px 12px', fontSize: '11px', background: 'none', border: '1px solid var(--border)', color: 'var(--accent)', cursor: 'pointer' }}
                          onClick={() => setPreviewCert(cert)}
                        >
                          👁️ Lihat
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* CERTIFICATE PREVIEW MODAL */}
      {previewCert && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999
        }} onClick={() => setPreviewCert(null)}>
          
          <div style={{
            background: '#ffffff',
            padding: '40px',
            borderRadius: '16px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            width: '750px',
            maxWidth: '95vw',
            position: 'relative'
          }} onClick={(e) => e.stopPropagation()}>
            
            {/* Close button */}
            <button 
              type="button" 
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text3)' }}
              onClick={() => setPreviewCert(null)}
            >
              ✕
            </button>

            {/* Certificate Frame */}
            <div style={{
              border: `8px double ${selectedTemplate === 'modern-navy' ? '#0f172a' : selectedTemplate === 'luxury-gold' ? '#d97706' : '#047857'}`,
              padding: '30px',
              textAlign: 'center',
              background: '#fefefe',
              borderRadius: '8px',
              fontFamily: "'Plus Jakarta Sans', serif",
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Background badge decorations */}
              <div style={{
                position: 'absolute',
                bottom: '-20px',
                right: '-20px',
                width: '150px',
                height: '150px',
                borderRadius: '50%',
                background: selectedTemplate === 'modern-navy' ? '#eff6ff' : selectedTemplate === 'luxury-gold' ? '#fffbeb' : '#f0fdf4',
                opacity: 0.5,
                zIndex: 1
              }} />

              {/* Logo Area */}
              <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text3)', marginBottom: '20px' }}>
                🏢 {tenant.name} · Corporate LMS
              </div>

              {/* Title */}
              <h1 style={{ 
                fontFamily: "'Playfair Display', Georgia, serif", 
                fontSize: '28px', 
                fontWeight: '700', 
                color: selectedTemplate === 'modern-navy' ? '#0f172a' : selectedTemplate === 'luxury-gold' ? '#b45309' : '#065f46',
                margin: '0 0 10px 0',
                letterSpacing: '1px'
              }}>
                SERTIFIKAT KELULUSAN
              </h1>
              <div style={{ width: '60px', height: '2px', background: selectedTemplate === 'modern-navy' ? '#0f172a' : selectedTemplate === 'luxury-gold' ? '#d97706' : '#047857', margin: '0 auto 24px auto' }}></div>

              {/* Sub-info */}
              <p style={{ fontSize: '13px', color: 'var(--text3)', margin: '0 0 20px 0', fontStyle: 'italic' }}>
                Dengan ini secara resmi menyatakan dan menganugerahkan penghargaan kepada:
              </p>

              {/* Recipient Name */}
              <h2 style={{ 
                fontSize: '24px', 
                fontWeight: '700', 
                color: 'var(--text1)', 
                margin: '10px 0',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                textDecoration: 'underline'
              }}>
                {previewCert.employeeName}
              </h2>

              <p style={{ fontSize: '13px', color: 'var(--text3)', margin: '15px auto', maxWidth: '480px', lineHeight: '1.6' }}>
                Atas kelulusan luar biasa dan kompetensi penuh yang ditunjukkan dalam menyelesaikan pelatihan materi video standar perusahaan:
              </p>

              {/* Course Title */}
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--accent)', margin: '10px 0 30px 0' }}>
                {previewCert.videoTitle}
              </h3>

              {/* Footer details */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', marginTop: '40px', alignItems: 'end', zIndex: 2, position: 'relative' }}>
                {/* Left: Date & Score */}
                <div style={{ textAlign: 'left', fontSize: '12px', color: 'var(--text2)', borderRight: '1px solid var(--border)', paddingRight: '20px' }}>
                  <div style={{ marginBottom: '6px' }}><strong>ID Sertifikat:</strong> {previewCert.id}</div>
                  <div style={{ marginBottom: '6px' }}><strong>Tanggal Terbit:</strong> {previewCert.issueDate}</div>
                  <div style={{ marginBottom: '6px' }}><strong>Masa Berlaku:</strong> {previewCert.expiryDate}</div>
                  <div><strong>Skor Akhir:</strong> <span style={{ color: 'var(--green)', fontWeight: '600' }}>{previewCert.score}%</span></div>
                </div>

                {/* Right: Signature */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: "'Brush Script MT', cursive, sans-serif", fontSize: '24px', color: '#1e3a8a', height: '35px', lineHeight: '35px' }}>
                    Andi Saputra
                  </div>
                  <div style={{ width: '120px', height: '1px', background: 'var(--border)', margin: '4px auto' }}></div>
                  <div style={{ fontSize: '11px', color: 'var(--text3)', fontWeight: '600', textTransform: 'uppercase' }}>
                    HR Manager, {tenant.name}
                  </div>
                </div>
              </div>

            </div>

            {/* Print/Export Options */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button 
                type="button" 
                className="form-input" 
                style={{ cursor: 'pointer', padding: '8px 18px' }}
                onClick={() => setPreviewCert(null)}
              >
                Tutup
              </button>
              <button 
                type="button" 
                className="btn-primary" 
                style={{ padding: '8px 24px', background: '#002D72' }}
                onClick={() => window.print()}
              >
                🖨️ Cetak / Simpan PDF
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
