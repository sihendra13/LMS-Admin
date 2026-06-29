import React, { useState, useEffect } from 'react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://axara-lms-backend.onrender.com';

export const AcceptInvitation = ({ token, onAccepted }) => {
  const [invitation, setInvitation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 8) return setError('Password minimal 8 karakter');
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

  const containerStyle = {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #0b1628, #1a2d4a)',
    fontFamily: "'Inter', sans-serif",
    padding: '20px',
  };

  const cardStyle = {
    background: '#fff',
    borderRadius: '16px',
    padding: '48px',
    width: '100%',
    maxWidth: '480px',
    minWidth: '340px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
    boxSizing: 'border-box',
  };

  if (loading) {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <p style={{ textAlign: 'center', color: '#64748b' }}>Memvalidasi undangan...</p>
        </div>
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#dc2626', marginBottom: '12px', textAlign: 'center' }}>Undangan Tidak Valid</h2>
          <p style={{ fontSize: '14px', color: '#64748b', textAlign: 'center' }}>{error}</p>
          <button
            onClick={() => window.location.href = '/'}
            style={{ marginTop: '20px', width: '100%', padding: '10px', background: '#002D72', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}
          >
            Ke Halaman Login
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#16a34a', marginBottom: '12px', textAlign: 'center' }}>Akun Berhasil Dibuat!</h2>
          <p style={{ fontSize: '14px', color: '#64748b', textAlign: 'center' }}>Mengalihkan ke dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '36px', marginBottom: '8px' }}>🎉</div>
          <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#0f172a', marginBottom: '4px' }}>Anda Diundang!</h2>
          <p style={{ fontSize: '13px', color: '#64748b' }}>
            Sebagai <strong style={{ color: '#2F7BFF' }}>{invitation.role}</strong> di <strong>{invitation.company}</strong>
          </p>
        </div>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px', marginBottom: '16px', fontSize: '13px', color: '#dc2626' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>NAMA LENGKAP</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Masukkan nama lengkap"
              required
              disabled={submitting}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>EMAIL</label>
            <input
              type="email"
              value={invitation.email}
              disabled
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', background: '#f3f4f6', color: '#6b7280', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>PASSWORD</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimal 8 karakter"
              required
              minLength={8}
              disabled={submitting}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            style={{
              width: '100%', padding: '12px', background: '#002D72', color: '#fff', border: 'none', borderRadius: '8px',
              fontSize: '14px', fontWeight: '600', cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting ? 'Membuat akun...' : 'Buat Akun & Masuk'}
          </button>
        </form>
      </div>
    </div>
  );
};
