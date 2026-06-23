import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { useTenant } from '../context/TenantContext';
import { getEmployeeLimit } from '../utils/featureGates';

export const Employees = () => {
  const { tenant, employees, addEmployee, deleteEmployee, updateEmployee, currentUser } = useTenant();
  const isSupervisor = currentUser.role !== 'admin';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [dept, setDept] = useState(isSupervisor ? currentUser.dept : 'Sales');
  const [city, setCity] = useState('Jakarta');

  const [editEmp, setEditEmp] = useState(null);
  const [editForm, setEditForm] = useState({});

  const [showImport, setShowImport] = useState(false);
  const [importRows, setImportRows] = useState([]);
  const [importError, setImportError] = useState('');

  const DEPT_OPTIONS = ['Sales', 'HRD', 'Operasional', 'Finance', 'CS', 'IT'];

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
            const empName = String(r[0] || '').trim();
            const empEmail = String(r[1] || '').trim();
            const empDept = String(r[2] || 'Sales').trim();
            const empCity = String(r[3] || 'Jakarta').trim();
            const validDept = DEPT_OPTIONS.find(d => d.toLowerCase() === empDept.toLowerCase()) || 'Sales';
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
    toAdd.forEach(r => addEmployee({ id: Date.now() + Math.random(), name: r.name, email: r.email || '', dept: r.dept, city: r.city, score: 0 }));
    setShowImport(false);
    setImportRows([]);
    alert(`${toAdd.length} karyawan berhasil ditambahkan!${toAdd.length < validRows.length ? `\n${validRows.length - toAdd.length} baris dilewati karena kuota penuh.` : ''}`);
  };

  const limit = getEmployeeLimit(tenant.plan);
  
  const [deptFilter, setDeptFilter] = useState('');

  const displayEmployees = isSupervisor
    ? employees.filter(e => e.dept.toLowerCase() === currentUser.dept.toLowerCase())
    : deptFilter
      ? employees.filter(e => e.dept.toLowerCase() === deptFilter.toLowerCase())
      : employees;

  const totalCount = employees.length;
  const isFull = totalCount >= limit;

  const handleAddEmployee = (e) => {
    e.preventDefault();
    if (!name.trim()) return alert('Nama karyawan tidak boleh kosong!');

    if (isFull) {
      alert(`Gagal! Batas kuota karyawan untuk Paket ${tenant.plan.toUpperCase()} adalah ${limit} karyawan. Silakan upgrade paket Anda.`);
      return;
    }

    const newEmp = {
      id: Date.now(),
      name,
      email: email.trim(),
      dept: isSupervisor ? currentUser.dept : dept,
      city,
      score: 0
    };

    addEmployee(newEmp);
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
                <select
                  value={deptFilter}
                  onChange={e => setDeptFilter(e.target.value)}
                  style={{ fontSize: '12px', height: '38px', padding: '0 32px 0 10px', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text2)', background: `#fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E") no-repeat right 10px center`, appearance: 'none', WebkitAppearance: 'none', minWidth: '180px', cursor: 'pointer' }}
                >
                  <option value="">Semua Departemen</option>
                  {DEPT_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>
          )}

          <div className="card">
            <div className="card-body">
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--surface2)', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '12px 20px', fontSize: '11px', color: 'var(--text3)', textTransform: 'uppercase' }}>Nama Karyawan</th>
                    <th style={{ padding: '12px 20px', fontSize: '11px', color: 'var(--text3)', textTransform: 'uppercase' }}>Departemen</th>
                    <th style={{ padding: '12px 20px', fontSize: '11px', color: 'var(--text3)', textTransform: 'uppercase' }}>Cabang / Kota</th>
                    <th style={{ padding: '12px 20px', fontSize: '11px', color: 'var(--text3)', textTransform: 'uppercase', textAlign: 'right' }}>SOP Selesai</th>
                    {!isSupervisor && <th style={{ padding: '12px 20px', fontSize: '11px', color: 'var(--text3)', textTransform: 'uppercase', textAlign: 'center' }}>Aksi</th>}
                  </tr>
                </thead>
                <tbody>
                  {displayEmployees.map((emp) => (
                    <tr key={emp.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '14px 20px', fontWeight: '500' }}>{emp.name}</td>
                      <td style={{ padding: '14px 20px' }}>
                        <span className={`dept-tag dt-${emp.dept.toLowerCase()}`} style={{ display: 'inline-block' }}>
                          {emp.dept}
                        </span>
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
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* REGISTER EMPLOYEE (ADD FORM WITH QUOTA GATING) */}
        <div>
          {/* TITLE & HEADER SECTION */}
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
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  style={{
                    flex: 1,
                    fontSize: '12px',
                    padding: '8px 12px',
                    background: '#ffffff',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    color: 'var(--text2)',
                    fontWeight: '600',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    height: '38px',
                    boxSizing: 'border-box',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = '#f8fafc';
                    e.currentTarget.style.borderColor = 'var(--text3)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = '#ffffff';
                    e.currentTarget.style.borderColor = 'var(--border)';
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Template Excel
                </button>
                <label
                  style={{
                    flex: 1,
                    fontSize: '12px',
                    padding: '8px 12px',
                    background: 'var(--navy)',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    color: '#fff',
                    fontWeight: '600',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    height: '38px',
                    boxSizing: 'border-box',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = 'var(--accent)'}
                  onMouseOut={(e) => e.currentTarget.style.background = 'var(--navy)'}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
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
                <div style={{ fontSize: '12px' }}>
                  Kuota Tersisa: <strong>{limit - totalCount} akun</strong> lagi.
                </div>
              </div>
            )}

            <form onSubmit={handleAddEmployee}>
              <div className="form-group">
                <label className="form-label">Nama Lengkap</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Contoh: Budi Santoso"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isFull || isSupervisor}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Karyawan</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="Contoh: budi.s@perusahaan.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isFull || isSupervisor}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Departemen</label>
                <select className="form-select" value={dept} onChange={(e) => setDept(e.target.value)} disabled={isFull || isSupervisor}>
                  {isSupervisor ? (
                    <option value={currentUser.dept}>{currentUser.dept}</option>
                  ) : (
                    <>
                      <option value="Sales">Sales</option>
                      <option value="HRD">HRD</option>
                      <option value="Operasional">Operasional</option>
                      <option value="Finance">Finance</option>
                      <option value="CS">Customer Service</option>
                      <option value="IT">IT</option>
                    </>
                  )}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Cabang / Kota</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Contoh: Jakarta"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  disabled={isFull || isSupervisor}
                />
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
            {/* Modal header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: '700', fontSize: '15px', color: 'var(--text1)' }}>Preview Import Karyawan</div>
                <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '2px' }}>
                  {importRows.filter(r => !r.errors.length).length} valid · {importRows.filter(r => r.errors.length).length} error
                  {limit !== Infinity && ` · kuota tersisa ${Math.max(0, limit - totalCount)}`}
                </div>
              </div>
              <button onClick={() => { setShowImport(false); setImportRows([]); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: 'var(--text3)' }}>✕</button>
            </div>

            {/* Table */}
            <div style={{ overflowY: 'auto', flex: 1 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: 'var(--surface2)', position: 'sticky', top: 0 }}>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', color: 'var(--text3)', textTransform: 'uppercase' }}>Baris</th>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', color: 'var(--text3)', textTransform: 'uppercase' }}>Nama Lengkap</th>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', color: 'var(--text3)', textTransform: 'uppercase' }}>Email</th>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', color: 'var(--text3)', textTransform: 'uppercase' }}>Departemen</th>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', color: 'var(--text3)', textTransform: 'uppercase' }}>Cabang/Kota</th>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', color: 'var(--text3)', textTransform: 'uppercase' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {importRows.map((r) => (
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

            {/* Modal footer */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => { setShowImport(false); setImportRows([]); }} style={{ padding: '8px 16px', background: '#f1f5f9', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: 'var(--text2)' }}>
                Batal
              </button>
              <button
                onClick={handleConfirmImport}
                disabled={!importRows.filter(r => !r.errors.length).length || isFull}
                style={{ padding: '8px 20px', background: 'var(--accent)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: '#fff', opacity: (!importRows.filter(r => !r.errors.length).length || isFull) ? 0.5 : 1 }}
              >
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
                  <input
                    type={type || 'text'}
                    value={editForm[key] || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, [key]: e.target.value }))}
                    placeholder={placeholder}
                    style={{ width: '100%', padding: '9px 12px', fontSize: '13px', border: '1px solid var(--border)', borderRadius: '8px', outline: 'none', boxSizing: 'border-box', color: 'var(--text1)' }}
                  />
                </div>
              ))}
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => setEditEmp(null)} style={{ padding: '8px 16px', background: '#f1f5f9', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: 'var(--text2)' }}>
                Batal
              </button>
              <button
                onClick={() => { updateEmployee(editEmp.id, editForm); setEditEmp(null); }}
                disabled={!editForm.name?.trim()}
                style={{ padding: '8px 20px', background: 'var(--accent)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: '#fff', opacity: !editForm.name?.trim() ? 0.5 : 1 }}
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
