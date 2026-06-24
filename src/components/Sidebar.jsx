import React from 'react';
import { useTenant } from '../context/TenantContext';
import { PLANS, canUploadSOP } from '../utils/featureGates';

export const Sidebar = ({ onLogout }) => {
  const { tenant, activePage, setActivePage, videos, currentUser, quizSubmissions } = useTenant();

  const getNavItemClass = (page) => `nav-item ${activePage === page ? 'active' : ''}`;
  const planLabel = tenant.plan.charAt(0).toUpperCase() + tenant.plan.slice(1);
  const isHRDAdmin = currentUser.role === 'admin';
  const pendingCertCount = quizSubmissions.filter(s => !s.certStatus || s.certStatus === 'pending').length;

  return (
    <aside className="sidebar" style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
      {/* BRANDING */}
      <div style={{ borderBottom: '1px solid rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{
          background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: '8px', cursor: 'pointer', height: '60px', overflow: 'hidden', padding: '0 20px',
          width: '100%', boxSizing: 'border-box', borderRight: '1px solid #e2e8f0'
        }} onClick={() => setActivePage('dashboard')}>
          {tenant.logo ? (
            <img src={tenant.logo} alt={tenant.name} style={{ maxWidth: '150px', maxHeight: '28px', objectFit: 'contain' }} />
          ) : (
            <>
              <span style={{ fontSize: '15px', flexShrink: 0 }}>🏢</span>
              <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tenant.name}</div>
            </>
          )}
        </div>
        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', padding: '12px 20px', fontWeight: '600' }}>
          Paket {planLabel} · {tenant.status}
        </div>
      </div>

      {/* USER BADGE */}
      <div className="tenant-badge" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', color: '#fff', flexShrink: 0 }}>
          {currentUser.avatar}
        </div>
        <div style={{ overflow: 'hidden' }}>
          <div className="tenant-name" style={{ fontWeight: '700', fontSize: '13px' }}>{currentUser.name}</div>
          <div className="tenant-plan" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {currentUser.role === 'admin' ? 'HR Manager' : `Lead Divisi ${currentUser.dept}`}
          </div>
        </div>
      </div>

      {/* NAV */}
      <nav style={{ flexShrink: 0 }}>
        <div className="nav-section">Utama</div>
        <a className={getNavItemClass('dashboard')} href="#dashboard" onClick={(e) => { e.preventDefault(); setActivePage('dashboard'); }}>
          <span className="nav-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg></span>
          Dashboard
        </a>
        <a className={getNavItemClass('sop')} href="#sop" onClick={(e) => { e.preventDefault(); setActivePage('sop'); }}>
          <span className="nav-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg></span>
          Video Training & SOP
          <span className="nav-badge">{videos.length}</span>
        </a>
        <a className={getNavItemClass('review-sertifikat')} href="#review-sertifikat" onClick={(e) => { e.preventDefault(); setActivePage('review-sertifikat'); }}>
          <span className="nav-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg></span>
          Sertifikat
          {pendingCertCount > 0 && <span className="nav-badge" style={{ background: '#f59e0b' }}>{pendingCertCount}</span>}
        </a>
        <a className={getNavItemClass('penilaian')} href="#penilaian" onClick={(e) => { e.preventDefault(); setActivePage('penilaian'); }}>
          <span className="nav-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg></span>
          Hasil Penilaian Kuis
        </a>
        <a className={getNavItemClass('laporan')} href="#laporan" onClick={(e) => { e.preventDefault(); setActivePage('laporan'); }}>
          <span className="nav-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg></span>
          Laporan
        </a>

        <div className="nav-section">Manajemen</div>
        <a className={getNavItemClass('karyawan')} href="#karyawan" onClick={(e) => { e.preventDefault(); setActivePage('karyawan'); }}>
          <span className="nav-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></span>
          Karyawan
        </a>

        {isHRDAdmin && (
          <>
            <a className={getNavItemClass('departemen')} href="#departemen" onClick={(e) => { e.preventDefault(); setActivePage('departemen'); }}>
              <span className="nav-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg></span>
              Departemen
            </a>
            <a className={getNavItemClass('upload')} href="#upload" onClick={(e) => { e.preventDefault(); setActivePage('upload'); }}>
              <span className="nav-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg></span>
              Upload Training & SOP {!canUploadSOP(tenant.plan) && '🔒'}
            </a>
            {tenant.plan === PLANS.ENTERPRISE && (
              <a className={getNavItemClass('heygen')} href="#heygen" onClick={(e) => { e.preventDefault(); setActivePage('heygen'); }}>
                <span className="nav-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></span>
                Akses HeyGen
              </a>
            )}
          </>
        )}

        <div className="nav-section">Lainnya</div>
        <a className={getNavItemClass('pengaturan')} href="#pengaturan" onClick={(e) => { e.preventDefault(); setActivePage('pengaturan'); }}>
          <span className="nav-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg></span>
          Pengaturan
        </a>
      </nav>

      {/* LOGOUT + BRANDING */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', padding: '12px 16px', flexShrink: 0, marginTop: 'auto' }}>
        {onLogout && (
          <button onClick={onLogout} style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '8px', padding: '9px 14px', color: 'rgba(255,255,255,0.7)', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Keluar
          </button>
        )}
        <div style={{ textAlign: 'center', fontSize: '11px', fontWeight: '600', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.05em' }}>
          Axara LMS Platform
        </div>
      </div>
    </aside>
  );
};
