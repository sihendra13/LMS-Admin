import React, { useState, useRef, useEffect } from 'react';

const SearchableDeptSelect = ({ value, onChange, departments, showAllOption = false, disabled = false, align = 'left', placeholder = 'Cari departemen...', allLabel = 'Semua Departemen' }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const options = showAllOption ? ['', ...departments] : departments;
  const filtered = options.filter(d => {
    if (d === '') return true;
    return d.toLowerCase().includes(search.toLowerCase());
  });

  const label = value === '' ? allLabel : (value || departments[0] || 'Pilih...');

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%' }}>
      <button
        type="button"
        onClick={() => { if (!disabled) { setOpen(o => !o); setSearch(''); } }}
        style={{ width: '100%', height: '38px', padding: '0 32px 0 10px', fontSize: '12px', border: '1px solid var(--border)', borderRadius: '6px', background: disabled ? 'var(--surface2)' : `#fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E") no-repeat right 10px center`, textAlign: 'left', color: disabled ? 'var(--text3)' : 'var(--text2)', cursor: disabled ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
      >
        {label}
      </button>
      {open && !disabled && (
        <div style={{ position: 'absolute', top: '42px', [align === 'right' ? 'right' : 'left']: 0, zIndex: 200, background: '#fff', border: '1px solid var(--border)', borderRadius: '8px', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', minWidth: '280px', maxWidth: '380px' }}>
          <div style={{ padding: '8px', borderBottom: '1px solid var(--border)' }}>
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={placeholder}
              style={{ width: '100%', padding: '6px 10px', fontSize: '12px', border: '1px solid var(--border)', borderRadius: '6px', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <div className="custom-scrollbar" style={{ maxHeight: '320px', overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: '#94a3b8 #f1f5f9' }}>
            {filtered.map(d => (
              <div
                key={d}
                onClick={() => { onChange(d); setOpen(false); setSearch(''); }}
                style={{ padding: '8px 12px', fontSize: '12px', cursor: 'pointer', background: value === d ? '#eff6ff' : 'transparent', color: value === d ? '#1d4ed8' : 'var(--text2)', fontWeight: value === d ? '600' : '400' }}
                onMouseEnter={e => { if (value !== d) e.currentTarget.style.background = 'var(--surface2)'; }}
                onMouseLeave={e => { if (value !== d) e.currentTarget.style.background = 'transparent'; }}
              >
                {d === '' ? allLabel : d}
              </div>
            ))}
            {filtered.length === 0 && (
              <div style={{ padding: '12px', fontSize: '12px', color: 'var(--text3)', textAlign: 'center' }}>Tidak ditemukan</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableDeptSelect;
