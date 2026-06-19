import React, { useState, useRef, useEffect } from 'react';
import { useTenant } from '../context/TenantContext';
import { supabase } from '../utils/supabase';

const DEPT_OPTIONS = ['Sales', 'HRD', 'Operasional', 'Finance', 'CS', 'IT'];
const BACKEND_URL = 'https://axara-lms-backend.onrender.com';

const deptColors = { Sales: '#1e3a5f', HRD: '#1a3d2b', Operasional: '#3d2200', Finance: '#2d1a4a', CS: '#072a30', IT: '#2a1024' };
const deptClasses = { Sales: 'dt-sales', HRD: 'dt-hrd', Operasional: 'dt-ops', Finance: 'dt-fin', CS: 'dt-cs', IT: 'dt-it' };

const toEditQuiz = (q) => ({
  question: q.question || '',
  type: q.type || 'multiple',
  options: q.options?.length ? [...q.options] : ['', '', '', ''],
  answer: q.answer || 'A',
  triggerMin: String(Math.floor((q.triggerTime || 0) / 60)),
  triggerSec: String((q.triggerTime || 0) % 60),
});

const toEditTriggerQuiz = (q) => ({
  question: q.question || '',
  type: 'multiple',
  options: q.options?.length ? [...q.options] : ['', '', '', ''],
  answer: q.answer || 'A',
  triggerSlide: String(q.triggerSlide || 2),
});

const emptyQuiz = () => ({ question: '', type: 'multiple', options: ['', '', '', ''], answer: 'A', triggerMin: '0', triggerSec: '0' });
const emptyTrigger = () => ({ question: '', type: 'multiple', options: ['', '', '', ''], answer: 'A', triggerSlide: '2' });

export const EditSOP = () => {
  const { videos, updateSOP, setActivePage, editingVideoId, setEditingVideoId } = useTenant();
  const video = videos.find(v => v.id === editingVideoId);
  const isPpt = video?.type === 'ppt';

  // Metadata
  const [title, setTitle] = useState(video?.title || '');
  const [dept, setDept] = useState(video?.dept || 'Sales');
  const [duration, setDuration] = useState(video?.duration || '5:00');

  // Kuis
  const [preQuestions, setPreQuestions] = useState(() =>
    video?.preQuizzes?.length ? video.preQuizzes.map(toEditQuiz) : [emptyQuiz(), emptyQuiz()]
  );
  const [postQuestions, setPostQuestions] = useState(() =>
    video?.postQuizzes?.length ? video.postQuizzes.map(toEditQuiz) : [emptyQuiz(), emptyQuiz()]
  );
  const [triggerQuizzes, setTriggerQuizzes] = useState(() =>
    video?.triggerQuizzes?.length ? video.triggerQuizzes.map(toEditTriggerQuiz) : [emptyTrigger()]
  );

  // Narasi
  const [narasiMode, setNarasiMode] = useState(video?.narasiMode || 'none');
  const [slideNarasi, setSlideNarasi] = useState(() => {
    const count = video?.slideImages?.length || video?.slideCount || 0;
    const existing = video?.slideNarasi || [];
    return Array.from({ length: count }, (_, i) => ({
      teks: existing[i]?.teks || '',
      audioFile: null,
      audioUrl: existing[i]?.audioUrl || null,
      audioInputMode: 'upload',
    }));
  });

  // Ganti File
  const [newFile, setNewFile] = useState(null);
  const [converting, setConverting] = useState(false);
  const [convertProgress, setConvertProgress] = useState(0);

  // Recording
  const [recordingSlide, setRecordingSlide] = useState(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef(null);
  const recordingTimerRef = useRef(null);
  const chunksRef = useRef([]);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!video) setActivePage('sop');
  }, [video]);

  if (!video) return null;

  // --- Helpers ---
  const toSecs = (q) => Number(q.triggerMin || 0) * 60 + Number(q.triggerSec || 0);

  const updateQuiz = (setter, idx, field, value) => setter(prev => {
    const u = [...prev]; u[idx] = { ...u[idx], [field]: value }; return u;
  });
  const updateOption = (setter, qIdx, oIdx, value) => setter(prev => {
    const u = [...prev]; const opts = [...u[qIdx].options]; opts[oIdx] = value;
    u[qIdx] = { ...u[qIdx], options: opts }; return u;
  });

  // --- Recording ---
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
        setSlideNarasi(prev => { const u = [...prev]; u[slideIdx] = { ...u[slideIdx], audioFile: file, audioUrl: null }; return u; });
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
      alert('Tidak bisa mengakses mikrofon.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state !== 'inactive') mediaRecorderRef.current?.stop();
    clearInterval(recordingTimerRef.current);
  };

  // --- Save ---
  const handleSave = async () => {
    if (!title.trim()) return alert('Judul tidak boleh kosong.');
    setSaving(true);
    try {
      const updates = {};

      // Metadata
      updates.title = title.trim();
      updates.dept = dept;
      updates.color = deptColors[dept] || '#1e3a5f';
      updates.tagClass = deptClasses[dept] || 'dt-sales';
      if (!isPpt) updates.duration = duration;

      // Kuis
      const toSavedQuiz = (q, idx) => ({
        id: idx + 1,
        question: q.question,
        type: q.type,
        options: q.type === 'multiple' ? q.options.map((o, i) => o.trim() || `Opsi ${String.fromCharCode(65 + i)}`) : [],
        answer: q.type === 'multiple' ? q.answer : '',
        triggerTime: toSecs(q),
      });
      updates.preQuizzes = preQuestions.filter(q => q.question.trim()).map(toSavedQuiz);
      updates.postQuizzes = postQuestions.filter(q => q.question.trim()).map(toSavedQuiz);

      if (isPpt) {
        const filledTriggers = triggerQuizzes.filter(q => q.question.trim() !== '');
        for (let i = 1; i < filledTriggers.length; i++) {
          if (Number(filledTriggers[i].triggerSlide) <= Number(filledTriggers[i - 1].triggerSlide)) {
            setSaving(false);
            return alert(`Kuis Pemicu #${i + 1}: nomor slide harus lebih besar dari sebelumnya (slide ${filledTriggers[i - 1].triggerSlide}).`);
          }
        }
        updates.triggerQuizzes = filledTriggers.map((q, idx) => ({
          id: idx + 1, question: q.question, type: 'multiple',
          triggerSlide: Number(q.triggerSlide),
          options: q.options.map((o, i) => o.trim() || `Opsi ${String.fromCharCode(65 + i)}`),
          answer: q.answer,
        }));

        // Narasi audio upload
        const updatedSlides = await Promise.all(slideNarasi.map(async (s, i) => {
          if (s.audioFile) {
            const ext = s.audioFile.name.split('.').pop();
            const path = `narasi/${video.id}/slide-${i + 1}.${ext}`;
            await supabase.storage.from('narasi').upload(path, s.audioFile, { upsert: true });
            const { data } = supabase.storage.from('narasi').getPublicUrl(path);
            return { teks: s.teks, audioUrl: data.publicUrl };
          }
          return { teks: s.teks, audioUrl: s.audioUrl };
        }));
        updates.narasiMode = narasiMode;
        updates.slideNarasi = narasiMode === 'none' ? [] : updatedSlides;
      }

      // Ganti File
      if (newFile) {
        if (isPpt) {
          setConverting(true);
          setConvertProgress(10);
          const prog = setInterval(() => setConvertProgress(p => p < 85 ? p + 3 : p), 800);
          const formData = new FormData();
          formData.append('file', newFile);
          const resp = await fetch(`${BACKEND_URL}/api/v1/ppt/convert`, { method: 'POST', body: formData });
          clearInterval(prog);
          setConverting(false);
          if (!resp.ok) {
            setSaving(false);
            return alert('Gagal konversi PPT baru.');
          }
          const result = await resp.json();
          updates.slideImages = result.slideUrls;
          updates.slideCount = result.slideCount;
          updates.duration = `${result.slideCount} slide`;
          // Reset narasi slides jika jumlah slide berubah
          if (result.slideCount !== slideNarasi.length) {
            updates.slideNarasi = Array.from({ length: result.slideCount }, (_, i) => ({
              teks: slideNarasi[i]?.teks || '',
              audioUrl: slideNarasi[i]?.audioUrl || null,
            }));
          }
        } else {
          // Video: upload ke Supabase
          const ext = newFile.name.split('.').pop();
          const filePath = `videos/${video.id}.${ext}`;
          await supabase.storage.from('videos').upload(filePath, newFile, { upsert: true });
          const { data } = supabase.storage.from('videos').getPublicUrl(filePath);
          updates.videoUrl = data.publicUrl;
          updates.filePath = filePath;
        }
      }

      updateSOP(video.id, updates);
      setEditingVideoId(null);
      setActivePage('sop');
    } catch (err) {
      alert('Gagal menyimpan: ' + err.message);
    } finally {
      setSaving(false);
      setConverting(false);
    }
  };

  const QuizEditor = ({ questions, setQuestions, label, colorClass }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text2)', paddingBottom: '8px', borderBottom: '1px solid var(--border)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </div>
      {questions.map((q, idx) => (
        <div key={idx} className="card" style={{ border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: colorClass, letterSpacing: '0.05em' }}>Pertanyaan #{idx + 1}</span>
            {questions.length > 1 && (
              <button type="button" onClick={() => setQuestions(prev => prev.filter((_, i) => i !== idx))}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '18px', lineHeight: 1 }}>×</button>
            )}
          </div>
          <div style={{ padding: '16px' }}>
            <textarea rows={2} className="form-input"
              style={{ fontFamily: 'inherit', resize: 'vertical', fontSize: '13px', marginBottom: '12px', width: '100%', boxSizing: 'border-box' }}
              placeholder="Teks pertanyaan..."
              value={q.question}
              onChange={e => updateQuiz(setQuestions, idx, 'question', e.target.value)}
            />
            {/* Trigger time — video only */}
            {!isPpt && (
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text3)' }}>PEMICU (menit:detik):</span>
                <input type="number" min="0" className="form-input" style={{ width: '64px', padding: '6px 10px', textAlign: 'center' }}
                  placeholder="0" value={q.triggerMin} onChange={e => updateQuiz(setQuestions, idx, 'triggerMin', e.target.value)} />
                <span style={{ color: 'var(--text3)' }}>:</span>
                <input type="number" min="0" max="59" className="form-input" style={{ width: '64px', padding: '6px 10px', textAlign: 'center' }}
                  placeholder="0" value={q.triggerSec} onChange={e => updateQuiz(setQuestions, idx, 'triggerSec', e.target.value)} />
                {idx > 0 && toSecs(q) <= toSecs(questions[idx - 1]) && (
                  <span style={{ fontSize: '11px', color: '#b91c1c' }}>⚠️ Harus lebih besar dari soal #{idx}</span>
                )}
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {q.options.map((opt, oIdx) => {
                const letter = String.fromCharCode(65 + oIdx);
                const isCorrect = q.answer === letter;
                return (
                  <div key={oIdx} className={`option-pill ${isCorrect ? 'correct' : ''}`}
                    onClick={() => updateQuiz(setQuestions, idx, 'answer', letter)}>
                    <div className="option-circle">{isCorrect && <span className="option-checkmark">✓</span>}</div>
                    <input type="text" className="option-input"
                      style={{ background: 'none', border: 'none', width: '100%', outline: 'none', fontSize: '13px', color: isCorrect ? '#1d4ed8' : 'var(--text1)' }}
                      placeholder={`Opsi ${letter}`}
                      value={opt}
                      onChange={e => updateOption(setQuestions, idx, oIdx, e.target.value)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ))}
      <button type="button" onClick={() => setQuestions(prev => [...prev, emptyQuiz()])}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', border: '1.5px dashed var(--border)', borderRadius: '8px', background: '#fff', color: 'var(--text3)', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
        + Tambah Pertanyaan
      </button>
    </div>
  );

  return (
    <div className="content" style={{ maxWidth: '900px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <button type="button" onClick={() => { setEditingVideoId(null); setActivePage('sop'); }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', padding: 0 }}>
          ← Kembali
        </button>
        <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text1)' }}>
          ✏️ Edit SOP — {video.title}
        </div>
        {video.views > 0 && (
          <span style={{ fontSize: '11px', background: '#fef3c7', color: '#b45309', padding: '3px 10px', borderRadius: '20px', fontWeight: '700' }}>
            🔒 Sudah ditonton {video.views}x — terkunci
          </span>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* SECTION 1: METADATA */}
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text2)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            📋 Informasi Umum
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: isPpt ? '1fr 1fr' : '2fr 1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Judul SOP</label>
              <input type="text" className="form-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Judul SOP..." />
            </div>
            <div className="form-group">
              <label className="form-label">Departemen</label>
              <select className="form-select" value={dept} onChange={e => setDept(e.target.value)}>
                {DEPT_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            {!isPpt && (
              <div className="form-group">
                <label className="form-label">Durasi</label>
                <input type="text" className="form-input" value={duration} onChange={e => setDuration(e.target.value)} placeholder="5:00" />
              </div>
            )}
          </div>
        </div>

        {/* SECTION 2: KUIS */}
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text2)', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            ✍️ Soal Kuis
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <QuizEditor questions={preQuestions} setQuestions={setPreQuestions} label="Pre-Test" colorClass="#1d4ed8" />
            <QuizEditor questions={postQuestions} setQuestions={setPostQuestions} label="Post-Test" colorClass="#15803d" />
          </div>
        </div>

        {/* SECTION 3: KUIS PEMICU (PPT only) */}
        {isPpt && (
          <div className="card" style={{ padding: '24px' }}>
            <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text2)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              ⚡ Kuis Pemicu Slide
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {triggerQuizzes.map((q, idx) => (
                <div key={idx} className="card" style={{ border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fffbeb', padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#b45309' }}>Kuis Pemicu #{idx + 1}</span>
                    {triggerQuizzes.length > 1 && (
                      <button type="button" onClick={() => setTriggerQuizzes(prev => prev.filter((_, i) => i !== idx))}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '18px' }}>×</button>
                    )}
                  </div>
                  <div style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text3)', whiteSpace: 'nowrap' }}>MUNCUL DI SLIDE:</span>
                      <input type="number" min="1" className="form-input" style={{ width: '72px', padding: '6px 10px', textAlign: 'center' }}
                        value={q.triggerSlide}
                        onChange={e => updateQuiz(setTriggerQuizzes, idx, 'triggerSlide', e.target.value)} />
                    </div>
                    <textarea rows={2} className="form-input"
                      style={{ fontFamily: 'inherit', resize: 'vertical', fontSize: '13px', marginBottom: '10px', width: '100%', boxSizing: 'border-box' }}
                      placeholder="Teks pertanyaan..."
                      value={q.question}
                      onChange={e => updateQuiz(setTriggerQuizzes, idx, 'question', e.target.value)}
                    />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      {q.options.map((opt, oIdx) => {
                        const letter = String.fromCharCode(65 + oIdx);
                        const isCorrect = q.answer === letter;
                        return (
                          <div key={oIdx} className={`option-pill ${isCorrect ? 'correct' : ''}`}
                            onClick={() => updateQuiz(setTriggerQuizzes, idx, 'answer', letter)}>
                            <div className="option-circle">{isCorrect && <span className="option-checkmark">✓</span>}</div>
                            <input type="text" className="option-input"
                              style={{ background: 'none', border: 'none', width: '100%', outline: 'none', fontSize: '13px', color: isCorrect ? '#1d4ed8' : 'var(--text1)' }}
                              placeholder={`Opsi ${letter}`} value={opt}
                              onChange={e => updateOption(setTriggerQuizzes, idx, oIdx, e.target.value)} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
              <button type="button" onClick={() => setTriggerQuizzes(prev => [...prev, emptyTrigger()])}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', border: '1.5px dashed var(--border)', borderRadius: '8px', background: '#fff', color: 'var(--text3)', cursor: 'pointer', fontSize: '13px', fontWeight: '600', alignSelf: 'flex-start' }}>
                + Tambah Kuis Pemicu
              </button>
            </div>
          </div>
        )}

        {/* SECTION 4: NARASI (PPT only) */}
        {isPpt && slideNarasi.length > 0 && (
          <div className="card" style={{ padding: '24px' }}>
            <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text2)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              🎙️ Narasi per Slide
            </div>
            {/* Mode selector */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
              {[{ val: 'none', label: 'Tidak Ada' }, { val: 'teks', label: 'Teks Saja' }, { val: 'audio', label: 'Audio Saja' }, { val: 'keduanya', label: 'Teks + Audio' }].map(opt => (
                <button key={opt.val} type="button" onClick={() => setNarasiMode(opt.val)}
                  style={{ padding: '7px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                    border: narasiMode === opt.val ? '2px solid #2F7BFF' : '1px solid var(--border)',
                    background: narasiMode === opt.val ? '#eff6ff' : '#fff',
                    color: narasiMode === opt.val ? '#1d4ed8' : 'var(--text2)' }}>
                  {opt.label}
                </button>
              ))}
            </div>
            {narasiMode !== 'none' && slideNarasi.map((s, i) => (
              <div key={i} style={{ marginBottom: '12px', padding: '14px 16px', border: '1px solid var(--border)', borderRadius: '10px', background: '#fafafa' }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text3)', marginBottom: '10px' }}>SLIDE {i + 1}</div>
                {(narasiMode === 'teks' || narasiMode === 'keduanya') && (
                  <textarea rows={2} placeholder={`Teks narasi slide ${i + 1}...`} value={s.teks}
                    onChange={e => setSlideNarasi(prev => { const u = [...prev]; u[i] = { ...u[i], teks: e.target.value }; return u; })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '13px', resize: 'vertical', fontFamily: 'inherit', marginBottom: '8px', boxSizing: 'border-box' }} />
                )}
                {(narasiMode === 'audio' || narasiMode === 'keduanya') && (
                  <div>
                    <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                      {['upload', 'rekam'].map(m => (
                        <button key={m} type="button"
                          onClick={() => setSlideNarasi(prev => { const u = [...prev]; u[i] = { ...u[i], audioInputMode: m, audioFile: null }; return u; })}
                          style={{ padding: '4px 12px', fontSize: '12px', fontWeight: '600', borderRadius: '6px', cursor: 'pointer',
                            border: s.audioInputMode === m ? '1.5px solid #4f46e5' : '1px solid var(--border)',
                            background: s.audioInputMode === m ? '#ede9fe' : '#f8fafc',
                            color: s.audioInputMode === m ? '#4f46e5' : 'var(--text2)' }}>
                          {m === 'upload' ? '📁 Upload' : '🎙️ Rekam'}
                        </button>
                      ))}
                    </div>
                    {s.audioInputMode === 'upload' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <input type="file" accept="audio/*" id={`es-audio-${i}`} style={{ display: 'none' }}
                          onChange={e => { const f = e.target.files[0]; if (!f) return; setSlideNarasi(prev => { const u = [...prev]; u[i] = { ...u[i], audioFile: f, audioUrl: null }; return u; }); }} />
                        <label htmlFor={`es-audio-${i}`} style={{ padding: '5px 12px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', background: '#f8fafc', color: 'var(--text2)', fontWeight: '600' }}>📁 Pilih File</label>
                        {s.audioFile ? (
                          <span style={{ fontSize: '12px', color: '#15803d', fontWeight: '600' }}>✓ {s.audioFile.name}
                            <button type="button" onClick={() => setSlideNarasi(prev => { const u = [...prev]; u[i] = { ...u[i], audioFile: null }; return u; })}
                              style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', marginLeft: '6px' }}>✕</button>
                          </span>
                        ) : s.audioUrl ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <audio controls src={s.audioUrl} style={{ height: '32px' }} />
                            <button type="button" onClick={() => setSlideNarasi(prev => { const u = [...prev]; u[i] = { ...u[i], audioUrl: null }; return u; })}
                              style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '12px' }}>🗑 Hapus</button>
                          </div>
                        ) : <span style={{ fontSize: '12px', color: 'var(--text3)' }}>Belum ada audio</span>}
                      </div>
                    )}
                    {s.audioInputMode === 'rekam' && (
                      recordingSlide === i ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontSize: '13px', color: '#dc2626', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#dc2626', display: 'inline-block' }} /> Merekam...
                          </span>
                          <span style={{ fontSize: '13px', fontWeight: '700', fontVariantNumeric: 'tabular-nums' }}>
                            {String(Math.floor(recordingSeconds / 60)).padStart(2, '0')}:{String(recordingSeconds % 60).padStart(2, '0')}
                          </span>
                          <button type="button" onClick={stopRecording}
                            style={{ padding: '5px 12px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>⏹ Stop</button>
                        </div>
                      ) : s.audioFile ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <audio controls src={URL.createObjectURL(s.audioFile)} style={{ width: '100%', height: '32px' }} />
                          <div style={{ display: 'flex', gap: '10px' }}>
                            <button type="button" onClick={() => setSlideNarasi(prev => { const u = [...prev]; u[i] = { ...u[i], audioFile: null }; return u; })}
                              style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '12px' }}>🗑 Hapus</button>
                            <button type="button" onClick={() => startRecording(i)}
                              style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '5px', color: 'var(--text2)', cursor: 'pointer', fontSize: '12px', padding: '2px 10px' }}>🔄 Rekam Ulang</button>
                          </div>
                        </div>
                      ) : (
                        <button type="button" onClick={() => startRecording(i)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                          ⏺ Mulai Rekam
                        </button>
                      )
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* SECTION 5: GANTI FILE */}
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text2)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            📂 Ganti File {isPpt ? 'PPT' : 'Video'}
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text3)', marginBottom: '14px' }}>
            Opsional. Biarkan kosong jika tidak ingin mengganti file.
            {isPpt && ' File PPT baru akan dikonversi ulang secara otomatis.'}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <input type="file" id="ganti-file" accept={isPpt ? '.ppt,.pptx' : 'video/*'} style={{ display: 'none' }}
              onChange={e => setNewFile(e.target.files[0] || null)} />
            <label htmlFor="ganti-file" style={{ padding: '8px 18px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', background: '#f8fafc', color: 'var(--text2)', fontWeight: '600' }}>
              📂 Pilih File Baru
            </label>
            {newFile && (
              <span style={{ fontSize: '13px', color: '#15803d', fontWeight: '600' }}>
                ✓ {newFile.name} ({(newFile.size / 1024 / 1024).toFixed(1)} MB)
                <button type="button" onClick={() => setNewFile(null)}
                  style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', marginLeft: '8px' }}>✕</button>
              </span>
            )}
            {converting && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '120px', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${convertProgress}%`, height: '100%', background: '#7c3aed', transition: 'width 0.3s' }} />
                </div>
                <span style={{ fontSize: '12px', color: 'var(--text3)' }}>Mengkonversi... {convertProgress}%</span>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* STICKY SAVE BAR */}
      <div style={{
        position: 'sticky', bottom: 0, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)',
        borderTop: '1px solid var(--border)', padding: '14px 0', marginTop: '24px',
        display: 'flex', justifyContent: 'flex-end', gap: '12px', zIndex: 10
      }}>
        <button type="button" onClick={() => { setEditingVideoId(null); setActivePage('sop'); }}
          style={{ padding: '10px 24px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', border: '1px solid var(--border)', background: '#fff', color: 'var(--text2)', cursor: 'pointer' }}>
          Batal
        </button>
        <button type="button" onClick={handleSave} disabled={saving || converting}
          style={{ padding: '10px 28px', borderRadius: '8px', fontSize: '13px', fontWeight: '700', border: 'none',
            background: saving || converting ? '#94a3b8' : '#2F7BFF', color: '#fff', cursor: saving || converting ? 'not-allowed' : 'pointer' }}>
          {saving ? 'Menyimpan...' : '💾 Simpan Perubahan'}
        </button>
      </div>
    </div>
  );
};
