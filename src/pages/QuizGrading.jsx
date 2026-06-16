import React, { useState, useEffect } from 'react';
import { useTenant } from '../context/TenantContext';

export const QuizGrading = () => {
  const { currentUser, pendingEssays, gradeEssay, passingScore, quizSubmissions, gradedEssays } = useTenant();
  const [selectedEssay, setSelectedEssay] = useState(null);
  
  // Modal inner wizard states
  const [activeQuestionId, setActiveQuestionId] = useState(null);
  const [questionScores, setQuestionScores] = useState({}); // e.g. { 1: 85, 2: 90 }
  const [currentScoreVal, setCurrentScoreVal] = useState(80);

  // Search and Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [sopFilter, setSopFilter] = useState('');

  // Filter essays by department if supervisor
  const isSupervisor = currentUser.role !== 'admin';
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

  // Combine multiple choice (Supabase) + essay grades (localStorage), filter by dept for supervisor
  const combinedHistory = [
    ...quizSubmissions.map(s => ({ ...s, type: 'quiz' })),
    ...gradedEssays.map(s => ({ ...s, type: 'essay' })),
  ].filter(sub => {
    if (isSupervisor) return (sub.dept || '').toLowerCase() === supervisorDept.toLowerCase();
    return true;
  });

  const handleOpenGradeModal = (essay) => {
    setSelectedEssay(essay);
    
    // Initialize scores map from the essay's questions
    const initialScores = {};
    essay.questions.forEach(q => {
      initialScores[q.id] = q.score !== undefined ? q.score : null;
    });
    setQuestionScores(initialScores);

    // Set first question as active
    if (essay.questions && essay.questions.length > 0) {
      const firstId = essay.questions[0].id;
      setActiveQuestionId(firstId);
      setCurrentScoreVal(initialScores[firstId] !== null ? initialScores[firstId] : 80);
    }
  };

  const handleSelectQuestion = (qId) => {
    setActiveQuestionId(qId);
    setCurrentScoreVal(questionScores[qId] !== null ? questionScores[qId] : 80);
  };

  // Sync active question score change back to map
  const handleScoreValueChange = (val) => {
    const numericVal = Number(val);
    setCurrentScoreVal(numericVal);
    setQuestionScores(prev => ({
      ...prev,
      [activeQuestionId]: numericVal
    }));
  };

  const handleQuickScore = (val) => {
    handleScoreValueChange(val);
  };

  const getActiveQuestionObj = () => {
    if (!selectedEssay) return null;
    return selectedEssay.questions.find(q => q.id === activeQuestionId);
  };

  // Calculate Average score of currently input scores
  const getAverageScore = () => {
    const scores = Object.values(questionScores);
    const validScores = scores.filter(s => s !== null);
    if (validScores.length === 0) return 0;
    const sum = validScores.reduce((acc, curr) => acc + curr, 0);
    return Math.round(sum / validScores.length);
  };

  const isAllGraded = () => {
    return Object.values(questionScores).every(s => s !== null);
  };

  const handleSubmitGrade = (e) => {
    e.preventDefault();
    if (!selectedEssay || !isAllGraded()) return;
    
    const finalAverage = getAverageScore();
    gradeEssay(selectedEssay.id, finalAverage);
    setSelectedEssay(null);
  };

  const activeQuestion = getActiveQuestionObj();
  const currentAverage = getAverageScore();
  const allGraded = isAllGraded();

  // Find next and previous questions
  const getPrevAndNext = () => {
    if (!selectedEssay || !activeQuestionId) return { prev: null, next: null };
    const idx = selectedEssay.questions.findIndex(q => q.id === activeQuestionId);
    return {
      prev: idx > 0 ? selectedEssay.questions[idx - 1].id : null,
      next: idx < selectedEssay.questions.length - 1 ? selectedEssay.questions[idx + 1].id : null
    };
  };

  const { prev: prevQId, next: nextQId } = getPrevAndNext();

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
      <div className="card" style={{ padding: '20px', marginBottom: '24px', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end', background: '#ffffff', border: '1px solid var(--border)', borderRadius: '12px' }}>
        <div style={{ flex: 1, minWidth: '260px' }}>
          <label style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text2)', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cari Karyawan</label>
          <div style={{ position: 'relative' }}>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Cari nama karyawan..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                paddingLeft: '38px',
                fontSize: '13.5px',
                width: '100%',
                height: '42px',
                boxSizing: 'border-box'
              }}
            />
            <svg 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="#94a3b8" 
              strokeWidth="2.5" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
            >
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </div>
        </div>

        <div style={{ width: '320px', minWidth: '240px' }}>
          <label style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text2)', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Saring Berdasarkan SOP</label>
          <select 
            className="form-select" 
            style={{ 
              fontSize: '13.5px',
              width: '100%',
              height: '42px',
              boxSizing: 'border-box'
            }}
            value={sopFilter}
            onChange={(e) => setSopFilter(e.target.value)}
          >
            <option value="">Semua Video Training & SOP ({uniqueSops.length})</option>
            {uniqueSops.map((sop, i) => (
              <option key={i} value={sop}>{sop}</option>
            ))}
          </select>
        </div>

        {(searchQuery || sopFilter) && (
          <div style={{ alignSelf: 'flex-end' }}>
            <button 
              type="button" 
              className="btn-sec" 
              style={{
                fontSize: '12px',
                padding: '0 18px',
                background: '#f1f5f9',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                fontWeight: '600',
                height: '42px',
                cursor: 'pointer',
                color: 'var(--text2)',
                transition: 'all 0.2s'
              }}
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
                    style={{ fontSize: '12px', padding: '6px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
                    onClick={() => handleOpenGradeModal(essay)}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '14px', height: '14px' }}>
                      <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                    </svg>
                    Beri Nilai ({essay.questions?.length || 0} Soal)
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

                {/* Question summaries */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
                  {essay.questions?.map((q, idx) => (
                    <span key={q.id} style={{ background: '#e2e8f0', color: 'var(--text1)', fontSize: '11px', padding: '4px 10px', borderRadius: '12px', fontWeight: '500' }}>
                      📝 Soal {idx + 1}: {q.score !== null ? `✓ ${q.score}%` : '⏳ Menunggu'}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* GRADED HISTORY LIST */}
      <div className="card">
        <div className="card-head" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="card-title">Riwayat Penilaian Kuis</div>
          <span style={{ fontSize: '12px', color: 'var(--text3)', fontWeight: '500' }}>
            Pilihan Ganda + Esai
          </span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '12px 20px', fontWeight: '600', color: 'var(--text2)' }}>Karyawan</th>
                <th style={{ padding: '12px 20px', fontWeight: '600', color: 'var(--text2)' }}>SOP / Materi</th>
                <th style={{ padding: '12px 20px', fontWeight: '600', color: 'var(--text2)' }}>Jenis Kuis</th>
                <th style={{ padding: '12px 20px', fontWeight: '600', color: 'var(--text2)' }}>Tanggal</th>
                <th style={{ padding: '12px 20px', fontWeight: '600', color: 'var(--text2)' }}>Skor</th>
                <th style={{ padding: '12px 20px', fontWeight: '600', color: 'var(--text2)' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {combinedHistory.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '24px', color: 'var(--text3)' }}>
                    Belum ada riwayat penilaian kuis.
                  </td>
                </tr>
              ) : (
                combinedHistory.map((sub, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 20px', fontWeight: '600', color: 'var(--text1)' }}>
                      {sub.employeeName}
                      {sub.dept && <div style={{ fontSize: '11px', color: 'var(--text3)', fontWeight: '400' }}>Divisi {sub.dept}</div>}
                    </td>
                    <td style={{ padding: '12px 20px', color: 'var(--text2)' }}>{sub.videoTitle}</td>
                    <td style={{ padding: '12px 20px' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '3px 8px',
                        borderRadius: '10px',
                        fontSize: '11px',
                        fontWeight: '600',
                        background: sub.type === 'essay' ? '#ede9fe' : '#e0f2fe',
                        color: sub.type === 'essay' ? '#6d28d9' : '#0369a1',
                      }}>
                        {sub.type === 'essay' ? '✏️ Esai' : '☑️ Pilihan Ganda'}
                      </span>
                    </td>
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

      {/* SPLIT-SCREEN WIZARD GRADING MODAL */}
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
              width: '950px',
              maxWidth: '95vw',
              height: '80vh',
              maxHeight: '680px',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '700', color: 'var(--text1)' }}>
                  Penilaian Kuis: {selectedEssay.employeeName} ({selectedEssay.dept})
                </h3>
                <span style={{ fontSize: '12px', color: 'var(--text3)' }}>{selectedEssay.videoTitle}</span>
              </div>
              <button 
                type="button" 
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text3)' }}
                onClick={() => setSelectedEssay(null)}
              >
                ✕
              </button>
            </div>

            {/* Split Screen Body */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
              
              {/* LEFT PANEL: DAFTAR SOAL (35% Width) */}
              <div style={{ 
                width: '35%', 
                borderRight: '1px solid var(--border)', 
                background: '#f8fafc', 
                overflowY: 'auto',
                padding: '20px'
              }}>
                <h4 style={{ margin: '0 0 14px 0', fontSize: '11px', fontWeight: '700', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Daftar Pertanyaan Esai ({selectedEssay.questions?.length})
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {selectedEssay.questions?.map((q, idx) => {
                    const isActive = q.id === activeQuestionId;
                    const isGraded = questionScores[q.id] !== null;
                    const qScore = questionScores[q.id];

                    return (
                      <div
                        key={q.id}
                        onClick={() => handleSelectQuestion(q.id)}
                        style={{
                          padding: '12px 14px',
                          borderRadius: '8px',
                          border: isActive ? '2px solid var(--accent)' : '1px solid var(--border)',
                          background: isActive ? '#eff6ff' : '#ffffff',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ fontSize: '12px', fontWeight: '700', color: isActive ? 'var(--accent)' : 'var(--text2)' }}>
                            {isActive ? '👉 ' : ''}Soal {idx + 1}
                          </span>
                          <span style={{ 
                            fontSize: '10px', 
                            fontWeight: '700',
                            padding: '2px 6px',
                            borderRadius: '12px',
                            background: isGraded ? '#e6f4ea' : '#f1f5f9',
                            color: isGraded ? '#137333' : '#64748b'
                          }}>
                            {isGraded ? `Skor: ${qScore}%` : 'Belum dinilai'}
                          </span>
                        </div>
                        <p style={{ 
                          margin: 0, 
                          fontSize: '11px', 
                          color: 'var(--text3)', 
                          whiteSpace: 'nowrap', 
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis' 
                        }}>
                          {q.question}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* RIGHT PANEL: LEMBAR JAWABAN & SKOR (65% Width) */}
              <div style={{ 
                width: '65%', 
                padding: '24px', 
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}>
                {activeQuestion ? (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--accent)', textTransform: 'uppercase' }}>
                        Tinjauan Jawaban Soal
                      </span>
                      <span style={{ fontSize: '12px', color: 'var(--text3)', fontWeight: '600' }}>
                        Pertanyaan {selectedEssay.questions.findIndex(q => q.id === activeQuestionId) + 1} dari {selectedEssay.questions.length}
                      </span>
                    </div>

                    {/* Question text box */}
                    <div style={{ marginBottom: '18px' }}>
                      <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text2)', display: 'block', marginBottom: '6px' }}>PERTANYAAN:</span>
                      <p style={{ margin: 0, fontSize: '13px', color: 'var(--text1)', fontWeight: '600', background: '#f1f5f9', padding: '12px 14px', borderRadius: '8px', lineHeight: '1.5' }}>
                        "{activeQuestion.question}"
                      </p>
                    </div>

                    {/* Employee Answer text box */}
                    <div style={{ marginBottom: '24px' }}>
                      <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text2)', display: 'block', marginBottom: '6px' }}>JAWABAN KARYAWAN:</span>
                      <p style={{ margin: 0, fontSize: '13px', color: 'var(--text1)', fontWeight: '500', background: '#eff6ff', padding: '14px', borderRadius: '8px', borderLeft: '4px solid #3b82f6', lineHeight: '1.6' }}>
                        {activeQuestion.answer}
                      </p>
                    </div>

                    {/* Scoring Controls */}
                    <div style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: '12px', padding: '18px' }}>
                      <label style={{ fontWeight: '700', fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span>Beri Nilai Soal Ini</span>
                        <span style={{ fontSize: '16px', color: 'var(--accent)' }}>
                          {questionScores[activeQuestionId] !== null ? `${questionScores[activeQuestionId]}%` : 'Belum diisi'}
                        </span>
                      </label>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <input 
                          type="range"
                          min="0"
                          max="100"
                          step="5"
                          value={currentScoreVal}
                          onChange={(e) => handleScoreValueChange(e.target.value)}
                          style={{ flex: 1, cursor: 'pointer' }}
                        />
                        <input 
                          type="number"
                          min="0"
                          max="100"
                          value={currentScoreVal}
                          onChange={(e) => handleScoreValueChange(Math.min(100, Math.max(0, Number(e.target.value))))}
                          style={{ width: '60px', padding: '6px', textAlign: 'center', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '13px' }}
                        />
                      </div>

                      {/* Presets */}
                      <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button 
                          type="button" 
                          onClick={() => handleQuickScore(50)}
                          style={{ padding: '4px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', background: '#fce8e6', color: '#c5221f', border: '1px solid #f5c2c1' }}
                        >
                          ❌ Kurang (50)
                        </button>
                        <button 
                          type="button" 
                          onClick={() => handleQuickScore(75)}
                          style={{ padding: '4px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' }}
                        >
                          ⚠️ Cukup (75)
                        </button>
                        <button 
                          type="button" 
                          onClick={() => handleQuickScore(100)}
                          style={{ padding: '4px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', background: '#e6f4ea', color: '#137333', border: '1px solid #c4eed0' }}
                        >
                          ✅ Sempurna (100)
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text3)' }}>
                    Silakan pilih soal di sebelah kiri untuk memulai penilaian.
                  </div>
                )}

                {/* Back and Next navigation inside Wizard */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                  <button
                    type="button"
                    className="btn-sec"
                    disabled={!prevQId}
                    onClick={() => handleSelectQuestion(prevQId)}
                    style={{ fontSize: '12px', padding: '6px 14px', cursor: prevQId ? 'pointer' : 'not-allowed', opacity: prevQId ? 1 : 0.5 }}
                  >
                    « Kembali
                  </button>
                  <button
                    type="button"
                    className="btn-sec"
                    disabled={!nextQId}
                    onClick={() => handleSelectQuestion(nextQId)}
                    style={{ fontSize: '12px', padding: '6px 14px', cursor: nextQId ? 'pointer' : 'not-allowed', opacity: nextQId ? 1 : 0.5 }}
                  >
                    Lanjut »
                  </button>
                </div>
              </div>

            </div>

            {/* Modal Footer with Summary Statistics */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--text3)', display: 'block', fontWeight: '600' }}>SKOR RATA-RATA</span>
                  <span style={{ fontSize: '18px', fontWeight: '800', color: currentAverage >= passingScore ? 'var(--green)' : 'var(--accent)' }}>
                    {currentAverage}%
                  </span>
                </div>
                <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: '16px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text3)', display: 'block', fontWeight: '600' }}>STATUS KELULUSAN</span>
                  <span style={{ 
                    fontSize: '11px', 
                    fontWeight: '700',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    background: currentAverage >= passingScore ? '#e6f4ea' : '#fce8e6',
                    color: currentAverage >= passingScore ? '#137333' : '#c5221f'
                  }}>
                    {currentAverage >= passingScore ? `Lulus (≥${passingScore}%)` : `Remedi (<${passingScore}%)`}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  type="button" 
                  className="btn-sec" 
                  style={{ padding: '8px 16px' }}
                  onClick={() => setSelectedEssay(null)}
                >
                  Batal
                </button>
                <button 
                  type="button" 
                  className="btn-primary" 
                  disabled={!allGraded}
                  onClick={handleSubmitGrade}
                  style={{ 
                    padding: '8px 20px', 
                    background: allGraded ? '#002D72' : '#94a3b8', 
                    borderColor: allGraded ? '#002D72' : '#94a3b8', 
                    cursor: allGraded ? 'pointer' : 'not-allowed' 
                  }}
                  title={allGraded ? 'Simpan nilai akhir' : 'Harap nilai semua soal terlebih dahulu'}
                >
                  Simpan Nilai
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
