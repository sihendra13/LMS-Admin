import React, { useState, useRef, useEffect } from 'react';
import JSZip from 'jszip';
import { useTenant } from '../context/TenantContext';
import { canUploadSOP, canUploadPPT, getPPTLimit } from '../utils/featureGates';
import { supabase } from '../utils/supabase';

export const UploadSOP = () => {
  const { tenant, addSOP, updateSOP, setActivePage, videos, editingVideoId, setEditingVideoId } = useTenant();
  const editVideo = editingVideoId ? videos.find(v => v.id === editingVideoId) : null;
  const isEditMode = !!editVideo;

  const [contentType, setContentType] = useState(editVideo?.type || 'video');
  const [title, setTitle] = useState(editVideo?.title || '');
  const [dept, setDept] = useState(editVideo?.dept || 'Sales');
  const [duration, setDuration] = useState(editVideo?.duration || '5:00');
  const [videoFile, setVideoFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [pptFile, setPptFile] = useState(null);
  const [slideCount, setSlideCount] = useState(editVideo?.slideImages?.length || editVideo?.slideCount || 0);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef(null);
  const pptInputRef = useRef(null);

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

  const selectPptFile = async (file) => {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (ext !== 'pptx') return alert('Hanya file .pptx yang didukung.');
    setPptFile(file);
    try {
      const zip = await JSZip.loadAsync(file);
      const slides = Object.keys(zip.files).filter(name =>
        /^ppt\/slides\/slide\d+\.xml$/.test(name)
      );
      setSlideCount(slides.length);
      setDuration(`${slides.length} slide`);
    } catch {
      setSlideCount(0);
      setDuration('? slide');
    }
  };

  // Helper convert saved quiz → edit format
  const toEditQuiz = (q) => ({
    question: q.question || '',
    type: q.type || 'multiple',
    options: q.options?.length ? [...q.options] : ['', '', '', ''],
    answer: q.answer || 'A',
    triggerMin: String(Math.floor((q.triggerTime || 0) / 60)),
    triggerSec: String((q.triggerTime || 0) % 60),
  });
  const emptyQuiz = { question: '', type: 'multiple', options: ['', '', '', ''], answer: 'A', triggerMin: '0', triggerSec: '0' };

  // Toggle state to switch editing between 'pre' (Pre-Test) and 'post' (Post-Test)
  const [activeTab, setActiveTab] = useState('pre'); // 'pre' | 'post'

  // Dynamic state for Pre-Test Questions
  const [preQuestions, setPreQuestions] = useState(
    editVideo?.preQuizzes?.length ? editVideo.preQuizzes.map(toEditQuiz) : [{ ...emptyQuiz }, { ...emptyQuiz }]
  );

  // Dynamic state for Post-Test Questions
  const [postQuestions, setPostQuestions] = useState(
    editVideo?.postQuizzes?.length ? editVideo.postQuizzes.map(toEditQuiz) : [{ ...emptyQuiz }, { ...emptyQuiz }]
  );

  // State for confirm delete modal
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, type: 'pre', index: null });

  // Kuis Pemicu Slide — hanya untuk PPT, muncul saat user sampai di slide tertentu
  const [triggerQuizzes, setTriggerQuizzes] = useState(
    editVideo?.triggerQuizzes?.length
      ? editVideo.triggerQuizzes.map(q => ({
          question: q.question || '',
          type: 'multiple',
          options: q.options?.length ? [...q.options] : ['', '', '', ''],
          answer: q.answer || 'A',
          triggerSlide: String(q.triggerSlide || 2),
        }))
      : [{ question: '', type: 'multiple', options: ['', '', '', ''], answer: 'A', triggerSlide: '2' }]
  );

  // Narasi per Slide — teks dan/atau audio per slide
  const [narasiMode, setNarasiMode] = useState(editVideo?.narasiMode || 'none');
  const [slideNarasi, setSlideNarasi] = useState(
    editVideo?.slideNarasi?.length
      ? editVideo.slideNarasi.map(s => ({ teks: s.teks || '', audioFile: null, audioUrl: s.audioUrl || null, audioInputMode: 'upload' }))
      : []
  );
  const [activeSlideIndex, setActiveSlideIndex] = useState(0); // Carousel active slide index
  const [recordingSlide, setRecordingSlide] = useState(null); // index slide yang sedang direkam
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef(null);
  const recordingTimerRef = useRef(null);
  const chunksRef = useRef([]);

  // Inisialisasi slideNarasi saat slideCount berubah
  useEffect(() => {
    if (slideCount > 0) {
      setSlideNarasi(prev => {
        const result = [];
        for (let i = 0; i < slideCount; i++) {
          result.push(prev[i] || { teks: '', audioFile: null, audioUrl: null, audioInputMode: 'upload' });
        }
        return result;
      });
    }
  }, [slideCount]);

  const startRecording = async (slideIdx) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const file = new File([blob], `rekaman-slide-${slideIdx + 1}.webm`, { type: 'audio/webm' });
        setSlideNarasi(prev => {
          const updated = [...prev];
          updated[slideIdx] = { ...updated[slideIdx], audioFile: file, audioUrl: null };
          return updated;
        });
        clearInterval(recordingTimerRef.current);
        setRecordingSlide(null);
        setRecordingSeconds(0);
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecordingSlide(slideIdx);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => setRecordingSeconds(s => s + 1), 1000);
    } catch {
      alert('Tidak bisa mengakses mikrofon. Pastikan izin mikrofon sudah diberikan di browser.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

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

  // Handlers untuk Kuis Pemicu Slide
  const handleTriggerQuizChange = (index, field, value) => {
    setTriggerQuizzes(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };
  const handleTriggerOptionChange = (qIndex, oIndex, value) => {
    setTriggerQuizzes(prev => {
      const updated = [...prev];
      updated[qIndex].options[oIndex] = value;
      return updated;
    });
  };
  const addTriggerQuiz = () => {
    setTriggerQuizzes(prev => [...prev, { question: '', type: 'multiple', options: ['', '', '', ''], answer: 'A', triggerSlide: '2' }]);
  };
  const removeTriggerQuiz = (index) => {
    setTriggerQuizzes(prev => prev.filter((_, i) => i !== index));
  };

  const toSecs = (q) => Number(q.triggerMin || 0) * 60 + Number(q.triggerSec || 0);

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return alert('Judul SOP tidak boleh kosong!');
    if (contentType === 'video') {
      for (let i = 1; i < preQuestions.length; i++) {
        if (preQuestions[i].question.trim() === '') continue;
        if (toSecs(preQuestions[i]) <= toSecs(preQuestions[i - 1])) {
          return alert(`Pertanyaan Pre-Test #${i + 1}: waktu pemicu harus lebih besar dari pertanyaan sebelumnya. Kuis harus muncul secara kronologis.`);
        }
      }
    }
    if (contentType === 'ppt') {
      const filledTriggers = triggerQuizzes.filter(q => q.question.trim() !== '');
      for (let i = 1; i < filledTriggers.length; i++) {
        if (Number(filledTriggers[i].triggerSlide) <= Number(filledTriggers[i - 1].triggerSlide)) {
          return alert(`Kuis Pemicu #${i + 1}: nomor slide harus lebih besar dari kuis pemicu sebelumnya (slide ${filledTriggers[i - 1].triggerSlide}). Kuis harus muncul secara berurutan.`);
        }
      }
    }
    setShowPublishConfirm(true);
  };

  const BACKEND_URL = 'https://axara-lms-backend.onrender.com';

  const handleConfirmPublish = async () => {
    setShowPublishConfirm(false);
    let videoUrl = null;
    let filePath = null;
    let slideImages = null;

    if (contentType === 'ppt' && pptFile) {
      // Kirim PPTX ke backend → konversi jadi PNG per slide
      setUploading(true);
      setUploadProgress(10);
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => prev < 85 ? prev + 3 : prev);
      }, 800);

      try {
        const formData = new FormData();
        formData.append('file', pptFile);
        const resp = await fetch(`${BACKEND_URL}/api/v1/ppt/convert`, {
          method: 'POST',
          body: formData,
        });
        clearInterval(progressInterval);
        if (!resp.ok) {
          const errData = await resp.json().catch(() => ({}));
          setUploading(false);
          setUploadProgress(0);
          return alert(`Gagal konversi PPT: ${errData.error || resp.statusText}`);
        }
        const result = await resp.json();
        slideImages = result.slideUrls;
        setSlideCount(result.slideCount);
        setDuration(`${result.slideCount} slide`);
        setUploadProgress(100);
        await new Promise(r => setTimeout(r, 300));
      } catch (err) {
        clearInterval(progressInterval);
        setUploading(false);
        setUploadProgress(0);
        return alert(`Koneksi ke server gagal: ${err.message}`);
      }

      // Upload audio narasi per slide ke Supabase (jika ada)
      if (narasiMode === 'audio' || narasiMode === 'keduanya') {
        const audioFiles = slideNarasi.filter(s => s.audioFile);
        if (audioFiles.length > 0) {
          setUploadProgress(5);
          const sopId = Date.now();
          for (let i = 0; i < slideNarasi.length; i++) {
            const s = slideNarasi[i];
            if (!s.audioFile) continue;
            const ext = s.audioFile.name.split('.').pop();
            const path = `narasi/${sopId}/slide-${i + 1}.${ext}`;
            const { error } = await supabase.storage.from('narasi').upload(path, s.audioFile, { upsert: true });
            if (error) return alert(`Gagal upload audio slide ${i + 1}: ${error.message}`);
            const { data: urlData } = supabase.storage.from('narasi').getPublicUrl(path);
            setSlideNarasi(prev => {
              const updated = [...prev];
              updated[i] = { ...updated[i], audioUrl: urlData.publicUrl };
              return updated;
            });
            setUploadProgress(Math.round((i + 1) / slideNarasi.length * 90));
          }
          setUploadProgress(100);
          await new Promise(r => setTimeout(r, 200));
        }
      }

      setUploading(false);

    } else if (contentType === 'video' && videoFile) {
      setUploading(true);
      setUploadProgress(5);
      const fileExt = videoFile.name.split('.').pop();
      const fileName = `${Date.now()}_${title.replace(/\s+/g, '_')}.${fileExt}`;
      filePath = fileName;

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
        return alert(`Gagal upload video: ${error.message}`);
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

    const triggerList = contentType === 'ppt'
      ? triggerQuizzes
          .filter(q => q.question.trim() !== '')
          .map((q, idx) => ({
            id: idx + 1,
            question: q.question,
            type: q.type,
            triggerSlide: Math.max(1, Math.min(Number(q.triggerSlide) || 2, slideCount || 999)),
            options: q.options.map((o, oIdx) => o.trim() || `Opsi ${String.fromCharCode(65 + oIdx)}`),
            answer: q.answer
          }))
      : null;

    if (isEditMode) {
      // Edit mode: update existing SOP
      const updatedFields = {
        title,
        dept,
        duration,
        color: deptColors[dept] || '#1e3a5f',
        tagClass: deptClasses[dept] || 'dt-sales',
        triggerQuizzes: triggerList,
        preQuizzes: preList,
        postQuizzes: postList,
        narasiMode: contentType === 'ppt' ? narasiMode : null,
        slideNarasi: contentType === 'ppt' && narasiMode !== 'none'
          ? slideNarasi.map(s => ({ teks: s.teks || '', audioUrl: s.audioUrl || null }))
          : null,
      };
      // Kalau ada file baru diunggah
      if (videoUrl) updatedFields.videoUrl = videoUrl;
      if (filePath) updatedFields.filePath = filePath;
      if (slideImages) {
        updatedFields.slideImages = slideImages;
        updatedFields.slideCount = slideCount;
      }
      updateSOP(editVideo.id, updatedFields);
      setEditingVideoId(null);
      setActivePage('sop');
      return;
    }

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
      type: contentType,
      slideCount: contentType === 'ppt' ? slideCount : null,
      slideImages: contentType === 'ppt' ? slideImages : null,
      triggerQuizzes: triggerList,
      preQuizzes: preList,
      postQuizzes: postList,
      narasiMode: contentType === 'ppt' ? narasiMode : null,
      slideNarasi: contentType === 'ppt' && narasiMode !== 'none'
        ? slideNarasi.map(s => ({
            teks: s.teks || '',
            audioUrl: s.audioUrl || null,
          }))
        : null,
    };

    addSOP(newVideo);
    setUploadSuccess(true);
    setTimeout(() => setActivePage('sop'), 2200);
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
        {isEditMode && (
          <button type="button" onClick={() => { setEditingVideoId(null); setActivePage('sop'); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: '13px', padding: 0, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            ← Kembali ke Daftar SOP
          </button>
        )}
        <h2 style={{ fontSize: '20px', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: '600', color: '#0f172a' }}>
          {isEditMode ? `✏️ Edit SOP — ${editVideo.title}` : 'Konfigurasi Materi Training & SOP'}
        </h2>
        <p style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '4px' }}>
          {isEditMode
            ? 'Edit metadata, kuis, narasi, atau ganti file SOP ini.'
            : 'Unggah video instruksi atau presentasi PPT dan buat parameter ujian untuk memastikan standar kualitas kerja.'}
        </p>
      </div>

      {/* CONTENT TYPE TOGGLE — disembunyikan di edit mode */}
      <div style={{ display: isEditMode ? 'none' : 'flex', gap: '8px', marginBottom: '20px' }}>
        <button
          type="button"
          onClick={() => { setContentType('video'); setPptFile(null); setSlideCount(0); }}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '10px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: '600',
            border: contentType === 'video' ? '2px solid #0B1628' : '2px solid var(--border)',
            background: contentType === 'video' ? '#0B1628' : '#fff',
            color: contentType === 'video' ? '#fff' : 'var(--text2)',
            cursor: 'pointer', transition: 'all 0.2s'
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="23 7 16 12 23 17 23 7" />
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
          </svg>
          Video
        </button>
        <button
          type="button"
          onClick={() => {
            if (!canUploadPPT(tenant.plan)) {
              return alert('Fitur upload PPT hanya tersedia untuk paket Business dan Enterprise. Hubungi tim Axara untuk upgrade.');
            }
            setContentType('ppt'); setVideoFile(null); setPreviewUrl(null);
          }}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '10px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: '600',
            border: contentType === 'ppt' ? '2px solid #7c3aed' : '2px solid var(--border)',
            background: contentType === 'ppt' ? '#7c3aed' : '#fff',
            color: contentType === 'ppt' ? '#fff' : canUploadPPT(tenant.plan) ? 'var(--text2)' : '#94a3b8',
            cursor: 'pointer', transition: 'all 0.2s', position: 'relative'
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          Presentasi PPT
          {!canUploadPPT(tenant.plan) && (
            <span style={{ fontSize: '10px', background: '#f1f5f9', color: '#64748b', padding: '2px 6px', borderRadius: '4px', fontWeight: '700', marginLeft: '4px' }}>
              Business+
            </span>
          )}
        </button>
      </div>

      <form onSubmit={handleFormSubmit}>
        
        {/* ROW 1: SINGLE CARD WITH 3 SECTIONS SPLIT INTO 2 COLUMNS SIDE-BY-SIDE */}
        <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
          {/* SINGLE COLUMN: Media Upload & Video Preview (Dynamic Layout) */}
          <div style={{ marginBottom: '24px' }}>
            
            {/* SECTION 1: MEDIA UPLOAD / VIDEO PLAYER / PPT */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text1)' }}>
                  {contentType === 'ppt' ? 'File Presentasi (PPTX)' : 'Media Training & SOP'}
                </div>
                {contentType === 'video' && videoFile && !uploading && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      className="btn-sec"
                      style={{ padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', border: '1px solid var(--border)', background: '#ffffff', color: 'var(--text2)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }}
                      onClick={() => fileInputRef.current.click()}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
                      </svg>
                      Ganti Video
                    </button>
                    <button
                      type="button"
                      style={{ padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', border: '1px solid #fee2e2', background: '#fff5f5', color: '#ef4444', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }}
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
                {contentType === 'ppt' && pptFile && !uploading && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      style={{ padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', border: '1px solid var(--border)', background: '#fff', color: 'var(--text2)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      onClick={() => pptInputRef.current.click()}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
                      </svg>
                      Ganti File
                    </button>
                    <button
                      type="button"
                      style={{ padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', border: '1px solid #fee2e2', background: '#fff5f5', color: '#ef4444', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      onClick={() => { setPptFile(null); setSlideCount(0); setDuration('5:00'); pptInputRef.current.value = ''; }}
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

              {/* HIDDEN FILE INPUTS */}
              <input type="file" ref={fileInputRef} accept="video/*" style={{ display: 'none' }} onChange={(e) => selectVideoFile(e.target.files[0])} />
              <input type="file" ref={pptInputRef} accept=".pptx" style={{ display: 'none' }} onChange={(e) => selectPptFile(e.target.files[0])} />

              {contentType === 'video' ? (
                previewUrl ? (
                  <div style={{ borderRadius: '12px', overflow: 'hidden', background: '#0f172a', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '340px', background: '#000' }}>
                      <video src={previewUrl} controls controlsList="nodownload" style={{ width: '100%', maxHeight: '420px', objectFit: 'contain' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0b1329', padding: '12px 18px', color: '#fff', fontSize: '12.5px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ background: '#3b82f6', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontWeight: '800', fontSize: '10px' }}>HD</span>
                        <span style={{ fontWeight: '500', opacity: 0.95 }}>{videoFile?.name}</span>
                        <span style={{ opacity: 0.4 }}>•</span>
                        <span style={{ color: '#94a3b8' }}>{videoFile ? (videoFile.size / 1024 / 1024).toFixed(1) : '0'} MB</span>
                      </div>
                      {duration && <div style={{ color: '#94a3b8', fontWeight: '500' }}>Durasi: {duration}</div>}
                    </div>
                  </div>
                ) : isEditMode && !videoFile && editVideo?.videoUrl ? (
                  <div style={{ borderRadius: '12px', border: '1px solid var(--border)', background: '#f0f9ff', padding: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ width: '56px', height: '56px', borderRadius: '12px', background: '#0b1628', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>
                        </svg>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '700', fontSize: '14px', color: '#0f172a', marginBottom: '4px' }}>File video sudah ada</div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>Durasi: {editVideo.duration} · Klik "Ganti File" untuk mengganti</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current.click()}
                        style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', background: '#fff', border: '1px solid #cbd5e1', color: '#334155', cursor: 'pointer' }}
                      >
                        Ganti File
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    className="upload-zone"
                    style={{ margin: '0', padding: '60px 20px', border: '2px dashed #cbd5e1', borderRadius: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: '#f8fafc', transition: 'border-color 0.2s', cursor: 'pointer' }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => { e.preventDefault(); selectVideoFile(e.dataTransfer.files[0]); }}
                    onClick={() => fileInputRef.current.click()}
                  >
                    <div style={{ color: '#94a3b8', marginBottom: '16px' }}>
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="17 8 12 3 7 8"></polyline>
                        <line x1="12" y1="3" x2="12" y2="15"></line>
                      </svg>
                    </div>
                    <div className="upload-title" style={{ fontSize: '14px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>Seret dan letakkan file video Anda</div>
                    <div className="upload-desc" style={{ fontSize: '11.5px', color: '#94a3b8', margin: '0 0 20px 0', lineHeight: '1.4' }}>Format MP4, MKV, atau AVI. Maksimal 500MB.</div>
                    {uploading ? (
                      <div style={{ width: '280px', padding: '0 10px', boxSizing: 'border-box' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ height: '4px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden', marginBottom: '6px' }}>
                          <div style={{ height: '100%', width: `${uploadProgress}%`, background: '#0B1628', transition: 'width 0.3s ease' }} />
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b', textAlign: 'center' }}>Mengupload... {uploadProgress}%</div>
                      </div>
                    ) : (
                      <button type="button" className="btn-primary" style={{ padding: '10px 24px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', boxShadow: '0 4px 6px -1px rgba(11, 22, 40, 0.15)', cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); fileInputRef.current.click(); }}>
                        Pilih File Video
                      </button>
                    )}
                  </div>
                )
              ) : (
                /* PPT DROP ZONE / PREVIEW */
                pptFile ? (
                  <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)', background: '#faf5ff' }}>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '24px' }}>
                      <div style={{ width: '56px', height: '56px', borderRadius: '12px', background: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                          <line x1="16" y1="13" x2="8" y2="13" />
                          <line x1="16" y1="17" x2="8" y2="17" />
                        </svg>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '700', fontSize: '14px', color: '#1e1b4b', marginBottom: '4px' }}>{pptFile.name}</div>
                        <div style={{ fontSize: '12px', color: '#7c3aed', fontWeight: '600' }}>{slideCount} slide terdeteksi</div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{(pptFile.size / 1024 / 1024).toFixed(1)} MB</div>
                      </div>
                      <div style={{ background: '#ede9fe', color: '#6d28d9', padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '700' }}>
                        PPTX
                      </div>
                    </div>
                    {uploading && (
                      <div style={{ padding: '0 24px 20px' }}>
                        <div style={{ height: '4px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden', marginBottom: '6px' }}>
                          <div style={{ height: '100%', width: `${uploadProgress}%`, background: '#7c3aed', transition: 'width 0.3s ease' }} />
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b', textAlign: 'center' }}>Mengupload... {uploadProgress}%</div>
                      </div>
                    )}
                  </div>
                ) : isEditMode && !pptFile && editVideo?.slideImages ? (
                  <div style={{ borderRadius: '12px', border: '1px solid #ddd6fe', background: '#faf5ff', padding: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ width: '56px', height: '56px', borderRadius: '12px', background: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                        </svg>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '700', fontSize: '14px', color: '#1e1b4b', marginBottom: '4px' }}>File PPT sudah ada</div>
                        <div style={{ fontSize: '12px', color: '#7c3aed', fontWeight: '600' }}>{editVideo.slideImages.length} slide · Klik "Ganti File" untuk mengganti</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => pptInputRef.current.click()}
                        style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', background: '#fff', border: '1px solid #ddd6fe', color: '#6d28d9', cursor: 'pointer' }}
                      >
                        Ganti File
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    className="upload-zone"
                    style={{ margin: '0', padding: '60px 20px', border: '2px dashed #c4b5fd', borderRadius: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: '#faf5ff', transition: 'border-color 0.2s', cursor: 'pointer' }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => { e.preventDefault(); selectPptFile(e.dataTransfer.files[0]); }}
                    onClick={() => pptInputRef.current.click()}
                  >
                    <div style={{ color: '#7c3aed', marginBottom: '16px' }}>
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                        <line x1="12" y1="20" x2="12" y2="9" />
                        <polyline points="9 12 12 9 15 12" />
                      </svg>
                    </div>
                    <div className="upload-title" style={{ fontSize: '14px', fontWeight: '700', color: '#4c1d95', marginBottom: '6px' }}>Seret dan letakkan file PowerPoint Anda</div>
                    <div className="upload-desc" style={{ fontSize: '11.5px', color: '#7c3aed', margin: '0 0 20px 0', lineHeight: '1.4', opacity: 0.7 }}>Format PPTX. Jumlah slide akan otomatis terdeteksi.</div>
                    <button type="button" style={{ padding: '10px 24px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', background: '#7c3aed', color: '#fff', border: 'none', boxShadow: '0 4px 6px -1px rgba(124, 58, 237, 0.3)', cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); pptInputRef.current.click(); }}>
                      Pilih File PPTX
                    </button>
                  </div>
                )
              )}
            </div>

            {/* SECTION 2: DETAIL INFORMASI (Full width under player/dropzone) */}
            <div className="card" style={{ padding: '24px', border: '1px solid var(--border)', borderRadius: '12px', background: '#ffffff', textAlign: 'left' }}>
              <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text1)', marginBottom: '16px' }}>Detail Informasi</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group" style={{ margin: '0' }}>
                  <label className="form-label" style={{ textTransform: 'uppercase', fontSize: '10px', fontWeight: '700', letterSpacing: '0.05em' }}>
                    {contentType === 'ppt' ? 'Judul Presentasi / SOP' : 'Judul Video Training / SOP'}
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    style={{ fontSize: '14px', padding: '10px 12px' }}
                    placeholder={contentType === 'ppt' ? 'Contoh: Presentasi: Standar Layanan Pelanggan 2024' : 'Contoh: SOP Operasional: Tata Cara Packing Barang Baru'}
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
                    <label className="form-label" style={{ textTransform: 'uppercase', fontSize: '10px', fontWeight: '700', letterSpacing: '0.05em' }}>
                      {contentType === 'ppt' ? 'Jumlah Slide' : 'Durasi Video'}
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      style={{ fontSize: '14px', padding: '10px 12px', textAlign: 'center', background: '#f1f5f9', color: 'var(--text2)', cursor: 'default' }}
                      placeholder="Otomatis terisi"
                      value={contentType === 'ppt' ? (slideCount > 0 ? `${slideCount} slide` : 'Belum ada file') : duration}
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
            <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '2px' }}>
              {contentType === 'ppt'
                ? 'Kuis Pre-Test muncul sebelum presentasi dimulai. Kuis Post-Test muncul setelah karyawan menekan tombol Selesai.'
                : 'Buat parameter kuis yang muncul di tengah video (Pre-Test) dan evaluasi akhir setelah selesai menonton (Post-Test).'}
            </div>
          </div>

          {/* TWO COLUMN GRID FOR PRE-TEST AND POST-TEST */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }}>
            
            {/* COLUMN 1: PRE-TEST */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text2)', paddingBottom: '8px', borderBottom: '1px solid var(--border)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {contentType === 'ppt' ? '✍️ Kuis Pre-Test (Sebelum Presentasi)' : '✍️ Kuis Pre-Test (Tengah Video)'}
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
                        placeholder="Contoh: Ibukota Indonesia adalah?"
                        value={q.question}
                        onChange={(e) => handlePreQuestionChange(idx, 'question', e.target.value)}
                      />
                    </div>

                    {/* TIMESTAMP TRIGGER — hanya untuk Video */}
                    {contentType === 'video' && (
                      <div className="form-group" style={{ marginBottom: '16px', marginTop: '12px' }}>
                        <label className="form-label" style={{ textTransform: 'uppercase', fontSize: '12px', fontWeight: '700', color: 'var(--text1)' }}>
                          Waktu Pemicu Kuis (Muncul Di Tengah Video)
                        </label>
                        <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-end', marginTop: '8px', flexWrap: 'wrap' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text3)', textTransform: 'uppercase' }}>Menit</span>
                            <input type="number" min="0" className="form-input" style={{ width: '80px', fontSize: '14px', padding: '10px 14px', textAlign: 'center', fontWeight: '600' }} placeholder="0" value={q.triggerMin} onChange={(e) => handlePreQuestionChange(idx, 'triggerMin', e.target.value)} />
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text3)', textTransform: 'uppercase' }}>Detik</span>
                            <input type="number" min="0" max="59" className="form-input" style={{ width: '80px', fontSize: '14px', padding: '10px 14px', textAlign: 'center', fontWeight: '600' }} placeholder="0" value={q.triggerSec} onChange={(e) => handlePreQuestionChange(idx, 'triggerSec', e.target.value)} />
                          </div>
                          <div style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '240px', height: '46px', boxSizing: 'border-box' }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                              <circle cx="12" cy="12" r="10"></circle>
                              <line x1="12" y1="16" x2="12" y2="12"></line>
                              <line x1="12" y1="8" x2="12.01" y2="8"></line>
                            </svg>
                            <span style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic', lineHeight: '1.4' }}>Video akan otomatis terhenti di waktu ini untuk menampilkan kuis.</span>
                          </div>
                        </div>
                        {idx > 0 && toSecs(q) <= toSecs(preQuestions[idx - 1]) && (toSecs(q) > 0 || toSecs(preQuestions[idx - 1]) > 0) && (
                          <div style={{ marginTop: '6px', fontSize: '11px', color: '#b91c1c', background: '#fff5f5', border: '1px solid #fecaca', borderRadius: '6px', padding: '5px 10px' }}>
                            ⚠️ Waktu pemicu harus lebih besar dari pertanyaan #{idx} ({preQuestions[idx - 1].triggerMin}m {preQuestions[idx - 1].triggerSec}s)
                          </div>
                        )}
                      </div>
                    )}

                    <div style={{ marginTop: '16px' }}>
                      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 14px', marginBottom: '12px', fontSize: '12px', color: '#1e293b' }}>
                        <div style={{ fontWeight: '700', marginBottom: '4px' }}>🔑 Cara mengisi kunci jawaban:</div>
                        <ol style={{ margin: 0, paddingLeft: '18px', lineHeight: '1.8' }}>
                          <li>Isi teks masing-masing opsi jawaban (A, B, C, D) di kotak di bawah</li>
                          <li>Klik kotak opsi yang merupakan <strong>jawaban benar</strong> — kotak akan berwarna biru (✓)</li>
                        </ol>
                        <div style={{ marginTop: '6px', fontSize: '11px', color: '#64748b', fontStyle: 'italic' }}>
                          Contoh: Pertanyaan "Ibukota Indonesia adalah?" → isi A=Jakarta, B=Bandung, C=Solo, D=Yogyakarta → klik opsi A (Jakarta) sebagai jawaban benar
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        {q.options.map((opt, oIdx) => {
                          const letter = String.fromCharCode(65 + oIdx);
                          const isCorrect = q.answer === letter;
                          const examples = ['Jakarta', 'Bandung', 'Solo', 'Yogyakarta'];
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
                                placeholder={`Contoh: ${examples[oIdx]}`}
                                value={opt}
                                onChange={(e) => handlePreOptionChange(idx, oIdx, e.target.value)}
                                required
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
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
                {contentType === 'ppt' ? '📝 Kuis Post-Test (Setelah Presentasi Selesai)' : '📝 Kuis Post-Test (Setelah Video Selesai)'}
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

                    <div style={{ marginTop: '16px' }}>
                      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 14px', marginBottom: '12px', fontSize: '12px', color: '#1e293b' }}>
                        <div style={{ fontWeight: '700', marginBottom: '4px' }}>🔑 Cara mengisi kunci jawaban:</div>
                        <ol style={{ margin: 0, paddingLeft: '18px', lineHeight: '1.8' }}>
                          <li>Isi teks masing-masing opsi jawaban (A, B, C, D) di kotak di bawah</li>
                          <li>Klik kotak opsi yang merupakan <strong>jawaban benar</strong> — kotak akan berwarna biru (✓)</li>
                        </ol>
                        <div style={{ marginTop: '6px', fontSize: '11px', color: '#64748b', fontStyle: 'italic' }}>
                          Contoh: Pertanyaan "Ibukota Indonesia adalah?" → isi A=Jakarta, B=Bandung, C=Solo, D=Yogyakarta → klik opsi A (Jakarta) sebagai jawaban benar
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        {q.options.map((opt, oIdx) => {
                          const letter = String.fromCharCode(65 + oIdx);
                          const isCorrect = q.answer === letter;
                          const examples = ['Jakarta', 'Bandung', 'Solo', 'Yogyakarta'];
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
                                placeholder={`Contoh: ${examples[oIdx]}`}
                                value={opt}
                                onChange={(e) => handlePostOptionChange(idx, oIdx, e.target.value)}
                                required
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
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

          {/* KUIS PEMICU SLIDE — Full width, hanya untuk PPT */}
          {contentType === 'ppt' && (
            <div style={{ marginTop: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '16px', paddingBottom: '12px', borderBottom: '2px solid #fde68a' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: '800', color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                    ⚡ Kuis Pemicu Slide (Muncul Di Tengah Presentasi)
                  </div>
                  <div style={{ fontSize: '12px', color: '#78350f' }}>
                    Tentukan di slide berapa kuis muncul. Learner tidak bisa melanjutkan ke slide berikutnya sebelum menjawab.
                  </div>
                </div>
                {slideCount > 0 && (
                  <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '8px', padding: '6px 12px', fontSize: '11px', fontWeight: '700', color: '#92400e', whiteSpace: 'nowrap' }}>
                    Total {slideCount} slide
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {triggerQuizzes.map((q, idx) => (
                  <div key={idx} className="card" style={{ border: '1px solid #fde68a', borderRadius: '10px', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fffbeb', padding: '12px 20px', borderBottom: '1px solid #fde68a' }}>
                      <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#b45309', letterSpacing: '0.05em' }}>
                        ⚡ Kuis Pemicu #{idx + 1}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '11px', fontWeight: '600', color: '#78350f' }}>Muncul di slide</span>
                          <input
                            type="number"
                            min="1"
                            max={slideCount || 999}
                            value={q.triggerSlide}
                            onChange={(e) => handleTriggerQuizChange(idx, 'triggerSlide', e.target.value)}
                            style={{
                              width: '64px', fontSize: '14px', padding: '4px 8px', textAlign: 'center', fontWeight: '700',
                              border: `1px solid ${idx > 0 && Number(q.triggerSlide) <= Number(triggerQuizzes[idx - 1].triggerSlide) ? '#f87171' : '#fcd34d'}`,
                              borderRadius: '6px', color: '#92400e', background: idx > 0 && Number(q.triggerSlide) <= Number(triggerQuizzes[idx - 1].triggerSlide) ? '#fef2f2' : '#fef9c3'
                            }}
                          />
                          {slideCount > 0 && (
                            <span style={{ fontSize: '11px', color: '#b45309' }}>/ {slideCount}</span>
                          )}
                        </div>
                        {triggerQuizzes.length > 1 && (
                          <button
                            type="button"
                            className="delete-question-btn"
                            title="Hapus Kuis Pemicu"
                            onClick={() => removeTriggerQuiz(idx)}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '16px', height: '16px' }}>
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>

                    <div style={{ padding: '20px', textAlign: 'left', background: '#fffdf0' }}>
                      {idx > 0 && Number(q.triggerSlide) <= Number(triggerQuizzes[idx - 1].triggerSlide) && (
                        <div style={{ marginBottom: '12px', fontSize: '11px', color: '#b91c1c', background: '#fff5f5', border: '1px solid #fecaca', borderRadius: '6px', padding: '6px 10px' }}>
                          ⚠️ Nomor slide harus lebih besar dari Kuis Pemicu #{idx} (slide {triggerQuizzes[idx - 1].triggerSlide}). Kuis harus muncul secara berurutan.
                        </div>
                      )}
                      <div className="form-group" style={{ marginBottom: '16px' }}>
                        <label className="form-label" style={{ textTransform: 'uppercase', fontSize: '12px', fontWeight: '700', color: '#92400e' }}>Teks Pertanyaan</label>
                        <textarea
                          className="form-input"
                          style={{ minHeight: '72px', fontFamily: 'inherit', resize: 'vertical', fontSize: '14px', padding: '10px 14px', marginTop: '6px', borderColor: '#fcd34d' }}
                          placeholder={`Contoh: Apa yang harus dilakukan ketika menerima keluhan pelanggan? (muncul di slide ${q.triggerSlide})`}
                          value={q.question}
                          onChange={(e) => handleTriggerQuizChange(idx, 'question', e.target.value)}
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        {q.options.map((opt, oIdx) => {
                          const letter = String.fromCharCode(65 + oIdx);
                          const isCorrect = q.answer === letter;
                          return (
                            <div
                              key={oIdx}
                              className={`option-pill ${isCorrect ? 'correct' : ''}`}
                              onClick={() => handleTriggerQuizChange(idx, 'answer', letter)}
                            >
                              <div className="option-circle">
                                {isCorrect && <span className="option-checkmark">✓</span>}
                              </div>
                              <input
                                type="text"
                                className="option-input"
                                style={{ background: 'none', border: 'none', width: '100%', outline: 'none', fontSize: '14px', color: isCorrect ? '#1d4ed8' : 'var(--text1)' }}
                                placeholder={`Opsi ${letter}`}
                                value={opt}
                                onChange={(e) => handleTriggerOptionChange(idx, oIdx, e.target.value)}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  style={{ background: '#fffbeb', border: '1px dashed #fcd34d', color: '#b45309', fontSize: '12px', padding: '12px', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
                  onClick={addTriggerQuiz}
                >
                  ➕ Tambah Kuis Pemicu Slide
                </button>
              </div>
            </div>
          )}
        </div>

        {/* NARASI PER SLIDE — hanya untuk PPT */}
        {contentType === 'ppt' && slideCount > 0 && (
          <div style={{ marginTop: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '16px', paddingBottom: '12px', borderBottom: '2px solid #bfdbfe' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: '800', color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                  🎙️ Narasi per Slide (Opsional)
                </div>
                <div style={{ fontSize: '12px', color: '#1e40af' }}>
                  Tambahkan penjelasan teks atau rekaman suara untuk setiap slide agar learner lebih mudah memahami materi.
                </div>
              </div>
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '6px 12px', fontSize: '11px', fontWeight: '700', color: '#1d4ed8', whiteSpace: 'nowrap' }}>
                {slideCount} slide
              </div>
            </div>

            {/* Pilih mode narasi */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
              {[
                { val: 'none', label: 'Tidak Ada Narasi', icon: '🚫' },
                { val: 'teks', label: 'Teks Narasi', icon: '📝' },
                { val: 'audio', label: 'Audio Narasi', icon: '🔊' },
                { val: 'keduanya', label: 'Teks + Audio', icon: '🎙️' },
              ].map(opt => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => setNarasiMode(opt.val)}
                  style={{
                    padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '600',
                    cursor: 'pointer', border: narasiMode === opt.val ? '2px solid #2F7BFF' : '1px solid var(--border)',
                    background: narasiMode === opt.val ? '#eff6ff' : '#fff',
                    color: narasiMode === opt.val ? '#1d4ed8' : 'var(--text2)',
                  }}
                >
                  {opt.icon} {opt.label}
                </button>
              ))}
            </div>

            {/* Input narasi per slide (CAROUSEL UI) */}
            {narasiMode !== 'none' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', background: '#f8fafc', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
                
                {/* CAROUSEL NAVIGATION HEADER */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '14px', borderBottom: '1px dashed var(--border)', marginBottom: '6px' }}>
                  <button
                    type="button"
                    disabled={activeSlideIndex === 0}
                    onClick={() => setActiveSlideIndex(prev => Math.max(0, prev - 1))}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '700',
                      border: '1px solid var(--border)',
                      background: activeSlideIndex === 0 ? '#f1f5f9' : '#fff',
                      color: activeSlideIndex === 0 ? 'var(--text3)' : 'var(--text2)',
                      cursor: activeSlideIndex === 0 ? 'not-allowed' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 18 9 12 15 6"/>
                    </svg>
                    Prev Slide
                  </button>

                  <div style={{ textAlign: 'center' }}>
                    <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--navy)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Slide {activeSlideIndex + 1} dari {slideCount}
                    </span>
                    {slideNarasi[activeSlideIndex]?.audioUrl && (
                      <span style={{ marginLeft: '8px', fontSize: '11px', background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '4px', fontWeight: '700' }}>
                        ✓ Audio Terpasang
                      </span>
                    )}
                    {(!slideNarasi[activeSlideIndex]?.audioUrl && slideNarasi[activeSlideIndex]?.audioFile) && (
                      <span style={{ marginLeft: '8px', fontSize: '11px', background: '#eff6ff', color: 'var(--accent)', padding: '2px 8px', borderRadius: '4px', fontWeight: '700' }}>
                        ✓ Audio Rekaman Baru
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={activeSlideIndex === slideCount - 1}
                    onClick={() => setActiveSlideIndex(prev => Math.min(slideCount - 1, prev + 1))}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '700',
                      border: '1px solid var(--border)',
                      background: activeSlideIndex === slideCount - 1 ? '#f1f5f9' : '#fff',
                      color: activeSlideIndex === slideCount - 1 ? 'var(--text3)' : 'var(--text2)',
                      cursor: activeSlideIndex === slideCount - 1 ? 'not-allowed' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    Next Slide
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </button>
                </div>

                {/* SLIDE IMAGE PREVIEW */}
                {(() => {
                  const imgUrl = (editVideo?.slideImages || [])[activeSlideIndex];
                  const hasNarasi = slideNarasi[activeSlideIndex]?.teks?.trim();
                  const hasAudio = slideNarasi[activeSlideIndex]?.audioFile || slideNarasi[activeSlideIndex]?.audioUrl;
                  return (
                    <div style={{ position: 'relative', borderRadius: '10px', overflow: 'hidden', background: '#1e293b', aspectRatio: '16/9', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '180px' }}>
                      {imgUrl ? (
                        <img src={imgUrl} alt={`Slide ${activeSlideIndex + 1}`} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
                      ) : (
                        <div style={{ textAlign: 'center', color: '#94a3b8', padding: '20px' }}>
                          <div style={{ fontSize: '48px', fontWeight: '900', color: '#334155', lineHeight: 1 }}>{activeSlideIndex + 1}</div>
                          <div style={{ fontSize: '12px', marginTop: '8px' }}>Slide {activeSlideIndex + 1} dari {slideCount}</div>
                          <div style={{ fontSize: '10px', marginTop: '4px', opacity: 0.6 }}>Preview gambar tersedia setelah dipublikasi</div>
                        </div>
                      )}
                      {/* Slide number badge */}
                      <div style={{ position: 'absolute', top: '10px', left: '10px', background: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: '11px', fontWeight: '700', padding: '3px 9px', borderRadius: '5px', backdropFilter: 'blur(4px)' }}>
                        {activeSlideIndex + 1} / {slideCount}
                      </div>
                      {/* Narasi status badges */}
                      <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', gap: '5px' }}>
                        {hasNarasi && <span style={{ background: 'rgba(5,150,105,0.85)', color: '#fff', fontSize: '10px', fontWeight: '700', padding: '3px 8px', borderRadius: '4px', backdropFilter: 'blur(4px)' }}>✓ Teks</span>}
                        {hasAudio && <span style={{ background: 'rgba(124,58,237,0.85)', color: '#fff', fontSize: '10px', fontWeight: '700', padding: '3px 8px', borderRadius: '4px', backdropFilter: 'blur(4px)' }}>✓ Audio</span>}
                      </div>
                    </div>
                  );
                })()}

                {/* DOTS PAGINATION FOR QUICK JUMP */}
                <div style={{ display: 'flex', gap: '5px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '10px', padding: '0 10px' }}>
                  {Array.from({ length: slideCount }).map((_, idx) => {
                    const hasData = slideNarasi[idx]?.teks?.trim() || slideNarasi[idx]?.audioFile || slideNarasi[idx]?.audioUrl;
                    const isActive = activeSlideIndex === idx;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setActiveSlideIndex(idx)}
                        title={`Lompat ke Slide ${idx + 1}`}
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          fontSize: '10px',
                          fontWeight: '700',
                          border: isActive ? '2px solid var(--accent)' : '1px solid var(--border)',
                          background: isActive ? '#eff6ff' : hasData ? '#ecfdf5' : '#ffffff',
                          color: isActive ? 'var(--accent)' : hasData ? '#059669' : 'var(--text3)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.15s ease',
                          boxShadow: isActive ? '0 0 0 3px rgba(47, 123, 255, 0.15)' : 'none'
                        }}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>

                {/* ACTIVE SLIDE CONTENT EDITOR */}
                <div style={{ background: '#ffffff', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                  <div style={{ background: '#eff6ff', padding: '12px 18px', borderBottom: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '11px', fontWeight: '800', color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Konfigurasi Slide {activeSlideIndex + 1}
                    </span>
                  </div>

                  <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {/* Teks Narasi Input */}
                    {(narasiMode === 'teks' || narasiMode === 'keduanya') && (
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '6px', letterSpacing: '0.02em' }}>TEKS NARASI</label>
                        <textarea
                          rows={4}
                          placeholder={`Ketik penjelasan atau naskah presentasi untuk slide ${activeSlideIndex + 1}...`}
                          value={slideNarasi[activeSlideIndex]?.teks || ''}
                          onChange={e => {
                            setSlideNarasi(prev => {
                              const updated = [...prev];
                              updated[activeSlideIndex] = { ...updated[activeSlideIndex], teks: e.target.value };
                              return updated;
                            });
                          }}
                          style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '13px', resize: 'vertical', fontFamily: 'inherit', color: 'var(--text1)', lineHeight: '1.5' }}
                        />
                      </div>
                    )}

                    {/* Audio Narasi Input */}
                    {(narasiMode === 'audio' || narasiMode === 'keduanya') && (
                      <div style={{ borderTop: (narasiMode === 'keduanya') ? '1px dashed var(--border)' : 'none', paddingTop: (narasiMode === 'keduanya') ? '14px' : '0' }}>
                        <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '8px', letterSpacing: '0.02em' }}>AUDIO NARASI</label>
                        
                        {/* Toggle: Upload vs Rekam */}
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                          {['upload', 'rekam'].map(mode => (
                            <button
                              key={mode}
                              type="button"
                              onClick={() => setSlideNarasi(prev => {
                                const updated = [...prev];
                                updated[activeSlideIndex] = { ...updated[activeSlideIndex], audioInputMode: mode, audioFile: null, audioUrl: null };
                                return updated;
                              })}
                              style={{
                                padding: '6px 14px',
                                fontSize: '12px',
                                fontWeight: '700',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                border: slideNarasi[activeSlideIndex]?.audioInputMode === mode ? '1.5px solid var(--navy)' : '1px solid var(--border)',
                                background: slideNarasi[activeSlideIndex]?.audioInputMode === mode ? '#f1f5f9' : '#ffffff',
                                color: slideNarasi[activeSlideIndex]?.audioInputMode === mode ? 'var(--navy)' : 'var(--text2)',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              {mode === 'upload' ? '📁 Upload File Audio' : '🎙️ Rekam Suara'}
                            </button>
                          ))}
                        </div>

                        {/* Upload mode */}
                        {(slideNarasi[activeSlideIndex]?.audioInputMode === 'upload') && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <input
                              type="file"
                              accept="audio/mp3,audio/mpeg,audio/wav,audio/m4a,audio/*"
                              id={`audio-slide-${activeSlideIndex}`}
                              style={{ display: 'none' }}
                              onChange={e => {
                                const file = e.target.files[0];
                                if (!file) return;
                                setSlideNarasi(prev => {
                                  const updated = [...prev];
                                  updated[activeSlideIndex] = { ...updated[activeSlideIndex], audioFile: file, audioUrl: null };
                                  return updated;
                                });
                              }}
                            />
                            <label
                              htmlFor={`audio-slide-${activeSlideIndex}`}
                              style={{ padding: '8px 16px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', background: '#f8fafc', color: 'var(--text2)', fontWeight: '700', whiteSpace: 'nowrap', transition: 'all 0.15s ease' }}
                              onMouseOver={(e) => e.currentTarget.style.background = '#f1f5f9'}
                              onMouseOut={(e) => e.currentTarget.style.background = '#f8fafc'}
                            >
                              📁 Pilih File Audio (MP3/WAV)
                            </label>
                            {slideNarasi[activeSlideIndex]?.audioFile && (
                              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '12px', color: '#15803d', fontWeight: '600' }}>
                                  ✓ {slideNarasi[activeSlideIndex].audioFile.name}
                                </span>
                                <span style={{ fontSize: '11px', color: 'var(--text3)' }}>
                                  ({(slideNarasi[activeSlideIndex].audioFile.size / 1024 / 1024).toFixed(1)} MB)
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setSlideNarasi(prev => {
                                    const updated = [...prev];
                                    updated[activeSlideIndex] = { ...updated[activeSlideIndex], audioFile: null, audioUrl: null };
                                    return updated;
                                  })}
                                  style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '12px', padding: '0 4px', fontWeight: '700' }}
                                >✕</button>
                              </div>
                            )}
                            {!slideNarasi[activeSlideIndex]?.audioFile && (
                              <span style={{ fontSize: '12px', color: 'var(--text3)' }}>Belum ada file audio terpasang</span>
                            )}
                          </div>
                        )}

                        {/* Rekam mode */}
                        {(slideNarasi[activeSlideIndex]?.audioInputMode === 'rekam') && (
                          <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                            {recordingSlide === activeSlideIndex ? (
                              /* Sedang merekam */
                              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#dc2626', fontWeight: '700' }}>
                                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#dc2626', display: 'inline-block', animation: 'pulse 1s infinite' }} />
                                  Merekam Suara...
                                </span>
                                <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text1)', fontVariantNumeric: 'tabular-nums' }}>
                                  {String(Math.floor(recordingSeconds / 60)).padStart(2, '0')}:{String(recordingSeconds % 60).padStart(2, '0')}
                                </span>
                                <button
                                  type="button"
                                  onClick={stopRecording}
                                  style={{ padding: '6px 16px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 2px 4px rgba(220, 38, 38, 0.2)' }}
                                >
                                  ⏹ Hentikan Rekaman
                                </button>
                              </div>
                            ) : slideNarasi[activeSlideIndex]?.audioFile ? (
                              /* Ada hasil rekaman */
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <audio
                                  controls
                                  src={URL.createObjectURL(slideNarasi[activeSlideIndex].audioFile)}
                                  style={{ width: '100%', height: '36px' }}
                                />
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  <span style={{ fontSize: '12px', color: '#15803d', fontWeight: '600' }}>
                                    ✓ {slideNarasi[activeSlideIndex].audioFile.name}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setSlideNarasi(prev => {
                                      const updated = [...prev];
                                      updated[activeSlideIndex] = { ...updated[activeSlideIndex], audioFile: null, audioUrl: null };
                                      return updated;
                                    })}
                                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '12px', padding: '0', fontWeight: '700' }}
                                  >
                                    🗑 Hapus Audio
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => startRecording(activeSlideIndex)}
                                    style={{ background: '#ffffff', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text2)', cursor: 'pointer', fontSize: '12px', padding: '4px 12px', fontWeight: '700', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}
                                  >
                                    🔄 Rekam Ulang
                                  </button>
                                </div>
                              </div>
                            ) : (
                              /* Belum rekam */
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <button
                                  type="button"
                                  onClick={() => startRecording(activeSlideIndex)}
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 2px 4px rgba(220, 38, 38, 0.15)' }}
                                >
                                  ⏺ Mulai Rekam Suara
                                </button>
                                <span style={{ fontSize: '12px', color: 'var(--text3)' }}>Gunakan mikrofon untuk merekam penjelasan secara langsung</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

              </div>
            )}
          </div>
        )}

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
            {uploading ? `Mengupload ${contentType === 'ppt' ? 'PPT' : 'Video'}... ${uploadProgress}%` : 'Terbitkan Materi & Ujian'}
          </button>
        </div>
      </form>

      {/* SUCCESS TOAST */}
      {uploadSuccess && (
        <div style={{
          position: 'fixed', bottom: '32px', left: '50%', transform: 'translateX(-50%)',
          background: '#0f172a', color: '#fff', padding: '14px 24px', borderRadius: '12px',
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center',
          gap: '12px', zIndex: 99999, fontSize: '14px', fontWeight: '500',
          animation: 'slideUp 0.3s ease'
        }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <span>SOP berhasil diterbitkan! Mengalihkan ke halaman video...</span>
        </div>
      )}

      {/* PPT PROCESSING LOADING MODAL */}
      {uploading && contentType === 'ppt' && (
        <>
          <style>{`@keyframes ppt-spin { to { transform: rotate(360deg); } }`}</style>
          <div style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(6px)',
            display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 99998
          }}>
            <div style={{
              background: '#ffffff', borderRadius: '20px', padding: '40px 44px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '22px',
              width: '380px', maxWidth: '90vw', textAlign: 'center'
            }}>
              <div style={{ position: 'relative', width: '72px', height: '72px' }}>
                <div style={{
                  width: '72px', height: '72px', borderRadius: '18px', background: '#f3f0ff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                </div>
                <div style={{
                  position: 'absolute', bottom: '-2px', right: '-2px',
                  width: '22px', height: '22px', borderRadius: '50%',
                  border: '3px solid #7c3aed', borderTopColor: 'transparent',
                  animation: 'ppt-spin 0.75s linear infinite'
                }} />
              </div>

              <div>
                <div style={{ fontSize: '17px', fontWeight: '700', color: '#1e1b4b', marginBottom: '8px' }}>
                  Memproses Presentasi
                </div>
                <div style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.6' }}>
                  {uploadProgress < 20 ? 'Mengirim file ke server...' :
                   uploadProgress < 85 ? 'Mengkonversi setiap slide menjadi gambar...' :
                   'Menyimpan gambar slide ke cloud...'}
                </div>
              </div>

              <div style={{ width: '100%' }}>
                <div style={{ height: '8px', background: '#ede9fe', borderRadius: '8px', overflow: 'hidden', marginBottom: '10px' }}>
                  <div style={{
                    height: '100%', width: `${uploadProgress}%`,
                    background: 'linear-gradient(90deg, #7c3aed, #a78bfa)',
                    borderRadius: '8px', transition: 'width 0.4s ease'
                  }} />
                </div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#7c3aed' }}>{uploadProgress}%</div>
              </div>

              <div style={{ fontSize: '11.5px', color: '#94a3b8', background: '#f8fafc', borderRadius: '8px', padding: '10px 16px', lineHeight: '1.6', border: '1px solid #e2e8f0' }}>
                Jangan tutup halaman ini. Proses konversi biasanya membutuhkan <strong>1–3 menit</strong>.
              </div>
            </div>
          </div>
        </>
      )}

      {/* PUBLISH CONFIRMATION MODAL */}
      {showPublishConfirm && (() => {
        const preToShow = preQuestions.filter(q => q.question.trim() !== '');
        const postToShow = postQuestions.filter(q => q.question.trim() !== '');
        const triggersToShow = contentType === 'ppt' ? triggerQuizzes.filter(q => q.question.trim() !== '') : [];
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
                      <span style={{ fontSize: '12px', color: 'var(--text3)', minWidth: '90px' }}>{contentType === 'ppt' ? 'Jumlah Slide' : 'Durasi Video'}</span>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text1)' }}>{duration || '—'}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'baseline' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text3)', minWidth: '90px' }}>{contentType === 'ppt' ? 'File PPTX' : 'File Video'}</span>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text1)' }}>{contentType === 'ppt' ? (pptFile ? pptFile.name : 'Tidak ada file') : (videoFile ? videoFile.name : 'Tidak ada video')}</span>
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

                {/* KUIS PEMICU SLIDE — hanya untuk PPT */}
                {triggersToShow.length > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }}></span>
                      Kuis Pemicu Slide ({triggersToShow.length} kuis)
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {triggersToShow.map((q, i) => (
                        <div key={i} style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '10px 14px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                            <div style={{ fontSize: '13px', color: 'var(--text1)', lineHeight: '1.4', flex: 1 }}>
                              <span style={{ fontWeight: '700', color: 'var(--text3)', marginRight: '6px' }}>#{i + 1}</span>
                              {q.question}
                            </div>
                            <span style={{ fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '4px', background: '#fef3c7', color: '#92400e', flexShrink: 0, whiteSpace: 'nowrap' }}>
                              Slide {q.triggerSlide}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {preToShow.length === 0 && postToShow.length === 0 && triggersToShow.length === 0 && (
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
