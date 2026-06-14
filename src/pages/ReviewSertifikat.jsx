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
  const forMe = (sub) => isHRD || sub.dept?.toLowerCase() === myDept?.toLowerCase() ||
    // fallback: match by supervisor's dept against employee list (submissions may not have dept)
    true; // supervisor sees all pending for now; will be refined when dept is on submission

  const byCertStatus = (...statuses) =>
    quizSubmissions.filter(s => statuses.includes(s.certStatus || 'pending') && (isHRD || !s.dept || s.dept?.toLowerCase() === myDept?.toLowerCase()));

  // HRD tabs
  const readySubs    = quizSubmissions.filter(s => s.certStatus === 'supervisor_ok');
  const inProgressSubs = quizSubmissions.filter(s => !s.certStatus || s.certStatus === 'pending' || s.certStatus === 'remedial');
  const approvedSubs = quizSubmissions.filter(s => s.certStatus === 'approved');
  const rejectedSubs = quizSubmissions.filter(s => s.certStatus === 'rejected');

  // Supervisor tabs (all — dept filter would come from real auth; for demo shows all)
  const needReviewSubs  = quizSubmissions.filter(s => !s.certStatus || s.certStatus === 'pending');
  const remedialSubs    = quizSubmissions.filter(s => s.certStatus === 'remedial');
  const recommendedSubs = quizSubmissions.filter(s => s.certStatus === 'supervisor_ok' || s.certStatus === 'approved' || s.certStatus === 'rejected');

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

  const Card = ({ sub, actions }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
      {/* Avatar */}
      <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', color: '#fff', flexShrink: 0 }}>
        {sub.employeeName?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: '600', fontSize: '14px', color: 'var(--text1)', marginBottom: '1px' }}>{sub.employeeName}</div>
        <div style={{ fontSize: '12px', color: 'var(--text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '5px' }}>{sub.videoTitle}</div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', color: 'var(--text3)' }}>
            Pre: <strong style={{ color: scoreColor(sub.preScore) }}>{sub.preScore ?? '—'}%</strong>
          </span>
          <span style={{ fontSize: '11px', color: 'var(--text3)' }}>
            Post: <strong style={{ color: scoreColor(sub.postScore) }}>{sub.postScore ?? '—'}%</strong>
          </span>
          <span style={{ fontSize: '11px', color: 'var(--text3)' }}>{sub.date}</span>
          {sub.retakeCount > 0 && (
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#b45309', background: '#fff7ed', border: '1px solid #fed7aa', padding: '1px 7px', borderRadius: '10px' }}>
              Percobaan ke-{sub.retakeCount + 1}
            </span>
          )}
        </div>
        {/* Supervisor note visible to HRD */}
        {sub.supervisorNote && (
          <div style={{ marginTop: '5px', fontSize: '11px', color: '#1d4ed8', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', padding: '4px 8px', display: 'inline-block' }}>
            💬 Catatan Supervisor ({sub.supervisorName}): {sub.supervisorNote}
          </div>
        )}
        {/* Rejection note */}
        {sub.certStatus === 'rejected' && sub.rejectionNote && (
          <div style={{ marginTop: '5px', fontSize: '11px', color: '#b91c1c', background: '#fff5f5', border: '1px solid #fecaca', borderRadius: '6px', padding: '4px 8px', display: 'inline-block' }}>
            Alasan: {sub.rejectionNote}
          </div>
        )}
        {/* Remedial note for supervisor */}
        {sub.certStatus === 'remedial' && sub.supervisorNote && !isHRD && (
          <div style={{ marginTop: '5px', fontSize: '11px', color: '#b45309', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '6px', padding: '4px 8px', display: 'inline-block' }}>
            Catatan: {sub.supervisorNote}
          </div>
        )}
        {/* Approved info */}
        {sub.certStatus === 'approved' && (
          <div style={{ marginTop: '4px', fontSize: '11px', color: '#15803d', fontWeight: '600' }}>
            ✓ Diterbitkan oleh {sub.approvedBy} · {sub.approvedDate}
          </div>
        )}
      </div>

      {/* Right side: badge + actions */}
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
    sup_ok:   { title: 'Rekomendasikan Lulus?',  color: '#1d4ed8', btnLabel: 'Rekomendasikan',  btnBg: '#2563eb', needNote: false, placeholder: 'Catatan tambahan (opsional)' },
    sup_rem:  { title: 'Minta Remedial?',        color: '#b45309', btnLabel: 'Ya, Minta Remedial', btnBg: '#f59e0b', needNote: true, placeholder: 'Contoh: Jawaban kurang detail. Mohon tonton ulang bagian X dan coba kembali.' },
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

      {/* STATS */}
      <div className="stats-row" style={{ marginBottom: '20px' }}>
        {stats.map(s => (
          <div key={s.label} className="stat-mini" style={{ background: s.bg, border: `1px solid ${s.border}` }}>
            <div>
              <div className="s-val" style={{ color: s.color }}>{s.value}</div>
              <div className="s-lbl">{s.label}</div>
            </div>
          </div>
        ))}
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
            borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)'
          }} onClick={e => e.stopPropagation()}>
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
              style={{ height: '80px', resize: 'none', marginBottom: '20px', fontSize: '13px' }}
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
                background: canConfirm ? mc.btnBg : '#e5e7eb',
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
