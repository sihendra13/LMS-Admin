import React, { useState } from 'react';
import { useTenant } from '../context/TenantContext';

export const QuizGrading = () => {
  const { currentUser, pendingEssays, gradeEssay, passingScore, quizSubmissions } = useTenant();
  const [selectedEssay, setSelectedEssay] = useState(null);
  const [scoreInput, setScoreInput] = useState(80);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  
  // Search and Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [sopFilter, setSopFilter] = useState('');

  // Filter essays by department if supervisor
  const isSupervisor = currentUser.role === 'supervisor';
  const supervisorDept = currentUser.dept;

  // Base list depending on supervisor division boundary
  const basePending = pendingEssays.filter(essay => {
    if (isSupervisor) {
      return essay.dept.toLowerCase() === supervisorDept.toLowerCase();
    }
    return true;
  });

  // Extract unique SOP titles for the dropdown filter
  const uniqueSops = Array.from(new Set(basePending.map(essay => essay.videoTitle)));

  // Final filtered list based on search query and dropdown selection
  const filteredPending = basePending.filter(essay => {
    const matchesSearch = essay.employeeName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSop = sopFilter ? essay.videoTitle === sopFilter : true;
    return matchesSearch && matchesSop;
  });

  // Filter recently graded essays (from quizSubmissions) - only show essays or submissions relevant to role
  const filteredSubmissions = quizSubmissions.filter(sub => {
    if (isSupervisor) {
      return true; // Simple simulation, show all or filter if dept matches
    }
    return true;
  });

  const handleOpenGradeModal = (essay) => {
    setSelectedEssay(essay);
    setScoreInput(80); // reset default to 80
    setFeedbackMsg('');
  };

  const handleSubmitGrade = (e) => {
    e.preventDefault();
    if (!selectedEssay) return;
    
    gradeEssay(selectedEssay.id, Number(scoreInput));
    setSelectedEssay(null);
  };

  return (
    <div className="content">
      {/* HEADER */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text1)', marginBottom: '6px' }}>Penilaian Kuis (Esai)</h2>
          <p style={{ color: 'var(--text3)', fontSize: '13px' }}>
            {isSupervisor 
              ? `Tinjau dan beri nilai jawaban esai karyawan untuk Divisi ${supervisorDept}.`
              : 'Tinjau dan beri nilai jawaban esai karyawan untuk seluruh departemen perusahaan.'
            }
          </p>
        </div>
        <div style={{ background: '#f1f5f9', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', color: 'var(--text2)' }}>
          Kriteria Kelulusan: <span style={{ color: 'var(--green)' }}>≥ {passingScore}%</span>
        </div>
      </div>

      {/* FILTER SEARCH & DROPDOWN HEADER */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: '20px', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
          <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text3)', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Cari Karyawan</label>
          <div style={{ position: 'relative' }}>
            <input 
              type="text" 
              className="form-control" 
              placeholder="Ketik nama karyawan..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '36px', fontSize: '13px' }}
            />
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>🔍</span>
          </div>
        </div>

        <div style={{ width: '280px', minWidth: '200px' }}>
          <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text3)', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Saring Berdasarkan SOP</label>
          <select 
            className="form-select" 
            style={{ fontSize: '13px' }}
            value={sopFilter}
            onChange={(e) => setSopFilter(e.target.value)}
          >
            <option value="">-- Semua SOP / Video ({uniqueSops.length}) --</option>
            {uniqueSops.map((sop, i) => (
              <option key={i} value={sop}>{sop}</option>
            ))}
          </select>
        </div>

        {(searchQuery || sopFilter) && (
          <div style={{ alignSelf: 'flex-end', marginBottom: '4px' }}>
            <button 
              type="button" 
              className="btn-sec" 
              style={{ fontSize: '12px', padding: '6px 12px', background: '#f1f5f9', border: '1px solid #cbd5e1' }}
              onClick={() => { setSearchQuery(''); setSopFilter(''); }}
            >
              Reset Filter
            </button>
          </div>
        )}
      </div>

      {/* PENDING ESSAYS QUEUE */}
      <div className="card" style={{ marginBottom: '28px' }}>
        <div className="card-head" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>Antrean Penilaian</span>
            <span style={{ background: 'var(--accent)', color: '#ffffff', fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '10px' }}>
              {filteredPending.length}
            </span>
          </div>
        </div>

        {filteredPending.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text3)' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🎉</div>
            <h4 style={{ fontWeight: '600', color: 'var(--text1)', marginBottom: '4px' }}>Tidak Ada Antrean</h4>
            <p style={{ fontSize: '13px' }}>Tidak ada jawaban kuis esai yang cocok dengan filter pencarian Anda.</p>
          </div>
        ) : (
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {filteredPending.map(essay => (
              <div 
                key={essay.id} 
                style={{ 
                  border: '1px solid var(--border)', 
                  borderRadius: '12px', 
                  padding: '18px', 
                  background: '#f8fafc',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  position: 'relative'
                }}
                className="essay-card-hover"
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ 
                      width: '36px', 
                      height: '36px', 
                      borderRadius: '50%', 
                      background: 'var(--accent)', 
                      color: '#ffffff', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      fontWeight: '700',
                      fontSize: '14px'
                    }}>
                      {essay.employeeName.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontWeight: '700', fontSize: '14px', color: 'var(--text1)' }}>{essay.employeeName}</h4>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', fontSize: '11px', color: 'var(--text3)', marginTop: '2px' }}>
                        <span>{essay.date}</span>
                        <span>•</span>
                        <span className={`dept-tag dt-${essay.dept.toLowerCase()}`} style={{ fontSize: '10px', padding: '1px 6px' }}>
                          Divisi {essay.dept}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button 
                    type="button"
                    className="btn-primary"
                    style={{ fontSize: '12px', padding: '6px 14px', background: '#002D72', border: '1px solid #002D72', display: 'flex', alignItems: 'center', gap: '6px' }}
                    onClick={() => handleOpenGradeModal(essay)}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '14px', height: '14px' }}>
                      <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                    </svg>
                    Beri Nilai
                  </button>
                </div>

                <div style={{ background: '#ffffff', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px 14px', marginBottom: '10px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--accent)', marginBottom: '4px', textTransform: 'uppercase' }}>
                    SOP / VIDEO TRAINING:
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text1)' }}>
                    {essay.videoTitle}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '4px' }}>
                  <div>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text2)', display: 'block', marginBottom: '2px' }}>Pertanyaan:</span>
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--text1)', fontStyle: 'italic', background: '#f1f5f9', padding: '8px 12px', borderRadius: '6px' }}>
                      "{essay.question}"
                    </p>
                  </div>
                  <div style={{ marginTop: '4px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text2)', display: 'block', marginBottom: '2px' }}>Jawaban Karyawan:</span>
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--text1)', fontWeight: '500', lineHeight: '1.5', background: '#eff6ff', borderLeft: '3px solid #3b82f6', padding: '8px 12px', borderRadius: '0 6px 6px 0' }}>
                      {essay.answer}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* GRADED HISTORY LIST */}
      <div className="card">
        <div className="card-head" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <div className="card-title">Riwayat Penilaian Kuis</div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '12px 20px', fontWeight: '600', color: 'var(--text2)' }}>Karyawan</th>
                <th style={{ padding: '12px 20px', fontWeight: '600', color: 'var(--text2)' }}>SOP / Materi</th>
                <th style={{ padding: '12px 20px', fontWeight: '600', color: 'var(--text2)' }}>Tanggal Penilaian</th>
                <th style={{ padding: '12px 20px', fontWeight: '600', color: 'var(--text2)' }}>Skor Akhir</th>
                <th style={{ padding: '12px 20px', fontWeight: '600', color: 'var(--text2)' }}>Status Kelulusan</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubmissions.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '24px', color: 'var(--text3)' }}>
                    Belum ada kuis esai yang dinilai sebelumnya.
                  </td>
                </tr>
              ) : (
                filteredSubmissions.map((sub, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 20px', fontWeight: '600', color: 'var(--text1)' }}>{sub.employeeName}</td>
                    <td style={{ padding: '12px 20px', color: 'var(--text2)' }}>{sub.videoTitle}</td>
                    <td style={{ padding: '12px 20px', color: 'var(--text3)' }}>{sub.date}</td>
                    <td style={{ padding: '12px 20px', fontWeight: '700', color: sub.postScore >= passingScore ? 'var(--green)' : 'var(--red)' }}>
                      {sub.postScore}%
                    </td>
                    <td style={{ padding: '12px 20px' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 10px',
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

      {/* GRADING MODAL */}
      {selectedEssay && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999
        }} onClick={() => setSelectedEssay(null)}>
          <div 
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              width: '600px',
              maxWidth: '90vw',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '700', color: 'var(--text1)' }}>Beri Nilai Jawaban Esai</h3>
            <p style={{ color: 'var(--text3)', fontSize: '13px', margin: '0 0 20px 0' }}>
              Berikan nilai objektif berdasarkan keakuratan jawaban karyawan terhadap SOP yang berlaku.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text3)', display: 'block', textTransform: 'uppercase' }}>Karyawan</span>
                <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text1)' }}>{selectedEssay.employeeName} ({selectedEssay.dept})</span>
              </div>

              <div>
                <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text2)', display: 'block', marginBottom: '4px' }}>Pertanyaan:</span>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text1)', background: '#f1f5f9', padding: '10px 12px', borderRadius: '6px' }}>
                  {selectedEssay.question}
                </p>
              </div>

              <div>
                <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text2)', display: 'block', marginBottom: '4px' }}>Jawaban Karyawan:</span>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text1)', fontWeight: '500', background: '#eff6ff', padding: '12px', borderRadius: '6px', borderLeft: '3px solid #3b82f6' }}>
                  {selectedEssay.answer}
                </p>
              </div>

              <form onSubmit={handleSubmitGrade}>
                <div className="form-group" style={{ marginTop: '10px' }}>
                  <label className="form-label" style={{ fontWeight: '700', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Skor Ujian (0 - 100)</span>
                    <span style={{ fontSize: '16px', color: 'var(--accent)' }}>{scoreInput}%</span>
                  </label>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '6px' }}>
                    <input 
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={scoreInput}
                      onChange={(e) => setScoreInput(e.target.value)}
                      style={{ flex: 1, cursor: 'pointer' }}
                    />
                    <input 
                      type="number"
                      min="0"
                      max="100"
                      value={scoreInput}
                      onChange={(e) => setScoreInput(Math.min(100, Math.max(0, Number(e.target.value))))}
                      style={{ width: '60px', padding: '6px', textAlign: 'center', borderRadius: '6px', border: '1px solid var(--border)' }}
                    />
                  </div>

                  {/* QUICK SCORING PRESETS */}
                  <div style={{ marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text3)', alignSelf: 'center', marginRight: '4px' }}>Template Nilai Cepat:</span>
                    <button 
                      type="button" 
                      onClick={() => setScoreInput(50)}
                      style={{ padding: '4px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', background: '#fce8e6', color: '#c5221f', border: '1px solid #f5c2c1' }}
                    >
                      ❌ Salah/Kurang (50)
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setScoreInput(75)}
                      style={{ padding: '4px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' }}
                    >
                      ⚠️ Cukup (75)
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setScoreInput(100)}
                      style={{ padding: '4px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', background: '#e6f4ea', color: '#137333', border: '1px solid #c4eed0' }}
                    >
                      ✅ Sempurna (100)
                    </button>
                  </div>
                  
                  {/* Realtime Passing Status Badge */}
                  <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text2)' }}>Status Kelulusan:</span>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: '700',
                      background: Number(scoreInput) >= passingScore ? '#e6f4ea' : '#fce8e6',
                      color: Number(scoreInput) >= passingScore ? '#137333' : '#c5221f'
                    }}>
                      {Number(scoreInput) >= passingScore ? `Lulus (≥${passingScore}%)` : `Remedi (<${passingScore}%)`}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                  <button 
                    type="button" 
                    className="btn-sec" 
                    style={{ padding: '8px 16px' }}
                    onClick={() => setSelectedEssay(null)}
                  >
                    Batal
                  </button>
                  <button 
                    type="submit" 
                    className="btn-primary" 
                    style={{ padding: '8px 20px', background: '#002D72', border: '1px solid #002D72' }}
                  >
                    Simpan Nilai
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
