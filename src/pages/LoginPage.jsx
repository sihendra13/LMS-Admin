import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';

export const LoginPage = ({ onLogin }) => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [slowWarning, setSlowWarning] = useState(false);
  const [error, setError] = useState('');
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [activeEmpIdx, setActiveEmpIdx] = useState(0);

  const employees = [
    {
      url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=600&h=600',
      name: 'Rini Wulandari',
      dept: 'Sales Manager',
      quote: '"Video SOP sangat membantu saya memahami regulasi penjualan terbaru dengan cepat."'
    },
    {
      url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=600&h=600',
      name: 'Hendra Fitriadi',
      dept: 'HR Coordinator',
      quote: '"Proses training onboarding karyawan baru sekarang 100% otomatis dan terpantau."'
    },
    {
      url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=600&h=600',
      name: 'Sari Anggraeni',
      dept: 'Customer Service',
      quote: '"Kuis interaktif di akhir setiap video SOP membuat belajar materi baru jadi lebih menyenangkan."'
    },
    {
      url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=600&h=600',
      name: 'Budi Pratama',
      dept: 'Finance Specialist',
      quote: '"Semua regulasi kepatuhan keuangan terdokumentasi rapi dan mudah diakses kapan saja."'
    },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveEmpIdx(prev => (prev + 1) % employees.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!form.email) { setError('Masukkan email terlebih dahulu.'); return; }
    setForgotLoading(true);
    setError('');
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(form.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (err) throw err;
      setForgotSuccess(true);
    } catch (err) {
      setError(err.message || 'Gagal mengirim email reset.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setSlowWarning(false);

    const slowTimer = setTimeout(() => setSlowWarning(true), 4000);

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      });
      if (authError) throw new Error(authError.message);

      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('id, name, role, avatar, tenant_id')
        .eq('id', authData.user.id)
        .single();
      if (profileError) throw new Error('Gagal mengambil profil pengguna.');

      const user = {
        id: profile.id,
        name: profile.name,
        role: profile.role,
        avatar: profile.avatar || profile.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(),
      };

      localStorage.setItem('axara_token', authData.session.access_token);
      localStorage.setItem('axara_refresh_token', authData.session.refresh_token);
      localStorage.setItem('axara_user', JSON.stringify(user));

      onLogin(user);
    } catch (err) {
      setError(err.message || 'Login gagal. Periksa email dan password.');
    } finally {
      clearTimeout(slowTimer);
      setLoading(false);
      setSlowWarning(false);
    }
  };

  return (
    <div style={styles.wrapper}>
      {/* CSS Animation injection */}
      <style>{`
        @keyframes rotate-ring {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      <div style={styles.innerContainer}>
        {/* LEFT COLUMN: Login Form */}
        <div style={styles.leftCol}>
          <div style={styles.formContainer}>
            <h2 style={styles.heading}>Masuk ke Akun Anda</h2>
            <p style={styles.subheading}>Silakan masukkan email corporate dan password Anda</p>

            {forgotSuccess ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '40px', marginBottom: '16px' }}>📧</div>
                <div style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', marginBottom: '8px' }}>Email Terkirim!</div>
                <div style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.6', marginBottom: '24px' }}>
                  Link reset password sudah dikirim ke <strong>{form.email}</strong>. Cek inbox atau folder spam Anda.
                </div>
                <button onClick={() => { setForgotSuccess(false); setForgotMode(false); }} style={styles.btn}>
                  Kembali ke Login
                </button>
              </div>
            ) : forgotMode ? (
              <form onSubmit={handleForgotPassword} style={styles.form}>
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
                {error && <div style={styles.error}>{error}</div>}
                <button type="submit" style={{ ...styles.btn, opacity: forgotLoading ? 0.7 : 1 }} disabled={forgotLoading}>
                  {forgotLoading ? 'Mengirim...' : 'Kirim Link Reset Password'}
                </button>
                <button type="button" onClick={() => { setForgotMode(false); setError(''); }} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '13px', cursor: 'pointer', textAlign: 'center', marginTop: '4px' }}>
                  Kembali ke Login
                </button>
              </form>
            ) : (
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={styles.label}>PASSWORD</label>
                    <button type="button" onClick={() => { setForgotMode(true); setError(''); }} style={{ background: 'none', border: 'none', color: '#002D72', fontSize: '12px', fontWeight: '600', cursor: 'pointer', padding: 0 }}>
                      Lupa Password?
                    </button>
                  </div>
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
                      style={styles.eyeBtn}
                    >
                      {showPassword ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                          <line x1="1" y1="1" x2="23" y2="23"></line>
                        </svg>
                      ) : (
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
                {slowWarning && (
                  <div style={{ fontSize: '12px', color: '#64748b', textAlign: 'center', marginTop: '-8px', lineHeight: '1.5' }}>
                    Server sedang menyala, mohon tunggu sebentar...
                  </div>
                )}
              </form>
            )}

            <div style={styles.footer}>
              Belum memiliki akses? Silakan hubungi Administrator HRD perusahaan Anda untuk pendaftaran akun baru.
            </div>

            <div style={styles.platformBranding}>
              Powered by Axara
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Masked Slideshow of Employee Faces */}
        <div style={styles.rightCol}>
          <div style={styles.rightColContent}>
            {/* Photo Ring & Slideshow Wrapper */}
            <div style={styles.photoRingWrapper}>
              {/* Rotating Decorative dashed Ring */}
              <div style={styles.rotatingRing}></div>
              
              {/* Slideshow container for circular photos */}
              <div style={styles.slideshowContainer}>
                {employees.map((emp, idx) => {
                  const isActive = idx === activeEmpIdx;
                  return (
                    <div
                      key={idx}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: isActive ? 1 : 0,
                        transform: isActive ? 'scale(1)' : 'scale(0.9)',
                        transition: 'opacity 0.8s ease-in-out, transform 0.8s ease-in-out',
                        pointerEvents: isActive ? 'auto' : 'none',
                      }}
                    >
                      <div style={styles.imageMaskCircle}>
                        <img
                          src={emp.url}
                          alt={emp.name}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Caption info (outside loop to prevent text overlapping) */}
            <div style={{ marginTop: '32px', textAlign: 'center', maxWidth: '320px', padding: '0 16px', minHeight: '120px' }}>
              <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text1)' }}>
                {employees[activeEmpIdx].name}
              </div>
              <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--accent)', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {employees[activeEmpIdx].dept}
              </div>
              <div style={{ fontSize: '14px', fontStyle: 'italic', color: 'var(--text2)', marginTop: '16px', lineHeight: '1.6' }}>
                {employees[activeEmpIdx].quote}
              </div>
            </div>
          </div>
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
    background: '#ffffff',
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 9999,
    boxSizing: 'border-box',
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    padding: '40px',
  },
  innerContainer: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    width: '100%',
    maxWidth: '860px',
    margin: '0 auto',
    gap: '40px',
  },
  leftCol: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxSizing: 'border-box',
    width: '100%',
  },
  rightCol: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#ffffff',
    position: 'relative',
    overflow: 'hidden',
  },
  rightColContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formContainer: {
    width: '100%',
    maxWidth: '400px',
    display: 'flex',
    flexDirection: 'column',
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
    fontSize: '11px',
    fontWeight: '800',
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
    boxSizing: 'border-box',
  },
  eyeBtn: {
    position: 'absolute',
    right: '12px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#64748b',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4px',
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
  },
  photoRingWrapper: {
    position: 'relative',
    width: '270px',
    height: '270px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rotatingRing: {
    position: 'absolute',
    width: '266px',
    height: '266px',
    borderRadius: '50%',
    border: '2px dashed var(--accent)',
    opacity: 0.35,
    animation: 'rotate-ring 24s linear infinite',
  },
  slideshowContainer: {
    position: 'relative',
    width: '250px',
    height: '250px',
  },
  imageMaskCircle: {
    width: '250px',
    height: '250px',
    borderRadius: '50%',
    overflow: 'hidden',
    boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
    border: '4px solid #ffffff',
  },
};
