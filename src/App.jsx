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
import { QuizGrading } from './pages/QuizGrading';
import { Settings } from './pages/Settings';

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
      case 'penilaian':
        return <QuizGrading />;
      case 'pengaturan':
        return <Settings />;
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
