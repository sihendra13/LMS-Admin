import React, { useState, useRef, useEffect } from 'react';
import { useTenant } from '../context/TenantContext';
import { getEmployeeLimit } from '../utils/featureGates';

export const Dashboard = () => {
  const { tenant, employees, videos, activities, setActivePage, currentUser, quizSubmissions, passingScore } = useTenant();

  const isSupervisor = currentUser.role !== 'admin';

  // Chat AXA Assistant state & logic
  const [chatMessages, setChatMessages] = useState([
    { id: 1, sender: 'ai', name: 'AXA', text: 'Halo Mohamad, saya telah menganalisis data minggu ini. Ada penurunan 12% pada departemen Marketing untuk penyelesaian SOP K3.', time: '09:41 AM' },
    { id: 2, sender: 'user', name: currentUser ? currentUser.name.split(' ')[0] + '.' : 'Moh.', text: 'Bisa tunjukkan detail karyawan yang belum selesai?', time: '09:42 AM' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);

  // Scroll to bottom when chat messages update
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isTyping]);

  const handleSendMessage = (text) => {
    if (!text.trim()) return;
    const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const userShortName = currentUser ? currentUser.name.split(' ')[0] + '.' : 'User';
    
    const userMsg = {
      id: Date.now(),
      sender: 'user',
      name: userShortName,
      text: text,
      time: now
    };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsTyping(true);

    // Simulate AI reply
    setTimeout(() => {
      let replyText = 'Tentu! Berikut beberapa analisis terkait data training karyawan Anda.';
      if (text.toLowerCase().includes('progres') || text.toLowerCase().includes('progress')) {
        replyText = 'Rata-rata progres training minggu ini mencapai 78%. Departemen CS memimpin dengan tingkat penyelesaian 94%.';
      } else if (text.toLowerCase().includes('laporan') || text.toLowerCase().includes('mingguan')) {
        replyText = 'Laporan mingguan menunjukkan peningkatan penyelesaian kuis sebesar 8%. Namun, departemen Marketing masih memerlukan perhatian khusus.';
      } else if (text.toLowerCase().includes('karyawan') || text.toLowerCase().includes('belum selesai')) {
        replyText = 'Berikut daftar karyawan departemen Marketing yang belum menyelesaikan SOP K3: Budi Santoso (progres 20%) dan Siti Aminah (progres 35%).';
      }
      
      const aiMsg = {
        id: Date.now() + 1,
        sender: 'ai',
        name: 'AXA',
        text: replyText,
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      };
      setChatMessages(prev => [...prev, aiMsg]);
      setIsTyping(false);
    }, 1200);
  };

  // Filter employees and videos by department for supervisor
  const displayEmployees = isSupervisor 
    ? employees.filter(e => e.dept.toLowerCase() === currentUser.dept.toLowerCase())
    : employees;

  const displayVideos = isSupervisor
    ? videos.filter(v => v.dept.toLowerCase() === currentUser.dept.toLowerCase())
    : videos;

  const displayActivities = isSupervisor
    ? activities.filter(act => {
        const nameMatch = displayEmployees.some(emp => act.text.includes(emp.name) || act.text.includes(emp.name.split(' ')[0]));
        return nameMatch || act.text.toLowerCase().includes(currentUser.dept.toLowerCase());
      })
    : activities;

  // Calculate stats dynamically based on mock data
  const totalSOPs = displayVideos.length;
  const activeEmployees = displayEmployees.length;
  const employeeLimit = getEmployeeLimit(tenant.plan);

  return (
    <div className="content">
      {/* STATS ROW */}
      <div className="stats-grid">
        <div className="stat-card blue">
          <div className="stat-icon blue">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
          </div>
          <div className="stat-label">Total Materi SOP</div>
          <div className="stat-value">{totalSOPs}</div>
          <div className="stat-change info">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 5 5 12"/></svg>
            +6 materi baru bulan ini
          </div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon green">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <div className="stat-label">Karyawan Terdaftar</div>
          <div className="stat-value">
            {activeEmployees}
            <span style={{ fontSize: '14px', color: 'var(--text3)', fontWeight: 'normal' }}>
              {' '}/ {employeeLimit === Infinity ? '∞' : employeeLimit}
            </span>
          </div>
          <div className="stat-change up">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 5 5 12"/></svg>
            Kuota Terpakai {Math.round((activeEmployees / (employeeLimit === Infinity ? 1000 : employeeLimit)) * 100)}%
          </div>
        </div>
        <div className="stat-card amber">
          <div className="stat-icon amber">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          </div>
          <div className="stat-label">Rata-rata Completion</div>
          <div className="stat-value">78%</div>
          <div className="stat-change up">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 5 5 12"/></svg>
            +12% vs bulan lalu
          </div>
        </div>
        <div className="stat-card purple">
          <div className="stat-icon purple">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>
          </div>
          <div className="stat-label">Sertifikat Diterbitkan</div>
          <div className="stat-value">186</div>
          <div className="stat-change info">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 5 5 12"/></svg>
            +24 minggu ini
          </div>
        </div>
      </div>

      {/* MAIN GRID */}
      <div className="main-grid">
        {/* VIDEO LIST */}
        <div className="card">
          <div className="card-head">
            <div className="card-title">Training & SOP Terbaru & Progress</div>
            <div className="card-action" onClick={() => setActivePage('sop')}>Lihat semua →</div>
          </div>
          <div className="card-body">
            {displayVideos.slice(0, 6).map((video) => (
              <div key={video.id} className="video-item">
                <div className="thumb" style={{ background: video.color }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" width="20" height="20">
                    <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>
                  </svg>
                  <div className="play-over">
                    <svg viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                  </div>
                </div>
                <div className="video-info">
                  <div className="video-title">{video.title}</div>
                  <div className="video-meta" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginTop: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span className={`dept-tag ${video.tagClass}`}>{video.dept}</span>
                       {video.type === 'ppt' ? (
                         <span style={{
                           fontSize: '10px',
                           fontWeight: '700',
                           background: '#f3f4f6',
                           color: '#4b5563',
                           border: '1px solid #e5e7eb',
                           padding: '1px 7px',
                           borderRadius: '4px',
                           display: 'inline-flex',
                           alignItems: 'center',
                           gap: '4px'
                         }}>
                           <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#6b7280', flexShrink: 0 }}>
                             <line x1="18" y1="20" x2="18" y2="10" />
                             <line x1="12" y1="20" x2="12" y2="4" />
                             <line x1="6" y1="20" x2="6" y2="14" />
                           </svg>
                           {video.slideCount ? `${video.slideCount} slide` : (video.duration || '? slide')}
                         </span>
                       ) : (
                         <span style={{
                           fontSize: '10px',
                           fontWeight: '700',
                           background: '#f3f4f6',
                           color: '#4b5563',
                           border: '1px solid #e5e7eb',
                           padding: '1px 7px',
                           borderRadius: '4px',
                           display: 'inline-flex',
                           alignItems: 'center',
                           gap: '4px'
                         }}>
                           <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#6b7280', flexShrink: 0 }}>
                             <circle cx="12" cy="12" r="10" />
                             <polyline points="12 6 12 12 16 14" />
                           </svg>
                           {video.duration}
                         </span>
                       )}
                      {video.type === 'ppt' && video.narasiMode && video.narasiMode !== 'none' && (
                         <span style={{
                           display: 'inline-flex',
                           alignItems: 'center',
                           gap: '4px',
                           fontSize: '10px',
                           fontWeight: '700',
                           color: '#7c3aed',
                           background: '#f5f3ff',
                           border: '1px solid #ddd6fe',
                           padding: '1px 7px',
                           borderRadius: '4px'
                         }}>
                           <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                             <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                             <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                             <line x1="12" y1="19" x2="12" y2="23"/>
                             <line x1="8" y1="23" x2="16" y2="23"/>
                           </svg>
                           Narasi: {video.narasiMode}
                         </span>
                       )}
                      {video.deadline && (() => {
                        const today = new Date(); today.setHours(0,0,0,0);
                        const dl = new Date(video.deadline);
                        const diff = Math.ceil((dl - today) / (1000 * 60 * 60 * 24));
                        const dateStr = dl.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
                        const label = diff < 0 ? `Deadline terlewat · ${dateStr}` : diff === 0 ? `Deadline hari ini · ${dateStr}` : `Deadline ${diff} hari lagi · ${dateStr}`;
                        const color = diff < 0 ? '#ef4444' : diff <= 3 ? '#d97706' : '#ea580c';
                        const bg = diff < 0 ? '#fef2f2' : diff <= 3 ? '#fffbeb' : '#fff7ed';
                        const borderCol = diff < 0 ? '#fecaca' : diff <= 3 ? '#fde68a' : '#fed7aa';
                        
                        let icon;
                        if (diff < 0) {
                          icon = (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                              <line x1="12" y1="9" x2="12" y2="13"/>
                              <line x1="12" y1="17" x2="12.01" y2="17"/>
                            </svg>
                          );
                        } else if (diff <= 3) {
                          icon = (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                            </svg>
                          );
                        } else {
                          icon = (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                              <line x1="16" y1="2" x2="16" y2="6"/>
                              <line x1="8" y1="2" x2="8" y2="6"/>
                              <line x1="3" y1="10" x2="21" y2="10"/>
                            </svg>
                          );
                        }

                        return (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '10px',
                            fontWeight: '700',
                            color,
                            background: bg,
                            border: `1px solid ${borderCol}`,
                            padding: '1px 7px',
                            borderRadius: '4px'
                          }}>
                            {icon}
                            {label}
                          </span>
                        );
                      })()}
                    </div>
                    {(() => {
                      const deptEmps = video.dept === 'Semua' ? employees : employees.filter(e => e.dept.toLowerCase() === video.dept.toLowerCase());
                      const lulus = quizSubmissions.filter(s => s.videoTitle === video.title && (s.postScore ?? 0) >= passingScore).length;
                      return (
                        <div style={{ fontSize: '11px', color: 'var(--text3)', whiteSpace: 'nowrap', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <span>Diikuti oleh {deptEmps.length} karyawan</span>
                          <span style={{ color: '#d1d5db' }}>|</span>
                          <span style={{ color: '#16a34a', fontWeight: '700' }}>{lulus} Lulus</span>
                        </div>
                      );
                    })()}
                  </div>
                  {(() => {
                    const deptEmps = video.dept === 'Semua' ? employees : employees.filter(e => e.dept.toLowerCase() === video.dept.toLowerCase());
                    const lulus = quizSubmissions.filter(s => s.videoTitle === video.title && (s.postScore ?? 0) >= passingScore).length;
                    const pct = deptEmps.length > 0 ? Math.round((lulus / deptEmps.length) * 100) : 0;
                    return (
                      <div className="prog-wrap" style={{ marginTop: '8px', width: '100%' }}>
                        <div className="prog-bar">
                          <div className="prog-fill" style={{ width: `${pct}%`, background: 'var(--accent)' }}></div>
                        </div>
                        <div className="prog-pct">{pct}% Lulus</div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SIDE COLUMN */}
        <div className="side-col">
          {/* AXA ASSISTANT CARD */}
          <div className="card axa-card-glow" style={{ overflow: 'hidden' }}>
            <div className="card-head" style={{ borderBottom: '1px solid var(--border)', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #a78bfa, var(--accent))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white'
                }}>
                  <svg className="axa-sparkle-pulse" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m11.314 11.314l.707-.707" />
                  </svg>
                </div>
                <div>
                  <div className="card-title" style={{ fontSize: '14px', fontWeight: '700' }}>AXA Assistant</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '1px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }}></span>
                    <span style={{ fontSize: '10px', color: '#16a34a', fontWeight: '600' }}>Online & Ready</span>
                  </div>
                </div>
              </div>
              <button style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: '4px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" />
                </svg>
              </button>
            </div>

            <div className="chat-container">
              {chatMessages.map((msg) => (
                <div key={msg.id} className={`chat-bubble-wrapper ${msg.sender}`}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px', alignSelf: msg.sender === 'ai' ? 'flex-start' : 'flex-end' }}>
                    {msg.sender === 'ai' ? (
                      <div style={{ width: '18px', height: '18px', borderRadius: '4px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #dbeafe' }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="3">
                          <path d="M12 3v1m0 16v1m9-9h-1M4 12H3" />
                        </svg>
                      </div>
                    ) : (
                      <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--text2)" strokeWidth="2.5">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                        </svg>
                      </div>
                    )}
                    <span className="chat-avatar-label">{msg.name}</span>
                  </div>
                  <div className={`chat-bubble chat-bubble-${msg.sender}`}>
                    {msg.text}
                    <span className="chat-time">{msg.time}</span>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="typing-indicator">
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div style={{ padding: '0 15px 10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text3)', letterSpacing: '0.05em' }}>SARAN ANALISIS</div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => handleSendMessage('Analisis Progres')}
                  style={{
                    padding: '5px 10px',
                    borderRadius: '15px',
                    border: '1px solid var(--border)',
                    background: '#ffffff',
                    fontSize: '11px',
                    fontWeight: '600',
                    color: 'var(--text2)',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.15s'
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.color = 'var(--accent)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.color = 'var(--text2)'; }}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
                  Analisis Progres
                </button>
                <button
                  onClick={() => handleSendMessage('Laporan Mingguan')}
                  style={{
                    padding: '5px 10px',
                    borderRadius: '15px',
                    border: '1px solid var(--border)',
                    background: '#ffffff',
                    fontSize: '11px',
                    fontWeight: '600',
                    color: 'var(--text2)',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.15s'
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.color = 'var(--accent)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.color = 'var(--text2)'; }}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  Laporan Mingguan
                </button>
              </div>
            </div>

            <form
              onSubmit={(e) => { e.preventDefault(); handleSendMessage(chatInput); }}
              className="chat-input-container"
            >
              <div className="chat-input-wrapper">
                <input
                  type="text"
                  placeholder="Tanya sesuatu..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  className="chat-input"
                />
                <div className="chat-input-icon">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                    <line x1="12" y1="19" x2="12" y2="23"/>
                    <line x1="8" y1="23" x2="16" y2="23"/>
                  </svg>
                </div>
              </div>
              <button
                type="submit"
                className="chat-send-btn"
                title="Kirim pesan"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ transform: 'rotate(-45deg) translate(1px, -1px)' }}>
                  <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </form>
          </div>

          {/* COMPLETION PER DEPT / PROG DIVISI */}
          <div className="card">
            <div className="card-head">
              <div className="card-title">
                {isSupervisor ? `Progres Training Divisi ${currentUser.dept}` : 'Completion per Departemen'}
              </div>
            </div>
            <div className="card-body">
              {isSupervisor ? (
                displayVideos.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', fontSize: '12px', color: 'var(--text3)' }}>
                    Belum ada materi SOP ditugaskan untuk divisi {currentUser.dept}.
                  </div>
                ) : (
                  displayVideos.map((video) => (
                    <div key={video.id} className="dept-item">
                      <div className="dept-ic" style={{ background: '#eff6ff' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2F7BFF" strokeWidth="2">
                          <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>
                        </svg>
                      </div>
                      <div className="dept-label">
                        <div className="dept-name" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '160px' }} title={video.title}>
                          {video.title.replace('SOP Sales: ', '').replace('SOP Finance: ', '').replace('SOP HRD: ', '').replace('SOP Operasional: ', '')}
                        </div>
                        <div className="dept-pbar">
                          <div className="dept-pfill" style={{ width: `${video.progress}%`, background: 'var(--accent)' }}></div>
                        </div>
                      </div>
                      <div className="dept-num">{video.progress}%</div>
                    </div>
                  ))
                )
              ) : (
                <>
                  <div className="dept-item">
                    <div className="dept-ic" style={{ background: '#eff6ff' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2F7BFF" strokeWidth="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
                    </div>
                    <div className="dept-label">
                      <div className="dept-name">Sales</div>
                      <div className="dept-pbar"><div className="dept-pfill" style={{ width: '89%', background: '#2F7BFF' }}></div></div>
                    </div>
                    <div className="dept-num">89%</div>
                  </div>
                  <div className="dept-item">
                    <div className="dept-ic" style={{ background: '#f0fdf4' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                    </div>
                    <div className="dept-label">
                      <div className="dept-name">HRD</div>
                      <div className="dept-pbar"><div className="dept-pfill" style={{ width: '76%', background: '#10b981' }}></div></div>
                    </div>
                    <div className="dept-num">76%</div>
                  </div>
                  <div className="dept-item">
                    <div className="dept-ic" style={{ background: '#fffbeb' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><rect x="1" y="3" width="15" height="13" rx="2"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                    </div>
                    <div className="dept-label">
                      <div className="dept-name">Operasional</div>
                      <div className="dept-pbar"><div className="dept-pfill" style={{ width: '61%', background: '#f59e0b' }}></div></div>
                    </div>
                    <div className="dept-num">61%</div>
                  </div>
                  <div className="dept-item">
                    <div className="dept-ic" style={{ background: '#f5f3ff' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                    </div>
                    <div className="dept-label">
                      <div className="dept-name">Finance</div>
                      <div className="dept-pbar"><div className="dept-pfill" style={{ width: '94%', background: '#8b5cf6' }}></div></div>
                    </div>
                    <div className="dept-num">94%</div>
                  </div>
                  <div className="dept-item">
                    <div className="dept-ic" style={{ background: '#ecfeff' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    </div>
                    <div className="dept-label">
                      <div className="dept-name">Customer Service</div>
                      <div className="dept-pbar"><div className="dept-pfill" style={{ width: '70%', background: '#06b6d4' }}></div></div>
                    </div>
                    <div className="dept-num">70%</div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* LEADERBOARD */}
          <div className="card">
            <div className="card-head">
              <div className="card-title">Top Learners Bulan Ini</div>
              <div className="card-action" onClick={() => setActivePage('karyawan')}>Lihat semua</div>
            </div>
            <div className="card-body">
              {displayEmployees.slice(0, 5).map((emp, i) => {
                const ranks = ['🥇', '🥈', '🥉', '4', '5'];
                const avColors = ['#d97706', '#64748b', '#2563eb', '#0891b2', '#7c3aed'];
                const initials = emp.name.split(' ').map(n => n[0]).join('');
                return (
                  <div key={emp.id} className="lb-item">
                    <div className={`lb-rank ${i < 3 ? 'r' + (i+1) : ''}`}>{ranks[i]}</div>
                    <div className="lb-av" style={{ background: avColors[i % avColors.length] }}>{initials}</div>
                    <div className="lb-info">
                      <div className="lb-name">{emp.name}</div>
                      <div className="lb-dept">{emp.dept} · {emp.city}</div>
                    </div>
                    <div className="lb-score">{emp.score} SOP</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM ROW */}
      <div className="bottom-grid">
        {/* AKTIVITAS */}
        <div className="card">
          <div className="card-head">
            <div className="card-title">Aktivitas Terkini</div>
          </div>
          <div className="card-body">
            {displayActivities.slice(0, 5).map((act) => {
              const dots = { green: '#10b981', blue: '#2F7BFF', purple: '#8b5cf6', amber: '#f59e0b', cyan: '#06b6d4' };
              return (
                <div key={act.id} className="activity-item">
                  <div className="act-dot" style={{ background: dots[act.type] || '#ccc' }}></div>
                  <div>
                    <div className="act-text" dangerouslySetInnerHTML={{ __html: act.text }}></div>
                    <div className="act-time">{act.time}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* WEEKLY PROGRESS CHART */}
        <div className="card">
          <div className="card-head">
            <div className="card-title">Materi SOP Dipelajari Minggu Ini</div>
          </div>
          <div className="chart-area">
            <div className="chart-bars">
              <div className="bar-group">
                <div className="bar" style={{ height: '38px', background: '#dbeafe' }}></div>
                <div className="bar-label">Sen</div>
              </div>
              <div className="bar-group">
                <div className="bar" style={{ height: '55px', background: '#93c5fd' }}></div>
                <div className="bar-label">Sel</div>
              </div>
              <div className="bar-group">
                <div className="bar" style={{ height: '42px', background: '#93c5fd' }}></div>
                <div className="bar-label">Rab</div>
              </div>
              <div className="bar-group">
                <div className="bar" style={{ height: '70px', background: '#3b82f6' }}></div>
                <div className="bar-label">Kam</div>
              </div>
              <div className="bar-group">
                <div className="bar" style={{ height: '60px', background: '#2F7BFF' }}></div>
                <div className="bar-label">Jum</div>
              </div>
              <div className="bar-group">
                <div className="bar" style={{ height: '28px', background: '#dbeafe' }}></div>
                <div className="bar-label">Sab</div>
              </div>
              <div className="bar-group">
                <div className="bar" style={{ height: '18px', background: '#dbeafe' }}></div>
                <div className="bar-label">Min</div>
              </div>
            </div>
             <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text3)' }}>Total minggu ini</div>
                <div style={{ fontSize: '18px', fontWeight: 600, fontFamily: "'Plus Jakarta Sans',sans-serif", color: 'var(--text1)' }}>
                  {isSupervisor ? 84 : 312} <span style={{ fontSize: '12px', color: 'var(--green)', fontWeight: 400 }}>↑ 18%</span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '11px', color: 'var(--text3)' }}>Avg/hari</div>
                <div style={{ fontSize: '18px', fontWeight: 600, fontFamily: "'Plus Jakarta Sans',sans-serif", color: 'var(--text1)' }}>
                  {isSupervisor ? 12 : 44}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* QUICK STATS */}
        <div className="card">
          <div className="card-head">
            <div className="card-title">Ringkasan Pelatihan</div>
          </div>
          <div className="mini-stats">
            <div className="mini-stat">
              <div className="mini-label">Wajib ditonton</div>
              <div className="mini-val">{isSupervisor ? displayVideos.length : 18}</div>
              <div className="mini-sub" style={{ color: 'var(--accent)', fontSize: '11px' }}>SOP aktif</div>
            </div>
            <div className="mini-stat">
              <div className="mini-label">Belum selesai</div>
              <div className="mini-val" style={{ color: 'var(--red)' }}>
                {isSupervisor ? displayEmployees.filter(e => e.score === 0).length : 54}
              </div>
              <div className="mini-sub" style={{ color: 'var(--red)', fontSize: '11px' }}>karyawan</div>
            </div>
            <div className="mini-stat">
              <div className="mini-label">Quiz lulus</div>
              <div className="mini-val">
                {isSupervisor ? displayEmployees.filter(e => e.score > 0).length : 186}
              </div>
              <div className="mini-sub" style={{ color: 'var(--green)', fontSize: '11px' }}>
                {isSupervisor ? `dari ${displayEmployees.length}` : 'dari 248'}
              </div>
            </div>
            <div className="mini-stat">
              <div className="mini-label">Avg. skor quiz</div>
              <div className="mini-val">{isSupervisor ? 88 : 82}<span style={{ fontSize: '14px', fontWeight: 400 }}>%</span></div>
              <div className="mini-sub" style={{ color: 'var(--green)', fontSize: '11px' }}>↑ baik</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
