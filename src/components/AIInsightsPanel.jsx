import React, { useState, useRef, useEffect } from 'react';
import { useTenant } from '../context/TenantContext';

const QUICK_PROMPTS = [
  'Siapa yang belum lulus minggu ini?',
  'SOP mana yang paling banyak gagal?',
  'Buatkan ringkasan laporan bulan ini',
  'Deadline SOP minggu ini',
];

const generateInsight = (msg, { employees, videos, quizSubmissions, passingScore, currentUser }) => {
  const lower = msg.toLowerCase();
  const isSupervisor = currentUser.role !== 'admin';
  const deptEmployees = isSupervisor
    ? employees.filter(e => e.dept.toLowerCase() === currentUser.dept.toLowerCase())
    : employees;

  const failed = quizSubmissions.filter(s => (s.postScore ?? 0) < passingScore);
  const passed = quizSubmissions.filter(s => (s.postScore ?? 0) >= passingScore);

  if (lower.includes('belum lulus') || lower.includes('remedial')) {
    const names = [...new Set(failed.map(s => s.employeeName))];
    if (names.length === 0) return 'Semua karyawan sudah lulus kuis. Tidak ada yang perlu remedial saat ini.';
    return `Ada ${names.length} karyawan yang perlu remedial:\n\n${names.map((n, i) => `${i + 1}. ${n}`).join('\n')}\n\nSarankan mereka untuk menonton ulang materi dan mengulang kuis.`;
  }

  if (lower.includes('paling banyak gagal') || lower.includes('sop mana')) {
    const failByVideo = {};
    failed.forEach(s => { failByVideo[s.videoTitle] = (failByVideo[s.videoTitle] || 0) + 1; });
    const sorted = Object.entries(failByVideo).sort((a, b) => b[1] - a[1]);
    if (sorted.length === 0) return 'Belum ada data kegagalan kuis saat ini.';
    const top = sorted[0];
    return `SOP dengan tingkat kegagalan tertinggi:\n\n📌 "${top[0]}"\n${top[1]} karyawan gagal di materi ini.\n\nPertimbangkan untuk merevisi bagian yang paling sering salah.`;
  }

  if (lower.includes('laporan') || lower.includes('ringkasan')) {
    const totalKaryawan = deptEmployees.length;
    const avgScore = quizSubmissions.length > 0
      ? Math.round(quizSubmissions.reduce((a, b) => a + (b.postScore || 0), 0) / quizSubmissions.length)
      : 0;
    return `Ringkasan Training Bulan Ini:\n\n👥 Total karyawan: ${totalKaryawan}\n✅ Lulus kuis: ${passed.length}\n❌ Perlu remedial: ${failed.length}\n📊 Rata-rata skor: ${avgScore}%\n\nPerforma training ${avgScore >= passingScore ? 'baik' : 'perlu ditingkatkan'}.`;
  }

  if (lower.includes('deadline')) {
    const withDeadline = videos.filter(v => v.deadline);
    if (withDeadline.length === 0) return 'Tidak ada SOP dengan deadline yang ditetapkan saat ini.';
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const urgent = withDeadline.filter(v => {
      const diff = Math.ceil((new Date(v.deadline) - today) / 86400000);
      return diff <= 7 && diff >= 0;
    });
    if (urgent.length === 0) return 'Tidak ada SOP dengan deadline dalam 7 hari ke depan.';
    return `${urgent.length} SOP deadline dalam 7 hari:\n\n${urgent.map(v => {
      const diff = Math.ceil((new Date(v.deadline) - today) / 86400000);
      return `⚠️ "${v.title}" — ${diff} hari lagi`;
    }).join('\n')}`;
  }

  return `Saya tidak menemukan data spesifik untuk itu. Coba tanyakan:\n\n• Siapa yang belum lulus?\n• SOP mana yang paling banyak gagal?\n• Ringkasan laporan bulan ini\n• Deadline SOP minggu ini`;
};

export const AIInsightsPanel = () => {
  const { employees, videos, quizSubmissions, passingScore, currentUser } = useTenant();
  const [messages, setMessages] = useState([
    { role: 'ai', text: 'Halo! Tanyakan apa saja tentang data training tim kamu — progress, hasil kuis, atau minta laporan otomatis.' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: msg }]);
    setLoading(true);
    setTimeout(() => {
      const reply = generateInsight(msg, { employees, videos, quizSubmissions, passingScore, currentUser });
      setMessages(prev => [...prev, { role: 'ai', text: reply }]);
      setLoading(false);
    }, 700 + Math.random() * 400);
  };

  return (
    <div style={{
      margin: '8px',
      background: 'linear-gradient(160deg,#1e1b4b 0%,#1a2744 100%)',
      border: '1px solid rgba(167,139,250,0.2)',
      borderRadius: '12px',
      display: 'flex',
      flexDirection: 'column',
      maxHeight: '320px',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ padding: '10px 12px 8px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: '7px', flexShrink: 0 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2"><path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/><circle cx="7.5" cy="14.5" r="1.5" fill="#a78bfa" stroke="none"/><circle cx="16.5" cy="14.5" r="1.5" fill="#a78bfa" stroke="none"/></svg>
        <span style={{ fontSize: '12px', fontWeight: '600', color: '#a78bfa' }}>AI Insights</span>
        <span style={{ marginLeft: 'auto', width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', flexShrink: 0 }}></span>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 10px 4px', display: 'flex', flexDirection: 'column', gap: '7px' }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '92%' }}>
            <div style={{
              padding: '7px 10px',
              borderRadius: msg.role === 'user' ? '10px 3px 10px 10px' : '3px 10px 10px 10px',
              fontSize: '11px', lineHeight: '1.6', whiteSpace: 'pre-wrap',
              background: msg.role === 'user' ? 'rgba(167,139,250,0.2)' : 'rgba(255,255,255,0.07)',
              color: msg.role === 'user' ? '#ddd6fe' : 'rgba(255,255,255,0.85)',
              border: msg.role === 'user' ? '1px solid rgba(167,139,250,0.25)' : '1px solid rgba(255,255,255,0.08)',
            }}>{msg.text}</div>
          </div>
        ))}
        {loading && (
          <div style={{ alignSelf: 'flex-start' }}>
            <div style={{ padding: '8px 12px', borderRadius: '3px 10px 10px 10px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: '4px', alignItems: 'center' }}>
              {[0,1,2].map(j => <span key={j} style={{ width:'5px',height:'5px',borderRadius:'50%',background:'rgba(167,139,250,0.6)',display:'inline-block',animation:`aiDot 1.2s ${j*0.2}s infinite` }}></span>)}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick prompts */}
      <div style={{ padding: '4px 10px 4px', display: 'flex', flexWrap: 'wrap', gap: '4px', flexShrink: 0 }}>
        {QUICK_PROMPTS.slice(0, 2).map((p, i) => (
          <button key={i} onClick={() => sendMessage(p)} style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '10px', border: '1px solid rgba(167,139,250,0.25)', background: 'rgba(167,139,250,0.08)', color: '#c4b5fd', cursor: 'pointer', whiteSpace: 'nowrap' }}>{p}</button>
        ))}
      </div>

      {/* Input */}
      <div style={{ padding: '5px 10px 10px', display: 'flex', gap: '6px', flexShrink: 0 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
          placeholder="Tanya tentang data tim..."
          style={{ flex: 1, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', padding: '6px 10px', fontSize: '11px', color: '#fff', outline: 'none' }}
        />
        <button
          onClick={() => sendMessage()}
          disabled={loading || !input.trim()}
          style={{ width: '28px', height: '28px', background: input.trim() ? 'rgba(167,139,250,0.3)' : 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '8px', cursor: input.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={input.trim() ? '#a78bfa' : 'rgba(255,255,255,0.2)'} strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </div>

      <style>{`@keyframes aiDot{0%,60%,100%{transform:translateY(0);opacity:.4}30%{transform:translateY(-4px);opacity:1}}`}</style>
    </div>
  );
};
