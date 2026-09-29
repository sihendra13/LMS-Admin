import React, { useState, useEffect } from 'react';
import { TenantProvider, useTenant } from './context/TenantContext';
import { ToastProvider } from './components/Toast';
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
import { AcceptInvitation } from './pages/AcceptInvitation';


const TrialExpired = ({ tenantName, onLogout }) => (
  <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg, #f8fafc)', padding: '16px' }}>
    <div style={{ maxWidth: '440px', width: '100%', background: '#fff', borderRadius: '16px', padding: '32px', boxShadow: '0 10px 30px rgba(15,23,42,0.08)', textAlign: 'center' }}>
      <div style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>Masa trial telah berakhir</div>
      <div style={{ fontSize: '14px', color: '#475569', lineHeight: 1.6, marginBottom: '24px' }}>
        Masa trial 7 hari untuk <strong>{tenantName}</strong> sudah selesai. Semua data Anda (SOP, karyawan, hasil kuis) tetap tersimpan.
        Hubungi tim Axara untuk melanjutkan berlangganan dan mengaktifkan kembali akun Anda.
      </div>
      <button onClick={onLogout} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontWeight: 600 }}>
        Keluar
      </button>
    </div>
  </div>
);

const TrialBanner = ({ daysLeft }) => (
  <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', color: '#9a3412', borderRadius: '10px', padding: '10px 14px', margin: '16px 28px 0', fontSize: '13px', flexShrink: 0 }}>
    <strong>Akun Trial</strong> — tersisa {daysLeft} hari. Data yang Anda buat akan tetap tersimpan saat berlangganan.
  </div>
);

const AppContent = ({ onLogout }) => {
  const { activePage, tenant, isTrial, trialExpired, trialDaysLeft } = useTenant();
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

  if (trialExpired) {
    return <TrialExpired tenantName={tenant.name} onLogout={onLogout} />;
  }

  return (
    <>
      <Sidebar onLogout={onLogout} />
      <main className="main" ref={mainRef}>
        <Topbar />
        {isTrial && <TrialBanner daysLeft={trialDaysLeft} />}
        {renderActivePage()}
      </main>
      {tenant.isDemo && <PlanSwitcher />}
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

  const urlParams = new URLSearchParams(window.location.search);
  const inviteToken = urlParams.get('token');
  const isAcceptPage = window.location.pathname === '/accept-invitation' && inviteToken;

  if (isAcceptPage) {
    return (
      <ToastProvider>
        <AcceptInvitation token={inviteToken} onAccepted={(user) => {
          window.history.replaceState({}, '', '/');
          setAuthUser(user);
        }} />
      </ToastProvider>
    );
  }

  if (!authUser) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <ToastProvider>
      <TenantProvider authUser={authUser}>
        <AppContent onLogout={handleLogout} />
      </TenantProvider>
    </ToastProvider>
  );
}

export default App;
