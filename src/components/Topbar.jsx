import React from 'react';
import { useTenant } from '../context/TenantContext';

export const Topbar = () => {
  const { tenant, activePage } = useTenant();

  // Helper to get descriptive title
  const getPageTitle = () => {
    switch (activePage) {
      case 'dashboard': return 'Dashboard';
      case 'sop': return 'Video SOP';
      case 'sertifikasi': return 'Sertifikasi';
      case 'laporan': return 'Laporan & Compliance';
      case 'karyawan': return 'Manajemen Karyawan';
      case 'departemen': return 'Daftar Departemen';
      case 'upload': return 'Upload Video SOP';
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
    <header className="topbar">
      <div>
        <div className="page-title">{getPageTitle()}</div>
        <div className="page-sub">
          {getTodayDateString()} &nbsp;·&nbsp; {tenant.name} Tbk
        </div>
      </div>
      <div className="topbar-right">
        <div className="search-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          Cari video SOP...
        </div>

        <div className="topbar-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          <div className="notif-dot"></div>
        </div>
      </div>
    </header>
  );
};
