import React, { useState } from 'react';
import { useTenant } from '../context/TenantContext';

export const Departments = () => {
  const {
    tenant,
    employees,
    videos,
    supervisors,
    invitations,
    inviteSupervisor,
    revokeSupervisor,
    currentUser,
    quizSubmissions,
    departments,
    addDepartment,
    deleteDepartment,
  } = useTenant();

  // Local state for invitation form
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [deptInput, setDeptInput] = useState(departments[0] || 'Sales');

  // Local state for dept management
  const [newDeptName, setNewDeptName] = useState('');
  const [deptError, setDeptError] = useState('');

  const DEPT_COLORS = [
    { color: '#eff6ff', textColor: '#2F7BFF' },
    { color: '#f5f3ff', textColor: '#8b5cf6' },
    { color: '#f0fdf4', textColor: '#10b981' },
    { color: '#fffbeb', textColor: '#f59e0b' },
    { color: '#ecfeff', textColor: '#06b6d4' },
    { color: '#fdf2f8', textColor: '#db2777' },
    { color: '#fff7ed', textColor: '#ea580c' },
    { color: '#f0fdf4', textColor: '#16a34a' },
  ];

  const departmentMeta = departments.map((name, i) => ({
    name,
    code: name.toLowerCase().replace(/\s+/g, ''),
    ...DEPT_COLORS[i % DEPT_COLORS.length],
  }));

  const departmentData = departmentMeta.map(meta => {
    const deptVideos = videos.filter(v => v.dept === meta.name && !v.archived);
    const modules = deptVideos.length;
    const deptEmployees = employees.filter(e => e.dept.toLowerCase() === meta.name.toLowerCase());
    const totalPairs = deptEmployees.length * (modules || 1);
    const completedPairs = deptVideos.reduce((acc, v) => {
      return acc + quizSubmissions.filter(s => s.videoTitle === v.title && s.status?.toLowerCase() === 'lulus' &&
        deptEmployees.some(e => e.name === s.employeeName)).length;
    }, 0);
    const progress = totalPairs > 0 ? Math.round((completedPairs / totalPairs) * 100) : 0;
    return { ...meta, modules, progress };
  });

  const handleInviteSubmit = (e) => {
    e.preventDefault();
    if (!emailInput.trim()) return alert('Email tidak boleh kosong!');
    inviteSupervisor(emailInput, deptInput);
    setEmailInput('');
    setIsModalOpen(false);
  };

  // Block page access for non-admin
  if (currentUser.role !== 'admin') {
    return (
      <div className="content" style={{ padding: '40px', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--red)' }}>Akses Ditolak</h2>
        <p>Hanya HRD Admin Utama yang dapat mengakses halaman manajemen departemen.</p>
      </div>
    );
  }

  return (
    <div className="content">
      {/* HEADER */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text1)', marginBottom: '6px' }}>Manajemen Departemen</h2>
          <p style={{ color: 'var(--text3)', fontSize: '13px' }}>
            Konfigurasi divisi perusahaan, pantau tingkat kepatuhan pelatihan, dan kelola hak akses Supervisor Divisi.
          </p>
        </div>
        <button 
          type="button" 
          className="btn-primary"
          style={{ padding: '10px 20px', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          onClick={() => setIsModalOpen(true)}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#ffffff' }}>
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Undang Supervisor
        </button>
      </div>

      {/* STATS OVERVIEW */}
      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card blue">
          <div className="stat-icon blue">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
            </svg>
          </div>
          <div className="stat-label">Total Departemen</div>
          <div className="stat-value">{departmentData.length}</div>
          <div className="stat-change info">Divisi Aktif</div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon green">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
            </svg>
          </div>
          <div className="stat-label">Supervisor Aktif</div>
          <div className="stat-value">{supervisors.length}</div>
          <div className="stat-change up">Memantau Divisi</div>
        </div>
        <div className="stat-card amber">
          <div className="stat-icon amber">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <div className="stat-label">Undangan Pending</div>
          <div className="stat-value">{invitations.length}</div>
          <div className="stat-change up">Menunggu Registrasi</div>
        </div>
      </div>

      {/* TWO COLUMN GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '24px', alignItems: 'start' }}>
        
        {/* LEFT COLUMN: LIST DEPARTEMEN */}
        <div className="card">
          <div className="card-head" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <div className="card-title">Struktur & Kepatuhan Departemen</div>
          </div>
          
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '12px 20px', fontWeight: '600', color: 'var(--text2)' }}>Departemen</th>
                  <th style={{ padding: '12px 20px', fontWeight: '600', color: 'var(--text2)' }}>Supervisor / Lead</th>
                  <th style={{ padding: '12px 20px', fontWeight: '600', color: 'var(--text2)' }}>Karyawan</th>
                  <th style={{ padding: '12px 20px', fontWeight: '600', color: 'var(--text2)' }}>Video Wajib</th>
                  <th style={{ padding: '12px 20px', fontWeight: '600', color: 'var(--text2)' }}>Avg. Progress</th>
                </tr>
              </thead>
              <tbody>
                {departmentData.map((dept) => {
                  // Find supervisor
                  const activeSup = supervisors.find(s => s.dept.toLowerCase() === dept.name.toLowerCase());
                  const pendingSup = invitations.find(i => i.dept.toLowerCase() === dept.name.toLowerCase());
                  
                  // Count employees in this dept
                  const deptEmployeesCount = employees.filter(e => e.dept.toLowerCase() === dept.name.toLowerCase()).length;

                  return (
                    <tr key={dept.name} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '16px 20px' }}>
                        <span className="dept-tag" style={{ background: dept.color, color: dept.textColor, fontWeight: '600' }}>
                          {dept.name}
                        </span>
                      </td>
                      <td style={{ padding: '16px 20px', fontWeight: '500', color: 'var(--text1)' }}>
                        {activeSup ? (
                          <span>👤 {activeSup.name}</span>
                        ) : pendingSup ? (
                          <span style={{ color: 'var(--text3)', fontStyle: 'italic' }}>✉️ Pending ({pendingSup.email})</span>
                        ) : (
                          <span style={{ color: 'var(--red)', fontSize: '12px' }}>⚠️ Belum ada Lead</span>
                        )}
                      </td>
                      <td style={{ padding: '16px 20px', color: 'var(--text2)' }}>{deptEmployeesCount} Karyawan</td>
                      <td style={{ padding: '16px 20px', color: 'var(--text2)' }}>{dept.modules} Modul</td>
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div className="prog-bar" style={{ width: '80px', height: '6px', margin: 0 }}>
                            <div className="prog-fill" style={{ width: `${dept.progress}%`, background: dept.progress > 80 ? 'var(--green)' : 'var(--accent)' }}></div>
                          </div>
                          <span style={{ fontWeight: '600', color: 'var(--text1)' }}>{dept.progress}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT COLUMN: KELOLA HAK AKSES */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* KELOLA DEPARTEMEN */}
          <div className="card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text2)', borderBottom: '1px solid var(--border)', paddingBottom: '10px', marginBottom: '16px' }}>
              Kelola Departemen
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
              {departments.map(d => {
                const empCount = employees.filter(e => e.dept.toLowerCase() === d.toLowerCase()).length;
                return (
                  <div key={d} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <div>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text1)' }}>{d}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text3)', marginLeft: '8px' }}>{empCount} karyawan</span>
                    </div>
                    <button
                      type="button"
                      title="Hapus departemen"
                      onClick={() => {
                        if (empCount > 0) { setDeptError(`Tidak bisa hapus "${d}" karena masih ada ${empCount} karyawan.`); return; }
                        if (departments.length <= 1) { setDeptError('Minimal harus ada 1 departemen.'); return; }
                        if (window.confirm(`Hapus departemen "${d}"?`)) { deleteDepartment(d); setDeptError(''); }
                      }}
                      style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', color: 'var(--text3)', display: 'inline-flex', alignItems: 'center' }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
            {deptError && (
              <div style={{ fontSize: '12px', color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', padding: '8px 12px', marginBottom: '10px' }}>
                {deptError}
              </div>
            )}
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={newDeptName}
                onChange={e => { setNewDeptName(e.target.value); setDeptError(''); }}
                placeholder="Nama departemen baru"
                style={{ flex: 1, padding: '8px 10px', fontSize: '13px', border: '1px solid var(--border)', borderRadius: '6px', outline: 'none', color: 'var(--text1)' }}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (!newDeptName.trim()) return;
                    const ok = addDepartment(newDeptName);
                    if (ok) { setNewDeptName(''); setDeptError(''); }
                    else setDeptError(`"${newDeptName.trim()}" sudah ada.`);
                  }
                }}
              />
              <button
                type="button"
                onClick={() => {
                  if (!newDeptName.trim()) return;
                  const ok = addDepartment(newDeptName);
                  if (ok) { setNewDeptName(''); setDeptError(''); }
                  else setDeptError(`"${newDeptName.trim()}" sudah ada.`);
                }}
                style={{ padding: '8px 14px', background: 'var(--navy)', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                + Tambah
              </button>
            </div>
          </div>
          
          {/* ACTIVE SUPERVISORS */}
          <div className="card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text2)', borderBottom: '1px solid var(--border)', paddingBottom: '10px', marginBottom: '16px' }}>
              👤 Akun Supervisor Aktif
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {supervisors.map(sup => (
                <div key={sup.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text1)' }}>{sup.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '2px' }}>{sup.email} · Divisi: <strong>{sup.dept}</strong></div>
                  </div>
                  <button
                    type="button"
                    title="Cabut Akses"
                    className="delete-question-btn"
                    onClick={() => {
                      if (confirm(`Cabut akses supervisor ${sup.name}?`)) {
                        revokeSupervisor(sup.id, 'supervisor');
                      }
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '15px', height: '15px' }}>
                      <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* PENDING INVITATIONS */}
          <div className="card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text2)', borderBottom: '1px solid var(--border)', paddingBottom: '10px', marginBottom: '16px' }}>
              ✉️ Undangan Pending
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {invitations.length === 0 ? (
                <div style={{ fontSize: '12px', color: 'var(--text3)', textAlign: 'center', padding: '10px 0' }}>Tidak ada undangan pending.</div>
              ) : (
                invitations.map(invite => (
                  <div key={invite.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fffbeb', padding: '10px 14px', borderRadius: '8px', border: '1px solid #fef3c7' }}>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text1)' }}>{invite.email}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '2px' }}>Divisi: <strong>{invite.dept}</strong> · {invite.date}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        className="view-cert-btn"
                        title="Kirim Ulang Undangan"
                        style={{ padding: '4px' }}
                        onClick={() => alert(`Undangan email dikirim ulang ke ${invite.email}`)}
                      >
                        🔄
                      </button>
                      <button
                        type="button"
                        className="delete-question-btn"
                        title="Batalkan Undangan"
                        style={{ padding: '4px' }}
                        onClick={() => revokeSupervisor(invite.id, 'invite')}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '14px', height: '14px' }}>
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>

      {/* INVITE SUPERVISOR MODAL */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(15, 23, 42, 0.4)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999
        }} onClick={() => setIsModalOpen(false)}>
          
          <div className="card" style={{
            width: '420px',
            background: '#ffffff',
            padding: '24px',
            borderRadius: '12px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            margin: '20px'
          }} onClick={(e) => e.stopPropagation()}>
            
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px', color: 'var(--text1)' }}>Undang Supervisor Divisi</h3>
            <p style={{ fontSize: '12px', color: 'var(--text3)', marginBottom: '20px' }}>
              Supervisor yang diundang akan menerima hak akses dashboard terbatas untuk mengelola divisi mereka.
            </p>

            <form onSubmit={handleInviteSubmit}>
              <div className="form-group" style={{ marginBottom: '14px', textAlign: 'left' }}>
                <label className="form-label" style={{ fontSize: '11px', fontWeight: '600' }}>EMAIL SUPERVISOR</label>
                <input 
                  type="email" 
                  className="form-input"
                  style={{ width: '100%', fontSize: '13px', marginTop: '4px' }}
                  placeholder="Contoh: manager.sales@majubersama.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '24px', textAlign: 'left' }}>
                <label className="form-label" style={{ fontSize: '11px', fontWeight: '600' }}>DEPARTEMEN YANG DIPIMPIN</label>
                <select
                  className="form-select"
                  style={{ width: '100%', fontSize: '13px', marginTop: '4px', padding: '8px 12px' }}
                  value={deptInput}
                  onChange={(e) => setDeptInput(e.target.value)}
                >
                  {departments.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="form-input"
                  style={{ cursor: 'pointer', padding: '8px 18px', margin: 0 }}
                  onClick={() => setIsModalOpen(false)}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ padding: '8px 20px', color: '#ffffff', cursor: 'pointer' }}
                >
                  Kirim Undangan
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
