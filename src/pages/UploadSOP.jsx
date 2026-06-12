import React, { useState } from 'react';
import { useTenant } from '../context/TenantContext';
import { canUploadSOP } from '../utils/featureGates';

export const UploadSOP = () => {
  const { tenant, addSOP, setActivePage } = useTenant();
  const [title, setTitle] = useState('');
  const [dept, setDept] = useState('Sales');
  const [duration, setDuration] = useState('5:00');

  // Toggle state to switch editing between 'pre' (Pre-Test) and 'post' (Post-Test)
  const [activeTab, setActiveTab] = useState('pre'); // 'pre' | 'post'

  // Dynamic state for Pre-Test Questions
  const [preQuestions, setPreQuestions] = useState([
    { question: '', type: 'multiple', options: ['', '', '', ''], answer: 'A', triggerMin: '0', triggerSec: '0' },
    { question: '', type: 'multiple', options: ['', '', '', ''], answer: 'A', triggerMin: '0', triggerSec: '0' }
  ]);

  // Dynamic state for Post-Test Questions
  const [postQuestions, setPostQuestions] = useState([
    { question: '', type: 'multiple', options: ['', '', '', ''], answer: 'A', triggerMin: '0', triggerSec: '0' },
    { question: '', type: 'multiple', options: ['', '', '', ''], answer: 'A', triggerMin: '0', triggerSec: '0' }
  ]);

  // State for confirm delete modal
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, type: 'pre', index: null });

  // Handlers for Pre-Test Questions
  const handlePreQuestionChange = (index, field, value) => {
    setPreQuestions(prev => {
      const updated = [...prev];
      updated[index][field] = value;
      return updated;
    });
  };

  const handlePreOptionChange = (qIndex, oIndex, value) => {
    setPreQuestions(prev => {
      const updated = [...prev];
      updated[qIndex].options[oIndex] = value;
      return updated;
    });
  };

  const addPreQuestion = () => {
    setPreQuestions(prev => [...prev, { question: '', type: 'multiple', options: ['', '', '', ''], answer: 'A', triggerMin: '0', triggerSec: '0' }]);
  };

  const removePreQuestion = (index) => {
    setPreQuestions(prev => prev.filter((_, i) => i !== index));
  };

  // Handlers for Post-Test Questions
  const handlePostQuestionChange = (index, field, value) => {
    setPostQuestions(prev => {
      const updated = [...prev];
      updated[index][field] = value;
      return updated;
    });
  };

  const handlePostOptionChange = (qIndex, oIndex, value) => {
    setPostQuestions(prev => {
      const updated = [...prev];
      updated[qIndex].options[oIndex] = value;
      return updated;
    });
  };

  const addPostQuestion = () => {
    setPostQuestions(prev => [...prev, { question: '', type: 'multiple', options: ['', '', '', ''], answer: 'A', triggerMin: '0', triggerSec: '0' }]);
  };

  const removePostQuestion = (index) => {
    setPostQuestions(prev => prev.filter((_, i) => i !== index));
  };

  const handleUploadSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return alert('Judul SOP tidak boleh kosong!');

    // Filter out blank Pre-Test Questions
    const preList = preQuestions
      .filter(q => q.question.trim() !== '')
      .map((q, idx) => ({
        id: idx + 1,
        question: q.question,
        type: q.type,
        triggerTime: (Number(q.triggerMin || 0) * 60) + Number(q.triggerSec || 0),
        options: q.type === 'multiple' ? q.options.map((o, oIdx) => o.trim() || `Opsi ${String.fromCharCode(65 + oIdx)}`) : [],
        answer: q.type === 'multiple' ? q.answer : ''
      }));

    // Filter out blank Post-Test Questions
    const postList = postQuestions
      .filter(q => q.question.trim() !== '')
      .map((q, idx) => ({
        id: idx + 1,
        question: q.question,
        type: q.type,
        triggerTime: (Number(q.triggerMin || 0) * 60) + Number(q.triggerSec || 0),
        options: q.type === 'multiple' ? q.options.map((o, oIdx) => o.trim() || `Opsi ${String.fromCharCode(65 + oIdx)}`) : [],
        answer: q.type === 'multiple' ? q.answer : ''
      }));

    const deptClasses = {
      Sales: 'dt-sales',
      HRD: 'dt-hrd',
      Operasional: 'dt-ops',
      Finance: 'dt-fin',
      CS: 'dt-cs',
      IT: 'dt-it',
    };

    const deptColors = {
      Sales: '#1e3a5f',
      HRD: '#1a3d2b',
      Operasional: '#3d2200',
      Finance: '#2d1a4a',
      CS: '#072a30',
      IT: '#2a1024',
    };

    const newVideo = {
      id: Date.now(),
      title,
      dept,
      duration,
      progress: 0,
      views: 0,
      color: deptColors[dept] || '#1e3a5f',
      tagClass: deptClasses[dept] || 'dt-sales',
      preQuizzes: preList,
      postQuizzes: postList
    };

    addSOP(newVideo);
    alert(`Video Training / SOP Berhasil Diunggah! Video terbit bersama ${preList.length} soal Pre-Test & ${postList.length} soal Post-Test.`);
    setActivePage('sop');
  };

  if (!canUploadSOP(tenant.plan)) {
    return (
      <div className="content">
        <div className="disabled-feature-overlay">
          <div className="disabled-badge">Fitur Terkunci</div>
          <h2 style={{ fontSize: '20px', marginBottom: '10px' }}>Upload Video Mandiri Tidak Tersedia</h2>
          <p style={{ color: 'var(--text2)', maxWidth: '480px', margin: '0 auto 20px', lineHeight: '1.5' }}>
            Akun Anda saat ini berada pada <strong>Paket Starter</strong>. Berdasarkan model bisnis, Paket Starter hanya mendukung materi Training & SOP standar yang diproduksi dan diunggah langsung oleh tim <strong>Axara</strong>.
          </p>
          <div style={{ background: 'var(--surface2)', padding: '16px 24px', borderRadius: '8px', border: '1px solid var(--border)', textAlign: 'left', marginBottom: '20px' }}>
            <h4 style={{ fontWeight: '600', marginBottom: '8px' }}>Ingin mengunggah video kustom buatan sendiri?</h4>
            <ul style={{ fontSize: '12px', color: 'var(--text2)', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <li><strong>Upgrade ke Paket Business</strong> (Rp 5-10jt/bln) untuk membuka upload mandiri tak terbatas beserta form kuis.</li>
              <li><strong>Upgrade ke Paket Enterprise</strong> (Rp 15jt+/bln) untuk akses upload mandiri + kuis + integrasi AI HeyGen.</li>
            </ul>
          </div>
          <button className="btn-primary" onClick={() => setActivePage('dashboard')}>
            Kembali ke Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="content">
      
      {/* HEADER LEFT ALIGNED */}
      <div style={{ textAlign: 'left', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: '600', color: '#0f172a' }}>
          Konfigurasi Video Training & SOP
        </h2>
        <p style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '4px' }}>
          Sistematisasi pengetahuan perusahaan Anda. Unggah video instruksi dan buat parameter ujian untuk memastikan standar kualitas kerja.
        </p>
      </div>

      <form onSubmit={handleUploadSubmit}>
        
        {/* ROW 1: STEP 1 & STEP 2 SIDE-BY-SIDE (1fr 1.5fr Grid) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '24px', alignItems: 'stretch', marginBottom: '24px' }}>
          
          {/* STEP 1: MEDIA UPLOAD (Left Column) */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="step-header" style={{ marginBottom: '16px' }}>
              <div className="step-title" style={{ fontSize: '15px' }}>Media Upload</div>
            </div>
            
            <div className="card" style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div className="upload-zone" style={{ margin: '0', padding: '36px 20px', border: '1px dashed var(--border)', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                <div className="upload-icon" style={{ fontSize: '28px', color: '#002D72', marginBottom: '10px' }}>☁️</div>
                <div className="upload-title" style={{ fontSize: '14px', fontWeight: '600' }}>Seret dan letakkan file video Anda</div>
                <div className="upload-desc" style={{ fontSize: '11px', color: 'var(--text3)', margin: '6px 0 16px', lineHeight: '1.4' }}>
                  Format MP4, MKV, atau AVI. Maksimal 500MB.
                </div>
                <button type="button" className="btn-primary" style={{ background: '#002D72', padding: '8px 20px', borderRadius: '20px', fontSize: '12px' }}>
                  Pilih File Video
                </button>
              </div>
            </div>
          </div>

          {/* STEP 2: DETAIL INFORMASI (Right Column) */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="step-header" style={{ marginBottom: '16px' }}>
              <div className="step-title" style={{ fontSize: '15px' }}>Detail Informasi</div>
            </div>

            <div className="card" style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '24px', alignItems: 'stretch', height: '100%' }}>
                
                {/* Form Fields */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'left', justifyContent: 'center' }}>
                  <div className="form-group" style={{ margin: '0' }}>
                    <label className="form-label" style={{ textTransform: 'uppercase', fontSize: '10px', fontWeight: '600', letterSpacing: '0.05em' }}>Judul Video Training / SOP</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Contoh: SOP Operasional: Tata Cara Packing Barang Baru"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group" style={{ margin: '0' }}>
                    <label className="form-label" style={{ textTransform: 'uppercase', fontSize: '10px', fontWeight: '600', letterSpacing: '0.05em' }}>Departemen Target</label>
                    <select className="form-select" value={dept} onChange={(e) => setDept(e.target.value)}>
                      <option value="Sales">Sales & Marketing</option>
                      <option value="HRD">HRD / GA</option>
                      <option value="Operasional">Operasional & Gudang</option>
                      <option value="Finance">Finance & Tax</option>
                      <option value="CS">Customer Service</option>
                      <option value="IT">IT Support</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ margin: '0' }}>
                    <label className="form-label" style={{ textTransform: 'uppercase', fontSize: '10px', fontWeight: '600', letterSpacing: '0.05em' }}>Estimasi Durasi (Menit)</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="5:00"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                    />
                  </div>
                </div>

                {/* Preview Placeholder */}
                <div style={{ display: 'flex', alignItems: 'stretch' }}>
                  <div className="preview-laptop-box" style={{ flex: 1 }}>
                    <div style={{ fontSize: '36px', marginBottom: '8px' }}>💻</div>
                    <p style={{ fontSize: '11px', color: 'var(--text3)', lineHeight: '1.4', padding: '0 10px' }}>
                      Pratinjau video akan muncul di sini setelah file diunggah.
                    </p>
                  </div>
                </div>

              </div>
            </div>
          </div>

        </div>

        {/* ROW 2: STEP 3 (Full Width Underneath) */}
        <div style={{ marginBottom: '24px' }}>
          <div className="step-header" style={{ justifyContent: 'space-between', marginBottom: '12px', alignItems: 'flex-start' }}>
            <div style={{ textAlign: 'left' }}>
              <div className="step-title" style={{ fontSize: '15px' }}>Konfigurasi Ujian</div>
              <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '2px' }}>Dikerjakan sebelum atau sesudah karyawan menonton video</div>
            </div>
            
            {/* SEGMENTED TAB SWITCHER */}
            <div className="segmented-control">
              <button
                type="button"
                className={`segment-btn ${activeTab === 'pre' ? 'active' : ''}`}
                onClick={() => setActiveTab('pre')}
              >
                Pre-Test
              </button>
              <button
                type="button"
                className={`segment-btn ${activeTab === 'post' ? 'active' : ''}`}
                onClick={() => setActiveTab('post')}
              >
                Post-Test
              </button>
            </div>
          </div>

          {/* ACTIVE QUESTIONS AREA (Spans Full Width) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {activeTab === 'pre' ? (
              // RENDER PRE-TEST QUESTIONS
              preQuestions.map((q, idx) => (
                <div key={idx} className="card" style={{ border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '12px 20px', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#1d4ed8', letterSpacing: '0.05em' }}>
                      Pertanyaan Pre-Test #{idx + 1}
                    </div>
                    {preQuestions.length > 1 && (
                      <button
                        type="button"
                        className="delete-question-btn"
                        title="Hapus Soal"
                        onClick={() => setDeleteConfirm({ isOpen: true, type: 'pre', index: idx })}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '16px', height: '16px' }}>
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          <line x1="10" y1="11" x2="10" y2="17" />
                          <line x1="14" y1="11" x2="14" y2="17" />
                        </svg>
                      </button>
                    )}
                  </div>

                  <div style={{ padding: '20px', textAlign: 'left' }}>
                    <div className="form-group" style={{ marginBottom: '12px' }}>
                      <label className="form-label" style={{ textTransform: 'uppercase', fontSize: '12px', fontWeight: '700', color: 'var(--text1)' }}>Teks Pertanyaan</label>
                      <textarea
                        className="form-input"
                        style={{ minHeight: '80px', fontFamily: 'inherit', resize: 'vertical', fontSize: '14px', padding: '10px 14px', marginTop: '6px' }}
                        placeholder="Contoh: Apa langkah pertama dalam prosedur packing barang pecah belah?"
                        value={q.question}
                        onChange={(e) => handlePreQuestionChange(idx, 'question', e.target.value)}
                      />
                    </div>

                    {/* QUESTION TYPE CHIPS SELECTOR */}
                    <div className="form-group" style={{ marginBottom: '12px' }}>
                      <label className="form-label" style={{ textTransform: 'uppercase', fontSize: '12px', fontWeight: '700', color: 'var(--text1)' }}>Tipe Pertanyaan</label>
                      <div className="type-chips-container" style={{ marginTop: '4px' }}>
                        <button
                          type="button"
                          className={`type-chip ${q.type === 'multiple' ? 'active' : ''}`}
                          onClick={() => handlePreQuestionChange(idx, 'type', 'multiple')}
                        >
                          Pilihan Ganda
                        </button>
                        <button
                          type="button"
                          className={`type-chip ${q.type === 'essay' ? 'active' : ''}`}
                          onClick={() => handlePreQuestionChange(idx, 'type', 'essay')}
                        >
                          Pertanyaan Biasa / Esai
                        </button>
                      </div>
                    </div>

                    {/* TIMESTAMP TRIGGER (IN-VIDEO TIMESTAMP) */}
                    <div className="form-group" style={{ marginBottom: '16px', marginTop: '12px' }}>
                      <label className="form-label" style={{ textTransform: 'uppercase', fontSize: '12px', fontWeight: '700', color: 'var(--text1)' }}>
                        Waktu Pemicu Kuis (Muncul Di Tengah Video)
                      </label>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '8px', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input
                            type="number"
                            min="0"
                            className="form-input"
                            style={{ width: '80px', fontSize: '14px', padding: '10px 14px', textAlign: 'center', fontWeight: '600' }}
                            placeholder="0"
                            value={q.triggerMin}
                            onChange={(e) => handlePreQuestionChange(idx, 'triggerMin', e.target.value)}
                          />
                          <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text2)' }}>Menit</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input
                            type="number"
                            min="0"
                            max="59"
                            className="form-input"
                            style={{ width: '80px', fontSize: '14px', padding: '10px 14px', textAlign: 'center', fontWeight: '600' }}
                            placeholder="0"
                            value={q.triggerSec}
                            onChange={(e) => handlePreQuestionChange(idx, 'triggerSec', e.target.value)}
                          />
                          <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text2)' }}>Detik</span>
                        </div>
                        <span style={{ fontSize: '13px', color: 'var(--text3)', marginLeft: '10px' }}>
                          ℹ️ Video akan otomatis terhenti di waktu ini untuk menampilkan soal kuis ke karyawan.
                        </span>
                      </div>
                    </div>

                    {q.type === 'multiple' ? (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '10px' }}>
                        {q.options.map((opt, oIdx) => {
                          const letter = String.fromCharCode(65 + oIdx);
                          const isCorrect = q.answer === letter;
                          return (
                            <div
                              key={oIdx}
                              className={`option-pill ${isCorrect ? 'correct' : ''}`}
                              onClick={() => handlePreQuestionChange(idx, 'answer', letter)}
                            >
                              <div className="option-circle">
                                {isCorrect && <span className="option-checkmark">✓</span>}
                              </div>
                              <input
                                type="text"
                                className="option-input"
                                style={{ background: 'none', border: 'none', width: '100%', outline: 'none', fontSize: '14px', color: isCorrect ? '#1d4ed8' : 'var(--text1)' }}
                                placeholder={`Opsi jawaban ${letter}`}
                                value={opt}
                                onChange={(e) => handlePreOptionChange(idx, oIdx, e.target.value)}
                                required
                              />
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div style={{ background: '#f8fafc', padding: '14px 18px', borderRadius: '8px', border: '1px solid var(--border)', marginTop: '10px', fontSize: '13px', color: 'var(--text3)' }}>
                        📝 Karyawan akan menjawab pertanyaan kuis ini dengan mengetikkan esai/teks bebas di portal mereka.
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              // RENDER POST-TEST QUESTIONS
              postQuestions.map((q, idx) => (
                <div key={idx} className="card" style={{ border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '12px 20px', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#1d4ed8', letterSpacing: '0.05em' }}>
                      Pertanyaan Post-Test #{idx + 1}
                    </div>
                    {postQuestions.length > 1 && (
                      <button
                        type="button"
                        className="delete-question-btn"
                        title="Hapus Soal"
                        onClick={() => setDeleteConfirm({ isOpen: true, type: 'post', index: idx })}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '16px', height: '16px' }}>
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          <line x1="10" y1="11" x2="10" y2="17" />
                          <line x1="14" y1="11" x2="14" y2="17" />
                        </svg>
                      </button>
                    )}
                  </div>

                  <div style={{ padding: '20px', textAlign: 'left' }}>
                    <div className="form-group" style={{ marginBottom: '12px' }}>
                      <label className="form-label" style={{ textTransform: 'uppercase', fontSize: '12px', fontWeight: '700', color: 'var(--text1)' }}>Teks Pertanyaan</label>
                      <textarea
                        className="form-input"
                        style={{ minHeight: '80px', fontFamily: 'inherit', resize: 'vertical', fontSize: '14px', padding: '10px 14px', marginTop: '6px' }}
                        placeholder="Contoh: Berapa standar berat maksimal per koli?"
                        value={q.question}
                        onChange={(e) => handlePostQuestionChange(idx, 'question', e.target.value)}
                      />
                    </div>

                    {/* QUESTION TYPE CHIPS SELECTOR */}
                    <div className="form-group" style={{ marginBottom: '12px' }}>
                      <label className="form-label" style={{ textTransform: 'uppercase', fontSize: '12px', fontWeight: '700', color: 'var(--text1)' }}>Tipe Pertanyaan</label>
                      <div className="type-chips-container" style={{ marginTop: '4px' }}>
                        <button
                          type="button"
                          className={`type-chip ${q.type === 'multiple' ? 'active' : ''}`}
                          onClick={() => handlePostQuestionChange(idx, 'type', 'multiple')}
                        >
                          Pilihan Ganda
                        </button>
                        <button
                          type="button"
                          className={`type-chip ${q.type === 'essay' ? 'active' : ''}`}
                          onClick={() => handlePostQuestionChange(idx, 'type', 'essay')}
                        >
                          Pertanyaan Biasa / Esai
                        </button>
                      </div>
                    </div>

                    {/* TIMESTAMP TRIGGER (IN-VIDEO TIMESTAMP) */}
                    <div className="form-group" style={{ marginBottom: '16px', marginTop: '12px' }}>
                      <label className="form-label" style={{ textTransform: 'uppercase', fontSize: '12px', fontWeight: '700', color: 'var(--text1)' }}>
                        Waktu Pemicu Kuis (Muncul Di Tengah Video)
                      </label>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '8px', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input
                            type="number"
                            min="0"
                            className="form-input"
                            style={{ width: '80px', fontSize: '14px', padding: '10px 14px', textAlign: 'center', fontWeight: '600' }}
                            placeholder="0"
                            value={q.triggerMin}
                            onChange={(e) => handlePostQuestionChange(idx, 'triggerMin', e.target.value)}
                          />
                          <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text2)' }}>Menit</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input
                            type="number"
                            min="0"
                            max="59"
                            className="form-input"
                            style={{ width: '80px', fontSize: '14px', padding: '10px 14px', textAlign: 'center', fontWeight: '600' }}
                            placeholder="0"
                            value={q.triggerSec}
                            onChange={(e) => handlePostQuestionChange(idx, 'triggerSec', e.target.value)}
                          />
                          <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text2)' }}>Detik</span>
                        </div>
                        <span style={{ fontSize: '13px', color: 'var(--text3)', marginLeft: '10px' }}>
                          ℹ️ Video akan otomatis terhenti di waktu ini untuk menampilkan soal kuis ke karyawan.
                        </span>
                      </div>
                    </div>

                    {q.type === 'multiple' ? (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '10px' }}>
                        {q.options.map((opt, oIdx) => {
                          const letter = String.fromCharCode(65 + oIdx);
                          const isCorrect = q.answer === letter;
                          return (
                            <div
                              key={oIdx}
                              className={`option-pill ${isCorrect ? 'correct' : ''}`}
                              onClick={() => handlePostQuestionChange(idx, 'answer', letter)}
                            >
                              <div className="option-circle">
                                {isCorrect && <span className="option-checkmark">✓</span>}
                              </div>
                              <input
                                type="text"
                                className="option-input"
                                style={{ background: 'none', border: 'none', width: '100%', outline: 'none', fontSize: '14px', color: isCorrect ? '#1d4ed8' : 'var(--text1)' }}
                                placeholder={`Opsi jawaban ${letter}`}
                                value={opt}
                                onChange={(e) => handlePostOptionChange(idx, oIdx, e.target.value)}
                                required
                              />
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div style={{ background: '#f8fafc', padding: '14px 18px', borderRadius: '8px', border: '1px solid var(--border)', marginTop: '10px', fontSize: '13px', color: 'var(--text3)' }}>
                        📝 Karyawan akan menjawab pertanyaan kuis ini dengan mengetikkan esai/teks bebas di portal mereka.
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}

            {/* ADD QUESTION BUTTON */}
            <button
              type="button"
              className="btn-primary"
              style={{ background: 'none', border: '1px dashed var(--border)', color: 'var(--text2)', fontSize: '12px', padding: '12px', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', borderRadius: '8px', cursor: 'pointer' }}
              onClick={activeTab === 'pre' ? addPreQuestion : addPostQuestion}
            >
              ➕ Tambah Pertanyaan Baru
            </button>

          </div>
        </div>

        {/* BOTTOM FORM ACTIONS */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid var(--border)', paddingTop: '16px', marginTop: '24px' }}>
          <button type="button" className="form-input" style={{ cursor: 'pointer', padding: '8px 18px' }} onClick={() => setActivePage('sop')}>
            Batal
          </button>
          <button type="submit" className="btn-primary" style={{ padding: '8px 24px', background: '#002D72' }}>
            Terbitkan SOP & Ujian
          </button>
        </div>
      </form>

      {/* CONFIRMATION MODAL */}
      {deleteConfirm.isOpen && (
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
        }} onClick={() => setDeleteConfirm({ isOpen: false, type: 'pre', index: null })}>
          <div className="card" style={{
            width: '400px',
            background: '#ffffff',
            padding: '24px',
            borderRadius: '12px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            textAlign: 'center',
            margin: '20px'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: '#fef2f2',
              color: '#ef4444',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              margin: '0 auto 16px auto'
            }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '22px', height: '22px' }}>
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px', color: 'var(--text1)' }}>Hapus Pertanyaan?</h3>
            <p style={{ fontSize: '13px', color: 'var(--text3)', marginBottom: '24px', lineHeight: '1.5', padding: '0 10px' }}>
              Apakah Anda yakin ingin menghapus pertanyaan ini? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                type="button"
                className="form-input"
                style={{ cursor: 'pointer', padding: '8px 18px', flex: 1, margin: 0 }}
                onClick={() => setDeleteConfirm({ isOpen: false, type: 'pre', index: null })}
              >
                Batal
              </button>
              <button
                type="button"
                className="btn-primary"
                style={{ padding: '8px 18px', background: '#ef4444', border: '1px solid #ef4444', color: '#ffffff', flex: 1, cursor: 'pointer' }}
                onClick={() => {
                  if (deleteConfirm.type === 'pre') {
                    removePreQuestion(deleteConfirm.index);
                  } else {
                    removePostQuestion(deleteConfirm.index);
                  }
                  setDeleteConfirm({ isOpen: false, type: 'pre', index: null });
                }}
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
