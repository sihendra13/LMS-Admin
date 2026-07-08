import React, { useState, useEffect, useRef } from 'react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://axara-lms-backend.onrender.com';

const mockCards = [
  { name: 'Rini Wulandari', sop: 'SOP Proses Onboarding Klien Baru', score: 100, status: 'Lulus', color: '#16a34a', bg: '#f0fdf4' },
  { name: 'Budi Santoso', sop: 'SOP Standar Pelayanan Kasir', score: 85, status: 'Lulus', color: '#16a34a', bg: '#f0fdf4' },
  { name: 'Sari Dewi', sop: 'SOP Penanganan Komplain', score: 60, status: 'Remedial', color: '#dc2626', bg: '#fef2f2' },
];

export const AcceptInvitation = ({ token, onAccepted }) => {
  const [invitation, setInvitation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [activeCardIdx, setActiveCardIdx] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const tiltRef = useRef(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveCardIdx(prev => (prev + 1) % mockCards.length);
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/v1/invitations/${token}/validate`)
      .then(res => res.json().then(data => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) throw new Error(data.error || 'Link tidak valid');
        setInvitation(data.invitation);
        if (data.invitation.invited_name) setName(data.invitation.invited_name);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  const handleMouseMove = (e) => {
    const rect = tiltRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: x * 12, y: -y * 12 });
  };

  const handleMouseLeave = () => setTilt({ x: 0, y: 0 });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 8) return setError('Password minimal 8 karakter');
    if (password !== confirmPassword) return setError('Konfirmasi password tidak sama');
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/invitations/${token}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal membuat akun');

      localStorage.setItem('axara_token', data.accessToken);
      localStorage.setItem('axara_refresh_token', data.refreshToken);
      localStorage.setItem('axara_user', JSON.stringify(data.user));
      setSuccess(true);
      setTimeout(() => onAccepted?.(data.user), 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getCardStyle = (idx) => {
    let diff = (idx - activeCardIdx + mockCards.length) % mockCards.length;
    if (diff === mockCards.length - 1) {
      return { transform: 'translate(-260px, -30px) rotate(-12deg) scale(0.9)', opacity: 0, zIndex: 10 };
    }
    const configs = [
      { transform: tilt.x !== 0 || tilt.y !== 0 ? `perspective(1000px) rotateX(${tilt.y}deg) rotateY(${tilt.x}deg) scale(1.02)` : 'perspective(1000px) rotate(-2deg) scale(1)', zIndex: 5, opacity: 1 },
      { transform: 'perspective(1000px) translate(14px, 18px) scale(0.95) rotate(2deg)', zIndex: 4, opacity: 0.9 },
      { transform: 'perspective(1000px) translate(28px, 36px) scale(0.90) rotate(5deg)', zIndex: 3, opacity: 0.65 },
    ];
    return { ...configs[diff] };
  };

  const pageStyle = {
    minHeight: '100vh',
    width: '100%',
    fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
    background: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    boxSizing: 'border-box',
  };

  if (loading) {
    return (
      <div style={pageStyle}>
        <div style={{ textAlign: 'center', color: '#64748b' }}>
          <div style={{ width: '32px', height: '32px', border: '3px solid #e2e8f0', borderTopColor: '#0B1628', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <p style={{ fontSize: '14px' }}>Memvalidasi undangan...</p>
        </div>
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div style={pageStyle}>
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <img src="/myaxara-logo.svg" alt="myAxara" style={{ maxWidth: '140px', marginBottom: '40px' }} />
          <div style={{ fontSize: '32px', marginBottom: '16px' }}>⚠️</div>
          <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', marginBottom: '8px' }}>Undangan Tidak Valid</h2>
          <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px' }}>{error}</p>
          <button
            onClick={() => window.location.href = '/'}
            style={{ padding: '12px 24px', background: '#0B1628', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}
          >
            Ke Halaman Login
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div style={pageStyle}>
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <img src="/myaxara-logo.svg" alt="myAxara" style={{ maxWidth: '140px', marginBottom: '40px' }} />
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎉</div>
          <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', marginBottom: '8px' }}>Akun Berhasil Dibuat!</h2>
          <p style={{ fontSize: '14px', color: '#64748b' }}>Mengalihkan ke dashboard supervisor...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
      `}</style>

      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1.1fr 1fr',
        width: '100%',
        maxWidth: '1060px',
        gap: '100px',
        alignItems: 'center',
        animation: 'fadeIn 0.6s ease-out',
      }}>
        {/* Left: Form */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', zIndex: 10 }}>
          <div style={{ width: '100%', maxWidth: '380px' }}>
            <img src="/myaxara-logo.svg" alt="myAxara" style={{ maxWidth: isMobile ? '120px' : '160px', height: 'auto', marginBottom: '24px' }} />

            <h1 style={{ fontSize: isMobile ? '22px' : '26px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px 0', letterSpacing: '-0.75px' }}>
              Selamat Datang, {name || invitation?.invited_name || 'Supervisor'}! 👋
            </h1>
            <p style={{ color: '#64748b', fontSize: '13px', margin: '0 0 32px 0', lineHeight: '1.5' }}>
              Anda diundang sebagai <strong style={{ color: '#2F7BFF' }}>supervisor</strong>
              {invitation?.dept && <> divisi <strong style={{ color: '#2F7BFF' }}>{invitation.dept}</strong></>}
              {invitation?.company && <> di <strong style={{ color: '#0f172a' }}>{invitation.company}</strong></>}.
              Buat password untuk mulai mereview staf Anda.
            </p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nama Lengkap</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Masukkan nama lengkap"
                  required
                  disabled={submitting}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '12px 16px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '16px', color: '#0f172a', outline: 'none', background: '#ffffff' }}
                  onFocus={e => { e.target.style.borderColor = '#002D72'; e.target.style.boxShadow = '0 0 0 3px rgba(0,45,114,0.1)'; }}
                  onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</label>
                <input
                  type="email"
                  value={invitation?.email || ''}
                  disabled
                  style={{ width: '100%', boxSizing: 'border-box', padding: '12px 16px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '16px', color: '#64748b', background: '#f8fafc', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Buat Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError(''); }}
                    placeholder="Minimal 8 karakter"
                    required
                    disabled={submitting}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '12px 44px 12px 16px', borderRadius: '10px', border: error ? '1.5px solid #ef4444' : '1.5px solid #cbd5e1', fontSize: '16px', color: '#0f172a', outline: 'none', background: '#ffffff' }}
                    onFocus={e => { e.target.style.borderColor = '#002D72'; e.target.style.boxShadow = '0 0 0 3px rgba(0,45,114,0.1)'; }}
                    onBlur={e => { e.target.style.borderColor = error ? '#ef4444' : '#cbd5e1'; e.target.style.boxShadow = 'none'; }}
                  />
                  <button type="button" onClick={() => setShowPassword(v => !v)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px' }}>
                    {showPassword
                      ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                      : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    }
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Konfirmasi Password</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => { setConfirmPassword(e.target.value); setError(''); }}
                  placeholder="Ulangi password"
                  required
                  disabled={submitting}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '12px 16px', borderRadius: '10px', border: error ? '1.5px solid #ef4444' : '1.5px solid #cbd5e1', fontSize: '16px', color: '#0f172a', outline: 'none', background: '#ffffff' }}
                  onFocus={e => { e.target.style.borderColor = '#002D72'; e.target.style.boxShadow = '0 0 0 3px rgba(0,45,114,0.1)'; }}
                  onBlur={e => { e.target.style.borderColor = error ? '#ef4444' : '#cbd5e1'; e.target.style.boxShadow = 'none'; }}
                />
              </div>

              {error && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#dc2626', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: '1px' }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                style={{ width: '100%', padding: '14px', borderRadius: '8px', background: submitting ? '#94a3b8' : '#0B1628', color: '#ffffff', border: 'none', fontSize: '14px', fontWeight: '700', cursor: submitting ? 'not-allowed' : 'pointer', boxShadow: submitting ? 'none' : '0 4px 12px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '6px', transition: 'transform 0.2s, background-color 0.2s' }}
                onMouseOver={e => { if (!submitting) { e.currentTarget.style.background = '#2F7BFF'; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
                onMouseOut={e => { if (!submitting) { e.currentTarget.style.background = '#0B1628'; e.currentTarget.style.transform = 'translateY(0)'; } }}
              >
                {submitting
                  ? <><span style={{ display: 'inline-block', width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#ffffff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />Membuat akun...</>
                  : 'Buat Akun & Mulai Review →'
                }
              </button>
            </form>

            <div style={{ marginTop: '28px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
              <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600', letterSpacing: '0.03em', whiteSpace: 'nowrap' }}>Powered by myAxara</span>
              <span style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
            </div>
          </div>
        </div>

        {/* Right: Animated Review Card Stack */}
        {!isMobile && (
          <div
            ref={tiltRef}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffffff', position: 'relative', overflow: 'hidden', borderRadius: '24px', width: '100%', height: '500px' }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <div style={{ position: 'relative', width: '340px', height: '340px', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'bounce-subtle 6s ease-in-out infinite' }}>
              {mockCards.map((card, idx) => {
                const s = getCardStyle(idx);
                return (
                  <div key={idx} style={{
                    position: 'absolute',
                    width: '340px',
                    padding: '20px 24px',
                    borderRadius: '20px',
                    background: '#ffffff',
                    boxShadow: s.zIndex === 5 ? '0 25px 50px rgba(15,23,42,0.10)' : '0 10px 30px rgba(15,23,42,0.05)',
                    border: '1.5px solid #f1f5f9',
                    transform: s.transform,
                    zIndex: s.zIndex,
                    opacity: s.opacity,
                    transition: 'all 0.8s cubic-bezier(0.4,0,0.2,1)',
                    pointerEvents: s.zIndex === 5 ? 'auto' : 'none',
                    boxSizing: 'border-box',
                  }}>
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#0B1628', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '13px', fontWeight: '700', flexShrink: 0 }}>
                        {card.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>{card.name}</div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>Divisi {invitation?.dept || 'Sales'}</div>
                      </div>
                      <div style={{ marginLeft: 'auto', fontSize: '11px', fontWeight: '700', color: card.color, background: card.bg, padding: '3px 10px', borderRadius: '20px' }}>
                        {card.status}
                      </div>
                    </div>

                    {/* SOP name */}
                    <div style={{ fontSize: '13px', color: '#475569', marginBottom: '12px', lineHeight: '1.4' }}>{card.sop}</div>

                    {/* Score bar */}
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>Skor Kuis</span>
                        <span style={{ fontSize: '12px', fontWeight: '700', color: card.color }}>{card.score}%</span>
                      </div>
                      <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${card.score}%`, background: card.color, borderRadius: '4px', transition: 'width 0.8s ease' }} />
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button style={{ flex: 1, padding: '8px', background: '#0B1628', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                        ✓ Rekomendasikan
                      </button>
                      <button style={{ flex: 1, padding: '8px', background: '#f8fafc', color: '#64748b', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                        ↩ Minta Ulang
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Label bawah */}
            <div style={{ position: 'absolute', bottom: '32px', left: 0, right: 0, textAlign: 'center' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a', marginBottom: '4px' }}>Review Sertifikat Staf</div>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>Rekomendasikan atau minta remedial — semua dari satu dashboard</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
