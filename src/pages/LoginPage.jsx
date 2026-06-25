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

  // Indonesian names and warm portraits
  const employees = [
    {
      url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=300&h=300',
      name: 'Rini Wulandari',
      dept: 'Sales Manager',
      quote: '"Video SOP sangat membantu saya memahami regulasi penjualan terbaru dengan cepat."',
      achievement: 'Onboarding Sales · Lulus 100%'
    },
    {
      url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=300&h=300',
      name: 'Hendra Fitriadi',
      dept: 'HR Coordinator',
      quote: '"Proses training onboarding karyawan baru sekarang 100% otomatis dan terpantau."',
      achievement: 'Pelatihan HR Kepatuhan · Lulus'
    },
    {
      url: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&q=80&w=300&h=300',
      name: 'Sari Anggraeni',
      dept: 'Customer Service',
      quote: '"Kuis interaktif di akhir setiap video SOP membuat belajar materi baru jadi lebih menyenangkan."',
      achievement: 'Standard Pelayanan CS · Lulus'
    },
    {
      url: 'https://images.unsplash.com/photo-1607990283143-e81e7a2c93ab?auto=format&fit=crop&q=80&w=300&h=300',
      name: 'Budi Pratama',
      dept: 'Finance Specialist',
      quote: '"Semua regulasi kepatuhan keuangan terdokumentasi rapi dan mudah diakses kapan saja."',
      achievement: 'Prosedur Audit Keuangan · Lulus'
    },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveEmpIdx(prev => (prev + 1) % employees.length);
    }, 4500); // 4.5 seconds for plenty of reading time
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

  const getCardStyle = (idx) => {
    let diff = (idx - activeEmpIdx + employees.length) % employees.length;
    
    // Swipe out card
    if (diff === employees.length - 1) {
      return {
        position: 'absolute',
        width: '400px',
        padding: '30px',
        borderRadius: '20px',
        background: '#ffffff',
        boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.08)',
        border: '1.5px solid #f1f5f9',
        transform: 'translate(-300px, -45px) rotate(-14deg) scale(0.9)',
        opacity: 0,
        zIndex: 10,
        transition: 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
        pointerEvents: 'none',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      };
    }
    
    if (diff >= 3) {
      return {
        position: 'absolute',
        width: '400px',
        padding: '30px',
        borderRadius: '20px',
        background: '#ffffff',
        opacity: 0,
        transform: 'translate(50px, 50px) scale(0.8) rotate(8deg)',
        zIndex: 0,
        transition: 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
        pointerEvents: 'none',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      };
    }
    
    const offsets = [
      { x: 0, y: 0, scale: 1, rotate: -2, zIndex: 5, opacity: 1 },
      { x: 18, y: 22, scale: 0.95, rotate: 2, zIndex: 4, opacity: 0.9 },
      { x: 36, y: 44, scale: 0.90, rotate: 6, zIndex: 3, opacity: 0.65 }
    ];
    
    const config = offsets[diff];
    return {
      position: 'absolute',
      width: '400px',
      padding: '30px',
      borderRadius: '20px',
      background: '#ffffff',
      boxShadow: '0 20px 45px rgba(15, 23, 42, 0.08)',
      border: '1.5px solid #f1f5f9',
      transform: `translate(${config.x}px, ${config.y}px) scale(${config.scale}) rotate(${config.rotate}deg)`,
      zIndex: config.zIndex,
      opacity: config.opacity,
      transition: 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
      pointerEvents: diff === 0 ? 'auto' : 'none',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px'
    };
  };

  return (
    <div style={styles.wrapper}>
      {/* CSS Animation injection */}
      <style>{`
        @keyframes rotate-ring-reverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        @keyframes rotate-ring {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
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

        {/* RIGHT COLUMN: Masked Card Stack of Employee Profiles */}
        <div style={styles.rightCol}>
          {/* Blueprint/grid pattern background */}
          <div style={styles.decorGridBackground}></div>
          <div style={styles.decorCircleLarge}></div>
          <div style={styles.decorCircleSmall}></div>

          <div style={styles.rightColContent}>
            {/* Card Stack Container */}
            <div style={styles.stackWrapper}>
              {employees.map((emp, idx) => (
                <div key={idx} style={getCardStyle(idx)}>
                  {/* Card Header: Profile Info */}
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={styles.avatarWrap}>
                      <img src={emp.url} alt={emp.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div>
                      <div style={{ fontSize: '17px', fontWeight: '800', color: 'var(--text1)', letterSpacing: '-0.3px' }}>{emp.name}</div>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px' }}>{emp.dept}</div>
                    </div>
                  </div>

                  {/* Card Body: Testimonial */}
                  <div style={{ fontSize: '14.5px', fontStyle: 'italic', color: 'var(--text2)', lineHeight: '1.6', flex: 1 }}>
                    {emp.quote}
                  </div>

                  {/* Card Footer: Achievement Badge */}
                  <div style={styles.badgeWrap}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>{emp.achievement}</span>
                  </div>
                </div>
              ))}
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
    gridTemplateColumns: '1.1fr 1fr',
    width: '100%',
    maxWidth: '1060px',
    margin: '0 auto',
    gap: '100px',
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
    borderRadius: '24px',
  },
  decorGridBackground: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(90deg, #f8fafc 1px, transparent 1px), linear-gradient(0deg, #f8fafc 1px, transparent 1px)',
    backgroundSize: '48px 48px',
    opacity: 0.7,
    zIndex: 1,
  },
  decorCircleLarge: {
    position: 'absolute',
    width: '420px',
    height: '420px',
    borderRadius: '50%',
    border: '1.5px dashed #e2e8f0',
    bottom: '-120px',
    right: '-120px',
    opacity: 0.4,
    zIndex: 1,
    animation: 'rotate-ring-reverse 45s linear infinite',
  },
  decorCircleSmall: {
    position: 'absolute',
    width: '240px',
    height: '240px',
    borderRadius: '50%',
    border: '1px dashed #cbd5e1',
    top: '-80px',
    left: '-80px',
    opacity: 0.3,
    zIndex: 1,
    animation: 'rotate-ring 30s linear infinite',
  },
  rightColContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
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
  stackWrapper: {
    position: 'relative',
    width: '440px',
    height: '380px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    animation: 'bounce-subtle 6s ease-in-out infinite',
  },
  avatarWrap: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    overflow: 'hidden',
    marginRight: '16px',
    border: '3px solid #ffffff',
    boxShadow: '0 6px 16px rgba(0,0,0,0.1)',
    flexShrink: 0,
  },
  badgeWrap: {
    display: 'inline-flex',
    alignItems: 'center',
    fontSize: '12px',
    fontWeight: '700',
    color: '#16a34a',
    background: '#f0fdf4',
    padding: '6px 12px',
    borderRadius: '20px',
    width: 'fit-content',
    border: '1px solid #bbf7d0',
  }
};
