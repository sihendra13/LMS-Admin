import React from 'react';
import { TenantProvider, useTenant } from './context/TenantContext';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { PlanSwitcher } from './components/PlanSwitcher';

// Pages
import { Dashboard } from './pages/Dashboard';
import { SOPManager } from './pages/SOPManager';
import { Employees } from './pages/Employees';
import { Reports } from './pages/Reports';
import { UploadSOP } from './pages/UploadSOP';
import { HeyGen } from './pages/HeyGen';
import { Certifications } from './pages/Certifications';
import { Departments } from './pages/Departments';

const AppContent = () => {
  const { activePage } = useTenant();

  // Simple router based on activePage state
  const renderActivePage = () => {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard />;
      case 'sop':
        return <SOPManager />;
      case 'karyawan':
        return <Employees />;
      case 'laporan':
        return <Reports />;
      case 'upload':
        return <UploadSOP />;
      case 'heygen':
        return <HeyGen />;
      case 'sertifikasi':
        return <Certifications />;
      case 'departemen':
        return <Departments />;
      case 'pengaturan':
        return (
          <div className="content">
            <h2 style={{ fontSize: '20px', marginBottom: '10px' }}>Pengaturan LMS</h2>
            <p style={{ color: 'var(--text2)' }}>Pengaturan umum, integrasi API, dan profil perusahaan klien.</p>
          </div>
        );
      default:
        return <Dashboard />;
    }
  };

  return (
    <>
      <Sidebar />
      <main className="main">
        <Topbar />
        {renderActivePage()}
      </main>
      <PlanSwitcher />
    </>
  );
};

function App() {
  return (
    <TenantProvider>
      <AppContent />
    </TenantProvider>
  );
}

export default App;
