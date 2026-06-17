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
  const formatDate = (d) => (!d || d === 'Hari ini' || d === 'Baru saja') ? todayStr : d;

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

      {/* SUMMARY CHIPS */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ background: '#ecfdf5', border: '1px solid #d1fae5', borderRadius: '10px', padding: '10px 16px', fontSize: '13px', fontWeight: '600', color: '#16a34a' }}>
          ✓ Lulus: <strong>{passed}</strong>
        </div>
        <div style={{ background: '#fff5f5', border: '1px solid #fecaca', borderRadius: '10px', padding: '10px 16px', fontSize: '13px', fontWeight: '600', color: '#dc2626' }}>
          ✕ Remedi: <strong>{failed}</strong>
        </div>
        <div style={{ background: '#f1f5f9', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px 16px', fontSize: '13px', fontWeight: '600', color: 'var(--text2)' }}>
          Total: <strong>{history.length}</strong>
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
