import React, { useState, useRef } from 'react';
import { useTenant } from '../context/TenantContext';
import { PLANS } from '../utils/featureGates';

export const PlanSwitcher = () => {
  const { tenant, changePlan, currentUser, setCurrentUser, setActivePage, authUser } = useTenant();
  const adminName = authUser?.name || 'HRD Admin';
  const adminAvatar = adminName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  // Sembunyikan widget simulasi untuk user SPV — ini hanya untuk demo ke klien
  if (authUser?.role === 'supervisor') return null;

  // Draggable states
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });

  const handleUserChange = (user) => {
    setCurrentUser(user);
    setActivePage('dashboard');
  };

  const handleMouseDown = (e) => {
    // Only drag when clicking the switcher wrapper itself or titles, not the buttons
    if (e.target.tagName === 'BUTTON') return;
    
    isDragging.current = true;
    dragStart.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e) => {
    if (!isDragging.current) return;
    setPosition({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y
    });
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  return (
    <div 
      className="plan-switcher" 
      style={{ 
        gap: '10px',
        transform: `translate(${position.x}px, ${position.y}px)`,
        cursor: 'grab',
        userSelect: 'none',
        boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
        transition: isDragging.current ? 'none' : 'transform 0.1s ease'
      }}
      onMouseDown={handleMouseDown}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '6px', cursor: 'move' }}>
        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: '700' }}>✋ DRAG UNTUK PINDAH</span>
      </div>
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
            onClick={() => handleUserChange({ id: authUser?.id || 1, name: adminName, role: 'admin', dept: 'HRD', avatar: adminAvatar })}
          >
            👤 {adminName} (HRD Admin)
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
