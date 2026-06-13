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
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [previewUrl]);

  const selectVideoFile = (file) => {
    if (!file || !file.type.startsWith('video/')) return;
    setVideoFile(file);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    const tempVideo = document.createElement('video');
    tempVideo.preload = 'metadata';
    tempVideo.onloadedmetadata = () => {
      const secs = Math.floor(tempVideo.duration);
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      setDuration(`${m}:${s.toString().padStart(2, '0')}`);
      URL.revokeObjectURL(tempVideo.src);
    };
    tempVideo.src = URL.createObjectURL(file);
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

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return alert('Judul SOP tidak boleh kosong!');
    setShowPublishConfirm(true);
  };

  const handleConfirmPublish = async () => {
    setShowPublishConfirm(false);
    let videoUrl = null;
    let filePath = null;

    if (videoFile) {
      setUploading(true);
      setUploadProgress(5);
      const fileExt = videoFile.name.split('.').pop();
      const fileName = `${Date.now()}_${title.replace(/\s+/g, '_')}.${fileExt}`;
      filePath = fileName;

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
      filePath: filePath,
      archived: false,
      preQuizzes: preList,
      postQuizzes: postList
    };

    addSOP(newVideo);
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

      <form onSubmit={handleFormSubmit}>
        
        {/* ROW 1: SINGLE CARD WITH 3 SECTIONS SPLIT INTO 2 COLUMNS SIDE-BY-SIDE */}
        <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
          {/* SINGLE COLUMN: Media Upload & Video Preview (Dynamic Layout) */}
          <div style={{ marginBottom: '24px' }}>
            
            {/* SECTION 1: MEDIA UPLOAD / VIDEO PLAYER */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text1)' }}>Media Training & SOP</div>
                {videoFile && !uploading && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      className="btn-sec"
                      style={{
                        padding: '6px 14px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '600',
                        border: '1px solid var(--border)',
                        background: '#ffffff',
                        color: 'var(--text2)',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.2s'
                      }}
                      onClick={() => fileInputRef.current.click()}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
                      </svg>
                      Ganti Video
                    </button>
                    <button
                      type="button"
                      style={{
                        padding: '6px 14px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '600',
                        border: '1px solid #fee2e2',
                        background: '#fff5f5',
                        color: '#ef4444',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.2s'
                      }}
                      onClick={() => { setVideoFile(null); if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); } fileInputRef.current.value = ''; }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      </svg>
                      Hapus
                    </button>
                  </div>
                )}
              </div>

              {previewUrl ? (
                /* VIDEO PLAYER WITH DETAILED FILE INFO BAR */
                <div style={{ borderRadius: '12px', overflow: 'hidden', background: '#0f172a', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '340px', background: '#000' }}>
                    <video
                      src={previewUrl}
                      controls
                      controlsList="nodownload"
                      style={{ width: '100%', maxHeight: '420px', objectFit: 'contain' }}
                    />
                  </div>
                  {/* DETAILED FILE INFO FOOTER */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0b1329', padding: '12px 18px', color: '#fff', fontSize: '12.5px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ background: '#3b82f6', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontWeight: '800', fontSize: '10px' }}>HD</span>
                      <span style={{ fontWeight: '500', opacity: 0.95 }}>{videoFile?.name}</span>
                      <span style={{ opacity: 0.4 }}>•</span>
                      <span style={{ color: '#94a3b8' }}>{videoFile ? (videoFile.size / 1024 / 1024).toFixed(1) : '0'} MB</span>
                    </div>
                    {duration && (
                      <div style={{ color: '#94a3b8', fontWeight: '500' }}>
                        Durasi: {duration}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* LARGE DROP ZONE AREA */
                <div
                  className="upload-zone"
                  style={{ 
                    margin: '0', 
                    padding: '60px 20px', 
                    border: '2px dashed #cbd5e1', 
                    borderRadius: '16px',
                    display: 'flex', 
                    flexDirection: 'column', 
                    justifyContent: 'center', 
                    alignItems: 'center',
                    background: '#f8fafc',
                    transition: 'border-color 0.2s',
                    cursor: 'pointer'
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    selectVideoFile(e.dataTransfer.files[0]);
                  }}
                  onClick={() => fileInputRef.current.click()}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="video/*"
                    style={{ display: 'none' }}
                    onChange={(e) => selectVideoFile(e.target.files[0])}
                  />
                  
                  {/* SVG CLOUD WITH UP ARROW */}
                  <div style={{ color: '#94a3b8', marginBottom: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="17 8 12 3 7 8"></polyline>
                      <line x1="12" y1="3" x2="12" y2="15"></line>
                    </svg>
                  </div>

                  <div className="upload-title" style={{ fontSize: '14px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>Seret dan letakkan file video Anda</div>
                  <div className="upload-desc" style={{ fontSize: '11.5px', color: '#94a3b8', margin: '0 0 20px 0', lineHeight: '1.4' }}>
                    Format MP4, MKV, atau AVI. Maksimal 500MB.
                  </div>

                  {uploading ? (
                    <div style={{ width: '280px', padding: '0 10px', boxSizing: 'border-box' }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ height: '4px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden', marginBottom: '6px' }}>
                        <div style={{ height: '100%', width: `${uploadProgress}%`, background: '#0B1628', transition: 'width 0.3s ease' }} />
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b', textAlign: 'center' }}>Mengupload... {uploadProgress}%</div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="btn-primary"
                      style={{ 
                        padding: '10px 24px', 
                        borderRadius: '8px', 
                        fontSize: '12px',
                        fontWeight: '700',
                        boxShadow: '0 4px 6px -1px rgba(11, 22, 40, 0.15)',
                        cursor: 'pointer'
                      }}
                      onClick={(e) => { e.stopPropagation(); fileInputRef.current.click(); }}
                    >
                      Pilih File Video
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* SECTION 2: DETAIL INFORMASI (Full width under player/dropzone) */}
            <div className="card" style={{ padding: '24px', border: '1px solid var(--border)', borderRadius: '12px', background: '#ffffff', textAlign: 'left' }}>
              <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text1)', marginBottom: '16px' }}>Detail Informasi</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group" style={{ margin: '0' }}>
                  <label className="form-label" style={{ textTransform: 'uppercase', fontSize: '10px', fontWeight: '700', letterSpacing: '0.05em' }}>Judul Video Training / SOP</label>
                  <input
                    type="text"
                    className="form-input"
                    style={{ fontSize: '14px', padding: '10px 12px' }}
                    placeholder="Contoh: SOP Operasional: Tata Cara Packing Barang Baru"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group" style={{ margin: '0' }}>
                    <label className="form-label" style={{ textTransform: 'uppercase', fontSize: '10px', fontWeight: '700', letterSpacing: '0.05em' }}>Departemen Target</label>
                    <select className="form-select" style={{ fontSize: '14px' }} value={dept} onChange={(e) => setDept(e.target.value)}>
                      <option value="Semua">Semua Departemen</option>
                      <option value="Sales">Sales & Marketing</option>
                      <option value="HRD">HRD / GA</option>
                      <option value="Operasional">Operasional & Gudang</option>
                      <option value="Finance">Finance & Tax</option>
                      <option value="CS">Customer Service</option>
                      <option value="IT">IT Support</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ margin: '0' }}>
                    <label className="form-label" style={{ textTransform: 'uppercase', fontSize: '10px', fontWeight: '700', letterSpacing: '0.05em' }}>Durasi Video</label>
                    <input
                      type="text"
                      className="form-input"
                      style={{ fontSize: '14px', padding: '10px 12px', textAlign: 'center', background: '#f1f5f9', color: 'var(--text2)', cursor: 'default' }}
                      placeholder="Otomatis terisi"
                      value={duration}
                      readOnly
                    />
                  </div>
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
                      <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-end', marginTop: '8px', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text3)', textTransform: 'uppercase' }}>Menit</span>
                          <input
                            type="number"
                            min="0"
                            className="form-input"
                            style={{ width: '80px', fontSize: '14px', padding: '10px 14px', textAlign: 'center', fontWeight: '600' }}
                            placeholder="0"
                            value={q.triggerMin}
                            onChange={(e) => handlePreQuestionChange(idx, 'triggerMin', e.target.value)}
                          />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text3)', textTransform: 'uppercase' }}>Detik</span>
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
                        </div>

                        {/* INFO BOX WITH SVG OUTLINE ICON MATCHING THE TRASH ICON STYLE */}
                        <div style={{
                          background: '#f8fafc',
                          border: '1px solid var(--border)',
                          borderRadius: '8px',
                          padding: '10px 16px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          flex: 1,
                          minWidth: '240px',
                          height: '46px',
                          boxSizing: 'border-box'
                        }}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="16" x2="12" y2="12"></line>
                            <line x1="12" y1="8" x2="12.01" y2="8"></line>
                          </svg>
                          <span style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic', lineHeight: '1.4' }}>
                            Video akan otomatis terhenti di waktu ini untuk menampilkan kuis.
                          </span>
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
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px',
          borderTop: '1px solid var(--border)',
          padding: '16px 24px',
          marginTop: '32px',
          position: 'sticky',
          bottom: 0,
          background: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          boxShadow: '0 -10px 15px -3px rgba(15, 23, 42, 0.04), 0 -4px 6px -2px rgba(15, 23, 42, 0.02)',
          zIndex: 10,
          marginRight: '-24px',
          marginLeft: '-24px'
        }}>
          <button type="button" className="form-input" style={{ cursor: 'pointer', padding: '8px 18px', margin: 0 }} onClick={() => setActivePage('sop')}>
            Batal
          </button>
          <button
            type="submit"
            className="btn-primary"
            style={{
              padding: '10px 24px',
              borderRadius: '8px',
              fontWeight: '700',
              boxShadow: '0 4px 6px -1px rgba(11, 22, 40, 0.15)',
              cursor: uploading ? 'not-allowed' : 'pointer'
            }}
            disabled={uploading}
          >
            {uploading ? `Mengupload Video... ${uploadProgress}%` : 'Terbitkan SOP & Ujian'}
          </button>
        </div>
      </form>

      {/* PUBLISH CONFIRMATION MODAL */}
      {showPublishConfirm && (() => {
        const preToShow = preQuestions.filter(q => q.question.trim() !== '');
        const postToShow = postQuestions.filter(q => q.question.trim() !== '');
        const formatTrigger = (q) => {
          const secs = (Number(q.triggerMin || 0) * 60) + Number(q.triggerSec || 0);
          if (secs === 0) return null;
          const m = Math.floor(secs / 60);
          const s = secs % 60;
          return `${m}:${s.toString().padStart(2, '0')}`;
        };
        return (
          <div style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(4px)',
            display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999
          }} onClick={() => setShowPublishConfirm(false)}>
            <div className="card" style={{
              width: '560px', maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto',
              background: '#ffffff', borderRadius: '16px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              display: 'flex', flexDirection: 'column'
            }} onClick={(e) => e.stopPropagation()}>
              {/* MODAL HEADER */}
              <div style={{ padding: '24px 28px 0', borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#fffbeb', border: '1px solid #fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                      <line x1="12" y1="9" x2="12" y2="13"></line>
                      <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                  </div>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text1)', margin: 0 }}>Konfirmasi Terbitkan SOP</h3>
                    <p style={{ fontSize: '12px', color: 'var(--text3)', margin: 0 }}>Tinjau kembali sebelum menerbitkan</p>
                  </div>
                </div>
              </div>

              {/* MODAL BODY */}
              <div style={{ padding: '20px 28px', flex: 1 }}>
                {/* SOP SUMMARY */}
                <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '14px 18px', marginBottom: '20px', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>Ringkasan SOP</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'baseline' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text3)', minWidth: '90px' }}>Judul</span>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text1)' }}>{title || '—'}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'baseline' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text3)', minWidth: '90px' }}>Departemen</span>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text1)' }}>{dept === 'Semua' ? 'Semua Departemen' : dept}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'baseline' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text3)', minWidth: '90px' }}>Durasi Video</span>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text1)' }}>{duration || '—'}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'baseline' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text3)', minWidth: '90px' }}>File Video</span>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text1)' }}>{videoFile ? videoFile.name : 'Tidak ada video'}</span>
                    </div>
                  </div>
                </div>

                {/* PRE-TEST QUESTIONS */}
                {preToShow.length > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#1d4ed8', display: 'inline-block' }}></span>
                      Pre-Test ({preToShow.length} soal)
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {preToShow.map((q, i) => {
                        const trigger = formatTrigger(q);
                        return (
                          <div key={i} style={{ background: '#f8fafc', border: `1px solid ${trigger ? '#fde68a' : 'var(--border)'}`, borderRadius: '8px', padding: '10px 14px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                              <div style={{ fontSize: '13px', color: 'var(--text1)', lineHeight: '1.4', flex: 1 }}>
                                <span style={{ fontWeight: '700', color: 'var(--text3)', marginRight: '6px' }}>#{i + 1}</span>
                                {q.question}
                              </div>
                              <span style={{ fontSize: '10px', fontWeight: '600', padding: '2px 6px', borderRadius: '4px', background: q.type === 'multiple' ? '#eff6ff' : '#f0fdf4', color: q.type === 'multiple' ? '#1d4ed8' : '#16a34a', flexShrink: 0 }}>
                                {q.type === 'multiple' ? 'Pilihan Ganda' : 'Esai'}
                              </span>
                            </div>
                            {trigger && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', padding: '6px 10px', background: '#fffbeb', borderRadius: '6px', border: '1px solid #fde68a' }}>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#b45309" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                                </svg>
                                <span style={{ fontSize: '11px', color: '#92400e', lineHeight: '1.4' }}>
                                  Video akan <strong>berhenti otomatis di menit {trigger}</strong> dan menampilkan soal ini sebelum karyawan bisa melanjutkan menonton.
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* POST-TEST QUESTIONS */}
                {postToShow.length > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
                      Post-Test ({postToShow.length} soal)
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {postToShow.map((q, i) => (
                        <div key={i} style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                            <div style={{ fontSize: '13px', color: 'var(--text1)', lineHeight: '1.4', flex: 1 }}>
                              <span style={{ fontWeight: '700', color: 'var(--text3)', marginRight: '6px' }}>#{i + 1}</span>
                              {q.question}
                            </div>
                            <span style={{ fontSize: '10px', fontWeight: '600', padding: '2px 6px', borderRadius: '4px', background: q.type === 'multiple' ? '#eff6ff' : '#f0fdf4', color: q.type === 'multiple' ? '#1d4ed8' : '#16a34a', flexShrink: 0 }}>
                              {q.type === 'multiple' ? 'Pilihan Ganda' : 'Esai'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {preToShow.length === 0 && postToShow.length === 0 && (
                  <div style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', fontSize: '13px', color: 'var(--text3)', textAlign: 'center' }}>
                    Tidak ada soal kuis yang dikonfigurasi
                  </div>
                )}

                {/* WARNING */}
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '14px 18px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '1px' }}>
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                  <span style={{ fontSize: '13px', color: '#dc2626', fontWeight: '500', lineHeight: '1.5' }}>
                    Setelah diterbitkan, pertanyaan kuis <strong>tidak dapat diedit atau diubah</strong>. Pastikan semua soal sudah benar sebelum melanjutkan.
                  </span>
                </div>
              </div>

              {/* MODAL FOOTER */}
              <div style={{ padding: '16px 28px', borderTop: '1px solid var(--border)', display: 'flex', gap: '12px', justifyContent: 'flex-end', background: '#fafafa', borderRadius: '0 0 16px 16px' }}>
                <button
                  type="button"
                  className="form-input"
                  style={{ cursor: 'pointer', padding: '10px 20px', margin: 0, fontWeight: '600', fontSize: '13px' }}
                  onClick={() => setShowPublishConfirm(false)}
                >
                  Tinjau Ulang
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  style={{ padding: '10px 24px', fontWeight: '700', fontSize: '13px', borderRadius: '8px', cursor: 'pointer' }}
                  onClick={handleConfirmPublish}
                >
                  Terbitkan Sekarang
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* DELETE QUESTION MODAL */}
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
