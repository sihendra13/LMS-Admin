import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';

const ToastContext = createContext();

export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'success', duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  }, []);

  const toast = {
    success: (msg) => addToast(msg, 'success'),
    error: (msg) => addToast(msg, 'error', 6000),
    info: (msg) => addToast(msg, 'info'),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '8px', pointerEvents: 'none' }}>
        {toasts.map(t => (
          <ToastItem key={t.id} toast={t} onClose={() => setToasts(prev => prev.filter(x => x.id !== t.id))} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

const STYLES = {
  success: { bg: '#f0fdf4', border: '#bbf7d0', color: '#16a34a' },
  error: { bg: '#fef2f2', border: '#fca5a5', color: '#dc2626' },
  info: { bg: '#eff6ff', border: '#bfdbfe', color: '#2563eb' },
};

const ICONS = {
  success: (c) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
  error: (c) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>,
  info: (c) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>,
};

const ToastItem = ({ toast, onClose }) => {
  const [visible, setVisible] = useState(false);
  const s = STYLES[toast.type] || STYLES.info;

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  return (
    <div style={{
      background: s.bg, border: `1px solid ${s.border}`, borderRadius: '10px',
      padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.08)', pointerEvents: 'auto', minWidth: '280px', maxWidth: '420px',
      transform: visible ? 'translateX(0)' : 'translateX(100%)',
      opacity: visible ? 1 : 0,
      transition: 'transform 0.3s ease-out, opacity 0.3s ease-out',
    }}>
      {(ICONS[toast.type] || ICONS.info)(s.color)}
      <span style={{ fontSize: '13px', fontWeight: '600', color: s.color, flex: 1 }}>{toast.message}</span>
      <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: s.color, fontSize: '16px', padding: '0 2px', lineHeight: 1 }}>×</button>
    </div>
  );
};
