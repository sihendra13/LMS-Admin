import React from 'react';
import { useTenant } from '../context/TenantContext';
import { PLANS } from '../utils/featureGates';

export const PlanSwitcher = () => {
  const { tenant, changePlan } = useTenant();

  return (
    <div className="plan-switcher">
      <div className="plan-switcher-title">Simulasi Paket Klien</div>
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
  );
};
