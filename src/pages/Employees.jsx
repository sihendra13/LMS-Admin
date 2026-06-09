import React, { useState } from 'react';
import { useTenant } from '../context/TenantContext';
import { getEmployeeLimit } from '../utils/featureGates';

export const Employees = () => {
  const { tenant, employees, addEmployee, currentUser } = useTenant();
  const isSupervisor = currentUser.role === 'supervisor';

  const [name, setName] = useState('');
  const [dept, setDept] = useState(isSupervisor ? currentUser.dept : 'Sales');
  const [city, setCity] = useState('Jakarta');

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
          </div>

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
    </div>
  );
};
