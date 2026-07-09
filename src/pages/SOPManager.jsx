import React, { useState } from 'react';
import { useTenant } from '../context/TenantContext';
import { canUploadSOP } from '../utils/featureGates';

export const SOPManager = () => {
  const { tenant, videos, setActivePage, currentUser, deleteSOP, archiveSOP, unarchiveSOP, setEditingVideoId, employees, quizSubmissions, passingScore } = useTenant();
  const isSupervisor = currentUser.role !== 'admin';

  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, video: null });
  const [activeTab, setActiveTab] = useState('active');

  const openEdit = (video) => {
    setEditingVideoId(video.id);
    setActivePage('upload');
  };

  const activeVideos = videos.filter(v => !v.archived && !v.isDraft);
  const archivedVideos = videos.filter(v => v.archived);
  const draftVideos = videos.filter(v => v.isDraft && !v.archived);

  return (
    <div className="content">
      <div className="section-header" style={{ marginBottom: '20px' }}>
        <div className="section-title">Semua Video Training & SOP</div>
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
            Upload Training / SOP Baru
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

      {/* TABS */}
      <div style={{ display: 'flex', gap: '4px', borderBottom: '2px solid var(--border)', marginBottom: '16px' }}>
        <button onClick={() => setActiveTab('active')} style={{
          padding: '10px 16px', fontSize: '13px', fontWeight: '600', border: 'none', background: 'none',
          cursor: 'pointer', borderBottom: '2px solid transparent', marginBottom: '-2px', transition: 'all 0.15s',
          color: activeTab === 'active' ? 'var(--accent)' : 'var(--text3)',
          borderBottomColor: activeTab === 'active' ? 'var(--accent)' : 'transparent',
        }}>
          Aktif ({activeVideos.length})
        </button>
        <button onClick={() => setActiveTab('archived')} style={{
          padding: '10px 16px', fontSize: '13px', fontWeight: '600', border: 'none', background: 'none',
          cursor: 'pointer', borderBottom: '2px solid transparent', marginBottom: '-2px', transition: 'all 0.15s',
          color: activeTab === 'archived' ? 'var(--accent)' : 'var(--text3)',
          borderBottomColor: activeTab === 'archived' ? 'var(--accent)' : 'transparent',
        }}>
          Arsip ({archivedVideos.length})
        </button>
        <button onClick={() => setActiveTab('draft')} style={{
          padding: '10px 16px', fontSize: '13px', fontWeight: '600', border: 'none', background: 'none',
          cursor: 'pointer', borderBottom: '2px solid transparent', marginBottom: '-2px', transition: 'all 0.15s',
          color: activeTab === 'draft' ? 'var(--accent)' : 'var(--text3)',
          borderBottomColor: activeTab === 'draft' ? 'var(--accent)' : 'transparent',
        }}>
          Draf ({draftVideos.length})
        </button>
      </div>

      {/* TABS CONTENT */}
      <div className="card">
        <div className="card-body">
          {activeTab === 'draft' ? (
            draftVideos.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text3)' }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>📝</div>
                <p style={{ fontSize: '13px' }}>Belum ada video draf.</p>
              </div>
            ) : (
              draftVideos.map((video) => (
                <div key={video.id} className="video-item" style={{ padding: '18px 20px' }}>
                  <div className="thumb" style={{ background: video.color, width: '100px', height: '60px', opacity: 0.7 }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" width="24" height="24">
                      <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>
                    </svg>
                    <div className="play-over" style={{ background: 'rgba(0,0,0,0.6)' }}>
                      <span style={{ color: 'white', fontSize: '10px', fontWeight: 'bold' }}>DRAF</span>
                    </div>
                  </div>
                  <div className="video-info">
                    <div className="video-title" style={{ fontSize: '15px', fontWeight: '600' }}>{video.title}</div>
                    <div className="video-meta" style={{ marginTop: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span className={`dept-tag ${video.tagClass}`}>{video.dept}</span>
                        <span style={{ color: '#64748b', fontSize: '12px' }}>Belum dipublikasikan</span>
                      </div>
                    </div>
                  </div>
                  <div className="video-actions">
                    <button className="btn-sec" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => openEdit(video)}>
                      Lanjutkan Edit
                    </button>
                    {currentUser.role === 'admin' && (
                      <button className="btn-sec" style={{ padding: '6px 12px', fontSize: '12px', color: '#ef4444', borderColor: '#fca5a5' }} onClick={() => setDeleteConfirm({ isOpen: true, video })}>
                        Hapus
                      </button>
                    )}
                  </div>
                </div>
              ))
            )
          ) : activeTab === 'active' ? (
            activeVideos.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text3)' }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>📂</div>
                <p style={{ fontSize: '13px' }}>Belum ada video SOP yang aktif.</p>
              </div>
            ) : (
              activeVideos.map((video) => (
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
                    <div className="video-meta" style={{ marginTop: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span className={`dept-tag ${video.tagClass}`}>{video.dept}</span>
                        {video.type === 'ppt' ? (
                          <span style={{
                            fontSize: '11px',
                            fontWeight: '700',
                            background: '#f3f4f6',
                            color: '#4b5563',
                            border: '1px solid #e5e7eb',
                            padding: '1px 8px',
                            borderRadius: '4px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            marginLeft: '2px'
                          }}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#6b7280', flexShrink: 0 }}>
                              <line x1="18" y1="20" x2="18" y2="10" />
                              <line x1="12" y1="20" x2="12" y2="4" />
                              <line x1="6" y1="20" x2="6" y2="14" />
                            </svg>
                            {video.slideCount || video.slideImages?.length ? `${video.slideCount || video.slideImages?.length} slide` : (video.duration || '? slide')}
                          </span>
                        ) : (
                          <span style={{
                            fontSize: '11px',
                            fontWeight: '700',
                            background: '#f3f4f6',
                            color: '#4b5563',
                            border: '1px solid #e5e7eb',
                            padding: '1px 8px',
                            borderRadius: '4px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            marginLeft: '2px'
                          }}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#6b7280', flexShrink: 0 }}>
                              <circle cx="12" cy="12" r="10" />
                              <polyline points="12 6 12 12 16 14" />
                            </svg>
                            {video.duration}
                          </span>
                        )}
                        {video.type === 'ppt' && video.narasiMode && video.narasiMode !== 'none' && (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '11px',
                            fontWeight: '700',
                            color: '#7c3aed',
                            background: '#f5f3ff',
                            border: '1px solid #ddd6fe',
                            padding: '1px 8px',
                            borderRadius: '4px',
                            marginLeft: '2px'
                          }}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                              <line x1="12" y1="19" x2="12" y2="23"/>
                              <line x1="8" y1="23" x2="16" y2="23"/>
                            </svg>
                            Narasi: {video.narasiMode}
                          </span>
                        )}
                        {video.deadline && (() => {
                          const today = new Date(); today.setHours(0,0,0,0);
                          const dl = new Date(video.deadline);
                          const diff = Math.ceil((dl - today) / (1000 * 60 * 60 * 24));
                          const dateStr = dl.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
                          const label = diff < 0 ? `Deadline terlewat · ${dateStr}` : diff === 0 ? `Deadline hari ini · ${dateStr}` : `Deadline ${diff} hari lagi · ${dateStr}`;
                          const color = diff < 0 ? '#ef4444' : diff <= 3 ? '#d97706' : '#ea580c';
                          const bg = diff < 0 ? '#fef2f2' : diff <= 3 ? '#fffbeb' : '#fff7ed';
                          const borderCol = diff < 0 ? '#fecaca' : diff <= 3 ? '#fde68a' : '#fed7aa';
                          
                          let icon;
                          if (diff < 0) {
                            icon = (
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                                <line x1="12" y1="9" x2="12" y2="13"/>
                                <line x1="12" y1="17" x2="12.01" y2="17"/>
                              </svg>
                            );
                          } else {
                            icon = (
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                <circle cx="12" cy="12" r="10"/>
                                <polyline points="12 6 12 12 16 14"/>
                              </svg>
                            );
                          }
                          
                          return (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '11px',
                              fontWeight: '700',
                              color,
                              background: bg,
                              border: `1px solid ${borderCol}`,
                              padding: '1px 8px',
                              borderRadius: '4px',
                              marginLeft: '2px'
                            }}>
                              {icon}
                              {label}
                            </span>
                          );
                        })()}
                      </div>
                      {(() => {
                        const deptEmps = video.dept === 'Semua' ? employees : employees.filter(e => e.dept.toLowerCase() === video.dept.toLowerCase());
                        const lulus = quizSubmissions.filter(s => s.videoTitle === video.title && (s.postScore ?? 0) >= passingScore).length;
                        return (
                          <div style={{ fontSize: '11px', color: 'var(--text3)', whiteSpace: 'nowrap', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <span>Diikuti oleh {deptEmps.length} karyawan</span>
                            <span style={{ color: '#d1d5db' }}>|</span>
                            <span style={{ color: '#16a34a', fontWeight: '700' }}>{lulus} Lulus</span>
                          </div>
                        );
                      })()}
                    </div>
                    {(() => {
                      const deptEmps = video.dept === 'Semua' ? employees : employees.filter(e => e.dept.toLowerCase() === video.dept.toLowerCase());
                      const lulus = quizSubmissions.filter(s => s.videoTitle === video.title && (s.postScore ?? 0) >= passingScore).length;
                      const pct = deptEmps.length > 0 ? Math.round((lulus / deptEmps.length) * 100) : 0;
                      return (
                        <div className="prog-wrap" style={{ marginTop: '8px', width: '100%' }}>
                          <div className="prog-bar">
                            <div className="prog-fill" style={{ width: `${pct}%`, background: 'var(--accent)' }}></div>
                          </div>
                          <div className="prog-pct">{pct}% Lulus</div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* ACTION BUTTONS */}
                  {!isSupervisor && (() => {
                    const hasSubmissions = quizSubmissions.some(s => s.videoTitle === video.title);
                    const deptEmps = video.dept === 'Semua' ? employees : employees.filter(e => e.dept.toLowerCase() === video.dept.toLowerCase());
                    const lulus = quizSubmissions.filter(s => s.videoTitle === video.title && (s.postScore ?? 0) >= passingScore).length;
                    const allPassed = deptEmps.length > 0 && lulus >= deptEmps.length;
                    if (hasSubmissions && !allPassed) return null;
                    return (
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginLeft: '16px', flexShrink: 0 }}>
                        {!hasSubmissions && (
                          <button
                            type="button"
                            onClick={() => openEdit(video)}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: '6px',
                              padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: '600',
                              border: '1px solid var(--border)', background: '#ffffff', color: 'var(--text2)',
                              cursor: 'pointer',
                            }}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M12 20h9" />
                              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                            </svg>
                            Edit
                          </button>
                        )}
                        {!hasSubmissions ? (
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
                        ) : allPassed ? (
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
                    );
                  })()}
                </div>
              ))
            )
          ) : (
            archivedVideos.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text3)' }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>📂</div>
                <p style={{ fontSize: '13px' }}>Belum ada video SOP yang diarsipkan.</p>
              </div>
            ) : (
              archivedVideos.map((video) => (
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
                      <span style={{ fontSize: '11px', color: 'var(--text3)', marginLeft: '15px' }}>
                        {(() => {
                          const deptEmps = video.dept === 'Semua' ? employees : employees.filter(e => e.dept.toLowerCase() === video.dept.toLowerCase());
                          const lulus = quizSubmissions.filter(s => s.videoTitle === video.title && (s.postScore ?? 0) >= passingScore).length;
                          return `${lulus} dari ${deptEmps.length} karyawan lulus`;
                        })()}
                      </span>
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
              ))
            )
          )}
        </div>
      </div>

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

    </div>
  );
};
