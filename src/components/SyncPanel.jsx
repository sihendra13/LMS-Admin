import React, { useState, useEffect } from 'react';
import { useTenant } from '../context/TenantContext';

export const SyncPanel = ({ isOpen, onClose }) => {
  const { exportDBString, videos, employees, quizSubmissions } = useTenant();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCopied(false);
      navigator.clipboard.writeText(exportDBString()).then(() => {
        setCopied(true);
      }).catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyAgain = () => {
    navigator.clipboard.writeText(exportDBString()).then(() => {
      setCopied(true);
    });
  };

  const activeVideos = videos.filter(v => !v.archived);

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999
    }} onClick={onClose}>
      <div style={{
        background: '#fff', borderRadius: '16px', width: '480px', maxWidth: '92vw', padding: '28px',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
      }} onClick={e => e.stopPropagation()}>

        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text1)', margin: '0 0 4px' }}>Sinkronisasi ke LMS Learner</h3>
            <p style={{ fontSize: '12px', color: 'var(--text3)', margin: 0 }}>Data Admin disalin otomatis ke clipboard</p>
          </div>
          <button style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: 'var(--text3)', padding: '0' }} onClick={onClose}>✕</button>
        </div>

        {/* STATUS COPY */}
        <div style={{
          background: copied ? '#f0fdf4' : '#f8fafc',
          border: `1px solid ${copied ? '#86efac' : 'var(--border)'}`,
          borderRadius: '10px', padding: '14px 18px', marginBottom: '20px',
          display: 'flex', alignItems: 'center', gap: '12px'
        }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
            background: copied ? '#10b981' : '#e2e8f0',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            {copied ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
            )}
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: '600', color: copied ? '#15803d' : 'var(--text2)' }}>
              {copied ? 'Data berhasil disalin ke clipboard!' : 'Menyalin data...'}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '2px' }}>
              {copied ? 'Buka LMS Learner → klik Sync State → Tempel & Sinkronkan' : 'Mohon tunggu sebentar'}
            </div>
          </div>
        </div>

        {/* DATA SUMMARY */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '20px' }}>
          {[
            { label: 'Video Aktif', value: activeVideos.length, icon: '🎬' },
            { label: 'Karyawan', value: employees.length, icon: '👥' },
            { label: 'Hasil Kuis', value: quizSubmissions.length, icon: '📝' },
          ].map(item => (
            <div key={item.label} style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '20px', marginBottom: '4px' }}>{item.icon}</div>
              <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text1)' }}>{item.value}</div>
              <div style={{ fontSize: '11px', color: 'var(--text3)' }}>{item.label}</div>
            </div>
          ))}
        </div>

        {/* STEPS */}
        <div style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px 18px', marginBottom: '20px' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>Langkah selanjutnya</div>
          {[
            'Data sudah tersalin ke clipboard ✅',
            'Buka tab LMS Learner',
            'Klik tombol "Sync State"',
            'Klik "Tempel & Sinkronkan" — selesai!',
          ].map((step, i) => (
            <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: i < 3 ? '8px' : 0 }}>
              <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: i === 0 ? '#10b981' : '#e2e8f0', color: i === 0 ? '#fff' : '#64748b', fontSize: '11px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {i + 1}
              </span>
              <span style={{ fontSize: '12px', color: i === 0 ? '#15803d' : 'var(--text2)', paddingTop: '2px' }}>{step}</span>
            </div>
          ))}
        </div>

        {/* ACTIONS */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleCopyAgain}
            style={{ flex: 1, padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', border: '1px solid var(--border)', background: '#fff', color: 'var(--text2)', cursor: 'pointer' }}
          >
            Salin Ulang
          </button>
          <button
            onClick={onClose}
            className="btn-primary"
            style={{ flex: 1, padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
};
