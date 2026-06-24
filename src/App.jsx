import React, { useState, useEffect } from 'react';
import { TenantProvider, useTenant } from './context/TenantContext';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { PlanSwitcher } from './components/PlanSwitcher';
import { LoginPage } from './pages/LoginPage';
import { supabase } from './utils/supabase';

// Pages
import { Dashboard } from './pages/Dashboard';
import { SOPManager } from './pages/SOPManager';
import { Employees } from './pages/Employees';
import { Reports } from './pages/Reports';
import { UploadSOP } from './pages/UploadSOP';
import { HeyGen } from './pages/HeyGen';
import { Departments } from './pages/Departments';
import { QuizGrading } from './pages/QuizGrading';
import { Settings } from './pages/Settings';
import { ReviewSertifikat } from './pages/ReviewSertifikat';


const AppContent = ({ onLogout }) => {
  const { activePage } = useTenant();
  const mainRef = React.useRef(null);

  useEffect(() => {
    if (mainRef.current) mainRef.current.scrollTop = 0;
  }, [activePage]);

  const renderActivePage = () => {
    switch (activePage) {
      case 'dashboard':    return <Dashboard />;
      case 'sop':          return <SOPManager />;
      case 'karyawan':     return <Employees />;
      case 'laporan':      return <Reports />;
      case 'upload':       return <UploadSOP />;

      case 'heygen':       return <HeyGen />;
      case 'departemen':   return <Departments />;
      case 'penilaian':    return <QuizGrading />;
      case 'review-sertifikat': return <ReviewSertifikat />;
      case 'pengaturan':   return <Settings />;
      default:             return <Dashboard />;
    }
  };

  return (
    <>
      <Sidebar onLogout={onLogout} />
      <main className="main" ref={mainRef}>
        <Topbar />
        {renderActivePage()}
      </main>
      <PlanSwitcher />
    </>
  );
};

function App() {
  const [authUser, setAuthUser] = useState(() => {
    try {
      const stored = localStorage.getItem('axara_user');
      const token = localStorage.getItem('axara_token');
      return stored && token ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const handleLogin = (user) => setAuthUser(user);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('axara_token');
    localStorage.removeItem('axara_refresh_token');
    localStorage.removeItem('axara_user');
    setAuthUser(null);
  };

  if (!authUser) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <TenantProvider authUser={authUser}>
      <AppContent onLogout={handleLogout} />
    </TenantProvider>
  );
}

export default App;
