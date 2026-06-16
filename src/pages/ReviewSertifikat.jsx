import React, { useState } from 'react';
import { useTenant } from '../context/TenantContext';

const MAX_RETAKES = 3;

const STATUS_META = {
  pending:       { label: 'Menunggu Supervisor', color: '#92400e', bg: '#fffbeb', border: '#fde68a' },
  supervisor_ok: { label: 'Siap Diterbitkan',    color: '#1d4ed8', bg: '#eff6ff', border: '#93c5fd' },
  remedial:      { label: 'Perlu Remedial',       color: '#b45309', bg: '#fff7ed', border: '#fed7aa' },
  approved:      { label: 'Sertifikat Aktif',     color: '#15803d', bg: '#f0fdf4', border: '#86efac' },
  rejected:      { label: 'Ditolak Final',        color: '#b91c1c', bg: '#fff5f5', border: '#fecaca' },
};

export const ReviewSertifikat = () => {
  const { quizSubmissions, approveCertificate, rejectCertificate, supervisorRecommend, currentUser, passingScore } = useTenant();
  const isHRD = currentUser.role === 'admin';

  const [activeTab, setActiveTab] = useState(isHRD ? 'ready' : 'need_review');
  const [actionModal, setActionModal] = useState({ open: false, type: null, sub: null });
  const [modalNote, setModalNote] = useState('');

  // ── filter helpers ───────────────────────────────────────────────────
  const myDept = currentUser.dept;
  const forMe = (sub) => isHRD || !sub.dept || sub.dept?.toLowerCase() === myDept?.toLowerCase();

  // HRD tabs
  const readySubs      = quizSubmissions.filter(s => s.certStatus === 'supervisor_ok');
  const inProgressSubs = quizSubmissions.filter(s => !s.certStatus || s.certStatus === 'pending' || s.certStatus === 'remedial');
  const approvedSubs   = quizSubmissions.filter(s => s.certStatus === 'approved');
  const rejectedSubs   = quizSubmissions.filter(s => s.certStatus === 'rejected');

  // Supervisor tabs — hanya tampil divisi yg sama
  const needReviewSubs  = quizSubmissions.filter(s => forMe(s) && (!s.certStatus || s.certStatus === 'pending'));
  const remedialSubs    = quizSubmissions.filter(s => forMe(s) && s.certStatus === 'remedial');
  const recommendedSubs = quizSubmissions.filter(s => forMe(s) && (s.certStatus === 'supervisor_ok' || s.certStatus === 'approved' || s.certStatus === 'rejected'));

  // ── action handlers ──────────────────────────────────────────────────
  const openModal = (type, sub) => { setActionModal({ open: true, type, sub }); setModalNote(''); };
  const closeModal = () => setActionModal({ open: false, type: null, sub: null });

  const handleConfirm = () => {
    const { type, sub } = actionModal;
    if (!sub) return;
    if (type === 'approve')   approveCertificate(sub.id, currentUser.name);
    if (type === 'reject')    rejectCertificate(sub.id, modalNote);
    if (type === 'sup_ok')    supervisorRecommend(sub.id, 'ok', modalNote);
    if (type === 'sup_rem')   supervisorRecommend(sub.id, 'remedial', modalNote);
    closeModal();
  };

  const scoreColor = (s) => {
    if (s == null) return 'var(--text3)';
    return s >= passingScore ? '#16a34a' : '#dc2626';
  };

  // ── sub-components ───────────────────────────────────────────────────
  const StatusBadge = ({ certStatus }) => {
    const m = STATUS_META[certStatus] || STATUS_META.pending;
    // Supervisor melihat pending → label "Belum Direview" bukan "Menunggu Supervisor"
    const label = (!isHRD && (certStatus === 'pending' || !certStatus)) ? 'Belum Direview' : m.label;
    return (
      <span style={{ fontSize: '11px', fontWeight: '700', padding: '3px 10px', borderRadius: '20px', background: m.bg, color: m.color, border: `1px solid ${m.border}`, flexShrink: 0 }}>
        {label}
      </span>
    );
  };

  const Card = ({ sub, actions }) => {
    const passed = sub.postScore != null && sub.postScore >= passingScore;
    const improvement = (sub.preScore != null && sub.postScore != null) ? sub.postScore - sub.preScore : null;
    const isSupervisorDecision = !isHRD && actions?.some(a => a.type === 'sup_ok');

    // ── SUPERVISOR DECISION CARD ─────────────────────────────────────────
    if (isSupervisorDecision) {
      return (
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '700', color: '#fff', flexShrink: 0 }}>
              {sub.employeeName?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: '700', fontSize: '15px', color: 'var(--text1)' }}>{sub.employeeName}</div>
              <div style={{ fontSize: '12px', color: 'var(--text3)' }}>{sub.videoTitle}</div>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text3)', textAlign: 'right' }}>
              {sub.date}
              {sub.retakeCount > 0 && (
                <div style={{ marginTop: '2px', fontWeight: '700', color: '#b45309' }}>Percobaan ke-{sub.retakeCount + 1} dari {MAX_RETAKES}</div>
              )}
            </div>
          </div>

          {/* Remedial completion banner */}
          {sub.retakeCount > 0 && (
            <div style={{
              background: '#f0fdf4', border: '1px solid #86efac',
              borderRadius: '10px', padding: '10px 14px', marginBottom: '12px',
              display: 'flex', alignItems: 'center', gap: '8px'
            }}>
              <span style={{ fontSize: '16px' }}>✅</span>
              <div>
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#15803d' }}>
                  Karyawan sudah menyelesaikan remedial (percobaan ke-{sub.retakeCount + 1} dari {MAX_RETAKES})
                </div>
                <div style={{ fontSize: '11px', color: '#166534', marginTop: '2px' }}>
                  Tinjau hasil belajar terbaru di bawah dan beri keputusan Anda.
                </div>
              </div>
            </div>
          )}

          {/* Pass/fail status block */}
          <div style={{
            background: passed ? '#f0fdf4' : '#fff5f5',
            border: `1px solid ${passed ? '#86efac' : '#fecaca'}`,
            borderRadius: '10px', padding: '12px 16px', marginBottom: '14px'
          }}>
            <div style={{ fontWeight: '700', fontSize: '13px', color: passed ? '#15803d' : '#b91c1c', marginBottom: '6px' }}>
              {passed ? '✅ Lulus standar perusahaan' : '❌ Belum memenuhi standar perusahaan'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', color: 'var(--text2)' }}>
                Nilai awal (sebelum belajar): <strong style={{ color: scoreColor(sub.preScore) }}>{sub.preScore ?? '—'}%</strong>
              </span>
              <span style={{ color: 'var(--text3)', fontSize: '12px' }}>→</span>
              <span style={{ fontSize: '12px', color: 'var(--text2)' }}>
                Nilai akhir (setelah belajar): <strong style={{ color: scoreColor(sub.postScore) }}>{sub.postScore ?? '—'}%</strong>
              </span>
              {improvement !== null && improvement > 0 && (
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#15803d', background: '#dcfce7', padding: '2px 8px', borderRadius: '10px' }}>
                  ↑ naik {improvement}%
                </span>
              )}
            </div>
            <div style={{ marginTop: '6px', fontSize: '11px', color: 'var(--text3)' }}>
              Standar kelulusan perusahaan: <strong>{passingScore}%</strong>
            </div>
          </div>

          {/* Previous remedial note */}
          {sub.supervisorNote && (
            <div style={{ fontSize: '12px', color: '#b45309', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '8px', padding: '8px 12px', marginBottom: '14px' }}>
              📋 <strong>Catatan remedial sebelumnya:</strong> {sub.supervisorNote}
            </div>
          )}

          {/* Decision question */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '14px' }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text2)', marginBottom: '10px' }}>
              Apakah Anda merekomendasikan sertifikat untuk karyawan ini?
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => openModal('sup_ok', sub)} style={{
                flex: 1, padding: '10px 0', borderRadius: '8px', fontSize: '13px', fontWeight: '700',
                background: '#eff6ff', border: '1px solid #93c5fd', color: '#1d4ed8', cursor: 'pointer'
              }}>
                ✓ Ya, Rekomendasikan
              </button>
              <button onClick={() => openModal('sup_rem', sub)} style={{
                flex: 1, padding: '10px 0', borderRadius: '8px', fontSize: '13px', fontWeight: '700',
                background: '#fff7ed', border: '1px solid #fed7aa', color: '#b45309', cursor: 'pointer'
              }}>
                ↩ Belum, Minta Ulang
              </button>
            </div>
          </div>
        </div>
      );
    }

    // ── COMPACT CARD (HRD + history) ─────────────────────────────────────
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', color: '#fff', flexShrink: 0 }}>
          {sub.employeeName?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: '600', fontSize: '14px', color: 'var(--text1)', marginBottom: '1px' }}>{sub.employeeName}</div>
          <div style={{ fontSize: '12px', color: 'var(--text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '4px' }}>{sub.videoTitle}</div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--text3)' }}>
              Pre: <strong style={{ color: scoreColor(sub.preScore) }}>{sub.preScore ?? '—'}%</strong>
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text3)' }}>
              Post: <strong style={{ color: scoreColor(sub.postScore) }}>{sub.postScore ?? '—'}%</strong>
            </span>
            {improvement !== null && improvement > 0 && (
              <span style={{ fontSize: '10px', fontWeight: '700', color: '#15803d', background: '#dcfce7', padding: '1px 6px', borderRadius: '8px' }}>↑{improvement}%</span>
            )}
            <span style={{ fontSize: '11px', color: 'var(--text3)' }}>{sub.date}</span>
            {sub.retakeCount > 0 && (
              <span style={{ fontSize: '10px', fontWeight: '700', color: '#b45309', background: '#fff7ed', border: '1px solid #fed7aa', padding: '1px 7px', borderRadius: '10px' }}>
                Percobaan ke-{sub.retakeCount + 1}
              </span>
            )}
          </div>
          {sub.supervisorNote && (
            <div style={{ marginTop: '5px', fontSize: '11px', color: '#1d4ed8', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', padding: '4px 8px', display: 'inline-block' }}>
              💬 {sub.supervisorName}: {sub.supervisorNote}
            </div>
          )}
          {sub.certStatus === 'rejected' && sub.rejectionNote && (
            <div style={{ marginTop: '5px', fontSize: '11px', color: '#b91c1c', background: '#fff5f5', border: '1px solid #fecaca', borderRadius: '6px', padding: '4px 8px', display: 'inline-block' }}>
              Alasan: {sub.rejectionNote}
            </div>
          )}
          {sub.certStatus === 'approved' && (
            <div style={{ marginTop: '4px', fontSize: '11px', color: '#15803d', fontWeight: '600' }}>
              ✓ Diterbitkan oleh {sub.approvedBy} · {sub.approvedDate}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', flexShrink: 0 }}>
          <StatusBadge certStatus={sub.certStatus || 'pending'} />
          {actions && (
            <div style={{ display: 'flex', gap: '6px' }}>
              {actions.map(a => (
                <button key={a.label} onClick={() => openModal(a.type, sub)} style={{
                  padding: '5px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: '700',
                  background: a.bg, border: `1px solid ${a.border}`, color: a.color, cursor: 'pointer'
                }}>
                  {a.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const EmptyState = ({ icon, msg }) => (
    <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text3)' }}>
      <div style={{ fontSize: '30px', marginBottom: '10px' }}>{icon}</div>
      <p style={{ fontSize: '13px' }}>{msg}</p>
    </div>
  );

  // ── HRD action config ────────────────────────────────────────────────
  const hrdActions = [
    { type: 'approve', label: '✓ Terbitkan',   color: '#15803d', bg: '#f0fdf4', border: '#86efac' },
    { type: 'reject',  label: '✕ Tolak Final', color: '#b91c1c', bg: '#fff5f5', border: '#fecaca' },
  ];
  const supActions = [
    { type: 'sup_ok',  label: '✓ Rekomendasikan Lulus', color: '#1d4ed8', bg: '#eff6ff', border: '#93c5fd' },
    { type: 'sup_rem', label: '↩ Minta Remedial',       color: '#b45309', bg: '#fff7ed', border: '#fed7aa' },
  ];

  // ── stats ────────────────────────────────────────────────────────────
  const stats = isHRD ? [
    { label: 'Siap Diterbitkan', value: readySubs.length,      color: '#1d4ed8', bg: '#eff6ff', border: '#93c5fd' },
    { label: 'Dalam Proses',     value: inProgressSubs.length, color: '#92400e', bg: '#fffbeb', border: '#fde68a' },
    { label: 'Diterbitkan',      value: approvedSubs.length,   color: '#15803d', bg: '#f0fdf4', border: '#86efac' },
    { label: 'Ditolak',          value: rejectedSubs.length,   color: '#b91c1c', bg: '#fff5f5', border: '#fecaca' },
  ] : [
    { label: 'Perlu Review',     value: needReviewSubs.length,  color: '#92400e', bg: '#fffbeb', border: '#fde68a' },
    { label: 'Sedang Remedial',  value: remedialSubs.length,    color: '#b45309', bg: '#fff7ed', border: '#fed7aa' },
    { label: 'Sudah Direkomendasikan', value: recommendedSubs.length, color: '#1d4ed8', bg: '#eff6ff', border: '#93c5fd' },
  ];

  // ── tabs ─────────────────────────────────────────────────────────────
  const tabs = isHRD ? [
    { key: 'ready',       label: `Siap Diterbitkan (${readySubs.length})` },
    { key: 'in_progress', label: `Dalam Proses (${inProgressSubs.length})` },
    { key: 'approved',    label: `Diterbitkan (${approvedSubs.length})` },
    { key: 'rejected',    label: `Ditolak (${rejectedSubs.length})` },
  ] : [
    { key: 'need_review',  label: `Perlu Review (${needReviewSubs.length})` },
    { key: 'remedial',     label: `Sedang Remedial (${remedialSubs.length})` },
    { key: 'recommended',  label: `Riwayat (${recommendedSubs.length})` },
  ];

  // ── modal config ─────────────────────────────────────────────────────
  const MODAL_CONFIG = {
    approve:  { title: 'Terbitkan Sertifikat?', color: '#15803d', btnLabel: 'Ya, Terbitkan',   btnBg: '#16a34a', needNote: false },
    reject:   { title: 'Tolak Final?',           color: '#b91c1c', btnLabel: 'Ya, Tolak Final', btnBg: '#ef4444', needNote: true, placeholder: 'Contoh: Skor tidak memenuhi standar, atau karyawan masih dalam masa percobaan.' },
    sup_ok:   { title: 'Rekomendasikan Sertifikat?', color: '#1d4ed8', btnLabel: 'Ya, Rekomendasikan', btnBg: '#2563eb', needNote: false, placeholder: 'Catatan tambahan untuk HRD (opsional)' },
    sup_rem:  { title: 'Minta Karyawan Mengulang?',  color: '#b45309', btnLabel: 'Ya, Minta Ulang',    btnBg: '#f59e0b', needNote: true, placeholder: 'Tuliskan alasan & bagian mana yang perlu dipelajari ulang. Catatan ini akan dilihat karyawan.' },
  };

  const mc = MODAL_CONFIG[actionModal.type] || {};
  const canConfirm = !mc.needNote || modalNote.trim().length > 0;

  return (
    <div className="content">
      <div style={{ marginBottom: '18px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text1)', marginBottom: '4px' }}>Review Sertifikat</h2>
        <p style={{ fontSize: '13px', color: 'var(--text3)' }}>
          {isHRD
            ? 'Review rekomendasi supervisor dan terbitkan sertifikat resmi karyawan.'
            : `Beri rekomendasi kelulusan karyawan divisi ${myDept} sebelum diteruskan ke HRD.`}
        </p>
      </div>

      {/* STATS OVERVIEW */}
      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        {isHRD ? (
          <>
            {/* HRD Card 1 */}
            <div className="stat-card blue">
              <div className="stat-icon blue">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
              </div>
              <div className="stat-label">Siap Diterbitkan</div>
              <div className="stat-value">{readySubs.length}</div>
              <div className="stat-change info">Rekomendasi Supervisor</div>
            </div>
            {/* HRD Card 2 */}
            <div className="stat-card amber">
              <div className="stat-icon amber">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
              <div className="stat-label">Dalam Proses</div>
              <div className="stat-value">{inProgressSubs.length}</div>
              <div className="stat-change up">Menunggu Review</div>
            </div>
            {/* HRD Card 3 */}
            <div className="stat-card green">
              <div className="stat-icon green">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/>
                </svg>
              </div>
              <div className="stat-label">Diterbitkan</div>
              <div className="stat-value">{approvedSubs.length}</div>
              <div className="stat-change up">Sertifikat Aktif</div>
            </div>
            {/* HRD Card 4 */}
            <div className="stat-card red" style={{ background: '#fff5f5', border: '1px solid #fecaca' }}>
              <div className="stat-icon red" style={{ background: '#fee2e2', color: '#ef4444' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
              </div>
              <div className="stat-label">Ditolak</div>
              <div className="stat-value" style={{ color: '#ef4444' }}>{rejectedSubs.length}</div>
              <div className="stat-change down" style={{ color: '#f87171' }}>Ditolak Final</div>
            </div>
          </>
        ) : (
          <>
            {/* Supervisor Card 1: Perlu Review */}
            <div className="stat-card blue">
              <div className="stat-icon blue">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
              <div className="stat-label">Perlu Review</div>
              <div className="stat-value">{needReviewSubs.length}</div>
              <div className="stat-change info">Belum Direkomendasikan</div>
            </div>
            {/* Supervisor Card 2: Sedang Remedial */}
            <div className="stat-card amber">
              <div className="stat-icon amber">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
                </svg>
              </div>
              <div className="stat-label">Sedang Remedial</div>
              <div className="stat-value">{remedialSubs.length}</div>
              <div className="stat-change up">Menunggu Ulang</div>
            </div>
            {/* Supervisor Card 3: Sudah Direkomendasikan */}
            <div className="stat-card green">
              <div className="stat-icon green">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
              </div>
              <div className="stat-label">Sudah Direkomendasikan</div>
              <div className="stat-value">{recommendedSubs.length}</div>
              <div className="stat-change up">Diteruskan ke HRD</div>
            </div>
          </>
        )}
      </div>

      {/* ROLE INFO BANNER */}
      {!isHRD && (
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', fontSize: '13px', color: '#1e40af', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '16px' }}>ℹ️</span>
          <div>
            <strong>Alur 2 Tahap:</strong> Anda (Supervisor) memberi rekomendasi terlebih dahulu.
            Setelah rekomendasi <em>Lulus</em>, HRD akan mereview dan menerbitkan sertifikat resmi.
            Jika Anda memilih <em>Remedial</em>, karyawan akan diminta menonton ulang dan mengerjakan kuis kembali (maks {MAX_RETAKES}x).
          </div>
        </div>
      )}

      {/* TABS */}
      <div style={{ display: 'flex', gap: '4px', borderBottom: '2px solid var(--border)', marginBottom: '16px' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
            padding: '10px 16px', fontSize: '13px', fontWeight: '600', border: 'none', background: 'none',
            cursor: 'pointer', borderBottom: '2px solid transparent', marginBottom: '-2px', transition: 'all 0.15s',
            color: activeTab === t.key ? 'var(--accent)' : 'var(--text3)',
            borderBottomColor: activeTab === t.key ? 'var(--accent)' : 'transparent',
          }}>{t.label}</button>
        ))}
      </div>

      {/* CONTENT */}
      <div className="card" style={{ padding: 0 }}>
        {/* ── HRD: Siap Diterbitkan ── */}
        {isHRD && activeTab === 'ready' && (
          readySubs.length === 0
            ? <EmptyState icon="✅" msg="Belum ada yang siap diterbitkan. Menunggu rekomendasi supervisor." />
            : readySubs.map(sub => <Card key={sub.id} sub={sub} actions={hrdActions} />)
        )}

        {/* ── HRD: Dalam Proses (pending + remedial) ── */}
        {isHRD && activeTab === 'in_progress' && (
          inProgressSubs.length === 0
            ? <EmptyState icon="📋" msg="Tidak ada yang sedang dalam proses." />
            : inProgressSubs.map(sub => <Card key={sub.id} sub={sub} actions={[
                { type: 'approve', label: '✓ Override & Terbitkan', color: '#15803d', bg: '#f0fdf4', border: '#86efac' },
                { type: 'reject',  label: '✕ Tolak',                color: '#b91c1c', bg: '#fff5f5', border: '#fecaca' },
              ]} />)
        )}

        {/* ── HRD: Diterbitkan ── */}
        {isHRD && activeTab === 'approved' && (
          approvedSubs.length === 0
            ? <EmptyState icon="🏆" msg="Belum ada sertifikat yang diterbitkan." />
            : approvedSubs.map(sub => <Card key={sub.id} sub={sub} actions={null} />)
        )}

        {/* ── HRD: Ditolak ── */}
        {isHRD && activeTab === 'rejected' && (
          rejectedSubs.length === 0
            ? <EmptyState icon="📋" msg="Belum ada yang ditolak." />
            : rejectedSubs.map(sub => <Card key={sub.id} sub={sub} actions={null} />)
        )}

        {/* ── Supervisor: Perlu Review ── */}
        {!isHRD && activeTab === 'need_review' && (
          needReviewSubs.length === 0
            ? <EmptyState icon="✅" msg="Tidak ada yang perlu direview saat ini." />
            : needReviewSubs.map(sub => <Card key={sub.id} sub={sub} actions={supActions} />)
        )}

        {/* ── Supervisor: Sedang Remedial ── */}
        {!isHRD && activeTab === 'remedial' && (
          remedialSubs.length === 0
            ? <EmptyState icon="📋" msg="Tidak ada karyawan yang sedang dalam proses remedial." />
            : remedialSubs.map(sub => (
                <div key={sub.id}>
                  <Card sub={sub} actions={null} />
                  {sub.retakeCount >= MAX_RETAKES && (
                    <div style={{ margin: '0 20px 12px', padding: '10px 14px', background: '#fff5f5', border: '1px solid #fecaca', borderRadius: '8px', fontSize: '12px', color: '#b91c1c', fontWeight: '600' }}>
                      ⚠️ Karyawan ini telah mencapai batas maksimal {MAX_RETAKES}x remedial. Rekomendasikan ke HRD untuk keputusan final.
                    </div>
                  )}
                </div>
              ))
        )}

        {/* ── Supervisor: Riwayat ── */}
        {!isHRD && activeTab === 'recommended' && (
          recommendedSubs.length === 0
            ? <EmptyState icon="📋" msg="Belum ada riwayat rekomendasi." />
            : recommendedSubs.map(sub => <Card key={sub.id} sub={sub} actions={null} />)
        )}
      </div>

      {/* ACTION MODAL */}
      {actionModal.open && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999
        }} onClick={closeModal}>
          <div className="card" style={{
            width: '440px', maxWidth: '95vw', padding: '28px', background: '#fff',
            borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)', position: 'relative'
          }} onClick={e => e.stopPropagation()}>
            <button onClick={closeModal} style={{
              position: 'absolute', top: '16px', right: '16px',
              width: '28px', height: '28px', borderRadius: '50%',
              border: 'none', background: '#f1f5f9', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#64748b', fontSize: '16px', lineHeight: 1
            }}>×</button>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: mc.color || 'var(--text1)', marginBottom: '6px' }}>
              {mc.title}
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text2)', marginBottom: '16px', lineHeight: '1.5' }}>
              <strong>{actionModal.sub?.employeeName}</strong> — {actionModal.sub?.videoTitle}
              {actionModal.sub?.retakeCount > 0 && (
                <span style={{ display: 'block', fontSize: '11px', color: '#b45309', marginTop: '4px' }}>
                  Percobaan ke-{actionModal.sub.retakeCount + 1} dari {MAX_RETAKES}
                </span>
              )}
            </p>

            <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text2)', display: 'block', marginBottom: '6px' }}>
              {mc.needNote ? 'Catatan / Alasan *' : 'Catatan (opsional)'}
            </label>
            <textarea
              className="form-input"
              style={{ height: '80px', resize: 'none', marginBottom: '20px', fontSize: '13px', width: '100%', boxSizing: 'border-box' }}
              placeholder={mc.placeholder || ''}
              value={modalNote}
              onChange={e => setModalNote(e.target.value)}
            />

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={closeModal} className="form-input" style={{ flex: 1, cursor: 'pointer', padding: '10px', margin: 0, fontWeight: '600', fontSize: '13px' }}>
                Batal
              </button>
              <button onClick={handleConfirm} disabled={!canConfirm} style={{
                flex: 1, padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: '700',
                background: canConfirm ? 'var(--navy)' : '#e5e7eb',
                border: 'none', color: canConfirm ? '#fff' : '#9ca3af', cursor: canConfirm ? 'pointer' : 'not-allowed',
                transition: 'all 0.15s'
              }}>
                {mc.btnLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
