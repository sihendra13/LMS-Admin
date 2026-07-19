import React, { useState, useRef, useEffect } from 'react';
import JSZip from 'jszip';
import * as XLSX from 'xlsx';
import { useTenant } from '../context/TenantContext';
import { canUploadSOP, canUploadPPT, getPPTLimit, hasDeadlineReminder } from '../utils/featureGates';
import { supabase } from '../utils/supabase';
import SearchableDeptSelect from '../components/SearchableDeptSelect';
import { useToast } from '../components/Toast';

const BACKEND_URL = 'https://axara-lms-backend.onrender.com';

export const UploadSOP = () => {
  const { tenant, addSOP, updateSOP, setActivePage, videos, editingVideoId, setEditingVideoId, departments } = useTenant();
  const toast = useToast();
  const editVideo = editingVideoId ? videos.find(v => v.id === editingVideoId) : null;
  const isEditMode = !!editVideo;

  const [contentType, setContentType] = useState(editVideo?.type || 'video');
  const [title, setTitle] = useState(editVideo?.title || '');
  const [dept, setDept] = useState(editVideo?.dept || 'Sales');
  const [deadline, setDeadline] = useState(editVideo?.deadline || '');
  const [duration, setDuration] = useState(editVideo?.duration || '5:00');
  const [videoFile, setVideoFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [pptFile, setPptFile] = useState(null);
  const [slideCount, setSlideCount] = useState(editVideo?.slideImages?.length || editVideo?.slideCount || 0);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [isDraftSuccess, setIsDraftSuccess] = useState(false);
  const fileInputRef = useRef(null);
  const pptInputRef = useRef(null);
  const uploadIntervalRef = useRef(null);

  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [previewUrl]);

  const selectVideoFile = (file) => {
    if (!file || !file.type.startsWith('video/')) return;
    const MAX_VIDEO_MB = 50;
    if (file.size > MAX_VIDEO_MB * 1024 * 1024) {
      toast.error(`File video terlalu besar!\n\nMaksimal ukuran file yang bisa diupload adalah ${MAX_VIDEO_MB}MB.\nUkuran file Anda: ${(file.size / 1024 / 1024).toFixed(1)} MB\n\nHarap kompres video terlebih dahulu sebelum mengupload.`);
      return;
    }
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
    if (ext !== 'pptx') return toast.error('Hanya file .pptx yang didukung.');
    setPptFile(file);
    setPreviewSlideImages(null);
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

    // Konversi PPT ke gambar di background agar admin bisa lihat preview slide saat mengisi narasi
    setPreviewLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const resp = await fetch(`${BACKEND_URL}/api/v1/ppt/convert`, {
        method: 'POST',
        body: formData,
      });
      if (resp.ok) {
        const result = await resp.json();
        setPreviewSlideImages(result.slideUrls);
        setSlideCount(result.slideCount);
        setDuration(`${result.slideCount} slide`);
      }
    } catch {
      // Preview tidak tersedia, tampilkan placeholder seperti biasa
    } finally {
      setPreviewLoading(false);
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
  const makeEmptyQuiz = () => ({ question: '', type: 'multiple', options: ['', '', '', ''], answer: 'A', triggerMin: '0', triggerSec: '0' });

  // Toggle state to switch editing between 'pre' (Pre-Test) and 'post' (Post-Test)
  const [activeTab, setActiveTab] = useState('pre'); // 'pre' | 'post'

  // Dynamic state for Pre-Test Questions (Pre-test murni tidak memicu waktu, triggerTime = 0)
  const [preQuestions, setPreQuestions] = useState(
    editVideo?.preQuizzes?.length
      ? editVideo.preQuizzes.filter(q => (q.triggerTime ?? 0) === 0).map(toEditQuiz)
      : [makeEmptyQuiz(), makeEmptyQuiz()]
  );

  // Dynamic state for Video Trigger Quizzes (Kuis pemicu waktu di tengah video, triggerTime > 0)
  const [videoTriggerQuizzes, setVideoTriggerQuizzes] = useState(
    editVideo?.type === 'video' && editVideo?.preQuizzes?.length
      ? editVideo.preQuizzes.filter(q => (q.triggerTime ?? 0) > 0).map(toEditQuiz)
      : [{ question: '', type: 'multiple', options: ['', '', '', ''], answer: 'A', triggerMin: '0', triggerSec: '0' }]
  );

  // Dynamic state for Post-Test Questions
  const [postQuestions, setPostQuestions] = useState(
    editVideo?.postQuizzes?.length ? editVideo.postQuizzes.map(toEditQuiz) : [makeEmptyQuiz(), makeEmptyQuiz()]
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
  const [previewSlideImages, setPreviewSlideImages] = useState(null); // Preview gambar slide sebelum publish
  const [previewLoading, setPreviewLoading] = useState(false); // Loading state saat konversi preview background
  const [saving, setSaving] = useState(false); // Loading simpan perubahan (tanpa upload file)
  const [noChangesToast, setNoChangesToast] = useState(false);
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
      toast.error('Tidak bisa mengakses mikrofon. Pastikan izin mikrofon sudah diberikan di browser.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  // Handlers for Pre-Test Questions
  const handlePreQuestionChange = (index, field, value) => {
    setPreQuestions(prev => prev.map((q, i) => i === index ? { ...q, [field]: value } : q));
  };

  const handlePreOptionChange = (qIndex, oIndex, value) => {
    setPreQuestions(prev => prev.map((q, i) => i === qIndex
      ? { ...q, options: q.options.map((o, j) => j === oIndex ? value : o) }
      : q
    ));
  };

  const addPreQuestion = () => {
    setPreQuestions(prev => [...prev, makeEmptyQuiz()]);
  };

  const removePreQuestion = (index) => {
    setPreQuestions(prev => prev.filter((_, i) => i !== index));
  };

  // Handlers for Video Trigger Quizzes
  const handleVideoTriggerQuestionChange = (index, field, value) => {
    setVideoTriggerQuizzes(prev => prev.map((q, i) => i === index ? { ...q, [field]: value } : q));
  };

  const handleVideoTriggerOptionChange = (qIndex, oIndex, value) => {
    setVideoTriggerQuizzes(prev => prev.map((q, i) => i === qIndex
      ? { ...q, options: q.options.map((o, j) => j === oIndex ? value : o) }
      : q
    ));
  };

  const addVideoTriggerQuestion = () => {
    setVideoTriggerQuizzes(prev => [...prev, makeEmptyQuiz()]);
  };

  const removeVideoTriggerQuestion = (index) => {
    setVideoTriggerQuizzes(prev => prev.filter((_, i) => i !== index));
  };

  // Handlers for Post-Test Questions
  const handlePostQuestionChange = (index, field, value) => {
    setPostQuestions(prev => prev.map((q, i) => i === index ? { ...q, [field]: value } : q));
  };

  const handlePostOptionChange = (qIndex, oIndex, value) => {
    setPostQuestions(prev => prev.map((q, i) => i === qIndex
      ? { ...q, options: q.options.map((o, j) => j === oIndex ? value : o) }
      : q
    ));
  };

  const addPostQuestion = () => {
    setPostQuestions(prev => [...prev, makeEmptyQuiz()]);
  };

  const removePostQuestion = (index) => {
    setPostQuestions(prev => prev.filter((_, i) => i !== index));
  };

  // Handlers untuk Kuis Pemicu Slide
  const handleTriggerQuizChange = (index, field, value) => {
    setTriggerQuizzes(prev => prev.map((q, i) => i === index ? { ...q, [field]: value } : q));
  };
  const handleTriggerOptionChange = (qIndex, oIndex, value) => {
    setTriggerQuizzes(prev => prev.map((q, i) => i === qIndex
      ? { ...q, options: q.options.map((o, j) => j === oIndex ? value : o) }
      : q
    ));
  };
  const addTriggerQuiz = () => {
    setTriggerQuizzes(prev => [...prev, { question: '', type: 'multiple', options: ['', '', '', ''], answer: 'A', triggerSlide: '2' }]);
  };
  const removeTriggerQuiz = (index) => {
    setTriggerQuizzes(prev => prev.filter((_, i) => i !== index));
  };

  const handleDownloadTemplate = () => {
    // Sheet 1: Pre-Test
    const wsPre = XLSX.utils.aoa_to_sheet([
      ['No', 'Pertanyaan', 'Opsi A', 'Opsi B', 'Opsi C', 'Opsi D', 'Jawaban Benar (A/B/C/D)'],
      ['1', 'Apa kepanjangan dari K3?', 'Kesehatan, Keselamatan Kerja', 'Kesejahteraan Karyawan', 'Kebersihan Kantor', 'Kekuatan Kerja', 'A']
    ]);
    wsPre['!cols'] = [{ wch: 5 }, { wch: 50 }, { wch: 25 }, { wch: 25 }, { wch: 25 }, { wch: 25 }, { wch: 20 }];

    // Sheet 2: Kuis Pemicu
    const wsMid = XLSX.utils.aoa_to_sheet([
      ['No', 'Waktu / Slide Pemicu (contoh: Menit 01:30, atau Slide 3)', 'Pertanyaan', 'Opsi A', 'Opsi B', 'Opsi C', 'Opsi D', 'Jawaban Benar (A/B/C/D)'],
      ['1', 'Menit 01:30', 'Apa yang harus dilakukan jika terjadi kebakaran?', 'Lari', 'Gunakan APAR', 'Sembunyi', 'Diam', 'B'],
      ['2', 'Slide 3', 'Siapa yang bertanggung jawab atas APAR?', 'Satpam', 'Semua Karyawan', 'Tim K3', 'HRD', 'C']
    ]);
    wsMid['!cols'] = [{ wch: 5 }, { wch: 45 }, { wch: 50 }, { wch: 25 }, { wch: 25 }, { wch: 25 }, { wch: 25 }, { wch: 20 }];

    // Sheet 3: Post-Test
    const wsPost = XLSX.utils.aoa_to_sheet([
      ['No', 'Pertanyaan', 'Opsi A', 'Opsi B', 'Opsi C', 'Opsi D', 'Jawaban Benar (A/B/C/D)'],
      ['1', 'Alat pelindung diri utama adalah?', 'Helm', 'Sepatu Safety', 'Kacamata', 'Semua Benar', 'D']
    ]);
    wsPost['!cols'] = [{ wch: 5 }, { wch: 50 }, { wch: 25 }, { wch: 25 }, { wch: 25 }, { wch: 25 }, { wch: 20 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsPre, 'Pre-Test');
    XLSX.utils.book_append_sheet(wb, wsMid, 'Kuis Pemicu');
    XLSX.utils.book_append_sheet(wb, wsPost, 'Post-Test');
    XLSX.writeFile(wb, 'Template_Kuis_SOP.xlsx');
  };

  const handleImportFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target.result, { type: 'binary' });
        
        const newPre = [];
        const newPost = [];
        const newVideoTrigger = [];
        const newTrigger = [];

        // Helper function to parse standard question rows (without trigger time)
        const parseStandardSheet = (sheetName, targetArray) => {
          const ws = wb.Sheets[sheetName];
          if (!ws) return;
          const raw = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false });
          const rows = raw.slice(1).filter(r => r[1] && String(r[1]).trim());
          for (let r of rows) {
            const question = String(r[1] || '').trim();
            if (!question) continue;
            const opsiA = String(r[2] || '').trim();
            const opsiB = String(r[3] || '').trim();
            const opsiC = String(r[4] || '').trim();
            const opsiD = String(r[5] || '').trim();
            const answerRaw = String(r[6] || '').trim().toUpperCase();
            const answer = ['A', 'B', 'C', 'D'].includes(answerRaw) ? answerRaw : 'A';
            const options = [opsiA, opsiB, opsiC, opsiD];
            targetArray.push({ question, type: 'multiple', options, answer, triggerMin: '0', triggerSec: '0' });
          }
        };

        // Helper function to parse trigger questions
        const parseTriggerSheet = () => {
          const ws = wb.Sheets['Kuis Pemicu'];
          if (!ws) return;
          let hasFormatError = false;
          const raw = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false });
          const rows = raw.slice(1).filter(r => r[2] && String(r[2]).trim());
          for (let r of rows) {
            const pemicuRaw = String(r[1] || '').trim();
            const question = String(r[2] || '').trim();
            if (!question) continue;
            const opsiA = String(r[3] || '').trim();
            const opsiB = String(r[4] || '').trim();
            const opsiC = String(r[5] || '').trim();
            const opsiD = String(r[6] || '').trim();
            const answerRaw = String(r[7] || '').trim().toUpperCase();
            const answer = ['A', 'B', 'C', 'D'].includes(answerRaw) ? answerRaw : 'A';
            const options = [opsiA, opsiB, opsiC, opsiD];

            if (contentType === 'video') {
              const timeStr = pemicuRaw.replace(/[^0-9:\.]/g, '');
              if (!timeStr || (!timeStr.includes(':') && !timeStr.includes('.'))) {
                toast.error('Format pertanyaan kuis pemicu salah! File ini sepertinya untuk PPT. Untuk SOP Video, gunakan format MM:SS (contoh: Menit 01:30)');
                hasFormatError = true;
                return true;
              }
              const normalizedPemicu = timeStr.replace('.', ':');
              const parts = normalizedPemicu.split(':');
              const min = parts[0] || '0';
              const sec = parts[1] || '0';
              newVideoTrigger.push({ question, type: 'multiple', options, answer, triggerMin: min, triggerSec: sec });
            } else if (contentType === 'ppt') {
              const slideNum = pemicuRaw.replace(/\D/g, '');
              if (!slideNum || pemicuRaw.toLowerCase().includes('menit') || pemicuRaw.includes(':') || pemicuRaw.includes('.')) {
                toast.error('Format pertanyaan kuis pemicu salah! File ini sepertinya untuk Video. Untuk SOP PPT, gunakan angka urutan slide (contoh: Slide 3)');
                hasFormatError = true;
                return true;
              }
              newTrigger.push({ question, type: 'multiple', options, answer, triggerSlide: slideNum });
            }
          }
          return hasFormatError;
        };

        const oldFormatSheet = wb.Sheets['Template Kuis SOP'];
        if (oldFormatSheet) {
          const raw = XLSX.utils.sheet_to_json(oldFormatSheet, { header: 1, raw: false });
          const rows = raw.slice(1).filter(r => r[0] && String(r[0]).trim());
          for (let r of rows) {
            const tipe = String(r[0] || '').trim().toLowerCase();
            const pemicuRaw = String(r[1] || '').trim();
            const question = String(r[2] || '').trim();
            const opsiA = String(r[3] || '').trim();
            const opsiB = String(r[4] || '').trim();
            const opsiC = String(r[5] || '').trim();
            const opsiD = String(r[6] || '').trim();
            const answerRaw = String(r[7] || '').trim().toUpperCase();
            const answer = ['A', 'B', 'C', 'D'].includes(answerRaw) ? answerRaw : 'A';
            const options = [opsiA, opsiB, opsiC, opsiD];

            if (!question) continue;

            if (tipe.includes('pre')) {
              newPre.push({ question, type: 'multiple', options, answer, triggerMin: '0', triggerSec: '0' });
            } else if (tipe.includes('post')) {
              newPost.push({ question, type: 'multiple', options, answer, triggerMin: '0', triggerSec: '0' });
            } else if (tipe.includes('pemicu')) {
              if (contentType === 'video') {
                if (pemicuRaw && !pemicuRaw.includes(':') && !pemicuRaw.includes('.')) {
                  toast.error('Format pertanyaan kuis pemicu salah! File ini sepertinya untuk PPT. Untuk SOP Video, gunakan format MM:SS (contoh: 01:30)');
                  return;
                }
                const normalizedPemicu = pemicuRaw.replace('.', ':');
                const parts = normalizedPemicu.split(':');
                const min = parts[0] || '0';
                const sec = parts[1] || '0';
                newVideoTrigger.push({ question, type: 'multiple', options, answer, triggerMin: min, triggerSec: sec });
              } else if (contentType === 'ppt') {
                if (pemicuRaw && (pemicuRaw.includes(':') || pemicuRaw.includes('.'))) {
                  toast.error('Format pertanyaan kuis pemicu salah! File ini sepertinya untuk Video. Untuk SOP PPT, gunakan angka urutan slide (contoh: 3)');
                  return;
                }
                const slideNum = pemicuRaw.replace(/\D/g, '') || '2';
                newTrigger.push({ question, type: 'multiple', options, answer, triggerSlide: slideNum });
              }
            }
          }
        } else {
          parseStandardSheet('Pre-Test', newPre);
          const hasError = parseTriggerSheet();
          if (hasError) return;
          parseStandardSheet('Post-Test', newPost);
        }

        if (newPre.length === 0 && newPost.length === 0 && newVideoTrigger.length === 0 && newTrigger.length === 0) {
          toast.error('Gagal mengimpor. Pastikan Anda mengisi soal di sheet Pre-Test, Kuis Pemicu, atau Post-Test.');
          return;
        }

        if (newPre.length) setPreQuestions(newPre);
        if (newPost.length) setPostQuestions(newPost);
        if (contentType === 'video' && newVideoTrigger.length) setVideoTriggerQuizzes(newVideoTrigger);
        if (contentType === 'ppt' && newTrigger.length) setTriggerQuizzes(newTrigger);

        toast.success('Kuis pertanyaan berhasil di impor! Jika ada kesalahan file yang diupload, cukup upload file yang benar untuk menimpa soal sebelumnya', { duration: 8000 });
      } catch (err) {
        console.error(err);
        toast.error('Gagal membaca file. Pastikan format .xlsx sesuai template.');
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const toSecs = (q) => Number(q.triggerMin || 0) * 60 + Number(q.triggerSec || 0);

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return toast.error('Judul SOP tidak boleh kosong!');
    if (contentType === 'video') {
      const filledTriggers = videoTriggerQuizzes.filter(q => q.question.trim() !== '');
      for (let i = 1; i < filledTriggers.length; i++) {
        if (toSecs(filledTriggers[i]) <= toSecs(filledTriggers[i - 1])) {
          return toast.error(`Kuis Pemicu Waktu #${i + 1}: waktu pemicu harus lebih besar dari kuis pemicu sebelumnya. Kuis harus muncul secara kronologis.`);
        }
      }
    }
    if (contentType === 'ppt') {
      const filledTriggers = triggerQuizzes.filter(q => q.question.trim() !== '');
      for (let i = 1; i < filledTriggers.length; i++) {
        if (Number(filledTriggers[i].triggerSlide) <= Number(filledTriggers[i - 1].triggerSlide)) {
          return toast.error(`Kuis Pemicu #${i + 1}: nomor slide harus lebih besar dari kuis pemicu sebelumnya (slide ${filledTriggers[i - 1].triggerSlide}). Kuis harus muncul secara berurutan.`);
        }
      }
    }
    setShowPublishConfirm(true);
  };

  const handleConfirmPublish = async (isDraftSubmit = false) => {
    setShowPublishConfirm(false);
    let videoUrl = null;
    let filePath = null;
    let slideImages = null;
    let latestSlideNarasi = slideNarasi.map(s => ({ ...s })); // local copy untuk track audio URLs baru

    if (contentType === 'ppt' && pptFile) {
      setUploading(true);
      setUploadProgress(10);
      if (previewSlideImages) {
        // Sudah dikonversi saat preview background — gunakan langsung, skip konversi ulang
        slideImages = previewSlideImages;
        setUploadProgress(60);
        await new Promise(r => setTimeout(r, 400)); // beri React waktu render overlay sebelum lanjut
      } else {
        // Belum ada preview (user belum tunggu atau konversi gagal) — konversi sekarang
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
            return toast.error(`Gagal konversi PPT: ${errData.error || resp.statusText}`);
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
          return toast.error(`Koneksi ke server gagal: ${err.message}`);
        }
      }

      // Upload audio narasi per slide ke Supabase (jika ada)
      if (narasiMode === 'audio' || narasiMode === 'keduanya') {
        const newAudio = latestSlideNarasi.filter(s => s.audioFile);
        if (newAudio.length > 0) {
          setUploadProgress(5);
          const sopId = Date.now();
          for (let i = 0; i < latestSlideNarasi.length; i++) {
            const s = latestSlideNarasi[i];
            if (!s.audioFile) continue;
            if (s.audioUrl) {
              const oldPath = s.audioUrl.split('/narasi/')[1];
              if (oldPath) await supabase.storage.from('narasi').remove([oldPath]);
            }
            const ext = s.audioFile.name.split('.').pop();
            const path = `narasi/${sopId}/slide-${i + 1}.${ext}`;
            const { error } = await supabase.storage.from('narasi').upload(path, s.audioFile, { upsert: true });
            if (error) return toast.error(`Gagal upload audio slide ${i + 1}: ${error.message}`);
            const { data: urlData } = supabase.storage.from('narasi').getPublicUrl(path);
            latestSlideNarasi[i] = { ...latestSlideNarasi[i], audioUrl: urlData.publicUrl };
            setUploadProgress(Math.round((i + 1) / latestSlideNarasi.length * 90));
          }
          setUploadProgress(100);
          await new Promise(r => setTimeout(r, 200));
        }
      }

      setUploading(false);

    } else if (contentType === 'ppt' && !pptFile && (narasiMode === 'audio' || narasiMode === 'keduanya')) {
      // Edit mode: PPT tidak diganti, tapi ada audio narasi baru yang perlu diupload
      const newAudioSlides = latestSlideNarasi.filter(s => s.audioFile);
      if (newAudioSlides.length > 0) {
        setUploading(true);
        setUploadProgress(5);
        const sopId = isEditMode ? editVideo.id : Date.now();
        for (let i = 0; i < latestSlideNarasi.length; i++) {
          const s = latestSlideNarasi[i];
          if (!s.audioFile) continue;
          if (s.audioUrl) {
            const oldPath = s.audioUrl.split('/narasi/')[1];
            if (oldPath) await supabase.storage.from('narasi').remove([oldPath]);
          }
          const ext = s.audioFile.name.split('.').pop();
          const path = `narasi/${sopId}/slide-${i + 1}.${ext}`;
          const { error } = await supabase.storage.from('narasi').upload(path, s.audioFile, { upsert: true });
          if (error) { setUploading(false); return toast.error(`Gagal upload audio slide ${i + 1}: ${error.message}`); }
          const { data: urlData } = supabase.storage.from('narasi').getPublicUrl(path);
          latestSlideNarasi[i] = { ...latestSlideNarasi[i], audioUrl: urlData.publicUrl };
          setUploadProgress(Math.round((i + 1) / latestSlideNarasi.length * 90));
        }
        setUploadProgress(100);
        await new Promise(r => setTimeout(r, 200));
        setUploading(false);
      }

    } else if (contentType === 'video' && videoFile) {
      setUploading(true);
      setUploadProgress(5);
      const fileExt = videoFile.name.split('.').pop();
      const fileName = `${Date.now()}_${title.replace(/\s+/g, '_')}.${fileExt}`;
      filePath = fileName;

      uploadIntervalRef.current = setInterval(() => {
        setUploadProgress(prev => prev < 80 ? prev + 5 : prev);
      }, 300);

      const { data, error } = await supabase.storage
        .from('videos')
        .upload(fileName, videoFile, { cacheControl: '3600', upsert: false });

      clearInterval(uploadIntervalRef.current);

      if (error) {
        setUploading(false);
        setUploadProgress(0);
        const isOverSize = error.message?.toLowerCase().includes('maximum allowed size') || error.message?.toLowerCase().includes('too large') || error.statusCode === '413';
        setTimeout(() => {
          if (isOverSize) {
            toast.error(`File video terlalu besar!\n\nMaksimal ukuran file yang bisa diupload adalah 50MB.\nUkuran file Anda: ${(videoFile.size / 1024 / 1024).toFixed(1)} MB\n\nHarap kompres video terlebih dahulu sebelum mengupload.`);
          } else {
            toast.error(`Gagal upload video: ${error.message}`);
          }
        }, 100);
        return;
      }

      setUploadProgress(95);
      const { data: urlData } = supabase.storage.from('videos').getPublicUrl(data.path);
      videoUrl = urlData.publicUrl;
      setUploadProgress(100);
      await new Promise(r => setTimeout(r, 400));
      setUploading(false);
    }

    // Filter out blank Pre-Test Questions
    const preList = [
      ...preQuestions
        .filter(q => q.question.trim() !== '')
        .map((q) => ({
          question: q.question,
          type: q.type,
          triggerTime: 0, // Pre-test murni tidak memicu waktu di tengah
          options: q.type === 'multiple' ? q.options.map((o, oIdx) => o.trim() || `Opsi ${String.fromCharCode(65 + oIdx)}`) : [],
          answer: q.type === 'multiple' ? q.answer : ''
        })),
      ...(contentType === 'video'
        ? videoTriggerQuizzes
            .filter(q => q.question.trim() !== '')
            .map((q) => ({
              question: q.question,
              type: q.type,
              triggerTime: (Number(q.triggerMin || 0) * 60) + Number(q.triggerSec || 0),
              options: q.type === 'multiple' ? q.options.map((o, oIdx) => o.trim() || `Opsi ${String.fromCharCode(65 + oIdx)}`) : [],
              answer: q.type === 'multiple' ? q.answer : ''
            }))
        : [])
    ].map((q, idx) => ({ id: idx + 1, ...q }));

    // Filter out blank Post-Test Questions
    const postList = postQuestions
      .filter(q => q.question.trim() !== '')
      .map((q, idx) => ({
        id: idx + 1,
        question: q.question,
        type: q.type,
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
      if (!uploading) {
        // Deteksi perubahan — hanya tampilkan loading kalau ada yang berubah
        const titleChanged = title.trim() !== (editVideo.title || '').trim();
        const deptChanged = dept !== (editVideo.dept || 'Sales');
        const deadlineChanged = deadline !== (editVideo.deadline || '');
        const narasiModeChanged = contentType === 'ppt' && narasiMode !== (editVideo.narasiMode || 'none');
        const hasPptFile = !!pptFile;
        const hasVideoFile = !!videoFile;
        const narasiTeksChanged = contentType === 'ppt' && narasiMode !== 'none' && slideNarasi.some((s, i) => {
          const orig = (editVideo.slideNarasi || [])[i];
          return (s.teks || '') !== (orig?.teks || '') || s.audioFile !== null;
        });

        const quizToCompare = (q) => JSON.stringify({ question: q.question, options: q.options, answer: q.answer, triggerMin: q.triggerMin || '0', triggerSec: q.triggerSec || '0' });
        const origPre = (editVideo.preQuizzes || []).filter(q => (q.triggerTime ?? 0) === 0).map(toEditQuiz);
        const origVideoTrigger = (editVideo.preQuizzes || []).filter(q => (q.triggerTime ?? 0) > 0).map(toEditQuiz);
        const origPost = (editVideo.postQuizzes || []).map(toEditQuiz);
        const origTrigger = (editVideo.triggerQuizzes || []).map(q => ({
          question: q.question || '', type: 'multiple',
          options: q.options?.length ? [...q.options] : ['', '', '', ''],
          answer: q.answer || 'A', triggerSlide: String(q.triggerSlide || 2),
        }));
        
        const preQuizChanged = preQuestions.length !== origPre.length || preQuestions.some((q, i) => quizToCompare(q) !== quizToCompare(origPre[i] || {}));
        const videoTriggerChanged = contentType === 'video' && (videoTriggerQuizzes.length !== origVideoTrigger.length || videoTriggerQuizzes.some((q, i) => quizToCompare(q) !== quizToCompare(origVideoTrigger[i] || {})));
        const postQuizChanged = postQuestions.length !== origPost.length || postQuestions.some((q, i) => quizToCompare(q) !== quizToCompare(origPost[i] || {}));
        const triggerQuizChanged = triggerQuizzes.length !== origTrigger.length || triggerQuizzes.some((q, i) => quizToCompare(q) !== quizToCompare(origTrigger[i] || {}));

        const hasChanges = titleChanged || deptChanged || deadlineChanged || narasiModeChanged || hasPptFile || hasVideoFile || narasiTeksChanged || preQuizChanged || videoTriggerChanged || postQuizChanged || triggerQuizChanged;

        if (!hasChanges) {
          setNoChangesToast(true);
          setTimeout(() => {
            setNoChangesToast(false);
            setEditingVideoId(null);
            setActivePage('sop');
          }, 2000);
          return;
        }

        setSaving(true);
        await new Promise(r => setTimeout(r, 1200));
      }
      // Edit mode: update existing SOP
      const updatedFields = {
        title,
        dept,
        duration,
        color: deptColors[dept] || '#1e3a5f',
        tagClass: deptClasses[dept] || 'dt-sales',
        deadline: deadline || null,
        triggerQuizzes: triggerList,
        preQuizzes: preList,
        postQuizzes: postList,
        narasiMode: contentType === 'ppt' ? narasiMode : null,
        slideNarasi: contentType === 'ppt' && narasiMode !== 'none'
          ? latestSlideNarasi.map(s => ({ teks: s.teks || '', audioUrl: s.audioUrl || null }))
          : null,
        isDraft: isDraftSubmit,
      };
      // Kalau ada file baru diunggah
      if (videoUrl) updatedFields.videoUrl = videoUrl;
      if (filePath) updatedFields.filePath = filePath;
      if (slideImages) {
        updatedFields.slideImages = slideImages;
        updatedFields.slideCount = slideCount;
      }
      await updateSOP(editVideo.id, updatedFields);
      setSaving(false);
      setIsDraftSuccess(isDraftSubmit);
      setUploadSuccess(true);
      setTimeout(() => {
        setEditingVideoId(null);
        setActivePage('sop');
      }, 1800);
      return;
    }

    const newVideo = {
      id: Date.now(),
      title,
      dept,
      duration,
      deadline: deadline || null,
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
        ? latestSlideNarasi.map(s => ({
            teks: s.teks || '',
            audioUrl: s.audioUrl || null,
          }))
        : null,
      isDraft: isDraftSubmit,
    };

    await addSOP(newVideo);
    setIsDraftSuccess(isDraftSubmit);
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
        <h2 style={{ fontSize: '20px', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: '600', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
          {isEditMode ? (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
              Edit SOP — {editVideo.title}
            </>
          ) : 'Konfigurasi Materi Training & SOP'}
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
              return toast.error('Fitur upload PPT hanya tersedia untuk paket Business dan Enterprise. Hubungi tim Axara untuk upgrade.');
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
        <div className="card" style={{ padding: '24px', marginBottom: '24px', overflow: 'visible' }}>
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
                    <div className="upload-desc" style={{ fontSize: '11.5px', color: '#94a3b8', margin: '0 0 20px 0', lineHeight: '1.4' }}>Format MP4, MKV, atau AVI. Maksimal 50MB.</div>
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
            <div className="card" style={{ padding: '24px', border: '1px solid var(--border)', borderRadius: '12px', background: '#ffffff', textAlign: 'left', overflow: 'visible' }}>
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

                {hasDeadlineReminder(tenant.plan) && (
                  <div className="form-group" style={{ margin: '0' }}>
                    <label className="form-label" style={{ textTransform: 'uppercase', fontSize: '10px', fontWeight: '700', letterSpacing: '0.05em' }}>
                      Deadline Penyelesaian <span style={{ color: '#94a3b8', fontWeight: '400', textTransform: 'none' }}>(opsional)</span>
                    </label>
                    <input
                      type="date"
                      className="form-input"
                      style={{ fontSize: '14px', padding: '10px 12px' }}
                      value={deadline}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setDeadline(e.target.value)}
                    />
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group" style={{ margin: '0' }}>
                    <label className="form-label" style={{ textTransform: 'uppercase', fontSize: '10px', fontWeight: '700', letterSpacing: '0.05em' }}>Departemen Target</label>
                    <SearchableDeptSelect
                      value={dept}
                      onChange={setDept}
                      departments={['Semua', ...departments]}
                    />
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
          <div className="step-header" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <div className="step-title" style={{ fontSize: '15px' }}>Konfigurasi Ujian</div>
              <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '2px' }}>
                {contentType === 'ppt'
                  ? 'Kuis Pre-Test muncul sebelum presentasi dimulai. Kuis Post-Test muncul setelah karyawan menekan tombol Selesai.'
                  : 'Buat parameter kuis yang muncul di tengah video (Pre-Test) dan evaluasi akhir setelah selesai menonton (Post-Test).'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" onClick={handleDownloadTemplate}
                style={{ fontSize: '12px', padding: '8px 12px', background: '#ffffff', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', color: 'var(--text2)', fontWeight: '600', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', height: '38px', boxSizing: 'border-box' }}
                onMouseOver={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = 'var(--text3)'; }}
                onMouseOut={e => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.borderColor = 'var(--border)'; }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Template Excel
              </button>
              <label style={{ fontSize: '12px', padding: '8px 12px', background: 'var(--navy)', border: 'none', borderRadius: '6px', cursor: 'pointer', color: '#fff', fontWeight: '600', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', height: '38px', boxSizing: 'border-box' }}
                onMouseOver={e => e.currentTarget.style.background = 'var(--accent)'}
                onMouseOut={e => e.currentTarget.style.background = 'var(--navy)'}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                Import Excel
                <input type="file" accept=".xlsx,.xls" onChange={handleImportFile} style={{ display: 'none' }} />
              </label>
            </div>
          </div>

          {/* SINGLE TUTORIAL GUIDELINE BOX */}
          <div style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px 20px', marginBottom: '20px', fontSize: '12.5px', color: 'var(--text2)', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#eff6ff', color: 'var(--accent)', display: 'flex', alignItems: 'center', justify: 'center', flexShrink: 0, marginTop: '2px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            </div>
            <div>
              <div style={{ fontWeight: '800', color: 'var(--text1)', marginBottom: '6px', fontSize: '13px' }}>Cara Mengisi Kunci Jawaban:</div>
              <ol style={{ margin: 0, paddingLeft: '16px', lineHeight: '1.6', color: 'var(--text2)' }}>
                <li>Ketik teks masing-masing opsi jawaban (A, B, C, D) di kotak yang disediakan pada setiap pertanyaan.</li>
                <li>Klik pil/kotak opsi tersebut untuk menentukan <strong>jawaban benar</strong> — kotak opsi yang dipilih akan otomatis berubah warna menjadi biru dengan tanda centang (✓).</li>
              </ol>
            </div>
          </div>

          {/* TWO COLUMN GRID FOR PRE-TEST AND POST-TEST */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }}>
            
            {/* COLUMN 1: PRE-TEST */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text2)', paddingBottom: '10px', borderBottom: '1px solid var(--border)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
                {contentType === 'ppt' ? 'Kuis Pre-Test (Sebelum Presentasi)' : 'Kuis Pre-Test (Sebelum Video Dimulai)'}
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

                    <div style={{ marginTop: '16px' }}>
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
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Tambah Pertanyaan Pre-Test
              </button>
            </div>

            {/* COLUMN 2: POST-TEST */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text2)', paddingBottom: '10px', borderBottom: '1px solid var(--border)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
                {contentType === 'ppt' ? 'Kuis Post-Test (Setelah Presentasi Selesai)' : 'Kuis Post-Test (Setelah Video Selesai)'}
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
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Tambah Pertanyaan Post-Test
              </button>
            </div>

          </div>

          {/* KUIS PEMICU WAKTU — Full width, hanya untuk VIDEO */}
          {contentType === 'video' && (
            <div style={{ marginTop: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text1)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                    </svg>
                    Kuis Pemicu Waktu (Muncul Di Tengah Video)
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text3)' }}>
                    Tentukan waktu pemicu agar video otomatis terhenti dan menampilkan kuis untuk memastikan konsentrasi karyawan.
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {videoTriggerQuizzes.map((q, idx) => (
                  <div key={idx} className="card" style={{ border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '12px 20px', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--accent)', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                        </svg>
                        Kuis Pemicu #{idx + 1}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text2)' }}>Muncul di</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <input
                              type="number"
                              min="0"
                              value={q.triggerMin}
                              onChange={(e) => handleVideoTriggerQuestionChange(idx, 'triggerMin', e.target.value)}
                              placeholder="0"
                              style={{ width: '48px', fontSize: '13px', padding: '4px 6px', textAlign: 'center', fontWeight: '700', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text1)', background: 'var(--background)' }}
                            />
                            <span style={{ fontSize: '11px', color: 'var(--text3)' }}>m</span>
                            <input
                              type="number"
                              min="0"
                              max="59"
                              value={q.triggerSec}
                              onChange={(e) => handleVideoTriggerQuestionChange(idx, 'triggerSec', e.target.value)}
                              placeholder="0"
                              style={{ width: '48px', fontSize: '13px', padding: '4px 6px', textAlign: 'center', fontWeight: '700', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text1)', background: 'var(--background)' }}
                            />
                            <span style={{ fontSize: '11px', color: 'var(--text3)' }}>s</span>
                          </div>
                        </div>
                        {videoTriggerQuizzes.length > 1 && (
                          <button
                            type="button"
                            className="delete-question-btn"
                            title="Hapus Kuis Pemicu"
                            onClick={() => removeVideoTriggerQuestion(idx)}
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
                    </div>

                    <div style={{ padding: '20px', textAlign: 'left' }}>
                      {idx > 0 && toSecs(q) <= toSecs(videoTriggerQuizzes[idx - 1]) && (
                        <div style={{ marginBottom: '12px', fontSize: '11px', color: '#b91c1c', background: '#fff5f5', border: '1px solid #fecaca', borderRadius: '6px', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                            <line x1="12" y1="9" x2="12" y2="13" />
                            <line x1="12" y1="17" x2="12.01" y2="17" />
                          </svg>
                          Waktu pemicu harus lebih besar dari Kuis Pemicu #{idx} ({videoTriggerQuizzes[idx - 1].triggerMin}m {videoTriggerQuizzes[idx - 1].triggerSec}s). Kuis harus muncul secara berurutan.
                        </div>
                      )}
                      <div className="form-group" style={{ marginBottom: '16px' }}>
                        <label className="form-label" style={{ textTransform: 'uppercase', fontSize: '12px', fontWeight: '700', color: 'var(--text1)' }}>Teks Pertanyaan</label>
                        <textarea
                          className="form-input"
                          style={{ minHeight: '72px', fontFamily: 'inherit', resize: 'vertical', fontSize: '14px', padding: '10px 14px', marginTop: '6px' }}
                          placeholder={`Contoh: Apa yang harus dilakukan ketika menerima keluhan pelanggan?`}
                          value={q.question}
                          onChange={(e) => handleVideoTriggerQuestionChange(idx, 'question', e.target.value)}
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
                              onClick={() => handleVideoTriggerQuestionChange(idx, 'answer', letter)}
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
                                onChange={(e) => handleVideoTriggerOptionChange(idx, oIdx, e.target.value)}
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
                  className="btn-primary"
                  style={{ background: 'none', border: '1px dashed var(--border)', color: 'var(--text2)', fontSize: '12px', padding: '12px', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', borderRadius: '8px', cursor: 'pointer' }}
                  onClick={addVideoTriggerQuestion}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Tambah Kuis Pemicu Waktu
                </button>
              </div>
            </div>
          )}

          {/* KUIS PEMICU SLIDE — Full width, hanya untuk PPT */}
          {contentType === 'ppt' && (
            <div style={{ marginTop: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text1)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                    </svg>
                    Kuis Pemicu Slide (Muncul Di Tengah Presentasi)
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text3)' }}>
                    Tentukan di slide berapa kuis muncul. Learner tidak bisa melanjutkan ke slide berikutnya sebelum menjawab.
                  </div>
                </div>
                {slideCount > 0 && (
                  <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '6px 12px', fontSize: '11px', fontWeight: '700', color: '#1d4ed8', whiteSpace: 'nowrap' }}>
                    Total {slideCount} slide
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {triggerQuizzes.map((q, idx) => (
                  <div key={idx} className="card" style={{ border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '12px 20px', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--accent)', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                        </svg>
                        Kuis Pemicu #{idx + 1}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text2)' }}>Muncul di slide</span>
                          <input
                            type="number"
                            min="1"
                            max={slideCount || 999}
                            value={q.triggerSlide}
                            onChange={(e) => handleTriggerQuizChange(idx, 'triggerSlide', e.target.value)}
                            style={{
                              width: '64px', fontSize: '14px', padding: '4px 8px', textAlign: 'center', fontWeight: '700',
                              border: `1px solid ${idx > 0 && Number(q.triggerSlide) <= Number(triggerQuizzes[idx - 1].triggerSlide) ? '#f87171' : 'var(--border)'}`,
                              borderRadius: '6px', color: 'var(--text1)', background: idx > 0 && Number(q.triggerSlide) <= Number(triggerQuizzes[idx - 1].triggerSlide) ? '#fef2f2' : 'var(--background)'
                            }}
                          />
                          {slideCount > 0 && (
                            <span style={{ fontSize: '11px', color: 'var(--text3)' }}>/ {slideCount}</span>
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
                              <line x1="10" y1="11" x2="10" y2="17" />
                              <line x1="14" y1="11" x2="14" y2="17" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>

                    <div style={{ padding: '20px', textAlign: 'left' }}>
                      {idx > 0 && Number(q.triggerSlide) <= Number(triggerQuizzes[idx - 1].triggerSlide) && (
                        <div style={{ marginBottom: '12px', fontSize: '11px', color: '#b91c1c', background: '#fff5f5', border: '1px solid #fecaca', borderRadius: '6px', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                            <line x1="12" y1="9" x2="12" y2="13" />
                            <line x1="12" y1="17" x2="12.01" y2="17" />
                          </svg>
                          Nomor slide harus lebih besar dari Kuis Pemicu #{idx} (slide {triggerQuizzes[idx - 1].triggerSlide}). Kuis harus muncul secara berurutan.
                        </div>
                      )}
                      <div className="form-group" style={{ marginBottom: '16px' }}>
                        <label className="form-label" style={{ textTransform: 'uppercase', fontSize: '12px', fontWeight: '700', color: 'var(--text1)' }}>Teks Pertanyaan</label>
                        <textarea
                          className="form-input"
                          style={{ minHeight: '72px', fontFamily: 'inherit', resize: 'vertical', fontSize: '14px', padding: '10px 14px', marginTop: '6px' }}
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
                  className="btn-primary"
                  style={{ background: 'none', border: '1px dashed var(--border)', color: 'var(--text2)', fontSize: '12px', padding: '12px', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', borderRadius: '8px', cursor: 'pointer' }}
                  onClick={addTriggerQuiz}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Tambah Kuis Pemicu Slide
                </button>
              </div>
            </div>
          )}
        </div>

        {/* NARASI PER SLIDE — hanya untuk PPT */}
        {contentType === 'ppt' && slideCount > 0 && (
          <div style={{ marginTop: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text1)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                    <line x1="12" y1="19" x2="12" y2="22"/>
                  </svg>
                  Narasi per Slide (Opsional)
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text3)' }}>
                  Tambahkan penjelasan teks atau rekaman suara untuk setiap slide agar learner lebih mudah memahami materi.
                </div>
              </div>
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '6px 12px', fontSize: '11px', fontWeight: '700', color: '#1d4ed8', whiteSpace: 'nowrap' }}>
                {slideCount} slide
              </div>
            </div>

            {/* Pilih mode narasi — tampil di sini hanya saat belum memilih mode */}
            {narasiMode === 'none' && (
              <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
                {[
                  {
                    val: 'none',
                    label: 'Tidak Ada Narasi',
                    icon: (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                      </svg>
                    )
                  },
                  {
                    val: 'teks',
                    label: 'Teks Narasi',
                    icon: (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                        <line x1="16" y1="13" x2="8" y2="13"/>
                        <line x1="16" y1="17" x2="8" y2="17"/>
                        <polyline points="10 9 9 9 8 9"/>
                      </svg>
                    )
                  },
                  {
                    val: 'audio',
                    label: 'Audio Narasi',
                    icon: (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
                      </svg>
                    )
                  },
                  {
                    val: 'keduanya',
                    label: 'Teks + Audio',
                    icon: (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/>
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                        <line x1="12" y1="19" x2="12" y2="22"/>
                      </svg>
                    )
                  },
                ].map(opt => {
                  const isActive = narasiMode === opt.val;
                  return (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => setNarasiMode(opt.val)}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        border: isActive ? '2px solid var(--accent)' : '1px solid var(--border)',
                        background: isActive ? '#eff6ff' : '#ffffff',
                        color: isActive ? 'var(--accent)' : 'var(--text2)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {opt.icon}
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            )}

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
                  const imgUrl = previewSlideImages?.[activeSlideIndex] || (editVideo?.slideImages || [])[activeSlideIndex];
                  const hasNarasi = slideNarasi[activeSlideIndex]?.teks?.trim();
                  const hasAudio = slideNarasi[activeSlideIndex]?.audioFile || slideNarasi[activeSlideIndex]?.audioUrl;
                  return (
                    <div style={{ position: 'relative', borderRadius: '10px', overflow: 'hidden', background: '#1e293b', aspectRatio: '16/9', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '180px' }}>
                      {imgUrl ? (
                        <img src={imgUrl} alt={`Slide ${activeSlideIndex + 1}`} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
                      ) : previewLoading ? (
                        <div style={{ textAlign: 'center', color: '#94a3b8', padding: '20px' }}>
                          <div style={{ width: '36px', height: '36px', border: '3px solid #334155', borderTop: '3px solid #7c3aed', borderRadius: '50%', margin: '0 auto 12px', animation: 'spin 1s linear infinite' }} />
                          <div style={{ fontSize: '12px' }}>Memuat preview slide...</div>
                          <div style={{ fontSize: '10px', marginTop: '4px', opacity: 0.6 }}>Konversi PPT sedang berjalan</div>
                        </div>
                      ) : (
                        <div style={{ textAlign: 'center', color: '#94a3b8', padding: '20px' }}>
                          <div style={{ fontSize: '48px', fontWeight: '900', color: '#334155', lineHeight: 1 }}>{activeSlideIndex + 1}</div>
                          <div style={{ fontSize: '12px', marginTop: '8px' }}>Slide {activeSlideIndex + 1} dari {slideCount}</div>
                          <div style={{ fontSize: '10px', marginTop: '4px', opacity: 0.6 }}>Preview tidak tersedia</div>
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

                {/* MODE SWITCHER — di dalam carousel agar mudah ganti tanpa scroll naik */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', padding: '4px 0' }}>
                  {[
                    {
                      val: 'none',
                      label: 'Tidak Ada Narasi',
                      icon: (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"/>
                          <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                        </svg>
                      )
                    },
                    {
                      val: 'teks',
                      label: 'Teks Narasi',
                      icon: (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                          <polyline points="14 2 14 8 20 8"/>
                          <line x1="16" y1="13" x2="8" y2="13"/>
                          <line x1="16" y1="17" x2="8" y2="17"/>
                          <polyline points="10 9 9 9 8 9"/>
                        </svg>
                      )
                    },
                    {
                      val: 'audio',
                      label: 'Audio Narasi',
                      icon: (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                          <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
                        </svg>
                      )
                    },
                    {
                      val: 'keduanya',
                      label: 'Teks + Audio',
                      icon: (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/>
                          <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                          <line x1="12" y1="19" x2="12" y2="22"/>
                        </svg>
                      )
                    },
                  ].map(opt => {
                    const isActive = narasiMode === opt.val;
                    return (
                      <button
                        key={opt.val}
                        type="button"
                        onClick={() => setNarasiMode(opt.val)}
                        style={{
                          padding: '7px 14px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          border: isActive ? '2px solid var(--accent)' : '1px solid var(--border)',
                          background: isActive ? '#eff6ff' : '#ffffff',
                          color: isActive ? 'var(--accent)' : 'var(--text2)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {opt.icon}
                        {opt.label}
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
                        
                        {/* CASE 1: SEDANG MEREKAM */}
                        {recordingSlide === activeSlideIndex ? (
                          <div style={{ background: '#f8fafc', border: '1px solid var(--border)', padding: '14px 18px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text1)', fontWeight: '700' }}>
                              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#dc2626', display: 'inline-block', animation: 'pulse 1s infinite' }} />
                              Merekam Suara...
                            </span>
                            <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text1)', fontVariantNumeric: 'tabular-nums' }}>
                              {String(Math.floor(recordingSeconds / 60)).padStart(2, '0')}:{String(recordingSeconds % 60).padStart(2, '0')}
                            </span>
                            <button
                              type="button"
                              onClick={stopRecording}
                              style={{
                                padding: '6px 14px',
                                background: '#1e293b',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: '700',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                              }}
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2">
                                <rect x="4" y="4" width="16" height="16" rx="2" ry="2" />
                              </svg>
                              Stop
                            </button>
                          </div>
                        ) : (slideNarasi[activeSlideIndex]?.audioFile || slideNarasi[activeSlideIndex]?.audioUrl) ? (
                          /* CASE 2: AUDIO SUDAH TERSEDIA (FILE ATAU URL) */
                          <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <audio
                              controls
                              src={slideNarasi[activeSlideIndex].audioFile ? URL.createObjectURL(slideNarasi[activeSlideIndex].audioFile) : slideNarasi[activeSlideIndex].audioUrl}
                              style={{ width: '100%', height: '36px' }}
                            />
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span style={{ fontSize: '12px', color: '#15803d', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                                {slideNarasi[activeSlideIndex].audioFile ? slideNarasi[activeSlideIndex].audioFile.name : 'Audio Terpasang'}
                              </span>
                              <button
                                type="button"
                                onClick={() => setSlideNarasi(prev => {
                                  const updated = [...prev];
                                  updated[activeSlideIndex] = { ...updated[activeSlideIndex], audioFile: null, audioUrl: null };
                                  return updated;
                                })}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#ef4444',
                                  cursor: 'pointer',
                                  fontSize: '12px',
                                  fontWeight: '700',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  marginLeft: 'auto'
                                }}
                              >
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="3 6 5 6 21 6" />
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                </svg>
                                Hapus Audio
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* CASE 3: BELUM ADA AUDIO (TAMPILKAN 2 OPSI LANGSUNG BERDAMPINGAN) */
                          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                            {/* Hidden file input */}
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
                            {/* Button Option 1: Upload */}
                            <label
                              htmlFor={`audio-slide-${activeSlideIndex}`}
                              style={{
                                padding: '8px 16px',
                                border: '1px solid var(--border)',
                                borderRadius: '6px',
                                fontSize: '12px',
                                cursor: 'pointer',
                                background: '#ffffff',
                                color: 'var(--text2)',
                                fontWeight: '700',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                transition: 'all 0.15s ease'
                              }}
                              onMouseOver={(e) => e.currentTarget.style.background = '#f8fafc'}
                              onMouseOut={(e) => e.currentTarget.style.background = '#ffffff'}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="17 8 12 3 7 8" />
                                <line x1="12" y1="3" x2="12" y2="15" />
                              </svg>
                              Unggah File Audio
                            </label>

                            {/* Button Option 2: Record */}
                            <button
                              type="button"
                              onClick={() => startRecording(activeSlideIndex)}
                              style={{
                                padding: '8px 16px',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '12px',
                                cursor: 'pointer',
                                background: 'var(--navy)',
                                color: '#ffffff',
                                fontWeight: '700',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                transition: 'all 0.15s ease',
                                boxShadow: '0 2px 4px rgba(11, 22, 40, 0.12)'
                              }}
                              onMouseOver={(e) => {
                                e.currentTarget.style.background = 'var(--accent)';
                                e.currentTarget.style.boxShadow = '0 4px 8px rgba(47, 123, 255, 0.2)';
                              }}
                              onMouseOut={(e) => {
                                e.currentTarget.style.background = 'var(--navy)';
                                e.currentTarget.style.boxShadow = '0 2px 4px rgba(11, 22, 40, 0.12)';
                              }}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
                                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                                <line x1="12" y1="19" x2="12" y2="22" />
                              </svg>
                              Rekam Suara
                            </button>
                            <span style={{ fontSize: '11px', color: 'var(--text3)' }}>Format didukung: MP3, WAV, M4A</span>
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
          
          <div style={{ display: 'flex', gap: '12px' }}>
            {(!isEditMode || editVideo?.isDraft) && (
              <button
                type="button"
                className="btn-sec"
                style={{
                  padding: '10px 24px',
                  borderRadius: '8px',
                  fontWeight: '600',
                  border: '1px solid var(--border)',
                  cursor: uploading ? 'not-allowed' : 'pointer',
                  background: '#fff',
                  color: 'var(--text2)'
                }}
                disabled={uploading}
                onClick={() => handleConfirmPublish(true)}
              >
                {isEditMode && editVideo?.isDraft ? 'Simpan Perubahan' : 'Simpan Draft'}
              </button>
            )}
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
            {uploading ? `Mengupload ${contentType === 'ppt' ? 'PPT' : 'Video'}... ${uploadProgress}%` : (isEditMode && editVideo?.isDraft) ? 'Terbitkan Materi & Ujian' : isEditMode ? 'Simpan Perubahan' : 'Terbitkan Materi & Ujian'}
          </button>
          </div>
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
          <span>{isDraftSuccess ? 'Draf materi ujian ini berhasil disimpan!' : (isEditMode && !editVideo?.isDraft) ? 'Perubahan berhasil disimpan!' : 'SOP berhasil diterbitkan! Mengalihkan ke halaman video...'}</span>
        </div>
      )}

      {/* SAVING OVERLAY — untuk edit mode tanpa upload file */}
      {saving && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(6px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 99998
        }}>
          <div style={{
            background: '#ffffff', borderRadius: '20px', padding: '48px 44px',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px',
            width: '260px', maxWidth: '90vw', textAlign: 'center'
          }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', border: '5px solid #e2e8f0', borderTopColor: '#7c3aed', animation: 'spin 0.85s linear infinite' }} />
            <div style={{ fontSize: '15px', fontWeight: '700', color: '#1e293b' }}>Menyimpan Perubahan...</div>
          </div>
        </div>
      )}

      {/* NO CHANGES TOAST */}
      {noChangesToast && (
        <div style={{
          position: 'fixed', bottom: '32px', left: '50%', transform: 'translateX(-50%)',
          background: '#0f172a', color: '#fff', padding: '14px 24px', borderRadius: '12px',
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center',
          gap: '12px', zIndex: 99999, fontSize: '14px', fontWeight: '500'
        }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <span>Tidak ada perubahan yang disimpan</span>
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

      {/* VIDEO UPLOAD LOADING OVERLAY */}
      {uploading && contentType === 'video' && (
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
                  <polygon points="23 7 16 12 23 17 23 7"/>
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
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
                Mengupload Video
              </div>
              <div style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.6' }}>
                {uploadProgress < 20 ? 'Mengirim file ke server...' :
                 uploadProgress < 80 ? 'Mengupload video ke cloud...' :
                 'Menyimpan data video...'}
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
              Jangan tutup halaman ini. Video berukuran besar bisa membutuhkan <strong>beberapa menit</strong>.
            </div>

            {uploadProgress >= 80 && (
              <button
                onClick={() => {
                  clearInterval(uploadIntervalRef.current);
                  setUploading(false);
                  setUploadProgress(0);
                }}
                style={{
                  marginTop: '4px', padding: '8px 24px', borderRadius: '8px',
                  border: '1.5px solid #e2e8f0', background: '#fff',
                  color: '#64748b', fontSize: '13px', fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Batalkan Upload
              </button>
            )}
          </div>
        </div>
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
               <div style={{ padding: '24px 28px 0', borderBottom: '1px solid var(--border)', paddingBottom: '16px', position: 'relative' }}>
                 <button
                   type="button"
                   onClick={() => setShowPublishConfirm(false)}
                   style={{
                     position: 'absolute',
                     top: '24px',
                     right: '28px',
                     background: 'none',
                     border: 'none',
                     color: 'var(--text3)',
                     cursor: 'pointer',
                     padding: '6px',
                     display: 'flex',
                     alignItems: 'center',
                     justifyContent: 'center',
                     borderRadius: '50%',
                     transition: 'all 0.15s ease'
                   }}
                   onMouseOver={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = 'var(--text1)'; }}
                   onMouseOut={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text3)'; }}
                   title="Tutup"
                 >
                   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                     <line x1="18" y1="6" x2="6" y2="18"></line>
                     <line x1="6" y1="6" x2="18" y2="18"></line>
                   </svg>
                 </button>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                   <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#fffbeb', border: '1px solid #fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                     <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                       <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                       <line x1="12" y1="9" x2="12" y2="13"></line>
                       <line x1="12" y1="17" x2="12.01" y2="17"></line>
                     </svg>
                   </div>
                   <div>
                     <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text1)', margin: 0 }}>{(isEditMode && !editVideo?.isDraft) ? 'Konfirmasi Simpan Perubahan' : 'Konfirmasi Terbitkan SOP'}</h3>
                     <p style={{ fontSize: '12px', color: 'var(--text3)', margin: 0 }}>{(isEditMode && !editVideo?.isDraft) ? 'Tinjau kembali perubahan sebelum disimpan' : 'Tinjau kembali sebelum menerbitkan'}</p>
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
                      <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text1)' }}>
                        {contentType === 'ppt'
                          ? (pptFile ? pptFile.name : isEditMode ? 'Menggunakan file yang ada (tidak diganti)' : 'Tidak ada file')
                          : (videoFile ? videoFile.name : isEditMode ? 'Menggunakan file yang ada (tidak diganti)' : 'Tidak ada video')}
                      </span>
                    </div>
                    {hasDeadlineReminder(tenant.plan) && (
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'baseline' }}>
                        <span style={{ fontSize: '12px', color: 'var(--text3)', minWidth: '90px' }}>Deadline</span>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: deadline ? 'var(--text1)' : 'var(--text3)' }}>
                          {deadline ? new Date(deadline).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'}
                        </span>
                      </div>
                    )}
                    {contentType === 'ppt' && (
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'baseline' }}>
                        <span style={{ fontSize: '12px', color: 'var(--text3)', minWidth: '90px' }}>Narasi</span>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: narasiMode === 'none' ? 'var(--text3)' : 'var(--text1)' }}>
                          {narasiMode === 'none'
                            ? 'Tidak Ada Narasi'
                            : `Narasi Teks + Audio : ${slideNarasi.filter(s => s.teks?.trim() || s.audioFile || s.audioUrl).length} dari ${slideCount} Slide terisi`
                          }
                        </span>
                      </div>
                    )}
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
                      {preToShow.map((q, i) => (
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

                {/* KUIS PEMICU WAKTU VIDEO — hanya untuk Video */}
                {contentType === 'video' && videoTriggerQuizzes.filter(q => q.question.trim() !== '').length > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }}></span>
                      Kuis Pemicu Waktu ({videoTriggerQuizzes.filter(q => q.question.trim() !== '').length} kuis)
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {videoTriggerQuizzes.filter(q => q.question.trim() !== '').map((q, i) => {
                        const trigger = formatTrigger(q);
                        return (
                          <div key={i} style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '10px 14px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                              <div style={{ fontSize: '13px', color: 'var(--text1)', lineHeight: '1.4', flex: 1 }}>
                                <span style={{ fontWeight: '700', color: 'var(--text3)', marginRight: '6px' }}>#{i + 1}</span>
                                {q.question}
                              </div>
                              <span style={{ fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '4px', background: '#fef3c7', color: '#92400e', flexShrink: 0, whiteSpace: 'nowrap' }}>
                                Menit {trigger || '0:00'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* KUIS PEMICU SLIDE — hanya untuk PPT */}
                {contentType === 'ppt' && triggersToShow.length > 0 && (
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

                {preToShow.length === 0 && postToShow.length === 0 && triggersToShow.length === 0 && (contentType === 'ppt' || videoTriggerQuizzes.filter(q => q.question.trim() !== '').length === 0) && (
                  <div style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', fontSize: '13px', color: 'var(--text3)', textAlign: 'center' }}>
                    Tidak ada soal kuis yang dikonfigurasi
                  </div>
                )}

                {/* WARNING */}
                {isEditMode ? (
                  <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '14px 18px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '1px' }}>
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="8" x2="12" y2="12"></line>
                      <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    <span style={{ fontSize: '13px', color: '#1d4ed8', fontWeight: '500', lineHeight: '1.5' }}>
                      Perubahan akan langsung berlaku. SOP masih bisa diedit kembali <strong>selama belum ada karyawan yang menontonnya</strong>.
                    </span>
                  </div>
                ) : (
                  <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '14px 18px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '1px' }}>
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="8" x2="12" y2="12"></line>
                      <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    <span style={{ fontSize: '13px', color: '#1d4ed8', fontWeight: '500', lineHeight: '1.5' }}>
                      Setelah diterbitkan, SOP masih bisa diedit kembali <strong>selama belum ada karyawan yang menontonnya</strong>.
                    </span>
                  </div>
                )}
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
                  onClick={() => handleConfirmPublish(false)}
                >
                  {(isEditMode && !editVideo?.isDraft) ? 'Simpan Perubahan' : 'Terbitkan Sekarang'}
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
