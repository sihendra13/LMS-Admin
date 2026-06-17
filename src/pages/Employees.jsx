import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { useTenant } from '../context/TenantContext';
import { getEmployeeLimit } from '../utils/featureGates';

export const Employees = () => {
  const { tenant, employees, addEmployee, currentUser } = useTenant();
  const isSupervisor = currentUser.role !== 'admin';

  const [name, setName] = useState('');
  const [dept, setDept] = useState(isSupervisor ? currentUser.dept : 'Sales');
  const [city, setCity] = useState('Jakarta');

  const [showImport, setShowImport] = useState(false);
  const [importRows, setImportRows] = useState([]);
  const [importError, setImportError] = useState('');

  const DEPT_OPTIONS = ['Sales', 'HRD', 'Operasional', 'Finance', 'CS', 'IT'];

  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['Nama Lengkap', 'Departemen', 'Cabang/Kota'],
      ['Budi Santoso', 'Sales', 'Jakarta'],
      ['Siti Rahayu', 'HRD', 'Bandung'],
      ['Agus Wijaya', 'Operasional', 'Surabaya'],
    ]);
    ws['!cols'] = [{ wch: 30 }, { wch: 20 }, { wch: 20 }];
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
            const empDept = String(r[1] || 'Sales').trim();
            const empCity = String(r[2] || 'Jakarta').trim();
            const validDept = DEPT_OPTIONS.find(d => d.toLowerCase() === empDept.toLowerCase()) || 'Sales';
            const errors = [];
            if (!empName) errors.push('Nama kosong');
            return { _idx: idx + 2, name: empName, dept: validDept, city: empCity, errors };
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
    toAdd.forEach(r => addEmployee({ id: Date.now() + Math.random(), name: r.name, dept: r.dept, city: r.city, score: 0 }));
    setShowImport(false);
    setImportRows([]);
    alert(`${toAdd.length} karyawan berhasil ditambahkan!${toAdd.length < validRows.length ? `\n${validRows.length - toAdd.length} baris dilewati karena kuota penuh.` : ''}`);
  };

  const limit = getEmployeeLimit(tenant.plan);
  
  const displayEmployees = isSupervisor
    ? employees.filter(e => e.dept.toLowerCase() === currentUser.dept.toLowerCase())
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
      dept: isSupervisor ? currentUser.dept : dept,
      city,
      score: 0 // New employee has 0 completed SOPs initially
    };

    addEmployee(newEmp);
    setName('');
    alert('Karyawan baru berhasil ditambahkan!');
  };

  return (
    <div className="content">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px' }}>
        
        {/* EMPLOYEES LIST */}
        <div>
          <div className="section-header">
            <div className="section-title">Daftar Karyawan Terdaftar ({displayEmployees.length} / {limit === Infinity ? '∞' : limit})</div>
          </div>

          <div className="card">
            <div className="card-body">
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--surface2)', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '12px 20px', fontSize: '11px', color: 'var(--text3)', textTransform: 'uppercase' }}>Nama Karyawan</th>
                    <th style={{ padding: '12px 20px', fontSize: '11px', color: 'var(--text3)', textTransform: 'uppercase' }}>Departemen</th>
                    <th style={{ padding: '12px 20px', fontSize: '11px', color: 'var(--text3)', textTransform: 'uppercase' }}>Cabang / Kota</th>
                    <th style={{ padding: '12px 20px', fontSize: '11px', color: 'var(--text3)', textTransform: 'uppercase', textAlign: 'right' }}>SOP Selesai</th>
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* REGISTER EMPLOYEE (ADD FORM WITH QUOTA GATING) */}
        <div>
          <div className="section-header">
            <div className="section-title">Registrasi Karyawan</div>
            {!isSupervisor && (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  style={{ fontSize: '12px', padding: '6px 12px', background: '#f1f5f9', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', color: 'var(--text2)', fontWeight: '600' }}
                >
                  ⬇ Template Excel
                </button>
                <label style={{ fontSize: '12px', padding: '6px 12px', background: 'var(--accent)', border: 'none', borderRadius: '6px', cursor: 'pointer', color: '#fff', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  📂 Import Excel
                  <input type="file" accept=".xlsx,.xls" onChange={handleImportFile} style={{ display: 'none' }} />
                </label>
              </div>
            )}
          </div>

          {importError && (
            <div style={{ background: '#fff5f5', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 14px', marginBottom: '12px', color: '#dc2626', fontSize: '12px', fontWeight: '600' }}>
              ⚠️ {importError}
            </div>
          )}

          <div className="card" style={{ padding: '20px' }}>
            {isFull ? (
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
                  disabled={isFull}
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
                  disabled={isFull}
                />
              </div>

              <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '12px' }} disabled={isFull}>
                {isFull ? '🔒 Kuota Karyawan Penuh' : 'Daftarkan Karyawan'}
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
    </div>
  );
};
