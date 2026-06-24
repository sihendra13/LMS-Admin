import React, { useState } from 'react';
import { useTenant } from '../context/TenantContext';

export const QuizGrading = () => {
  const { currentUser, passingScore, quizSubmissions } = useTenant();
  const [deptFilter, setDeptFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const isSupervisor = currentUser.role !== 'admin';
  const supervisorDept = currentUser.dept;

  const history = quizSubmissions.filter(sub => {
    if (isSupervisor) return (sub.dept || '').toLowerCase() === supervisorDept.toLowerCase();
    if (deptFilter) return (sub.dept || '').toLowerCase() === deptFilter.toLowerCase();
    return true;
  }).filter(sub =>
    searchQuery ? sub.employeeName?.toLowerCase().includes(searchQuery.toLowerCase()) : true
  );

  const uniqueDepts = Array.from(new Set(quizSubmissions.map(s => s.dept).filter(Boolean))).sort();

  const todayStr = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  const formatDate = (d) => {
    if (!d || d === 'Hari ini' || d === 'Baru saja') return todayStr;
    if (d.includes('T') || d.length > 12) {
      const dt = new Date(d);
      if (isNaN(dt)) return d;
      return dt.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
        + ' ' + String(dt.getHours()).padStart(2, '0') + ':' + String(dt.getMinutes()).padStart(2, '0');
    }
    return d;
  };

  const passed = history.filter(s => s.postScore >= passingScore).length;
  const failed = history.filter(s => s.postScore < passingScore).length;

  return (
    <div className="content">
      {/* HEADER */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text1)', marginBottom: '6px' }}>Hasil Penilaian Kuis</h2>
          <p style={{ color: 'var(--text3)', fontSize: '13px' }}>
            {isSupervisor
              ? `Riwayat hasil kuis pilihan ganda karyawan Divisi ${supervisorDept}. Penilaian dilakukan otomatis oleh sistem.`
              : 'Pantau hasil kuis pilihan ganda seluruh karyawan. Penilaian dilakukan otomatis oleh sistem berdasarkan jawaban benar.'
            }
          </p>
        </div>
        <div style={{ background: '#f1f5f9', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', color: 'var(--text2)' }}>
          Kriteria Kelulusan: <span style={{ color: 'var(--green)' }}>≥ {passingScore}%</span>
        </div>
      </div>

      {/* SUMMARY STATS CARDS */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '22px' }}>
        <div className="stat-card green" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="stat-icon green" style={{ width: '36px', height: '36px', borderRadius: '8px', display: 'flex', alignItems: 'center', justify: 'center', marginBottom: '14px', background: '#ecfdf5', color: '#16a34a' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: '18px', height: '18px' }}>
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <div className="stat-label" style={{ fontWeight: '500' }}>Karyawan Lulus</div>
          <div className="stat-value" style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            {passed}
            <span style={{ fontSize: '12px', color: 'var(--text3)', fontWeight: 'normal' }}>karyawan</span>
          </div>
        </div>

        <div className="stat-card red" style={{ display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
          <style dangerouslySetInnerHTML={{__html: `
            .stat-card.red::before { background: var(--red); }
            .stat-icon.red { background: #fff5f5; color: var(--red); }
          `}} />
          <div className="stat-icon red" style={{ width: '36px', height: '36px', borderRadius: '8px', display: 'flex', alignItems: 'center', justify: 'center', marginBottom: '14px' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: '18px', height: '18px' }}>
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <div className="stat-label">Perlu Remedi</div>
          <div className="stat-value" style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            {failed}
            <span style={{ fontSize: '12px', color: 'var(--text3)', fontWeight: 'normal' }}>karyawan</span>
          </div>
        </div>

        <div className="stat-card blue" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="stat-icon blue" style={{ width: '36px', height: '36px', borderRadius: '8px', display: 'flex', alignItems: 'center', justify: 'center', marginBottom: '14px' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: '18px', height: '18px' }}>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div className="stat-label">Total Percobaan Kuis</div>
          <div className="stat-value" style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            {history.length}
            <span style={{ fontSize: '12px', color: 'var(--text3)', fontWeight: 'normal' }}>total</span>
          </div>
        </div>
      </div>

      {/* FILTER BAR */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text"
          className="form-input"
          placeholder="Cari nama karyawan..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{ maxWidth: '260px', fontSize: '13px', height: '36px' }}
        />
        {!isSupervisor && (
          <select
            className="form-select"
            value={deptFilter}
            onChange={e => setDeptFilter(e.target.value)}
            style={{ fontSize: '12px', height: '36px', padding: '0 10px', minWidth: '180px' }}
          >
            <option value="">Semua Departemen</option>
            {uniqueDepts.map(dept => (
              <option key={dept} value={dept}>Divisi {dept}</option>
            ))}
          </select>
        )}
        {(searchQuery || deptFilter) && (
          <button
            type="button"
            onClick={() => { setSearchQuery(''); setDeptFilter(''); }}
            style={{ fontSize: '12px', padding: '0 14px', height: '36px', background: '#f1f5f9', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', color: 'var(--text2)', fontWeight: '600' }}
          >
            Reset
          </button>
        )}
      </div>

      {/* TABLE */}
      <div className="card">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '12px 20px', fontWeight: '600', color: 'var(--text2)' }}>Karyawan</th>
                <th style={{ padding: '12px 20px', fontWeight: '600', color: 'var(--text2)' }}>SOP / Materi</th>
                <th style={{ padding: '12px 20px', fontWeight: '600', color: 'var(--text2)' }}>Tanggal</th>
                <th style={{ padding: '12px 20px', fontWeight: '600', color: 'var(--text2)', textAlign: 'center' }}>Skor Kuis</th>
                <th style={{ padding: '12px 20px', fontWeight: '600', color: 'var(--text2)', textAlign: 'center' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: 'var(--text3)' }}>
                    Belum ada riwayat kuis.
                  </td>
                </tr>
              ) : (
                history.map((sub, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 20px', fontWeight: '600', color: 'var(--text1)' }}>
                      {sub.employeeName}
                      {sub.dept && <div style={{ fontSize: '11px', color: 'var(--text3)', fontWeight: '400' }}>Divisi {sub.dept}</div>}
                    </td>
                    <td style={{ padding: '12px 20px', color: 'var(--text2)' }}>{sub.videoTitle}</td>
                    <td style={{ padding: '12px 20px', color: 'var(--text3)' }}>{formatDate(sub.date)}</td>
                    <td style={{ padding: '12px 20px', textAlign: 'center', fontWeight: '700', color: sub.postScore >= passingScore ? 'var(--green)' : 'var(--red)' }}>
                      {sub.postScore}%
                    </td>
                    <td style={{ padding: '12px 20px', textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: '600',
                        background: sub.postScore >= passingScore ? '#e6f4ea' : '#fce8e6',
                        color: sub.postScore >= passingScore ? '#137333' : '#c5221f'
                      }}>
                        {sub.postScore >= passingScore ? 'Lulus' : 'Remedi'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
