import React, { useState } from 'react';
import { useTenant } from '../context/TenantContext';

export const ReviewSertifikat = () => {
  const { quizSubmissions, approveCertificate, rejectCertificate, currentUser, passingScore } = useTenant();
  const isSupervisor = currentUser.role !== 'admin';

  const [activeTab, setActiveTab] = useState('pending');
  const [rejectModal, setRejectModal] = useState({ open: false, submission: null });
  const [rejectNote, setRejectNote] = useState('');

  const pending = quizSubmissions.filter(s => !s.certStatus || s.certStatus === 'pending');
  const approved = quizSubmissions.filter(s => s.certStatus === 'approved');
  const rejected = quizSubmissions.filter(s => s.certStatus === 'rejected');

  const handleApprove = (id) => {
    approveCertificate(id, currentUser.name);
  };

  const handleRejectConfirm = () => {
    if (!rejectModal.submission) return;
    rejectCertificate(rejectModal.submission.id, rejectNote);
    setRejectModal({ open: false, submission: null });
    setRejectNote('');
  };

  const scoreColor = (score) => {
    if (score === null || score === undefined) return 'var(--text3)';
    if (score >= passingScore) return '#16a34a';
    return '#dc2626';
  };

  const SubmissionCard = ({ sub, showActions }) => (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '16px',
      padding: '16px 20px', borderBottom: '1px solid var(--border)'
    }}>
      <div style={{
        width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0,
        background: 'var(--accent)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: '14px', fontWeight: '700', color: '#fff'
      }}>
        {sub.employeeName?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: '600', fontSize: '14px', color: 'var(--text1)', marginBottom: '2px' }}>
          {sub.employeeName}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text3)', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {sub.videoTitle}
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '11px', color: 'var(--text3)' }}>
            Pre: <strong style={{ color: scoreColor(sub.preScore) }}>{sub.preScore ?? '-'}%</strong>
          </span>
          <span style={{ fontSize: '11px', color: 'var(--text3)' }}>
            Post: <strong style={{ color: scoreColor(sub.postScore) }}>{sub.postScore ?? '-'}%</strong>
          </span>
          <span style={{ fontSize: '11px', color: 'var(--text3)' }}>{sub.date}</span>
          {sub.certStatus === 'approved' && (
            <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: '600' }}>
              ✓ Disetujui oleh {sub.approvedBy} · {sub.approvedDate}
            </span>
          )}
          {sub.certStatus === 'rejected' && sub.rejectionNote && (
            <span style={{ fontSize: '11px', color: '#dc2626' }}>
              Alasan: {sub.rejectionNote}
            </span>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
        {showActions && !isSupervisor && (
          <>
            <button
              onClick={() => handleApprove(sub.id)}
              style={{
                padding: '7px 16px', borderRadius: '6px', fontSize: '12px', fontWeight: '700',
                background: '#f0fdf4', border: '1px solid #86efac', color: '#16a34a',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Terbitkan
            </button>
            <button
              onClick={() => { setRejectModal({ open: true, submission: sub }); setRejectNote(''); }}
              style={{
                padding: '7px 16px', borderRadius: '6px', fontSize: '12px', fontWeight: '700',
                background: '#fff5f5', border: '1px solid #fecaca', color: '#ef4444',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
              Tolak
            </button>
          </>
        )}
        {sub.certStatus === 'approved' && (
          <span style={{
            padding: '6px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '700',
            background: '#f0fdf4', color: '#16a34a', border: '1px solid #86efac'
          }}>
            Sertifikat Aktif
          </span>
        )}
        {sub.certStatus === 'rejected' && (
          <span style={{
            padding: '6px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '700',
            background: '#fff5f5', color: '#ef4444', border: '1px solid #fecaca'
          }}>
            Ditolak
          </span>
        )}
      </div>
    </div>
  );

  return (
    <div className="content">
      <div className="section-header" style={{ marginBottom: '20px' }}>
        <div className="section-title">Review Sertifikat</div>
      </div>

      {/* STATS */}
      <div className="stats-row" style={{ marginBottom: '20px' }}>
        {[
          { label: 'Menunggu Review', value: pending.length, color: '#f59e0b', bg: '#fffbeb', border: '#fde68a' },
          { label: 'Sudah Diterbitkan', value: approved.length, color: '#16a34a', bg: '#f0fdf4', border: '#86efac' },
          { label: 'Ditolak', value: rejected.length, color: '#ef4444', bg: '#fff5f5', border: '#fecaca' },
        ].map(item => (
          <div key={item.label} className="stat-mini" style={{ background: item.bg, border: `1px solid ${item.border}` }}>
            <div>
              <div className="s-val" style={{ color: item.color }}>{item.value}</div>
              <div className="s-lbl">{item.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* TABS */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', borderBottom: '2px solid var(--border)', paddingBottom: '0' }}>
        {[
          { key: 'pending', label: `Menunggu Review${pending.length > 0 ? ` (${pending.length})` : ''}` },
          { key: 'approved', label: `Sudah Diterbitkan (${approved.length})` },
          { key: 'rejected', label: `Ditolak (${rejected.length})` },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '10px 18px', fontSize: '13px', fontWeight: '600', border: 'none',
              background: 'none', cursor: 'pointer', borderBottom: '2px solid transparent',
              marginBottom: '-2px', transition: 'all 0.15s',
              color: activeTab === tab.key ? 'var(--accent)' : 'var(--text3)',
              borderBottomColor: activeTab === tab.key ? 'var(--accent)' : 'transparent',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* CONTENT */}
      <div className="card">
        {activeTab === 'pending' && (
          pending.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text3)' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>✅</div>
              <p style={{ fontSize: '13px' }}>Semua sertifikat sudah diproses. Tidak ada yang menunggu review.</p>
            </div>
          ) : (
            <div className="card-body" style={{ padding: 0 }}>
              {pending.map(sub => <SubmissionCard key={sub.id} sub={sub} showActions={true} />)}
            </div>
          )
        )}

        {activeTab === 'approved' && (
          approved.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text3)' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>🏆</div>
              <p style={{ fontSize: '13px' }}>Belum ada sertifikat yang diterbitkan.</p>
            </div>
          ) : (
            <div className="card-body" style={{ padding: 0 }}>
              {approved.map(sub => <SubmissionCard key={sub.id} sub={sub} showActions={false} />)}
            </div>
          )
        )}

        {activeTab === 'rejected' && (
          rejected.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text3)' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>📋</div>
              <p style={{ fontSize: '13px' }}>Belum ada sertifikat yang ditolak.</p>
            </div>
          ) : (
            <div className="card-body" style={{ padding: 0 }}>
              {rejected.map(sub => <SubmissionCard key={sub.id} sub={sub} showActions={false} />)}
            </div>
          )
        )}
      </div>

      {/* REJECT MODAL */}
      {rejectModal.open && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999
        }} onClick={() => setRejectModal({ open: false, submission: null })}>
          <div className="card" style={{
            width: '440px', maxWidth: '95vw', padding: '28px', background: '#fff',
            borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text1)', marginBottom: '8px' }}>
              Tolak Sertifikat?
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text2)', marginBottom: '16px', lineHeight: '1.5' }}>
              <strong>{rejectModal.submission?.employeeName}</strong> — {rejectModal.submission?.videoTitle}
            </p>
            <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text2)', display: 'block', marginBottom: '6px' }}>
              Alasan penolakan (opsional)
            </label>
            <textarea
              className="form-input"
              style={{ height: '80px', resize: 'none', marginBottom: '20px', fontSize: '13px' }}
              placeholder="Contoh: Skor tidak memenuhi standar departemen, harap tonton ulang dan coba kembali."
              value={rejectNote}
              onChange={e => setRejectNote(e.target.value)}
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setRejectModal({ open: false, submission: null })}
                className="form-input"
                style={{ flex: 1, cursor: 'pointer', padding: '10px', margin: 0, fontWeight: '600', fontSize: '13px' }}
              >
                Batal
              </button>
              <button
                onClick={handleRejectConfirm}
                style={{
                  flex: 1, padding: '10px', borderRadius: '8px', fontSize: '13px',
                  fontWeight: '700', background: '#ef4444', border: '1px solid #ef4444',
                  color: '#fff', cursor: 'pointer'
                }}
              >
                Ya, Tolak
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
