import React, { useState } from 'react';
import { useTenant } from '../context/TenantContext';
import { SyncPanel } from './SyncPanel';

export const Topbar = () => {
  const { tenant, activePage } = useTenant();
  const [syncOpen, setSyncOpen] = useState(false);

  // Helper to get descriptive title
  const getPageTitle = () => {
    switch (activePage) {
      case 'dashboard': return 'Dashboard';
      case 'sop': return 'Video Training & SOP';
      case 'sertifikasi': return 'Sertifikasi';
      case 'laporan': return 'Laporan & Compliance';
      case 'karyawan': return 'Manajemen Karyawan';
      case 'departemen': return 'Daftar Departemen';
      case 'upload': return 'Upload Training & SOP';
      case 'heygen': return 'Integrasi AI HeyGen';
      case 'pengaturan': return 'Pengaturan';
      default: return 'LMS Dashboard';
    }
  };

  const getTodayDateString = () => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date().toLocaleDateString('id-ID', options);
  };

  return (
    <>
      <header className="topbar">
        <div>
          <div className="page-title">{getPageTitle()}</div>
          <div className="page-sub">
            {getTodayDateString()} &nbsp;·&nbsp; {tenant.name} Tbk
          </div>
        </div>
        <div className="topbar-right">
          <button 
            onClick={() => setSyncOpen(true)}
            style={{
              background: '#0B1628',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.2)',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '11px',
              cursor: 'pointer',
              fontWeight: '600',
              marginRight: '8px'
            }}
          >
            🔄 Sync State
          </button>

          <div className="search-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            Cari video Training & SOP...
          </div>

          <div className="topbar-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            <div className="notif-dot"></div>
          </div>
        </div>
      </header>

      <SyncPanel isOpen={syncOpen} onClose={() => setSyncOpen(false)} />
    </>
  );
};
