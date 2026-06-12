import React, { useState } from 'react';

export const LoginPage = ({ onLogin }) => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Load tenant database from localStorage to simulate dynamic branding in login page
  const getStoredTenant = () => {
    try {
      const data = localStorage.getItem('axara_lms_db');
      if (data) {
        const parsed = JSON.parse(data);
        return parsed.tenant;
      }
    } catch (e) {
      // ignore
    }
    return { name: 'PT Maju Bersama', plan: 'business', status: 'Aktif', logo: null };
  };

  const tenant = getStoredTenant();

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
      {/* Left side decoration panel */}
      <div style={styles.leftPanel}>
        <div style={styles.brandingBox}>
          <div style={styles.brandingLogoContainer}>
            {tenant.logo ? (
              <img src={tenant.logo} alt={tenant.name} style={{ maxWidth: '100%', maxHeight: '45px', objectFit: 'contain' }} />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '20px' }}>🏢</span>
                <span style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>{tenant.name}</span>
              </div>
            )}
          </div>
          <div style={styles.tagline}>
            <div style={{ fontSize: '24px', fontWeight: '800', color: '#ffffff', marginBottom: '10px', lineHeight: '1.3' }}>
              White-Label LMS Platform
            </div>
            <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', lineHeight: '1.5' }}>
              Akses materi pembelajaran mandiri, tonton SOP Divisi, dan ikuti uji kompetensi tersinkronisasi dalam satu platform terintegrasi.
            </div>
          </div>
          <div style={styles.platformFooter}>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: '600', letterSpacing: '0.05em' }}>
              POWERED BY AXARA LMS PLATFORM
            </div>
          </div>
        </div>
      </div>

      {/* Right side form card */}
      <div style={styles.rightPanel}>
        <div style={styles.card}>
          <h2 style={styles.heading}>Masuk ke Akun Anda</h2>
          <p style={styles.subheading}>Silakan masukkan detail akun Mekari Talenta / LMS Anda</p>

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
              <input
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                style={styles.input}
                required
              />
            </div>

            {error && <div style={styles.error}>{error}</div>}

            <button type="submit" style={{ ...styles.btn, opacity: loading ? 0.7 : 1 }} disabled={loading}>
              {loading ? 'Memproses Masuk...' : 'Masuk Sekarang'}
            </button>
          </form>

          <div style={styles.footer}>
            Belum memiliki akses? Silakan hubungi Administrator HRD perusahaan Anda untuk pendaftaran akun baru.
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  wrapper: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'row',
    background: '#f8fafc',
  },
  leftPanel: {
    flex: '1.2',
    background: 'linear-gradient(135deg, #0f1e33 0%, #1a3a5c 100%)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '40px',
    position: 'relative',
  },
  brandingBox: {
    maxWidth: '440px',
    display: 'flex',
    flexDirection: 'column',
    gap: '30px',
  },
  brandingLogoContainer: {
    background: '#ffffff',
    borderRadius: '20px',
    boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '300px',
    height: '72px',
  },
  tagline: {
    marginTop: '20px',
  },
  platformFooter: {
    marginTop: '40px',
    borderTop: '1px solid rgba(255,255,255,0.1)',
    paddingTop: '20px',
  },
  rightPanel: {
    flex: '1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px',
    background: '#ffffff',
  },
  card: {
    width: '100%',
    maxWidth: '400px',
  },
  heading: {
    fontSize: '24px',
    fontWeight: '800',
    color: '#0f172a',
    margin: '0 0 8px',
    letterSpacing: '-0.5px',
  },
  subheading: {
    fontSize: '14px',
    color: '#64748b',
    margin: '0 0 32px',
    lineHeight: '1.5',
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
    textAlign: 'left',
  },
};
