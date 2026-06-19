import React, { useState } from 'react';
import { useTenant } from '../context/TenantContext';
import { canUploadSOP } from '../utils/featureGates';

export const SOPManager = () => {
  const { tenant, videos, setActivePage, currentUser, deleteSOP, archiveSOP, unarchiveSOP, setEditingVideoId } = useTenant();
  const isSupervisor = currentUser.role !== 'admin';

  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, video: null });
  const [showArchived, setShowArchived] = useState(false);

  const openEdit = (video) => {
    setEditingVideoId(video.id);
    setActivePage('edit-sop');
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
                  {/* Edit — semua SOP */}
                  <button
                    type="button"
                    onClick={() => openEdit(video)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '6px',
                      padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: '600',
                      border: '1px solid #ddd6fe', background: '#f5f3ff', color: '#7c3aed',
                      cursor: 'pointer',
                    }}
                  >
                    ✏️ Edit
                  </button>
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

    </div>
  );
};
