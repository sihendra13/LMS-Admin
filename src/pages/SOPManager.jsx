import React from 'react';
import { useTenant } from '../context/TenantContext';
import { canUploadSOP } from '../utils/featureGates';

export const SOPManager = () => {
  const { tenant, videos, setActivePage, currentUser } = useTenant();
  const isSupervisor = currentUser.role !== 'admin';

  return (
    <div className="content">
      <div className="section-header" style={{ marginBottom: '20px' }}>
        <div className="section-title">Semua Video Training & SOP ({videos.length})</div>
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

      <div className="card">
        <div className="card-body">
          {videos.map((video) => (
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
                  <span className="video-dur" style={{ marginLeft: '10px' }}>Durasi: {video.duration}</span>
                  <span style={{ fontSize: '11px', color: 'var(--text3)', marginLeft: '15px' }}>Dilihat oleh: {video.views} karyawan</span>
                </div>
                <div className="prog-wrap" style={{ marginTop: '8px', width: '60%' }}>
                  <div className="prog-bar">
                    <div className="prog-fill" style={{ width: `${video.progress}%`, background: 'var(--accent)' }}></div>
                  </div>
                  <div className="prog-pct">{video.progress}% Selesai</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
