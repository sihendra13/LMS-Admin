import React, { useState, useRef } from 'react';
import { useTenant } from '../context/TenantContext';
import { canUploadSOP } from '../utils/featureGates';
import { supabase } from '../utils/supabase';

export const SOPManager = () => {
  const { tenant, videos, setActivePage, currentUser, deleteSOP, archiveSOP, unarchiveSOP, updateSOP } = useTenant();
  const isSupervisor = currentUser.role !== 'admin';

  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, video: null });
  const [showArchived, setShowArchived] = useState(false);

  // --- Edit Narasi Modal state ---
  const [editVideo, setEditVideo] = useState(null);
  const [editMode, setEditMode] = useState('none');
  const [editSlideNarasi, setEditSlideNarasi] = useState([]);
  const [saving, setSaving] = useState(false);
  const [recordingSlide, setRecordingSlide] = useState(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef(null);
  const recordingTimerRef = useRef(null);
  const chunksRef = useRef([]);

  const openEditNarasi = (video) => {
    const count = video.slideImages?.length || video.slideCount || 0;
    const existing = video.slideNarasi || [];
    const slides = Array.from({ length: count }, (_, i) => ({
      teks: existing[i]?.teks || '',
      audioFile: null,
      audioUrl: existing[i]?.audioUrl || null,
      audioInputMode: existing[i]?.audioUrl ? 'upload' : 'upload',
    }));
    setEditVideo(video);
    setEditMode(video.narasiMode || 'none');
    setEditSlideNarasi(slides);
  };

  const closeEditNarasi = () => {
    stopRecording();
    setEditVideo(null);
    setEditMode('none');
    setEditSlideNarasi([]);
  };

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
        setEditSlideNarasi(prev => {
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
    clearInterval(recordingTimerRef.current);
  };

  const saveNarasi = async () => {
    if (!editVideo) return;
    setSaving(true);
    try {
      const sopId = editVideo.id;
      const updatedSlides = await Promise.all(
        editSlideNarasi.map(async (s, i) => {
          if (s.audioFile) {
            const ext = s.audioFile.name.split('.').pop();
            const path = `narasi/${sopId}/slide-${i + 1}.${ext}`;
            await supabase.storage.from('narasi').upload(path, s.audioFile, { upsert: true });
            const { data } = supabase.storage.from('narasi').getPublicUrl(path);
            return { teks: s.teks, audioUrl: data.publicUrl };
          }
          return { teks: s.teks, audioUrl: s.audioUrl };
        })
      );
      updateSOP(sopId, {
        narasiMode: editMode,
        slideNarasi: editMode === 'none' ? [] : updatedSlides,
      });
      closeEditNarasi();
    } catch (err) {
      alert('Gagal menyimpan narasi: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const activeVideos = videos.filter(v => !v.archived);
  const archivedVideos = videos.filter(v => v.archived);

  return (
    <div className="content">
      <div className="section-header" style={{ marginBottom: '20px' }}>
        <div className="section-title">Semua Video Training & SOP ({activeVideos.length})</div>
        {isSupervisor ? (
          <button
            className="btn-primary"
            style={{ opacity: 0.6, cursor: 'not-allowed', background: '#cbd5e1', border: '1px solid #cbd5e1', color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            disabled
            title="Hanya HRD Admin yang dapat mengunggah video training baru"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#64748b' }}>
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Upload Training / SOP (🔒 Khusus HRD)
          </button>
        ) : canUploadSOP(tenant.plan) ? (
          <button className="btn-primary" onClick={() => setActivePage('upload')} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#ffffff' }}>
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            + Upload Training / SOP Baru
          </button>
        ) : (
          <button className="btn-primary" style={{ opacity: 0.6, display: 'inline-flex', alignItems: 'center', gap: '8px' }} onClick={() => setActivePage('upload')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#ffffff' }}>
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Upload Mandiri (🔒 Starter)
          </button>
        )}
      </div>

      {/* ACTIVE VIDEOS */}
      <div className="card">
        <div className="card-body">
          {activeVideos.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text3)' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>📂</div>
              <p style={{ fontSize: '13px' }}>Belum ada video SOP yang aktif.</p>
            </div>
          )}
          {activeVideos.map((video) => (
            <div key={video.id} className="video-item" style={{ padding: '18px 20px' }}>
              <div className="thumb" style={{ background: video.color, width: '100px', height: '60px' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" width="24" height="24">
                  <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>
                </svg>
                <div className="play-over">
                  <svg viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                </div>
              </div>
              <div className="video-info">
                <div className="video-title" style={{ fontSize: '15px', fontWeight: '600' }}>{video.title}</div>
                <div className="video-meta" style={{ marginTop: '4px' }}>
                  <span className={`dept-tag ${video.tagClass}`}>{video.dept}</span>
                  <span className="video-dur" style={{ marginLeft: '10px' }}>
                    {video.type === 'ppt' ? `${video.slideCount || video.slideImages?.length || '?'} slide` : `Durasi: ${video.duration}`}
                  </span>
                  {video.type === 'ppt' && video.narasiMode && video.narasiMode !== 'none' && (
                    <span style={{ fontSize: '11px', color: '#7c3aed', marginLeft: '10px', fontWeight: '600' }}>
                      🎙️ Narasi: {video.narasiMode}
                    </span>
                  )}
                  <span style={{ fontSize: '11px', color: 'var(--text3)', marginLeft: '15px' }}>Dilihat oleh: {video.views} karyawan</span>
                </div>
                <div className="prog-wrap" style={{ marginTop: '8px', width: '60%' }}>
                  <div className="prog-bar">
                    <div className="prog-fill" style={{ width: `${video.progress}%`, background: 'var(--accent)' }}></div>
                  </div>
                  <div className="prog-pct">{video.progress}% Selesai</div>
                </div>
              </div>

              {/* ACTION BUTTONS */}
              {!isSupervisor && (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginLeft: '16px', flexShrink: 0 }}>
                  {/* Edit Narasi — hanya untuk PPT */}
                  {video.type === 'ppt' && (video.slideImages?.length > 0 || video.slideCount > 0) && (
                    <button
                      type="button"
                      onClick={() => openEditNarasi(video)}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: '600',
                        border: '1px solid #ddd6fe', background: '#f5f3ff', color: '#7c3aed',
                        cursor: 'pointer',
                      }}
                    >
                      🎙️ Edit Narasi
                    </button>
                  )}
                  {video.views === 0 ? (
                    <button
                      type="button"
                      onClick={() => setDeleteConfirm({ isOpen: true, video })}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: '600',
                        border: '1px solid #fecaca', background: '#fff5f5', color: '#ef4444',
                        cursor: 'pointer',
                      }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                      </svg>
                      Hapus
                    </button>
                  ) : video.progress === 100 ? (
                    <button
                      type="button"
                      onClick={() => archiveSOP(video.id)}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: '600',
                        border: '1px solid #fed7aa', background: '#fff7ed', color: '#c2410c',
                        cursor: 'pointer',
                      }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/>
                      </svg>
                      Arsipkan
                    </button>
                  ) : null}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ARCHIVED SECTION */}
      {archivedVideos.length > 0 && (
        <div style={{ marginTop: '24px' }}>
          <button
            type="button"
            onClick={() => setShowArchived(p => !p)}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none',
              cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: 'var(--text3)', marginBottom: '12px', padding: '0'
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: showArchived ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>
              <polyline points="9 18 15 12 9 6"/>
            </svg>
            Arsip ({archivedVideos.length} video)
          </button>

          {showArchived && (
            <div className="card">
              <div className="card-body">
                {archivedVideos.map((video) => (
                  <div key={video.id} className="video-item" style={{ padding: '18px 20px', opacity: 0.6 }}>
                    <div className="thumb" style={{ background: '#94a3b8', width: '100px', height: '60px' }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" width="24" height="24">
                        <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>
                      </svg>
                    </div>
                    <div className="video-info">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <div className="video-title" style={{ fontSize: '15px', fontWeight: '600' }}>{video.title}</div>
                        <span style={{ fontSize: '10px', fontWeight: '700', padding: '2px 7px', borderRadius: '4px', background: '#f1f5f9', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Diarsipkan</span>
                      </div>
                      <div className="video-meta">
                        <span className={`dept-tag ${video.tagClass}`}>{video.dept}</span>
                        <span className="video-dur" style={{ marginLeft: '10px' }}>Durasi: {video.duration}</span>
                        <span style={{ fontSize: '11px', color: 'var(--text3)', marginLeft: '15px' }}>Dilihat oleh: {video.views} karyawan</span>
                      </div>
                    </div>
                    {!isSupervisor && (
                      <button
                        type="button"
                        onClick={() => unarchiveSOP(video.id)}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: '6px',
                          padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: '600',
                          border: '1px solid var(--border)', background: '#ffffff', color: 'var(--text2)',
                          cursor: 'pointer', marginLeft: '16px', flexShrink: 0
                        }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                          <path d="M3 3v5h5"/>
                        </svg>
                        Pulihkan
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* DELETE CONFIRM MODAL */}
      {deleteConfirm.isOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999
        }} onClick={() => setDeleteConfirm({ isOpen: false, video: null })}>
          <div className="card" style={{
            width: '420px', maxWidth: '95vw', background: '#ffffff', padding: '28px',
            borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', textAlign: 'center'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text1)', marginBottom: '8px' }}>Hapus Video Permanen?</h3>
            <p style={{ fontSize: '13px', color: 'var(--text2)', marginBottom: '6px', lineHeight: '1.5' }}>Anda akan menghapus:</p>
            <p style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text1)', marginBottom: '16px', padding: '8px 16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid var(--border)' }}>
              "{deleteConfirm.video?.title}"
            </p>
            <p style={{ fontSize: '12px', color: '#ef4444', marginBottom: '24px', lineHeight: '1.5' }}>
              Tindakan ini tidak dapat dibatalkan. File video di storage akan ikut terhapus.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                className="form-input"
                style={{ cursor: 'pointer', padding: '10px 0', flex: 1, margin: 0, fontWeight: '600', fontSize: '13px' }}
                onClick={() => setDeleteConfirm({ isOpen: false, video: null })}
              >
                Batal
              </button>
              <button
                type="button"
                style={{
                  flex: 1, padding: '10px 0', borderRadius: '8px', fontSize: '13px', fontWeight: '700',
                  background: '#ef4444', border: '1px solid #ef4444', color: '#ffffff', cursor: 'pointer'
                }}
                onClick={() => {
                  deleteSOP(deleteConfirm.video.id);
                  setDeleteConfirm({ isOpen: false, video: null });
                }}
              >
                Ya, Hapus Permanen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT NARASI MODAL */}
      {editVideo && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
          zIndex: 9999, overflowY: 'auto', padding: '24px 16px'
        }} onClick={closeEditNarasi}>
          <div style={{
            width: '640px', maxWidth: '100%', background: '#ffffff',
            borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)',
            overflow: 'hidden', margin: 'auto'
          }} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text1)' }}>🎙️ Edit Narasi</div>
                <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '2px' }}>{editVideo.title} · {editSlideNarasi.length} slide</div>
              </div>
              <button type="button" onClick={closeEditNarasi} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: '20px', lineHeight: 1, padding: '4px' }}>✕</button>
            </div>

            {/* Body */}
            <div style={{ padding: '20px 24px', maxHeight: '70vh', overflowY: 'auto' }}>
              {/* Mode selector */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text3)', display: 'block', marginBottom: '10px', letterSpacing: '0.05em' }}>MODE NARASI</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {[
                    { val: 'none', label: 'Tidak Ada' },
                    { val: 'teks', label: 'Teks Saja' },
                    { val: 'audio', label: 'Audio Saja' },
                    { val: 'keduanya', label: 'Teks + Audio' },
                  ].map(opt => (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => setEditMode(opt.val)}
                      style={{
                        padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                        border: editMode === opt.val ? '2px solid #2F7BFF' : '1px solid var(--border)',
                        background: editMode === opt.val ? '#eff6ff' : '#fff',
                        color: editMode === opt.val ? '#1d4ed8' : 'var(--text2)',
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Per-slide input */}
              {editMode !== 'none' && editSlideNarasi.map((s, i) => (
                <div key={i} style={{ marginBottom: '16px', padding: '14px 16px', border: '1px solid var(--border)', borderRadius: '10px', background: '#fafafa' }}>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text3)', marginBottom: '10px' }}>SLIDE {i + 1}</div>

                  {/* Teks */}
                  {(editMode === 'teks' || editMode === 'keduanya') && (
                    <div style={{ marginBottom: '10px' }}>
                      <textarea
                        rows={2}
                        placeholder={`Ketik penjelasan untuk slide ${i + 1}...`}
                        value={s.teks}
                        onChange={e => setEditSlideNarasi(prev => {
                          const u = [...prev]; u[i] = { ...u[i], teks: e.target.value }; return u;
                        })}
                        style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '13px', resize: 'vertical', fontFamily: 'inherit', color: 'var(--text1)', boxSizing: 'border-box' }}
                      />
                    </div>
                  )}

                  {/* Audio */}
                  {(editMode === 'audio' || editMode === 'keduanya') && (
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text3)', display: 'block', marginBottom: '6px' }}>AUDIO NARASI</label>
                      {/* Toggle mode */}
                      <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                        {['upload', 'rekam'].map(m => (
                          <button key={m} type="button"
                            onClick={() => setEditSlideNarasi(prev => { const u = [...prev]; u[i] = { ...u[i], audioInputMode: m, audioFile: null }; return u; })}
                            style={{ padding: '4px 12px', fontSize: '12px', fontWeight: '600', borderRadius: '6px', cursor: 'pointer',
                              border: s.audioInputMode === m ? '1.5px solid #4f46e5' : '1px solid var(--border)',
                              background: s.audioInputMode === m ? '#ede9fe' : '#f8fafc',
                              color: s.audioInputMode === m ? '#4f46e5' : 'var(--text2)' }}
                          >
                            {m === 'upload' ? '📁 Upload' : '🎙️ Rekam'}
                          </button>
                        ))}
                      </div>

                      {/* Upload */}
                      {s.audioInputMode === 'upload' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                          <input type="file" accept="audio/*" id={`en-audio-${i}`} style={{ display: 'none' }}
                            onChange={e => {
                              const file = e.target.files[0]; if (!file) return;
                              setEditSlideNarasi(prev => { const u = [...prev]; u[i] = { ...u[i], audioFile: file, audioUrl: null }; return u; });
                            }}
                          />
                          <label htmlFor={`en-audio-${i}`} style={{ padding: '5px 12px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', background: '#f8fafc', color: 'var(--text2)', fontWeight: '600' }}>
                            📁 Pilih File
                          </label>
                          {s.audioFile ? (
                            <span style={{ fontSize: '12px', color: '#15803d', fontWeight: '600' }}>✓ {s.audioFile.name}
                              <button type="button" onClick={() => setEditSlideNarasi(prev => { const u = [...prev]; u[i] = { ...u[i], audioFile: null }; return u; })}
                                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', marginLeft: '6px', fontSize: '12px' }}>✕</button>
                            </span>
                          ) : s.audioUrl ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <audio controls src={s.audioUrl} style={{ height: '32px' }} />
                              <button type="button" onClick={() => setEditSlideNarasi(prev => { const u = [...prev]; u[i] = { ...u[i], audioUrl: null }; return u; })}
                                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '12px' }}>🗑 Hapus</button>
                            </div>
                          ) : (
                            <span style={{ fontSize: '12px', color: 'var(--text3)' }}>Belum ada audio</span>
                          )}
                        </div>
                      )}

                      {/* Rekam */}
                      {s.audioInputMode === 'rekam' && (
                        <div>
                          {recordingSlide === i ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <span style={{ fontSize: '13px', color: '#dc2626', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#dc2626', display: 'inline-block' }} />
                                Merekam...
                              </span>
                              <span style={{ fontSize: '13px', fontWeight: '700', fontVariantNumeric: 'tabular-nums' }}>
                                {String(Math.floor(recordingSeconds / 60)).padStart(2, '0')}:{String(recordingSeconds % 60).padStart(2, '0')}
                              </span>
                              <button type="button" onClick={stopRecording}
                                style={{ padding: '5px 12px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                                ⏹ Stop
                              </button>
                            </div>
                          ) : s.audioFile ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <audio controls src={URL.createObjectURL(s.audioFile)} style={{ width: '100%', height: '32px' }} />
                              <div style={{ display: 'flex', gap: '10px' }}>
                                <button type="button" onClick={() => setEditSlideNarasi(prev => { const u = [...prev]; u[i] = { ...u[i], audioFile: null }; return u; })}
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
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Footer */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button type="button" onClick={closeEditNarasi}
                style={{ padding: '9px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', border: '1px solid var(--border)', background: '#fff', color: 'var(--text2)', cursor: 'pointer' }}>
                Batal
              </button>
              <button type="button" onClick={saveNarasi} disabled={saving}
                style={{ padding: '9px 24px', borderRadius: '8px', fontSize: '13px', fontWeight: '700', border: 'none', background: saving ? '#94a3b8' : '#7c3aed', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer' }}>
                {saving ? 'Menyimpan...' : '💾 Simpan Narasi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
