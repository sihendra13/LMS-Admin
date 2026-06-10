import React from 'react';
import { useTenant } from '../context/TenantContext';
import { PLANS, canUploadSOP } from '../utils/featureGates';

export const Sidebar = () => {
  const { tenant, activePage, setActivePage, videos, currentUser, pendingEssays } = useTenant();

  // Helper for active menu class
  const getNavItemClass = (page) => {
    return `nav-item ${activePage === page ? 'active' : ''}`;
  };

  const planLabel = tenant.plan.charAt(0).toUpperCase() + tenant.plan.slice(1);

  const isHRDAdmin = currentUser.role === 'admin';

  // Calculate pending essays count based on role
  const filteredPendingCount = pendingEssays.filter(essay => {
    if (!isHRDAdmin) {
      return essay.dept.toLowerCase() === currentUser.dept.toLowerCase();
    }
    return true;
  }).length;

  return (
    <aside className="sidebar">
      <div className="logo-area">
        <div className="logo" onClick={() => setActivePage('dashboard')} style={{ cursor: 'pointer' }}>
          SOP<span>Learn</span>
        </div>
        <div className="logo-tagline">Corporate LMS Platform</div>
      </div>

      <div className="tenant-badge">
        <div className="tenant-avatar">{tenant.avatar}</div>
        <div>
          <div className="tenant-name">{tenant.name}</div>
          <div className="tenant-plan">Paket {planLabel} · {tenant.status}</div>
        </div>
      </div>

      <nav>
        <div className="nav-section">Utama</div>
        <a className={getNavItemClass('dashboard')} href="#dashboard" onClick={(e) => { e.preventDefault(); setActivePage('dashboard'); }}>
          <span className="nav-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>
          </span>
          Dashboard
        </a>
        <a className={getNavItemClass('sop')} href="#sop" onClick={(e) => { e.preventDefault(); setActivePage('sop'); }}>
          <span className="nav-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
          </span>
          Video Training & SOP
          <span className="nav-badge">{videos.length}</span>
        </a>
        <a className={getNavItemClass('sertifikasi')} href="#sertifikasi" onClick={(e) => { e.preventDefault(); setActivePage('sertifikasi'); }}>
          <span className="nav-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
          </span>
          Sertifikasi
        </a>
        <a className={getNavItemClass('penilaian')} href="#penilaian" onClick={(e) => { e.preventDefault(); setActivePage('penilaian'); }}>
          <span className="nav-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
          </span>
          Penilaian Kuis
          {filteredPendingCount > 0 && (
            <span className="nav-badge" style={{ background: '#f59e0b', color: '#ffffff' }}>{filteredPendingCount}</span>
          )}
        </a>
        <a className={getNavItemClass('laporan')} href="#laporan" onClick={(e) => { e.preventDefault(); setActivePage('laporan'); }}>
          <span className="nav-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
          </span>
          Laporan
        </a>

        <div className="nav-section">Manajemen</div>
        <a className={getNavItemClass('karyawan')} href="#karyawan" onClick={(e) => { e.preventDefault(); setActivePage('karyawan'); }}>
          <span className="nav-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </span>
          Karyawan
        </a>

        {isHRDAdmin && (
          <>
            <a className={getNavItemClass('departemen')} href="#departemen" onClick={(e) => { e.preventDefault(); setActivePage('departemen'); }}>
              <span className="nav-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
              </span>
              Departemen
            </a>
            
            <a className={getNavItemClass('upload')} href="#upload" onClick={(e) => { e.preventDefault(); setActivePage('upload'); }}>
              <span className="nav-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              </span>
              Upload Training & SOP {!canUploadSOP(tenant.plan) && '🔒'}
            </a>

            {tenant.plan === PLANS.ENTERPRISE && (
              <a className={getNavItemClass('heygen')} href="#heygen" onClick={(e) => { e.preventDefault(); setActivePage('heygen'); }}>
                <span className="nav-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                </span>
                Akses HeyGen
              </a>
            )}
          </>
        )}

        <div className="nav-section">Lainnya</div>
        <a className={getNavItemClass('pengaturan')} href="#pengaturan" onClick={(e) => { e.preventDefault(); setActivePage('pengaturan'); }}>
          <span className="nav-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>
          </span>
          Pengaturan
        </a>
      </nav>

      <div className="sidebar-footer">
        <div className="user-avatar">{currentUser.avatar}</div>
        <div>
          <div className="user-name">{currentUser.name}</div>
          <div className="user-role">{currentUser.role === 'admin' ? 'HR Manager' : `Lead Divisi ${currentUser.dept}`}</div>
        </div>
      </div>
    </aside>
  );
};
