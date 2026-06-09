import React from 'react';
import { useTenant } from '../context/TenantContext';
import { PLANS } from '../utils/featureGates';

export const PlanSwitcher = () => {
  const { tenant, changePlan, currentUser, setCurrentUser, setActivePage } = useTenant();

  const handleUserChange = (user) => {
    setCurrentUser(user);
    // Redirect to dashboard to prevent permission errors on admin-only pages
    setActivePage('dashboard');
  };

  return (
    <div className="plan-switcher" style={{ gap: '10px' }}>
      <div>
        <div className="plan-switcher-title" style={{ marginBottom: '4px' }}>Simulasi Paket Klien</div>
        <div className="plan-btn-group">
          <button
            className={`plan-btn ${tenant.plan === PLANS.STARTER ? 'active' : ''}`}
            onClick={() => changePlan(PLANS.STARTER)}
          >
            Starter
          </button>
          <button
            className={`plan-btn ${tenant.plan === PLANS.BUSINESS ? 'active' : ''}`}
            onClick={() => changePlan(PLANS.BUSINESS)}
          >
            Business
          </button>
          <button
            className={`plan-btn ${tenant.plan === PLANS.ENTERPRISE ? 'active' : ''}`}
            onClick={() => changePlan(PLANS.ENTERPRISE)}
          >
            Enterprise
          </button>
        </div>
      </div>

      <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '8px' }}>
        <div className="plan-switcher-title" style={{ marginBottom: '4px' }}>Simulasi Peran Login</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <button
            className={`plan-btn ${currentUser.role === 'admin' ? 'active' : ''}`}
            style={{ textAlign: 'left', width: '100%' }}
            onClick={() => handleUserChange({ id: 1, name: 'Andi Saputra', role: 'admin', dept: 'HRD', avatar: 'AS' })}
          >
            👤 Andi S (HRD Admin)
          </button>
          <button
            className={`plan-btn ${currentUser.role === 'supervisor' && currentUser.dept === 'Sales' ? 'active' : ''}`}
            style={{ textAlign: 'left', width: '100%' }}
            onClick={() => handleUserChange({ id: 2, name: 'Rini Wulandari', role: 'supervisor', dept: 'Sales', avatar: 'RW' })}
          >
            👤 Rini W (Lead Sales)
          </button>
          <button
            className={`plan-btn ${currentUser.role === 'supervisor' && currentUser.dept === 'Finance' ? 'active' : ''}`}
            style={{ textAlign: 'left', width: '100%' }}
            onClick={() => handleUserChange({ id: 3, name: 'Budi Pratama', role: 'supervisor', dept: 'Finance', avatar: 'BP' })}
          >
            👤 Budi P (Lead Finance)
          </button>
        </div>
      </div>
    </div>
  );
};
