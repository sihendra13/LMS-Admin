import React, { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { useTenant } from '../context/TenantContext';
import { getEmployeeLimit } from '../utils/featureGates';

const SearchableDeptSelect = ({ value, onChange, departments, showAllOption = false, disabled = false, align = 'left' }) => {
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

  const label = value === '' ? 'Semua Departemen' : (value || departments[0] || 'Pilih...');

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
              placeholder="Cari departemen..."
              style={{ width: '100%', padding: '6px 10px', fontSize: '12px', border: '1px solid var(--border)', borderRadius: '6px', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ maxHeight: '200px', overflowY: 'scroll', scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 transparent' }}>
            {filtered.map(d => (
              <div
                key={d}
                onClick={() => { onChange(d); setOpen(false); setSearch(''); }}
                style={{ padding: '8px 12px', fontSize: '12px', cursor: 'pointer', background: value === d ? '#eff6ff' : 'transparent', color: value === d ? '#1d4ed8' : 'var(--text2)', fontWeight: value === d ? '600' : '400' }}
                onMouseEnter={e => { if (value !== d) e.currentTarget.style.background = 'var(--surface2)'; }}
                onMouseLeave={e => { if (value !== d) e.currentTarget.style.background = 'transparent'; }}
              >
                {d === '' ? 'Semua Departemen' : d}
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

const DEPT_COLORS = [
  { bg: '#eff6ff', text: '#2F7BFF' },
  { bg: '#f5f3ff', text: '#8b5cf6' },
  { bg: '#f0fdf4', text: '#10b981' },
  { bg: '#fffbeb', text: '#f59e0b' },
  { bg: '#ecfeff', text: '#06b6d4' },
  { bg: '#fdf2f8', text: '#db2777' },
  { bg: '#fff7ed', text: '#ea580c' },
  { bg: '#f0fdf4', text: '#16a34a' },
];

export const Employees = () => {
  const { tenant, employees, addEmployee, deleteEmployee, updateEmployee, currentUser, departments, addDepartmentsBatch } = useTenant();
  const isSupervisor = currentUser.role !== 'admin';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [dept, setDept] = useState(isSupervisor ? currentUser.dept : (departments[0] || 'Sales'));
  const [city, setCity] = useState('Jakarta');

  const [editEmp, setEditEmp] = useState(null);
  const [editForm, setEditForm] = useState({});

  const [showImport, setShowImport] = useState(false);
  const [importRows, setImportRows] = useState([]);
  const [importError, setImportError] = useState('');

  const [deptFilter, setDeptFilter] = useState('');

  // --- Pagination ---
  const PAGE_SIZE = 20;
  const [currentPage, setCurrentPage] = useState(1);

  // --- Bulk Actions state ---
  const [selectedIds, setSelectedIds] = useState(new Set());

  const displayEmployees = isSupervisor
    ? employees.filter(e => e.dept.toLowerCase() === currentUser.dept.toLowerCase())
    : deptFilter
      ? employees.filter(e => e.dept.toLowerCase() === deptFilter.toLowerCase())
      : employees;

  const limit      = getEmployeeLimit(tenant.plan);
  const totalCount = employees.length;
  const isFull     = totalCount >= limit;

  // --- Bulk helpers ---
  const allSelected      = displayEmployees.length > 0 && displayEmployees.every(e => selectedIds.has(e.id));
  const someSelected     = selectedIds.size > 0;
  const selectedEmployees = displayEmployees.filter(e => selectedIds.has(e.id));

  const toggleSelect = (id) => setSelectedIds(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const toggleAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(displayEmployees.map(e => e.id)));
  };

  const handleDeptFilterChange = (e) => {
    setDeptFilter(e.target.value);
    setSelectedIds(new Set());
    setCurrentPage(1);
  };

  const handleBulkDelete = () => {
    if (!window.confirm(`Hapus ${selectedIds.size} karyawan terpilih?\n\nData ini tidak dapat dikembalikan.`)) return;
    selectedIds.forEach(id => deleteEmployee(id));
    setSelectedIds(new Set());
  };

  const handleExportSelected = () => {
    const rows = selectedEmployees.map(e => ({
      'Nama Karyawan': e.name,
      'Email': e.email || '-',
      'Departemen': e.dept,
      'Cabang / Kota': e.city || '-',
      'SOP Selesai': e.score || 0,
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Karyawan');
    const today = new Date().toLocaleDateString('id-ID').replace(/\//g, '-');
    XLSX.writeFile(wb, `Export_Karyawan_${today}.xlsx`);
  };


  // --- Existing handlers ---
  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['Nama Lengkap', 'Email', 'Departemen', 'Cabang/Kota'],
      ['Budi Santoso', 'budi.s@perusahaan.com', 'Sales', 'Jakarta'],
      ['Siti Rahayu', 'siti.r@perusahaan.com', 'HRD', 'Bandung'],
      ['Agus Wijaya', 'agus.w@perusahaan.com', 'Operasional', 'Surabaya'],
    ]);
    ws['!cols'] = [{ wch: 30 }, { wch: 32 }, { wch: 20 }, { wch: 20 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Karyawan');
    XLSX.writeFile(wb, 'Template_Import_Karyawan.xlsx');
  };

  const handleImportFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImportError('');
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json(ws, { header: 1 });
        const rows = raw.slice(1)
          .filter(r => r[0] && String(r[0]).trim())
          .map((r, idx) => {
            const empName  = String(r[0] || '').trim();
            const empEmail = String(r[1] || '').trim();
            const empDept  = String(r[2] || '').trim();
            const empCity  = String(r[3] || 'Jakarta').trim();
            const validDept = empDept || departments[0] || 'Sales';
            const errors = [];
            if (!empName) errors.push('Nama kosong');
            return { _idx: idx + 2, name: empName, email: empEmail, dept: validDept, city: empCity, errors };
          });
        if (!rows.length) { setImportError('File kosong atau format tidak sesuai template.'); return; }
        setImportRows(rows);
        setShowImport(true);
      } catch {
        setImportError('Gagal membaca file. Pastikan format .xlsx sesuai template.');
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const handleConfirmImport = () => {
    const validRows = importRows.filter(r => !r.errors.length);
    const remaining = limit - totalCount;
    const toAdd = limit === Infinity ? validRows : validRows.slice(0, remaining);

    // Auto-create new departments from Excel in one batch (avoids stale state bug)
    const uniqueDepts = [...new Set(toAdd.map(r => r.dept).filter(Boolean))];
    addDepartmentsBatch(uniqueDepts);

    toAdd.forEach(r => addEmployee({ id: Date.now() + Math.random(), name: r.name, email: r.email || '', dept: r.dept, city: r.city, score: 0 }));
    setShowImport(false);
    setImportRows([]);
    if (toAdd.length < validRows.length) {
      const skipped = validRows.length - toAdd.length;
      alert(
        `✅ ${toAdd.length} karyawan berhasil didaftarkan.\n\n` +
        `⚠️ ${skipped} karyawan tidak bisa didaftarkan karena melebihi kuota ${limit} karyawan di Paket ${tenant.plan.toUpperCase()}.\n\n` +
        `Upgrade ke paket yang lebih tinggi untuk mendaftarkan lebih banyak karyawan.`
      );
    } else {
      alert(`✅ ${toAdd.length} karyawan berhasil didaftarkan!`);
    }
  };

  const handleAddEmployee = (e) => {
    e.preventDefault();
    if (!name.trim()) return alert('Nama karyawan tidak boleh kosong!');
    if (isFull) {
      alert(`Kuota karyawan Anda sudah penuh (${totalCount}/${limit} di Paket ${tenant.plan.toUpperCase()}).\n\nUpgrade ke paket yang lebih tinggi untuk mendaftarkan lebih banyak karyawan.`);
      return;
    }
    addEmployee({ id: Date.now(), name, email: email.trim(), dept: isSupervisor ? currentUser.dept : dept, city, score: 0 });
    setName('');
    setEmail('');
    alert('Karyawan baru berhasil ditambahkan!');
  };

  return (
    <div className="content">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px' }}>

        {/* EMPLOYEES LIST */}
        <div>
          {isSupervisor ? (
            <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="section-title">
                Daftar Karyawan Terdaftar ({displayEmployees.length} / {limit === Infinity ? '∞' : limit})
              </div>
            </div>
          ) : (
            <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h3 style={{ fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text2)', margin: '0', letterSpacing: '0.05em', lineHeight: '1.2', height: '16px', display: 'flex', alignItems: 'center' }}>
                DAFTAR KARYAWAN TERDAFTAR ({displayEmployees.length} / {limit === Infinity ? '∞' : limit})
              </h3>
              <div style={{ display: 'flex', height: '38px', alignItems: 'center' }}>
                <SearchableDeptSelect
                  value={deptFilter}
                  onChange={(val) => { setDeptFilter(val); setSelectedIds(new Set()); setCurrentPage(1); }}
                  departments={departments}
                  showAllOption
                />
              </div>
            </div>
          )}

          {/* BULK ACTION BAR */}
          {!isSupervisor && someSelected && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#1d4ed8', marginRight: '4px' }}>
                {selectedIds.size} karyawan dipilih
              </span>
              <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto', flexWrap: 'wrap' }}>
                <button onClick={handleExportSelected}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px', fontSize: '12px', fontWeight: '600', borderRadius: '6px', border: '1px solid #93c5fd', background: '#fff', color: '#1d4ed8', cursor: 'pointer' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Export XLSX
                </button>
                <button onClick={handleBulkDelete}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px', fontSize: '12px', fontWeight: '600', borderRadius: '6px', border: '1px solid #fca5a5', background: '#fff', color: '#dc2626', cursor: 'pointer' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                  </svg>
                  Hapus ({selectedIds.size})
                </button>
                <button onClick={() => setSelectedIds(new Set())}
                  style={{ padding: '6px 14px', fontSize: '12px', fontWeight: '600', borderRadius: '6px', border: '1px solid var(--border)', background: '#f1f5f9', color: 'var(--text2)', cursor: 'pointer' }}>
                  Batal
                </button>
              </div>
            </div>
          )}

          {(() => {
            const totalPages = Math.ceil(displayEmployees.length / PAGE_SIZE);
            if (totalPages <= 1) return null;
            const btnBase = { padding: '5px 12px', fontSize: '12px', fontWeight: '600', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer' };
            return (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text3)' }}>
                  {Math.min((currentPage - 1) * PAGE_SIZE + 1, displayEmployees.length)}–{Math.min(currentPage * PAGE_SIZE, displayEmployees.length)} dari {displayEmployees.length} karyawan
                </span>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                    style={{ ...btnBase, background: currentPage === 1 ? '#f1f5f9' : '#fff', color: currentPage === 1 ? 'var(--text3)' : 'var(--text1)', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}>
                    ← Prev
                  </button>
                  <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text2)', padding: '0 4px' }}>
                    {currentPage} / {totalPages}
                  </span>
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                    style={{ ...btnBase, background: currentPage === totalPages ? '#f1f5f9' : '#fff', color: currentPage === totalPages ? 'var(--text3)' : 'var(--text1)', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}>
                    Next →
                  </button>
                </div>
              </div>
            );
          })()}

          <div className="card">
            <div className="card-body">
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--surface2)', borderBottom: '1px solid var(--border)' }}>
                    {!isSupervisor && (
                      <th style={{ padding: '12px 16px', width: '40px' }}>
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={toggleAll}
                          style={{ cursor: 'pointer', width: '15px', height: '15px' }}
                          title={allSelected ? 'Batal pilih semua' : 'Pilih semua'}
                        />
                      </th>
                    )}
                    <th style={{ padding: '12px 20px', fontSize: '11px', color: 'var(--text3)', textTransform: 'uppercase' }}>Nama Karyawan</th>
                    <th style={{ padding: '12px 20px', fontSize: '11px', color: 'var(--text3)', textTransform: 'uppercase' }}>Departemen</th>
                    <th style={{ padding: '12px 20px', fontSize: '11px', color: 'var(--text3)', textTransform: 'uppercase' }}>Cabang / Kota</th>
                    <th style={{ padding: '12px 20px', fontSize: '11px', color: 'var(--text3)', textTransform: 'uppercase', textAlign: 'right' }}>SOP Selesai</th>
                    {!isSupervisor && <th style={{ padding: '12px 20px', fontSize: '11px', color: 'var(--text3)', textTransform: 'uppercase', textAlign: 'center' }}>Aksi</th>}
                  </tr>
                </thead>
                <tbody>
                  {displayEmployees.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE).map((emp) => {
                    const isSelected = selectedIds.has(emp.id);
                    return (
                      <tr key={emp.id} style={{ borderBottom: '1px solid var(--border)', background: isSelected ? '#f0f7ff' : 'transparent' }}>
                        {!isSupervisor && (
                          <td style={{ padding: '14px 16px' }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelect(emp.id)}
                              style={{ cursor: 'pointer', width: '15px', height: '15px' }}
                            />
                          </td>
                        )}
                        <td style={{ padding: '14px 20px', fontWeight: '500' }}>{emp.name}</td>
                        <td style={{ padding: '14px 20px' }}>
                          {(() => {
                            const idx = departments.indexOf(emp.dept);
                            const c = DEPT_COLORS[(idx >= 0 ? idx : 0) % DEPT_COLORS.length];
                            return (
                              <span 
                                title={emp.dept}
                                style={{ 
                                  fontSize: '10px', 
                                  fontWeight: '600', 
                                  padding: '4px 10px', 
                                  borderRadius: '99px', 
                                  letterSpacing: '0.03em', 
                                  background: c.bg, 
                                  color: c.text, 
                                  display: 'inline-block',
                                  maxWidth: '180px',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  verticalAlign: 'middle',
                                  lineHeight: '1.2'
                                }}
                              >
                                {emp.dept}
                              </span>
                            );
                          })()}
                        </td>
                        <td style={{ padding: '14px 20px', color: 'var(--text2)' }}>{emp.city}</td>
                        <td style={{ padding: '14px 20px', fontWeight: '600', color: 'var(--accent)', textAlign: 'right' }}>{emp.score} SOP</td>
                        {!isSupervisor && (
                          <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                              <button
                                type="button"
                                title="Edit karyawan"
                                onClick={() => { setEditEmp(emp); setEditForm({ name: emp.name, email: emp.email || '', dept: emp.dept, city: emp.city || '' }); }}
                                style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '6px', padding: '5px 8px', cursor: 'pointer', color: 'var(--text3)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                              >
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                </svg>
                              </button>
                              <button
                                type="button"
                                title="Hapus karyawan"
                                onClick={() => {
                                  if (window.confirm(`Hapus karyawan "${emp.name}"?\n\nData karyawan ini akan dihapus permanen.`)) {
                                    deleteEmployee(emp.id);
                                    setSelectedIds(prev => { const next = new Set(prev); next.delete(emp.id); return next; });
                                  }
                                }}
                                style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '6px', padding: '5px 8px', cursor: 'pointer', color: 'var(--text3)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                              >
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                                </svg>
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* REGISTER EMPLOYEE */}
        <div>
          {isSupervisor ? (
            <div className="section-header" style={{ marginBottom: '16px' }}>
              <div className="section-title">Registrasi Karyawan</div>
            </div>
          ) : (
            <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h3 style={{ fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text2)', margin: '0', letterSpacing: '0.05em', lineHeight: '1.2', height: '16px', display: 'flex', alignItems: 'center' }}>
                REGISTRASI KARYAWAN
              </h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" onClick={handleDownloadTemplate}
                  style={{ flex: 1, fontSize: '12px', padding: '8px 12px', background: '#ffffff', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', color: 'var(--text2)', fontWeight: '600', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', height: '38px', boxSizing: 'border-box' }}
                  onMouseOver={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = 'var(--text3)'; }}
                  onMouseOut={e => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.borderColor = 'var(--border)'; }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Template Excel
                </button>
                <label style={{ flex: 1, fontSize: '12px', padding: '8px 12px', background: 'var(--navy)', border: 'none', borderRadius: '6px', cursor: 'pointer', color: '#fff', fontWeight: '600', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', height: '38px', boxSizing: 'border-box' }}
                  onMouseOver={e => e.currentTarget.style.background = 'var(--accent)'}
                  onMouseOut={e => e.currentTarget.style.background = 'var(--navy)'}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  Import Excel
                  <input type="file" accept=".xlsx,.xls" onChange={handleImportFile} style={{ display: 'none' }} />
                </label>
              </div>
            </div>
          )}

          {importError && (
            <div style={{ background: '#fff5f5', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 14px', marginBottom: '12px', color: '#dc2626', fontSize: '12px', fontWeight: '600' }}>
              ⚠️ {importError}
            </div>
          )}

          <div className="card" style={{ padding: '20px', opacity: isSupervisor ? 0.6 : 1 }}>
            {isSupervisor ? (
              <div style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px', marginBottom: '16px', color: 'var(--text2)' }}>
                <div style={{ fontWeight: '600', fontSize: '13px' }}>🔒 Hanya HRD Admin yang dapat mendaftarkan karyawan.</div>
              </div>
            ) : isFull ? (
              <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '8px', padding: '12px 14px', marginBottom: '16px', color: 'var(--red)' }}>
                <div style={{ fontWeight: '600', fontSize: '13px', marginBottom: '4px' }}>⚠️ Kuota Paket Penuh!</div>
                <div style={{ fontSize: '11px', lineHeight: '1.4' }}>
                  Jumlah karyawan telah mencapai limit {limit} orang untuk Paket {tenant.plan.toUpperCase()}. Upgrade paket untuk menambah lebih banyak akun karyawan.
                </div>
              </div>
            ) : (
              <div style={{ background: '#ecfdf5', border: '1px solid #d1fae5', borderRadius: '8px', padding: '12px 14px', marginBottom: '16px', color: 'var(--green)' }}>
                <div style={{ fontSize: '12px' }}>Kuota Tersisa: <strong>{limit - totalCount} akun</strong> lagi.</div>
              </div>
            )}

            <form onSubmit={handleAddEmployee}>
              <div className="form-group">
                <label className="form-label">Nama Lengkap</label>
                <input type="text" className="form-input" placeholder="Contoh: Budi Santoso" value={name} onChange={e => setName(e.target.value)} disabled={isFull || isSupervisor} />
              </div>
              <div className="form-group">
                <label className="form-label">Email Karyawan</label>
                <input type="email" className="form-input" placeholder="Contoh: budi.s@perusahaan.com" value={email} onChange={e => setEmail(e.target.value)} disabled={isFull || isSupervisor} />
              </div>
              <div className="form-group">
                <label className="form-label">Departemen</label>
                {isSupervisor ? (
                  <input className="form-input" value={currentUser.dept} disabled style={{ background: 'var(--surface2)', color: 'var(--text3)' }} readOnly />
                ) : (
                  <SearchableDeptSelect
                    value={dept}
                    onChange={setDept}
                    departments={departments}
                    disabled={isFull}
                    align="right"
                  />
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Cabang / Kota</label>
                <input type="text" className="form-input" placeholder="Contoh: Jakarta" value={city} onChange={e => setCity(e.target.value)} disabled={isFull || isSupervisor} />
              </div>
              <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '12px' }} disabled={isFull || isSupervisor}>
                {isSupervisor ? '🔒 Hanya HRD Admin' : isFull ? '🔒 Kuota Karyawan Penuh' : 'Daftarkan Karyawan'}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* IMPORT PREVIEW MODAL */}
      {showImport && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '640px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: '700', fontSize: '15px', color: 'var(--text1)' }}>Preview Import Karyawan</div>
                <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '2px' }}>
                  {importRows.filter(r => !r.errors.length).length} data valid · {importRows.filter(r => r.errors.length).length} error
                  {limit !== Infinity && (() => {
                    const validCount = importRows.filter(r => !r.errors.length).length;
                    const sisa = Math.max(0, limit - totalCount);
                    const willAdd = Math.min(validCount, sisa);
                    return validCount > sisa
                      ? <span style={{ color: '#dc2626', fontWeight: '600' }}> · Kuota tersisa {sisa} — hanya {willAdd} yang bisa didaftarkan</span>
                      : ` · kuota tersisa ${sisa}`;
                  })()}
                </div>
              </div>
              <button onClick={() => { setShowImport(false); setImportRows([]); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: 'var(--text3)' }}>✕</button>
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: 'var(--surface2)', position: 'sticky', top: 0 }}>
                    {['Baris', 'Nama Lengkap', 'Email', 'Departemen', 'Cabang/Kota', 'Status'].map(h => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', color: 'var(--text3)', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {importRows.map(r => (
                    <tr key={r._idx} style={{ borderBottom: '1px solid var(--border)', background: r.errors.length ? '#fff5f5' : 'transparent' }}>
                      <td style={{ padding: '10px 16px', color: 'var(--text3)' }}>{r._idx}</td>
                      <td style={{ padding: '10px 16px', fontWeight: '500' }}>{r.name}</td>
                      <td style={{ padding: '10px 16px', color: 'var(--text2)', fontSize: '12px' }}>{r.email || '-'}</td>
                      <td style={{ padding: '10px 16px' }}>{r.dept}</td>
                      <td style={{ padding: '10px 16px', color: 'var(--text2)' }}>{r.city}</td>
                      <td style={{ padding: '10px 16px' }}>
                        {r.errors.length
                          ? <span style={{ color: '#dc2626', fontWeight: '600', fontSize: '11px' }}>✕ {r.errors.join(', ')}</span>
                          : <span style={{ color: '#16a34a', fontWeight: '600', fontSize: '11px' }}>✓ OK</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => { setShowImport(false); setImportRows([]); }} style={{ padding: '8px 16px', background: '#f1f5f9', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: 'var(--text2)' }}>Batal</button>
              <button onClick={handleConfirmImport} disabled={!importRows.filter(r => !r.errors.length).length || isFull}
                style={{ padding: '8px 20px', background: 'var(--accent)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: '#fff', opacity: (!importRows.filter(r => !r.errors.length).length || isFull) ? 0.5 : 1 }}>
                Tambahkan {Math.min(importRows.filter(r => !r.errors.length).length, limit === Infinity ? Infinity : Math.max(0, limit - totalCount))} Karyawan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT EMPLOYEE MODAL */}
      {editEmp && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '480px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: '700', fontSize: '15px', color: 'var(--text1)' }}>Edit Karyawan</div>
              <button onClick={() => setEditEmp(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: 'var(--text3)' }}>✕</button>
            </div>
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {[
                { label: 'Nama Lengkap', key: 'name', placeholder: 'Nama karyawan' },
                { label: 'Email', key: 'email', placeholder: 'email@perusahaan.com', type: 'email' },
                { label: 'Departemen', key: 'dept', placeholder: 'Contoh: Sales, HR, IT' },
                { label: 'Cabang / Kota', key: 'city', placeholder: 'Contoh: Jakarta, Surabaya' },
              ].map(({ label, key, placeholder, type }) => (
                <div key={key}>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text2)', display: 'block', marginBottom: '6px' }}>{label}</label>
                  <input type={type || 'text'} value={editForm[key] || ''} onChange={e => setEditForm(prev => ({ ...prev, [key]: e.target.value }))} placeholder={placeholder}
                    style={{ width: '100%', padding: '9px 12px', fontSize: '13px', border: '1px solid var(--border)', borderRadius: '8px', outline: 'none', boxSizing: 'border-box', color: 'var(--text1)' }} />
                </div>
              ))}
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => setEditEmp(null)} style={{ padding: '8px 16px', background: '#f1f5f9', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: 'var(--text2)' }}>Batal</button>
              <button onClick={() => { updateEmployee(editEmp.id, editForm); setEditEmp(null); }} disabled={!editForm.name?.trim()}
                style={{ padding: '8px 20px', background: 'var(--accent)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: '#fff', opacity: !editForm.name?.trim() ? 0.5 : 1 }}>
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
