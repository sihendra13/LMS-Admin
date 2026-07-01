import React, { useState, useRef, useEffect } from 'react';

const CustomSelect = ({ value, onChange, options, disabled = false, align = 'left', minWidth = '160px' }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectedOption = options.find(o => o.value === value);
  const label = selectedOption ? selectedOption.label : 'Pilih...';

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%', minWidth }}>
      <button
        type="button"
        onClick={() => { if (!disabled) setOpen(o => !o); }}
        style={{ width: '100%', height: '38px', padding: '0 32px 0 10px', fontSize: '12px', border: '1px solid var(--border)', borderRadius: '6px', background: disabled ? 'var(--surface2)' : `#fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E") no-repeat right 10px center`, textAlign: 'left', color: disabled ? 'var(--text3)' : 'var(--text2)', cursor: disabled ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
      >
        {label}
      </button>
      {open && !disabled && (
        <div className="custom-scrollbar" style={{ position: 'absolute', top: '42px', [align === 'right' ? 'right' : 'left']: 0, zIndex: 200, background: '#fff', border: '1px solid var(--border)', borderRadius: '8px', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', minWidth: '100%', maxHeight: '160px', overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: '#94a3b8 #f1f5f9' }}>
          {options.map(o => (
            <div
              key={o.value}
              onClick={() => { onChange(o.value); setOpen(false); }}
              style={{ padding: '8px 12px', fontSize: '12px', cursor: 'pointer', background: value === o.value ? '#eff6ff' : 'transparent', color: value === o.value ? '#1d4ed8' : 'var(--text2)', fontWeight: value === o.value ? '600' : '400' }}
              onMouseEnter={e => { if (value !== o.value) e.currentTarget.style.background = 'var(--surface2)'; }}
              onMouseLeave={e => { if (value !== o.value) e.currentTarget.style.background = 'transparent'; }}
            >
              {o.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomSelect;
