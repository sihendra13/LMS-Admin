import React, { useState, useEffect, useRef } from 'react';
import { useTenant } from '../context/TenantContext';
import { supabase } from '../utils/supabase';

const MAX_RETAKES = 3;

export const Topbar = () => {
  const { tenant, activePage, setActivePage, quizSubmissions, videos, currentUser } = useTenant();
  const [showNotif, setShowNotif] = useState(false);
  const [readIds, setReadIds] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('axara_notif_read') || '[]')); }
    catch { return new Set(); }
  });
  const panelRef = useRef(null);

  // Sync read state from Supabase on mount
  useEffect(() => {
    if (!currentUser?.id) return;
    supabase
      .from('notification_reads')
      .select('read_keys')
      .eq('user_id', currentUser.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.read_keys?.length) {
          const keys = new Set(data.read_keys);
          setReadIds(keys);
          localStorage.setItem('axara_notif_read', JSON.stringify([...keys]));
        }
      });
  }, [currentUser?.id]);

  const now = new Date();

  // --- Bangun daftar notifikasi dari data real ---
  const notifications = [];

  // 1. Sertifikat menunggu approval HRD (supervisor_ok)
  const readyToApprove = quizSubmissions.filter(s => s.certStatus === 'supervisor_ok');
  if (readyToApprove.length > 0) {
    notifications.push({
      id: 'cert-approve',
      icon: '🎓',
      color: '#3b82f6',
      bg: '#eff6ff',
      title: `${readyToApprove.length} sertifikat siap di-approve`,
      sub: readyToApprove.slice(0, 2).map(s => s.employeeName).join(', ') + (readyToApprove.length > 2 ? ` +${readyToApprove.length - 2} lainnya` : ''),
      page: 'review-sertifikat',
    });
  }

  // 2. Submission pending review supervisor
  const pendingReview = quizSubmissions.filter(s => s.certStatus === 'pending');
  if (pendingReview.length > 0) {
    notifications.push({
      id: 'cert-pending',
      icon: '📋',
      color: '#f59e0b',
      bg: '#fffbeb',
      title: `${pendingReview.length} submission belum direview supervisor`,
      sub: 'Supervisor belum memberikan keputusan',
      page: 'review-sertifikat',
    });
  }

  // 3. Deadline SOP dalam 7 hari
  const upcoming = videos.filter(v => {
    if (!v.deadline || v.archived) return false;
    const diff = (new Date(v.deadline) - now) / 86400000;
    return diff >= 0 && diff <= 7;
  });
  upcoming.forEach(v => {
    const diff = Math.ceil((new Date(v.deadline) - now) / 86400000);
    notifications.push({
      id: `deadline-${v.id}`,
      icon: '⏰',
      color: '#ef4444',
      bg: '#fef2f2',
      title: `Deadline "${v.title}"`,
      sub: diff === 0 ? 'Hari ini!' : `${diff} hari lagi`,
      page: 'sop',
    });
  });

  // 4. Karyawan tidak lulus (>= MAX_RETAKES)
  const tidakLulus = quizSubmissions.filter(s => s.certStatus === 'remedial' && (s.retakeCount || 0) >= MAX_RETAKES);
  if (tidakLulus.length > 0) {
    notifications.push({
      id: 'tidak-lulus',
      icon: '🚨',
      color: '#ef4444',
      bg: '#fef2f2',
      title: `${tidakLulus.length} karyawan tidak lulus setelah ${MAX_RETAKES}x remedial`,
      sub: 'Perlu intervensi HRD segera',
      page: 'laporan',
    });
  }

  const unreadCount = notifications.filter(n => !readIds.has(n.id)).length;

  const markAllRead = () => {
    const next = new Set(notifications.map(n => n.id));
    setReadIds(next);
    const keys = [...next];
    localStorage.setItem('axara_notif_read', JSON.stringify(keys));
    if (currentUser?.id) {
      supabase.from('notification_reads').upsert({
        user_id: currentUser.id,
        read_keys: keys,
        updated_at: new Date().toISOString(),
      });
    }
  };

  const handleNotifClick = (page) => {
    setActivePage(page);
    setShowNotif(false);
  };

  // Tutup panel kalau klik di luar
  useEffect(() => {
    if (!showNotif) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setShowNotif(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showNotif]);

  const getPageTitle = () => {
    switch (activePage) {
      case 'dashboard':         return 'Dashboard';
      case 'sop':               return 'Video Training & SOP';
      case 'review-sertifikat': return 'Sertifikat';
      case 'penilaian':         return 'Hasil Penilaian Kuis';
      case 'laporan':           return 'Laporan & Compliance';
      case 'karyawan':          return 'Manajemen Karyawan';
      case 'departemen':        return 'Daftar Departemen';
      case 'upload':            return 'Upload Training & SOP';
      case 'heygen':            return 'Integrasi AI HeyGen';
      case 'pengaturan':        return 'Pengaturan';
      default:                  return 'LMS Dashboard';
    }
  };

  const getTodayDateString = () =>
    new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <header className="topbar">
      <div>
        <div className="page-title">{getPageTitle()}</div>
        <div className="page-sub">{getTodayDateString()} &nbsp;·&nbsp; {tenant.name}</div>
      </div>

      <div className="topbar-right">
        <div className="search-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          Cari video Training & SOP...
        </div>

        {/* BELL ICON */}
        <div ref={panelRef} style={{ position: 'relative' }}>
          <div
            className="topbar-btn"
            onClick={() => { setShowNotif(v => !v); if (!showNotif) markAllRead(); }}
            style={{ cursor: 'pointer', position: 'relative' }}
            title="Notifikasi"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute', top: '2px', right: '2px',
                background: '#ef4444', color: '#fff',
                fontSize: '9px', fontWeight: '700',
                minWidth: '16px', height: '16px',
                borderRadius: '8px', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                padding: '0 3px', lineHeight: 1,
                border: '1.5px solid #fff',
              }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>

          {/* DROPDOWN PANEL */}
          {showNotif && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 10px)', right: 0,
              width: '340px', background: '#fff',
              border: '1px solid var(--border)', borderRadius: '12px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              zIndex: 999, overflow: 'hidden',
            }}>
              {/* Header */}
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text1)' }}>Notifikasi</span>
                {notifications.length > 0 && (
                  <button onClick={markAllRead} style={{ background: 'none', border: 'none', fontSize: '11px', color: 'var(--accent)', cursor: 'pointer', fontWeight: '600', padding: 0 }}>
                    Tandai semua dibaca
                  </button>
                )}
              </div>

              {/* List */}
              <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text3)', fontSize: '13px' }}>
                    <div style={{ fontSize: '28px', marginBottom: '8px' }}>🎉</div>
                    Semua beres! Tidak ada notifikasi.
                  </div>
                ) : notifications.map(n => (
                  <div
                    key={n.id}
                    onClick={() => handleNotifClick(n.page)}
                    style={{
                      display: 'flex', gap: '12px', alignItems: 'flex-start',
                      padding: '12px 16px', cursor: 'pointer',
                      borderBottom: '1px solid var(--border)',
                      background: readIds.has(n.id) ? 'transparent' : '#f8faff',
                      transition: 'background 0.15s',
                    }}
                    onMouseOver={e => e.currentTarget.style.background = 'var(--surface2)'}
                    onMouseOut={e => e.currentTarget.style.background = readIds.has(n.id) ? 'transparent' : '#f8faff'}
                  >
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '8px',
                      background: n.bg, display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: '16px', flexShrink: 0,
                    }}>
                      {n.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text1)', lineHeight: '1.4', marginBottom: '2px' }}>{n.title}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.sub}</div>
                    </div>
                    {!readIds.has(n.id) && (
                      <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: n.color, flexShrink: 0, marginTop: '5px' }} />
                    )}
                  </div>
                ))}
              </div>

              {/* Footer */}
              {notifications.length > 0 && (
                <div
                  onClick={() => handleNotifClick('laporan')}
                  style={{ padding: '10px 16px', textAlign: 'center', fontSize: '12px', color: 'var(--accent)', fontWeight: '600', cursor: 'pointer', borderTop: '1px solid var(--border)' }}
                >
                  Lihat semua di Laporan →
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
