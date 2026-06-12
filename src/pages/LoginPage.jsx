import React, { useState } from 'react';

export const LoginPage = ({ onLogin }) => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const BASE_URL = import.meta.env.VITE_API_URL || 'https://axara-lms-backend.onrender.com';
      const res = await fetch(`${BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, password: form.password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login gagal');

      localStorage.setItem('axara_token', data.accessToken);
      localStorage.setItem('axara_refresh_token', data.refreshToken);
      localStorage.setItem('axara_user', JSON.stringify(data.user));

      onLogin(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <h2 style={styles.heading}>Masuk ke Akun Anda</h2>
        <p style={styles.subheading}>Silakan masukkan email corporate dan password Anda</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>EMAIL CORPORATE</label>
            <input
              type="email"
              placeholder="email@perusahaan.com"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              style={styles.input}
              required
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>PASSWORD</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                style={{ ...styles.input, width: '100%', paddingRight: '45px' }}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '4px'
                }}
              >
                {showPassword ? (
                  // Eye Slash Icon
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                ) : (
                  // Eye Icon
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <button type="submit" style={{ ...styles.btn, opacity: loading ? 0.7 : 1 }} disabled={loading}>
            {loading ? 'Memproses Masuk...' : 'Masuk Sekarang'}
          </button>
        </form>

        <div style={styles.footer}>
          Belum memiliki akses? Silakan hubungi Administrator HRD perusahaan Anda untuk pendaftaran akun baru.
        </div>

        <div style={styles.platformBranding}>
          Powered by Axara
        </div>
      </div>
    </div>
  );
};

const styles = {
  wrapper: {
    minHeight: '100vh',
    width: '100vw',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f5f7fa',
    padding: '24px',
    boxSizing: 'border-box',
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 9999
  },
  card: {
    background: '#ffffff',
    borderRadius: '16px',
    padding: '40px',
    width: '100%',
    maxWidth: '440px',
    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05), 0 8px 10px -6px rgba(0,0,0,0.05)',
    border: '1px solid #e2e8f0',
    boxSizing: 'border-box'
  },
  heading: {
    fontSize: '24px',
    fontWeight: '800',
    color: '#0f172a',
    margin: '0 0 8px',
    letterSpacing: '-0.5px',
    textAlign: 'center',
  },
  subheading: {
    fontSize: '14px',
    color: '#64748b',
    margin: '0 0 32px',
    lineHeight: '1.5',
    textAlign: 'center',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '12px',
    fontWeight: '700',
    color: '#475569',
    letterSpacing: '0.05em',
  },
  input: {
    padding: '13px 16px',
    borderRadius: '8px',
    border: '1.5px solid #cbd5e1',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s',
    color: '#0f172a',
    background: '#f8fafc',
  },
  error: {
    background: '#fef2f2',
    border: '1px solid #fca5a5',
    borderRadius: '8px',
    padding: '12px 16px',
    fontSize: '13px',
    color: '#b91c1c',
  },
  btn: {
    padding: '14px',
    borderRadius: '8px',
    background: '#002D72',
    color: '#fff',
    fontSize: '14px',
    fontWeight: '700',
    border: 'none',
    cursor: 'pointer',
    marginTop: '6px',
    boxShadow: '0 4px 12px rgba(0,45,114,0.15)',
  },
  footer: {
    marginTop: '32px',
    fontSize: '12px',
    color: '#94a3b8',
    lineHeight: '1.6',
    textAlign: 'center',
  },
  platformBranding: {
    marginTop: '24px',
    borderTop: '1px solid #e2e8f0',
    paddingTop: '16px',
    textAlign: 'center',
    fontSize: '11px',
    color: '#94a3b8',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  }
};
