import React, { useState, useRef, useEffect } from 'react';
import { useTenant } from '../context/TenantContext';
import { getEmployeeLimit } from '../utils/featureGates';

export const Dashboard = () => {
  const { tenant, employees, videos, activities, setActivePage, currentUser, quizSubmissions, passingScore } = useTenant();

  const isSupervisor = currentUser.role !== 'admin';

  // Chat AXA Assistant state & logic
  const buildInitialMessage = () => {
    const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const firstName = currentUser?.name?.split(' ')[0] || 'HR';
    
    // 1. Dapatkan waktu sapaan secara dinamis (pagi/siang/sore/malam)
    const hour = new Date().getHours();
    const waktu = hour < 11 ? 'pagi' : hour < 15 ? 'siang' : hour < 18 ? 'sore' : 'malam';

    // 2. Hitung rata-rata progres training keseluruhan secara dinamis (lulus vs total kuis wajib)
    const totalLulus = quizSubmissions.filter(s => (s.postScore ?? 0) >= passingScore).length;
    const totalWajib = employees.length * videos.length;
    const avgProgress = totalWajib > 0 ? Math.round((totalLulus / totalWajib) * 100) : 0;

    // 3. Cari divisi tertinggi & terendah secara real
    const depts = [...new Set(employees.map(e => e.dept))];
    let lowestDept = null, lowestPct = 101;
    let highestDept = null, highestPct = -1;

    depts.forEach(dept => {
      const deptEmps = employees.filter(e => e.dept === dept);
      if (deptEmps.length === 0) return;
      const lulus = quizSubmissions.filter(s => 
        deptEmps.some(e => e.name === s.employeeName) && (s.postScore ?? 0) >= passingScore
      ).length;
      const pct = Math.round((lulus / deptEmps.length) * 100);
      
      if (pct < lowestPct) { lowestPct = pct; lowestDept = dept; }
      if (pct > highestPct) { highestPct = pct; highestDept = dept; }
    });

    // 4. Susun pesan ramah & informatif sesuai pilihan
    let text = `Halo ${firstName}! Selamat ${waktu}.\n\n`;
    text += `Progres **Training** secara keseluruhan berada di angka **${avgProgress}%**. Sebagian besar divisi menunjukkan performa baik`;
    
    if (highestDept && highestPct >= 0) {
      text += `, dipimpin oleh **${highestDept} (${highestPct}%)**`;
    }
    
    if (lowestDept && lowestPct < 101) {
      if (lowestPct === 0) {
        text += `, sedangkan divisi **${lowestDept}** masih berada di angka **0%**.\n\n`;
      } else {
        text += `, sedangkan divisi **${lowestDept}** berada di angka terendah yaitu **${lowestPct}%**.\n\n`;
      }
    } else {
      text += `.\n\n`;
    }

    text += `Anda bisa menanyakan hal seperti:\n\n`;
    text += `* *'Mengapa progres ${lowestDept || 'Sales'} masih ${lowestPct === 101 ? 0 : lowestPct}%?'*\n`;
    text += `* *'Buatkan soal kuis baru untuk SOP Customer Service'*\n`;
    text += `* *'Tampilkan daftar karyawan yang belum lulus kuis'*\n\n`;
    text += `Apa yang bisa saya bantu analisis hari ini?`;

    return [{ id: 1, sender: 'ai', name: 'AXA', text, time: now }];
  };

  const [chatMessages, setChatMessages] = useState(() => buildInitialMessage());
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const chatEndRef = useRef(null);
  const textareaRef = useRef(null);
  const expTextareaRef = useRef(null);
  const menuRef = useRef(null);

  // Auto-resize textarea height
  const adjustHeight = (el) => {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  };

  useEffect(() => {
    adjustHeight(textareaRef.current);
  }, [chatInput]);

  useEffect(() => {
    if (isExpanded) {
      setTimeout(() => adjustHeight(expTextareaRef.current), 100);
    }
  }, [isExpanded, chatInput]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [chatMessages, isTyping, isExpanded]);

  const userInitial = currentUser && currentUser.name
    ? currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
    : 'U';

  const parseBold = (text) => {
    const parts = text.split(/\*\*(.*?)\*\*/g);
    return parts.map((part, i) => i % 2 === 1 ? <strong key={i}>{part}</strong> : part);
  };

  const renderMarkdown = (text) => {
    return text.split('\n').map((line, i) => {
      if (/^#{1,3}\s/.test(line)) {
        const level = line.match(/^#+/)[0].length;
        const content = line.replace(/^#+\s/, '');
        const size = level === 1 ? '14px' : level === 2 ? '13px' : '12px';
        return <div key={i} style={{ fontWeight: '700', fontSize: size, marginTop: '8px', marginBottom: '3px' }}>{parseBold(content)}</div>;
      }
      if (/^[\*\-]\s/.test(line)) {
        return <div key={i} style={{ display: 'flex', gap: '6px', marginBottom: '2px' }}><span style={{ flexShrink: 0, marginTop: '1px' }}>•</span><span>{parseBold(line.slice(2))}</span></div>;
      }
      if (/^\d+\.\s/.test(line)) {
        const [, num, rest] = line.match(/^(\d+)\.\s(.*)/);
        return <div key={i} style={{ display: 'flex', gap: '6px', marginBottom: '2px' }}><span style={{ flexShrink: 0, fontWeight: '600', minWidth: '16px' }}>{num}.</span><span>{parseBold(rest)}</span></div>;
      }
      if (line.trim() === '') return <div key={i} style={{ height: '5px' }} />;
      return <div key={i} style={{ marginBottom: '2px' }}>{parseBold(line)}</div>;
    });
  };

  const handleSendMessage = async (text) => {
    if (!text.trim()) return;
    const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const userShortName = currentUser ? currentUser.name.split(' ')[0] + '.' : 'User';

    const userMsg = { id: Date.now(), sender: 'user', name: userShortName, text, time: now };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsTyping(true);

    const greetingPattern = /^(halo|hai|hello|hi|selamat\s+(pagi|siang|sore|malam)|pagi|siang|sore|malam)[!.,\s]*$/i;
    if (greetingPattern.test(text.trim())) {
      const hour = new Date().getHours();
      const waktu = hour < 11 ? 'pagi' : hour < 15 ? 'siang' : hour < 18 ? 'sore' : 'malam';
      setChatMessages(prev => [...prev, {
        id: Date.now() + 1, sender: 'ai', name: 'AXA',
        text: `Selamat ${waktu}! Ada yang bisa saya bantu?`,
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      }]);
      setIsTyping(false);
      return;
    }

    const parseSecs = d => {
      if (!d) return 0;
      const m = String(d).match(/(\d+)m|(\d+)s|(\d+):(\d+)/);
      if (!m) return parseInt(d) || 0;
      if (m[4] !== undefined) return parseInt(m[3]) * 60 + parseInt(m[4]);
      return m[1] ? parseInt(m[1]) * 60 : parseInt(m[2]);
    };
    const fmtDur = s => s >= 60 ? `${Math.floor(s/60)} menit ${s%60} detik` : `${s} detik`;

    const clientAnswer = (() => {
      const q = text.toLowerCase().trim();
      const passedSet = new Set(quizSubmissions.filter(s => (s.postScore ?? 0) >= passingScore).map(s => s.employeeName));
      const failedSet = new Set(quizSubmissions.filter(s => (s.postScore ?? 0) < passingScore).map(s => s.employeeName));
      const depts = [...new Set(employees.map(e => e.dept))];
      const mentionedDept = depts.find(d => q.includes(d.toLowerCase()));
      const mentionedEmp = employees.find(e => e.name.split(' ').some(part => part.length > 2 && q.includes(part.toLowerCase())));

      // 1. Jumlah karyawan
      if (/berapa (banyak |jumlah )?(total |semua )?karyawan/.test(q) || /jumlah karyawan/.test(q)) {
        if (mentionedDept) {
          const n = employees.filter(e => e.dept === mentionedDept).length;
          return `Divisi **${mentionedDept}** memiliki **${n} karyawan**.`;
        }
        return `Total karyawan terdaftar di LMS: **${employees.length} orang**.`;
      }

      // 2. Daftar karyawan per dept
      if ((/daftar|siapa saja|list/i.test(q)) && (/karyawan|anggota|tim/i.test(q)) && mentionedDept) {
        const list = employees.filter(e => e.dept === mentionedDept).map((e,i) => `${i+1}. ${e.name} (${e.role})`).join('\n');
        return `Karyawan divisi **${mentionedDept}** (${employees.filter(e=>e.dept===mentionedDept).length} orang):\n${list}`;
      }

      // 3. Karyawan belum lulus quiz
      if (/belum lulus|tidak lulus|gagal (quiz|kuis)/.test(q) || /(quiz|kuis) belum/.test(q)) {
        const scope = mentionedDept
          ? employees.filter(e => e.dept === mentionedDept && !passedSet.has(e.name))
          : employees.filter(e => !passedSet.has(e.name));
        if (scope.length === 0) return mentionedDept
          ? `Semua karyawan divisi **${mentionedDept}** sudah lulus quiz.`
          : 'Semua karyawan sudah lulus quiz.';
        const label = mentionedDept ? `divisi **${mentionedDept}**` : 'semua divisi';
        return `Karyawan yang belum lulus quiz (${label}): **${scope.length} orang**\n` +
          scope.slice(0, 15).map((e,i) => `${i+1}. ${e.name} — ${e.dept}`).join('\n') +
          (scope.length > 15 ? `\n...dan ${scope.length - 15} lainnya.` : '');
      }

      // 4. Karyawan sudah lulus quiz
      if (/sudah lulus|telah lulus/.test(q) && /(quiz|kuis)/.test(q)) {
        const scope = mentionedDept
          ? employees.filter(e => e.dept === mentionedDept && passedSet.has(e.name))
          : employees.filter(e => passedSet.has(e.name));
        const label = mentionedDept ? `divisi **${mentionedDept}**` : 'semua divisi';
        return `Karyawan yang sudah lulus quiz (${label}): **${scope.length} orang** dari ${mentionedDept ? employees.filter(e=>e.dept===mentionedDept).length : employees.length}.`;
      }

      // 5. Nilai/skor karyawan tertentu
      if (mentionedEmp && /(nilai|skor|hasil|score|lulus|gagal)/.test(q)) {
        const sub = quizSubmissions.filter(s => s.employeeName === mentionedEmp.name);
        if (sub.length === 0) return `**${mentionedEmp.name}** belum mengikuti kuis apapun.`;
        const lines = sub.map(s => {
          const status = (s.postScore ?? 0) >= passingScore ? '✅ Lulus' : '❌ Belum lulus';
          return `• ${s.videoTitle}: skor **${s.postScore ?? '-'}** — ${status}`;
        }).join('\n');
        return `Hasil kuis **${mentionedEmp.name}** (${mentionedEmp.dept}):\n${lines}`;
      }

      // 6. Info karyawan tertentu
      if (mentionedEmp && /(siapa|info|profil|data|divisi|jabatan|email|departemen)/.test(q)) {
        const e = mentionedEmp;
        return `**${e.name}**\n• Divisi: ${e.dept}\n• Jabatan: ${e.role}\n• Email: ${e.email}`;
      }

      // 7. Jumlah video/SOP
      if (/berapa (banyak |jumlah )?(total |semua )?(video|sop|materi)/.test(q) || /jumlah (video|sop|materi)/.test(q)) {
        if (mentionedDept) {
          const n = videos.filter(v => v.dept === mentionedDept || v.dept === 'Semua').length;
          return `Video SOP untuk divisi **${mentionedDept}**: **${n} materi**.`;
        }
        return `Total video SOP tersedia: **${videos.length} materi**.`;
      }

      // 8. Daftar video/SOP
      if ((/daftar|list|apa saja/).test(q) && (/video|sop|materi/).test(q)) {
        const scope = mentionedDept ? videos.filter(v => v.dept === mentionedDept || v.dept === 'Semua') : videos;
        const label = mentionedDept ? `divisi **${mentionedDept}**` : 'semua divisi';
        return `Daftar materi SOP (${label}): **${scope.length} video**\n` +
          scope.slice(0, 10).map((v,i) => `${i+1}. ${v.title} (${fmtDur(parseSecs(v.duration))})`).join('\n') +
          (scope.length > 10 ? `\n...dan ${scope.length - 10} lainnya.` : '');
      }

      // 9. Passing score
      if (/(passing score|nilai kelulusan|batas lulus|skor minimal|standar lulus)/.test(q)) {
        return `Passing score yang ditetapkan adalah **${passingScore}%**. Karyawan harus mencapai nilai minimal ini untuk dinyatakan lulus kuis.`;
      }

      // 10. Completion rate
      if (/(completion rate|persentase lulus|tingkat kelulusan|persentase kelulusan)/.test(q)) {
        const scope = mentionedDept ? employees.filter(e => e.dept === mentionedDept) : employees;
        const passed = scope.filter(e => passedSet.has(e.name)).length;
        const pct = scope.length > 0 ? Math.round(passed / scope.length * 100) : 0;
        const label = mentionedDept ? `divisi **${mentionedDept}**` : 'seluruh perusahaan';
        return `Completion rate ${label}: **${pct}%** (${passed} dari ${scope.length} karyawan lulus quiz).`;
      }

      // 11. Divisi terbaik/terendah
      if (/(divisi|departemen).*(terbaik|tertinggi|paling banyak lulus)/.test(q)) {
        const stats = depts.map(d => {
          const emp = employees.filter(e => e.dept === d);
          const p = emp.filter(e => passedSet.has(e.name)).length;
          return { dept: d, pct: emp.length > 0 ? Math.round(p/emp.length*100) : 0, passed: p, total: emp.length };
        }).sort((a,b) => b.pct - a.pct);
        const top = stats[0];
        return `Divisi dengan completion rate tertinggi: **${top.dept}** (${top.pct}% — ${top.passed}/${top.total} karyawan lulus).`;
      }

      if (/(divisi|departemen).*(terburuk|terendah|paling sedikit lulus|perlu perhatian)/.test(q)) {
        const stats = depts.map(d => {
          const emp = employees.filter(e => e.dept === d);
          const p = emp.filter(e => passedSet.has(e.name)).length;
          return { dept: d, pct: emp.length > 0 ? Math.round(p/emp.length*100) : 0, passed: p, total: emp.length };
        }).sort((a,b) => a.pct - b.pct);
        const bot = stats[0];
        return `Divisi dengan completion rate terendah: **${bot.dept}** (${bot.pct}% — ${bot.passed}/${bot.total} karyawan lulus). Perlu perhatian lebih.`;
      }

      // 12. Rekap per divisi
      if (/(rekap|ringkasan|summary|laporan).*(divisi|departemen)/.test(q) || /(divisi|departemen).*(rekap|ringkasan|summary)/.test(q)) {
        const rows = depts.map(d => {
          const emp = employees.filter(e => e.dept === d);
          const p = emp.filter(e => passedSet.has(e.name)).length;
          const pct = emp.length > 0 ? Math.round(p/emp.length*100) : 0;
          return `• **${d}**: ${p}/${emp.length} lulus (${pct}%)`;
        }).join('\n');
        return `Rekap completion per divisi:\n${rows}`;
      }

      // 13. Total submission quiz
      if (/(berapa|jumlah).*(submission|pengerjaan|kuis|quiz)/.test(q) && !/(nilai|skor)/.test(q)) {
        return `Total pengerjaan kuis yang tercatat: **${quizSubmissions.length} submission**.`;
      }

      // 14. Paket/plan tenant
      if (/(paket|plan|langganan|tier)/.test(q)) {
        return `${tenant.name} saat ini menggunakan paket **${tenant.plan}**.`;
      }

      // 15. Info perusahaan/tenant
      if (/(nama perusahaan|nama tenant|perusahaan apa|klien ini)/.test(q)) {
        return `Tenant yang aktif saat ini adalah **${tenant.name}** dengan paket **${tenant.plan}**.`;
      }

      // 16. Siapa yang login
      if (/(siapa (yang )?login|user aktif|saya siapa|akun saya)/.test(q)) {
        return `Yang sedang login adalah **${currentUser.name}** (${currentUser.role}, Divisi ${currentUser.dept}).`;
      }

      // 17. Video terpanjang/terpendek
      if (/(video|sop|materi).*(paling panjang|terlama|terpanjang|durasi terlama)/.test(q)) {
        const sorted = [...videos].sort((a,b) => parseSecs(b.duration) - parseSecs(a.duration));
        const v = sorted[0];
        return v ? `Video SOP terpanjang: **${v.title}** (${fmtDur(parseSecs(v.duration))}).` : 'Data video tidak tersedia.';
      }

      if (/(video|sop|materi).*(paling pendek|tercepat|terpendek|durasi tercepat)/.test(q)) {
        const sorted = [...videos].filter(v => parseSecs(v.duration) > 0).sort((a,b) => parseSecs(a.duration) - parseSecs(b.duration));
        const v = sorted[0];
        return v ? `Video SOP terpendek: **${v.title}** (${fmtDur(parseSecs(v.duration))}).` : 'Data video tidak tersedia.';
      }

      // 18. Karyawan belum ikut kuis
      if (/(karyawan|siapa).*(belum ikut|belum mengerjakan|belum submit).*(quiz|kuis)/.test(q) ||
          /(quiz|kuis).*(belum dikerjakan|belum diikuti)/.test(q)) {
        const taken = new Set(quizSubmissions.map(s => s.employeeName));
        const notTaken = (mentionedDept ? employees.filter(e => e.dept === mentionedDept) : employees)
          .filter(e => !taken.has(e.name));
        if (notTaken.length === 0) return 'Semua karyawan sudah mengerjakan minimal satu kuis.';
        return `Karyawan yang belum mengerjakan kuis: **${notTaken.length} orang**\n` +
          notTaken.slice(0, 10).map((e,i) => `${i+1}. ${e.name} — ${e.dept}`).join('\n') +
          (notTaken.length > 10 ? `\n...dan ${notTaken.length - 10} lainnya.` : '');
      }

      // 19. Rata-rata skor
      if (/(rata-rata|average|avg).*(skor|nilai|score)/.test(q)) {
        const subs = mentionedDept
          ? quizSubmissions.filter(s => employees.find(e => e.name === s.employeeName && e.dept === mentionedDept))
          : quizSubmissions;
        if (subs.length === 0) return 'Belum ada data skor kuis.';
        const avg = Math.round(subs.reduce((a,s) => a + (s.postScore ?? 0), 0) / subs.length);
        const label = mentionedDept ? `divisi **${mentionedDept}**` : 'seluruh perusahaan';
        return `Rata-rata skor kuis (${label}): **${avg}%** dari ${subs.length} pengerjaan.`;
      }

      // 20. Skor tertinggi/terendah
      if (/(skor|nilai).*(tertinggi|terbaik|paling tinggi)/.test(q)) {
        const top = [...quizSubmissions].sort((a,b) => (b.postScore??0) - (a.postScore??0))[0];
        return top ? `Skor tertinggi: **${top.employeeName}** dengan nilai **${top.postScore}%** pada kuis "${top.videoTitle}".` : 'Belum ada data skor.';
      }

      if (/(skor|nilai).*(terendah|paling rendah)/.test(q)) {
        const bot = [...quizSubmissions].sort((a,b) => (a.postScore??0) - (b.postScore??0))[0];
        return bot ? `Skor terendah: **${bot.employeeName}** dengan nilai **${bot.postScore}%** pada kuis "${bot.videoTitle}".` : 'Belum ada data skor.';
      }

      // 21. Total jam training
      if (/(total|berapa).*(jam|waktu|durasi).*(training|belajar|materi)/.test(q)) {
        const totalSecs = videos.reduce((a,v) => a + parseSecs(v.duration), 0);
        return `Total durasi semua materi SOP: **${fmtDur(totalSecs)}** (${videos.length} video).`;
      }

      // 22. Video per kategori
      if (/(video|materi|sop).*(kategori|jenis|tipe)/.test(q) || /(kategori|jenis).*(video|materi|sop)/.test(q)) {
        const cats = {};
        videos.forEach(v => { const c = v.category || 'Umum'; cats[c] = (cats[c]||0)+1; });
        return `Materi SOP berdasarkan kategori:\n` + Object.entries(cats).map(([c,n]) => `• **${c}**: ${n} video`).join('\n');
      }

      // 23. Karyawan sudah ikut berapa kuis
      if (mentionedEmp && /(berapa|jumlah).*(kuis|quiz)/.test(q)) {
        const subs = quizSubmissions.filter(s => s.employeeName === mentionedEmp.name);
        return `**${mentionedEmp.name}** sudah mengerjakan **${subs.length} kuis**.`;
      }

      return null;
    })();

    if (clientAnswer) {
      setChatMessages(prev => [...prev, {
        id: Date.now() + 1, sender: 'ai', name: 'AXA', text: clientAnswer,
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      }]);
      setIsTyping(false);
      return;
    }

    try {
      const empData = employees.map(e => ({ name: e.name, dept: e.dept, role: e.role, email: e.email }));
      const vidData = videos.map(v => ({ title: v.title, dept: v.dept, duration: v.duration, category: v.category }));
      const quizData = quizSubmissions.map(q => ({ employee: q.employeeName, video: q.videoTitle, score: q.postScore, passed: (q.postScore ?? 0) >= passingScore }));

      const systemPrompt = `Kamu adalah AXA AI, asisten LMS Axara. Jawab dalam Bahasa Indonesia, gunakan data nyata berikut.

Tenant: ${tenant.name} | Paket: ${tenant.plan} | Login: ${currentUser.name} (${currentUser.role}, ${currentUser.dept}) | Passing: ${passingScore}%

KARYAWAN(${employees.length}): ${JSON.stringify(empData)}
VIDEO SOP(${videos.length}): ${JSON.stringify(vidData)}
KUIS(${quizSubmissions.length}): ${JSON.stringify(quizData)}

Bisa buat laporan, analisis, rekomendasi, soal kuis. Kalau user sekedar menyapa, balas singkat dan tanya apa yang bisa dibantu — jangan langsung dump semua data. Kalau ditanya sesuatu yang spesifik, jawab lengkap & actionable. Jangan selalu balik tanya.`;

      const history = chatMessages.slice(-10).map(m => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text
      }));

      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'system', content: systemPrompt }, ...history, { role: 'user', content: text }],
          max_tokens: 600,
          temperature: 0.5
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(`${res.status}: ${errData.error?.message || 'API error'}`);
      }
      const data = await res.json();
      const replyText = data.choices[0].message.content;

      setChatMessages(prev => [...prev, {
        id: Date.now() + 1, sender: 'ai', name: 'AXA', text: replyText,
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      }]);
    } catch (err) {
      const msg = !import.meta.env.VITE_GROQ_API_KEY
        ? 'API key tidak ditemukan. Hubungi administrator.'
        : 'Maaf, saya sedang tidak bisa terhubung. Silakan coba lagi.';
      console.error('[AXA]', err?.message);
      setChatMessages(prev => [...prev, {
        id: Date.now() + 1, sender: 'ai', name: 'AXA',
        text: msg,
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setIsTyping(false);
    }
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
    <>
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
        {/* LEFT COLUMN: Contains Video List and Bottom Grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
                        <span style={{ fontSize: '10px', fontWeight: '600', color: '#6b7280', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                          {video.views || 0}
                        </span>
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
  
          {/* BOTTOM GRID (Restructured inside Left Column) */}
          <div className="bottom-grid">
            {/* AKTIVITAS */}
            <div className="card">
              <div className="card-head">
                <div className="card-title">Aktivitas Terkini</div>
              </div>
              <div className="card-body">
                {displayActivities.slice(0, 3).map((act) => {
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

        {/* SIDE COLUMN */}
        <div className="side-col" style={{ position: 'sticky', top: '80px', alignSelf: 'start', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* AXA ASSISTANT CARD */}
          <div className="card axa-card-glow" style={{ overflow: 'visible' }}>
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
                  <svg className="axa-sparkle-pulse" width="18" height="18" viewBox="0 0 24 24" fill="white" stroke="none">
                    <path fill="white" stroke="none" d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
                    <path fill="white" stroke="none" d="m5 3 1 2.5L8.5 6 6 7 5 9.5 4 7 1.5 6 4 5 5 3Z"/>
                    <path fill="white" stroke="none" d="m19 17 1 2.5 2.5.5-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1 1-2.5Z"/>
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
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setIsExpanded(true)}
                  title="Perbesar Layar"
                  style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', transition: 'color 0.2s' }}
                  onMouseOver={(e) => e.currentTarget.style.color = 'var(--accent)'}
                  onMouseOut={(e) => e.currentTarget.style.color = 'var(--text3)'}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => setShowMenu(!showMenu)}
                  style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', transition: 'color 0.2s' }}
                  onMouseOver={(e) => e.currentTarget.style.color = 'var(--text1)'}
                  onMouseOut={(e) => e.currentTarget.style.color = 'var(--text3)'}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" />
                  </svg>
                </button>

                {showMenu && (
                  <div
                    ref={menuRef}
                    style={{
                      position: 'absolute',
                      top: '28px',
                      right: '0',
                    background: '#ffffff',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    zIndex: 999,
                    width: '150px',
                    padding: '4px 0'
                  }}>
                    <button
                      onClick={() => {
                        setChatMessages([{
                          id: Date.now(),
                          sender: 'ai',
                          name: 'AXA',
                          text: 'Obrolan telah dibersihkan. Ada yang bisa saya bantu analisis kembali?',
                          time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                        }]);
                        setShowMenu(false);
                      }}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        textAlign: 'left',
                        background: 'none',
                        border: 'none',
                        fontSize: '12px',
                        color: 'var(--red)',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.background = '#fef2f2'}
                      onMouseOut={(e) => e.currentTarget.style.background = 'none'}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                      Bersihkan Chat
                    </button>
                    <button
                      onClick={() => {
                        setIsExpanded(true);
                        setShowMenu(false);
                      }}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        textAlign: 'left',
                        background: 'none',
                        border: 'none',
                        fontSize: '12px',
                        color: 'var(--text1)',
                        fontWeight: '500',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.background = 'var(--surface2)'}
                      onMouseOut={(e) => e.currentTarget.style.background = 'none'}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
                      Layar Penuh
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="chat-container">
              {chatMessages.map((msg) => (
                <div key={msg.id} className={`chat-bubble-wrapper ${msg.sender}`} style={{ gap: '4px' }}>
                  <div className={`chat-bubble chat-bubble-${msg.sender}`}>
                    {msg.sender === 'ai' ? renderMarkdown(msg.text) : msg.text}
                  </div>
                  <div style={{
                    fontSize: '9px',
                    color: 'var(--text3)',
                    marginTop: '2px',
                    textAlign: msg.sender === 'ai' ? 'left' : 'right',
                    width: '100%',
                    padding: '0 4px',
                    fontWeight: '500'
                  }}>
                    {msg.time}
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
              style={{ alignItems: 'flex-end' }}
            >
              <div className="chat-input-wrapper">
                <textarea
                  ref={textareaRef}
                  placeholder="Tanya sesuatu..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(chatInput);
                    }
                  }}
                  rows="1"
                  className="chat-input"
                  style={{
                    resize: 'none',
                    height: '36px',
                    maxHeight: '120px',
                    borderRadius: '18px',
                    padding: '8px 14px',
                    lineHeight: '1.4',
                    overflowY: 'hidden'
                  }}
                />
              </div>
              <button
                type="submit"
                className="chat-send-btn"
                title="Kirim pesan"
                style={{ marginBottom: '2px' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ transform: 'rotate(45deg)' }}>
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
    </div>

    {/* EXPANDED FULLSCREEN MODAL FOR AXA ASSISTANT */}
    {isExpanded && (
      <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(4px)',
          webkitBackdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div className="card axa-card-glow" style={{
            width: '800px',
            maxWidth: '90vw',
            height: '80vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            borderRadius: '16px',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
          }}>
            {/* Modal Header */}
            <div className="card-head" style={{ borderBottom: '1px solid var(--border)', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #a78bfa, var(--accent))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white'
                }}>
                  <svg className="axa-sparkle-pulse" width="20" height="20" viewBox="0 0 24 24" fill="white" stroke="none">
                    <path fill="white" stroke="none" d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
                  </svg>
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text1)', margin: 0 }}>AXA Assistant — Jendela Penuh</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }}></span>
                    <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: '600' }}>Aktif & Terhubung</span>
                  </div>
                </div>
              </div>
              
              <button
                onClick={() => setIsExpanded(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#9ca3af',
                  padding: '6px',
                  borderRadius: '50%',
                  transition: 'background 0.2s, color 0.2s'
                }}
                onMouseOver={(e) => { e.currentTarget.style.background = 'var(--surface2)'; e.currentTarget.style.color = 'var(--text1)'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#9ca3af'; }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Modal Body: Chat History Container */}
            <div className="chat-container" style={{ flex: 1, height: 'auto', margin: '0', padding: '24px', background: '#f8fafc', overflowY: 'auto' }}>
              <div style={{ maxWidth: '720px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {chatMessages.map((msg) => (
                  <div key={msg.id} className={`chat-bubble-wrapper ${msg.sender}`} style={{ gap: '6px', maxWidth: '85%' }}>
                    <div className={`chat-bubble chat-bubble-${msg.sender}`} style={{ padding: '12px 18px', fontSize: '13px', borderRadius: '16px' }}>
                      {msg.sender === 'ai' ? renderMarkdown(msg.text) : msg.text}
                    </div>
                    <div style={{
                      fontSize: '10px',
                      color: 'var(--text3)',
                      marginTop: '2px',
                      textAlign: msg.sender === 'ai' ? 'left' : 'right',
                      width: '100%',
                      padding: '0 6px',
                      fontWeight: '500'
                    }}>
                      {msg.time}
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="typing-indicator" style={{ background: '#ffffff', border: '1px solid var(--border)' }}>
                    <div className="typing-dot"></div>
                    <div className="typing-dot"></div>
                    <div className="typing-dot"></div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            </div>

            {/* Modal Footer: Suggestion & Chat Input Area */}
            <div style={{ borderTop: '1px solid var(--border)', background: '#ffffff', padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ maxWidth: '720px', width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text3)', marginRight: '4px' }}>SARAN ANALISIS:</span>
                  <button
                    onClick={() => handleSendMessage('Analisis Progres')}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '20px',
                      border: '1px solid var(--border)',
                      background: '#ffffff',
                      fontSize: '12px',
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
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
                    Analisis Progres
                  </button>
                  <button
                    onClick={() => handleSendMessage('Laporan Mingguan')}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '20px',
                      border: '1px solid var(--border)',
                      background: '#ffffff',
                      fontSize: '12px',
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
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    Laporan Mingguan
                  </button>
                </div>

                <form
                  onSubmit={(e) => { e.preventDefault(); handleSendMessage(chatInput); }}
                  className="chat-input-container"
                  style={{ padding: '0', borderTop: 'none', alignItems: 'flex-end', gap: '12px' }}
                >
                  <div className="chat-input-wrapper">
                    <textarea
                      ref={expTextareaRef}
                      placeholder="Tanya sesuatu..."
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage(chatInput);
                        }
                      }}
                      rows="1"
                      className="chat-input"
                      style={{
                        resize: 'none',
                        height: '42px',
                        maxHeight: '120px',
                        borderRadius: '20px',
                        padding: '10px 16px',
                        lineHeight: '1.45',
                        overflowY: 'hidden',
                        fontSize: '13.5px'
                      }}
                    />
                  </div>
                  <button
                    type="submit"
                    className="chat-send-btn"
                    title="Kirim pesan"
                    style={{ width: '38px', height: '38px', marginBottom: '2px' }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ transform: 'rotate(45deg)' }}>
                      <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
