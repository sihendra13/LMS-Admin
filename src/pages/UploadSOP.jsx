import React, { useState, useRef, useEffect } from 'react';
import { useTenant } from '../context/TenantContext';
import { canUploadSOP } from '../utils/featureGates';
import { supabase } from '../utils/supabase';

export const UploadSOP = () => {
  const { tenant, addSOP, setActivePage } = useTenant();
  const [title, setTitle] = useState('');
  const [dept, setDept] = useState('Sales');
  const [duration, setDuration] = useState('5:00');
  const [videoFile, setVideoFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);

  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [previewUrl]);

  const selectVideoFile = (file) => {
    if (!file || !file.type.startsWith('video/')) return;
    setVideoFile(file);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
  };

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

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return alert('Judul SOP tidak boleh kosong!');

    let videoUrl = null;

    if (videoFile) {
      setUploading(true);
      setUploadProgress(5);
      const fileExt = videoFile.name.split('.').pop();
      const fileName = `${Date.now()}_${title.replace(/\s+/g, '_')}.${fileExt}`;

      // Simulasi progress saat upload berlangsung
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => prev < 80 ? prev + 5 : prev);
      }, 300);

      const { data, error } = await supabase.storage
        .from('videos')
        .upload(fileName, videoFile, { cacheControl: '3600', upsert: false });

      clearInterval(progressInterval);

      if (error) {
        setUploading(false);
        setUploadProgress(0);
        return alert('Gagal upload video: ' + error.message);
      }

      setUploadProgress(95);
      const { data: urlData } = supabase.storage.from('videos').getPublicUrl(data.path);
      videoUrl = urlData.publicUrl;
      setUploadProgress(100);
      await new Promise(r => setTimeout(r, 400));
      setUploading(false);
    }

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
      videoUrl: videoUrl || null,
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
              <div
                className="upload-zone"
                style={{ margin: '0', padding: '36px 20px', border: '1px dashed var(--border)', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  selectVideoFile(e.dataTransfer.files[0]);
                }}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="video/*"
                  style={{ display: 'none' }}
                  onChange={(e) => selectVideoFile(e.target.files[0])}
                />
                <div className="upload-icon" style={{ fontSize: '28px', color: '#002D72', marginBottom: '10px' }}>☁️</div>
                {videoFile ? (
                  <>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#059669', marginBottom: '4px', textAlign: 'center', wordBreak: 'break-all', padding: '0 10px' }}>✓ {videoFile.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text3)', marginBottom: '14px' }}>{(videoFile.size / 1024 / 1024).toFixed(1)} MB</div>
                    <button
                      type="button"
                      style={{ background: 'none', border: '1px solid #fca5a5', color: '#ef4444', fontSize: '11px', fontWeight: '600', padding: '4px 12px', borderRadius: '20px', cursor: 'pointer', marginBottom: '8px' }}
                      onClick={() => { setVideoFile(null); if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); } fileInputRef.current.value = ''; }}
                    >
                      ✕ Hapus File
                    </button>
                  </>
                ) : (
                  <>
                    <div className="upload-title" style={{ fontSize: '14px', fontWeight: '600' }}>Seret dan letakkan file video Anda</div>
                    <div className="upload-desc" style={{ fontSize: '11px', color: 'var(--text3)', margin: '6px 0 16px', lineHeight: '1.4' }}>
                      Format MP4, MKV, atau AVI. Maksimal 500MB.
                    </div>
                  </>
                )}
                {uploading ? (
                  <div style={{ width: '100%', padding: '0 10px', boxSizing: 'border-box' }}>
                    <div style={{ height: '4px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden', marginBottom: '6px' }}>
                      <div style={{ height: '100%', width: `${uploadProgress}%`, background: '#002D72', transition: 'width 0.3s ease' }} />
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', textAlign: 'center' }}>Mengupload... {uploadProgress}%</div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="btn-primary"
                    style={{ background: '#002D72', padding: '8px 20px', borderRadius: '20px', fontSize: '12px' }}
                    onClick={() => fileInputRef.current.click()}
                  >
                    {videoFile ? 'Ganti File Video' : 'Pilih File Video'}
                  </button>
                )}
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

                {/* Preview */}
                <div style={{ display: 'flex', alignItems: 'stretch' }}>
                  {previewUrl ? (
                    <div style={{ flex: 1, borderRadius: '10px', overflow: 'hidden', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <video
                        src={previewUrl}
                        controls
                        controlsList="nodownload"
                        style={{ width: '100%', maxHeight: '180px', objectFit: 'contain', borderRadius: '10px' }}
                      />
                    </div>
                  ) : (
                    <div className="preview-laptop-box" style={{ flex: 1 }}>
                      <div style={{ fontSize: '36px', marginBottom: '8px' }}>💻</div>
                      <p style={{ fontSize: '11px', color: 'var(--text3)', lineHeight: '1.4', padding: '0 10px' }}>
                        Pratinjau video akan muncul di sini setelah file dipilih.
                      </p>
                    </div>
                  )}
                </div>

              </div>
            </div>
          </div>

        </div>

        {/* ROW 2: STEP 3 (Full Width Underneath) - SIDE BY SIDE PRE-TEST AND POST-TEST LAYOUT */}
        <div style={{ marginBottom: '24px' }}>
          <div className="step-header" style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <div className="step-title" style={{ fontSize: '15px' }}>Konfigurasi Ujian</div>
            <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '2px' }}>Buat parameter kuis yang muncul di tengah video (Pre-Test) dan evaluasi akhir setelah selesai menonton (Post-Test).</div>
          </div>

          {/* TWO COLUMN GRID FOR PRE-TEST AND POST-TEST */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }}>
            
            {/* COLUMN 1: PRE-TEST */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text2)', paddingBottom: '8px', borderBottom: '1px solid var(--border)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                ✍️ Kuis Pre-Test (Tengah Video)
              </div>
              
              {preQuestions.map((q, idx) => (
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
              ))}

              {/* ADD PRE-TEST QUESTION BUTTON */}
              <button
                type="button"
                className="btn-primary"
                style={{ background: 'none', border: '1px dashed var(--border)', color: 'var(--text2)', fontSize: '12px', padding: '12px', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', borderRadius: '8px', cursor: 'pointer' }}
                onClick={addPreQuestion}
              >
                ➕ Tambah Pertanyaan Pre-Test
              </button>
            </div>

            {/* COLUMN 2: POST-TEST */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text2)', paddingBottom: '8px', borderBottom: '1px solid var(--border)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                📝 Kuis Post-Test (Setelah Video Selesai)
              </div>
              
              {postQuestions.map((q, idx) => (
                <div key={idx} className="card" style={{ border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '12px 20px', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#10b981', letterSpacing: '0.05em' }}>
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
              ))}

              {/* ADD POST-TEST QUESTION BUTTON */}
              <button
                type="button"
                className="btn-primary"
                style={{ background: 'none', border: '1px dashed var(--border)', color: 'var(--text2)', fontSize: '12px', padding: '12px', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', borderRadius: '8px', cursor: 'pointer' }}
                onClick={addPostQuestion}
              >
                ➕ Tambah Pertanyaan Post-Test
              </button>
            </div>

          </div>
        </div>

        {/* BOTTOM FORM ACTIONS */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid var(--border)', paddingTop: '16px', marginTop: '24px' }}>
          <button type="button" className="form-input" style={{ cursor: 'pointer', padding: '8px 18px' }} onClick={() => setActivePage('sop')}>
            Batal
          </button>
          <button type="submit" className="btn-primary" style={{ padding: '8px 24px', background: uploading ? '#94a3b8' : '#002D72', cursor: uploading ? 'not-allowed' : 'pointer' }} disabled={uploading}>
            {uploading ? `Mengupload Video... ${uploadProgress}%` : 'Terbitkan SOP & Ujian'}
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
