import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid,
} from 'recharts';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { useTenant } from '../context/TenantContext';
import { hasFullComplianceReports } from '../utils/featureGates';

export const Reports = () => {
  const { tenant, quizSubmissions, videos, employees, currentUser, passingScore } = useTenant();
  const isSupervisor = currentUser.role !== 'admin';
  const reportRef = useRef(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  const displaySubmissions = isSupervisor
    ? quizSubmissions.filter(sub => {
        const videoObj = videos.find(v => v.title.toLowerCase() === sub.videoTitle.toLowerCase());
        return videoObj && videoObj.dept.toLowerCase() === currentUser.dept.toLowerCase();
      })
    : quizSubmissions;

  const isFullReportEnabled = hasFullComplianceReports(tenant.plan);

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [histDeptFilter, setHistDeptFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // --- Helpers ---
  const parseDuration = (str) => {
    if (!str) return 0;
    const [m, s] = str.split(':').map(Number);
    return (m || 0) + (s || 0) / 60;
  };

  const getComplianceStatus = (rate) => {
    if (rate >= 90) return { label: 'Sangat Aman', color: 'var(--green)' };
    if (rate >= 75) return { label: 'Aman', color: 'var(--green)' };
    if (rate >= 60) return { label: 'Butuh Perhatian', color: 'var(--amber)' };
    return { label: 'Berisiko', color: 'var(--red)' };
  };

  const getBarColor = (rate) => rate >= 75 ? '#22c55e' : rate >= 60 ? '#f59e0b' : '#ef4444';

  // --- Compliance matrix ---
  const activeDepts = isSupervisor
    ? [currentUser.dept]
    : [...new Set(videos.filter(v => !v.archived && v.dept !== 'Semua').map(v => v.dept))].sort();

  const complianceMatrix = activeDepts.map(dept => {
    const deptVideos = videos.filter(v => !v.archived && (v.dept === dept || v.dept === 'Semua'));
    const deptEmployees = employees.filter(e => e.dept?.toLowerCase() === dept.toLowerCase());
    const deptSubs = quizSubmissions.filter(s => (s.dept || '').toLowerCase() === dept.toLowerCase());
    const uniqueSubmitters = new Set(deptSubs.map(s => s.employeeName)).size;
    const completedRate = deptEmployees.length > 0
      ? Math.round((uniqueSubmitters / deptEmployees.length) * 100)
      : 0;
    const avgScore = deptSubs.length > 0
      ? Math.round(deptSubs.reduce((sum, s) => sum + (s.postScore || 0), 0) / deptSubs.length)
      : null;
    return { dept, sopWajib: deptVideos.length, completedRate, avgScore, status: getComplianceStatus(completedRate) };
  });

  // --- Global stats ---
  const totalEmployees = employees.length;
  const uniqueGlobalSubmitters = new Set(quizSubmissions.map(s => s.employeeName)).size;
  const overallCompliance = totalEmployees > 0 ? Math.round((uniqueGlobalSubmitters / totalEmployees) * 100) : 0;
  const overallAvgScore = quizSubmissions.length > 0
    ? Math.round(quizSubmissions.reduce((sum, s) => sum + (s.postScore || 0), 0) / quizSubmissions.length)
    : 0;
  const avgVideoDurationMinutes = videos.length > 0
    ? videos.reduce((sum, v) => sum + parseDuration(v.duration), 0) / videos.length
    : 0;
  const totalWatchHours = Math.round((quizSubmissions.length * avgVideoDurationMinutes) / 60);

  // --- Trend data (6 bulan terakhir) ---
  const trendData = (() => {
    const monthMap = {};
    quizSubmissions.forEach(s => {
      if (!s.date || s.date.length <= 10) return;
      const d = new Date(s.date);
      if (isNaN(d)) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' });
      if (!monthMap[key]) monthMap[key] = { key, label, submitters: new Set() };
      monthMap[key].submitters.add(s.employeeName);
    });
    return Object.values(monthMap)
      .sort((a, b) => a.key.localeCompare(b.key))
      .slice(-6)
      .map(m => ({
        label: m.label,
        compliance: totalEmployees > 0 ? Math.round((m.submitters.size / totalEmployees) * 100) : 0,
      }));
  })();

  // --- Summary insight ---
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
  const monthName = now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

  const thisMonthSubs = quizSubmissions.filter(s => s.date?.startsWith(thisMonth));
  const lastMonthSubs = quizSubmissions.filter(s => s.date?.startsWith(lastMonth));
  const thisMonthCompliance = totalEmployees > 0
    ? Math.round((new Set(thisMonthSubs.map(s => s.employeeName)).size / totalEmployees) * 100) : 0;
  const lastMonthCompliance = totalEmployees > 0
    ? Math.round((new Set(lastMonthSubs.map(s => s.employeeName)).size / totalEmployees) * 100) : 0;
  const complianceChange = thisMonthCompliance - lastMonthCompliance;

  const bestDept = complianceMatrix.length > 0
    ? complianceMatrix.reduce((best, d) => d.completedRate > best.completedRate ? d : best)
    : null;
  const worstDept = complianceMatrix.filter(d => d.completedRate < 75).length > 0
    ? complianceMatrix.filter(d => d.completedRate < 75).reduce((worst, d) => d.completedRate < worst.completedRate ? d : worst)
    : null;
  const thisMonthCerts = thisMonthSubs.filter(s => s.certStatus === 'approved').length;
  const upcomingDeadlines = videos.filter(v => {
    if (!v.deadline || v.archived) return false;
    const dl = new Date(v.deadline);
    const diff = (dl - now) / 86400000;
    return diff >= 0 && diff <= 7;
  });

  // --- Filtered submissions ---
  const filteredDisplaySubmissions = displaySubmissions.filter(s => {
    if (!isSupervisor && histDeptFilter && (s.dept || '').toLowerCase() !== histDeptFilter.toLowerCase()) return false;
    if (dateFrom && s.date && s.date.length > 10) {
      if (new Date(s.date) < new Date(dateFrom)) return false;
    }
    if (dateTo && s.date && s.date.length > 10) {
      if (new Date(s.date) > new Date(dateTo + 'T23:59:59')) return false;
    }
    return true;
  });

  const totalPages = Math.ceil(filteredDisplaySubmissions.length / ITEMS_PER_PAGE);
  const paginatedSubmissions = filteredDisplaySubmissions.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const handleFilterChange = (setter) => (e) => {
    setter(e.target.value);
    setCurrentPage(1);
  };

  // --- Export XLSX ---
  const handleExport = () => {
    const today = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
    const wb = XLSX.utils.book_new();

    const complianceRows = complianceMatrix.map(row => ({
      'Departemen': row.dept,
      'SOP Wajib': `${row.sopWajib} Video`,
      'Completed Rate (%)': row.completedRate,
      'Skor Kuis Rata-rata (%)': row.avgScore ?? '-',
      'Status Compliance': row.status.label,
    }));
    const ws1 = XLSX.utils.json_to_sheet(complianceRows);
    XLSX.utils.book_append_sheet(wb, ws1, 'Compliance Departemen');

    const prePostRows = filteredDisplaySubmissions.map(sub => {
      const video = videos.find(v => v.title === sub.videoTitle);
      const deadlineStatus = (() => {
        if (!video?.deadline) return '-';
        const dl = new Date(video.deadline);
        const subDate = sub.date && sub.date.length > 10 ? new Date(sub.date) : null;
        if (!subDate) return 'Tidak diketahui';
        return subDate <= dl ? 'Tepat Waktu' : 'Terlambat';
      })();
      return {
        'Nama Karyawan': sub.employeeName,
        'Departemen': sub.dept || '-',
        'SOP / Materi': sub.videoTitle,
        'Tanggal & Waktu Penyelesaian': (() => {
          if (!sub.date) return '-';
          if (sub.date.includes('T') || sub.date.length > 12) {
            const dt = new Date(sub.date);
            if (isNaN(dt)) return sub.date;
            return dt.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
              + ' ' + String(dt.getHours()).padStart(2, '0') + ':' + String(dt.getMinutes()).padStart(2, '0');
          }
          return sub.date;
        })(),
        'Deadline': video?.deadline || '-',
        'Status Deadline': deadlineStatus,
        'Dikonfirmasi Karyawan': sub.acknowledged ? 'Ya' : 'Tidak',
        'Skor Pre-Test (%)': sub.preScore,
        'Skor Post-Test (%)': sub.postScore,
        'Peningkatan (%)': sub.postScore - sub.preScore,
        'Status Kelulusan': sub.status,
      };
    });
    const ws2 = XLSX.utils.json_to_sheet(prePostRows);
    XLSX.utils.book_append_sheet(wb, ws2, 'Evaluasi Pre-Post Test');

    XLSX.writeFile(wb, `Laporan_LMS_${today}.xlsx`);
  };

  // --- Export PDF ---
  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    setPdfLoading(true);
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;
      let yOffset = 0;
      while (yOffset < imgHeight) {
        pdf.addImage(imgData, 'PNG', 0, -yOffset, pdfWidth, imgHeight);
        yOffset += pageHeight;
        if (yOffset < imgHeight) pdf.addPage();
      }
      const today = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
      pdf.save(`Laporan_LMS_${today}.pdf`);
    } finally {
      setPdfLoading(false);
    }
  };

  const inputStyle = {
    padding: '6px 10px',
    borderRadius: '6px',
    border: '1px solid var(--border)',
    fontSize: '12px',
    background: 'var(--surface)',
    color: 'var(--text1)',
    height: '32px',
  };

  return (
    <div className="content" ref={reportRef}>
      <div style={{ marginBottom: '22px' }}>
        <h2 style={{ fontSize: '20px' }}>Laporan Pelatihan & Compliance</h2>
        <p style={{ fontSize: '12px', color: 'var(--text3)' }}>
          Pantau statistik penyelesaian SOP, audit kesiapan kerja, dan skor evaluasi kuis.
        </p>
      </div>

      {!isFullReportEnabled ? (
        <div>
          <div style={{ background: '#eff6ff', border: '1px solid #dbeafe', borderRadius: '8px', padding: '14px', marginBottom: '22px', fontSize: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>ℹ️ Akun Anda menggunakan <strong>Paket Starter</strong>. Fitur audit compliance lengkap terkunci.</span>
            <span style={{ color: 'var(--accent)', fontWeight: '600', cursor: 'pointer' }}>Upgrade ke Paket Business →</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="card" style={{ padding: '20px' }}>
              <div className="card-title" style={{ marginBottom: '14px' }}>Statistik Kehadiran Dasar</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '6px' }}>
                  <span style={{ color: 'var(--text2)' }}>Rata-rata Menonton</span>
                  <strong>12.5 menit/hari</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '6px' }}>
                  <span style={{ color: 'var(--text2)' }}>Kelulusan Ujian</span>
                  <strong>86%</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text2)' }}>Sertifikat Terbit</span>
                  <strong>186 Lembar</strong>
                </div>
              </div>
            </div>

            <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', border: '1px dashed var(--border)' }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>🔒</div>
              <h4 style={{ fontWeight: '600', marginBottom: '4px' }}>Laporan Compliance Lengkap Terkunci</h4>
              <p style={{ fontSize: '11px', color: 'var(--text3)', maxWidth: '240px', margin: '0 auto 12px' }}>
                Dapatkan ekspor file Excel/PDF, log audit Kemenaker, dan perbandingan kuis Pre/Post Test.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div>

          {/* SUMMARY INSIGHT */}
          <div className="card" style={{ marginBottom: '22px', background: 'linear-gradient(135deg, #f0f4ff 0%, #ffffff 100%)', border: '1px solid #dbeafe' }}>
            <div style={{ padding: '20px 24px' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
                📊 Ringkasan {monthName}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--text1)', lineHeight: '1.8' }}>
                {lastMonthSubs.length > 0 ? (
                  complianceChange > 0 ? (
                    <span>✅ Compliance rate bulan ini <strong>{thisMonthCompliance}%</strong>, naik dari {lastMonthCompliance}% bulan lalu <strong style={{ color: 'var(--green)' }}>(+{complianceChange}%)</strong>.</span>
                  ) : complianceChange < 0 ? (
                    <span>⚠️ Compliance rate bulan ini <strong>{thisMonthCompliance}%</strong>, turun dari {lastMonthCompliance}% bulan lalu <strong style={{ color: 'var(--red)' }}>({complianceChange}%)</strong>.</span>
                  ) : (
                    <span>📈 Compliance rate bulan ini <strong>{thisMonthCompliance}%</strong>, sama dengan bulan lalu.</span>
                  )
                ) : (
                  <span>📈 Overall compliance rate saat ini <strong>{overallCompliance}%</strong> dari {totalEmployees} karyawan aktif.</span>
                )}
                {bestDept && <span>🏆 Departemen <strong>{bestDept.dept}</strong> terbaik dengan completion rate <strong>{bestDept.completedRate}%</strong>.</span>}
                {worstDept && (
                  <span>⚠️ Departemen <strong>{worstDept.dept}</strong> perlu perhatian — hanya <strong style={{ color: 'var(--red)' }}>{worstDept.completedRate}%</strong> completion rate.</span>
                )}
                {thisMonthCerts > 0 && (
                  <span>🎓 <strong>{thisMonthCerts}</strong> sertifikat diterbitkan bulan ini.</span>
                )}
                {upcomingDeadlines.length > 0 && (
                  <span>🔔 <strong>{upcomingDeadlines.length}</strong> SOP mendekati deadline dalam 7 hari: <em>{upcomingDeadlines.map(v => v.title).join(', ')}</em>.</span>
                )}
                {!worstDept && complianceMatrix.length > 0 && (
                  <span>✅ Semua departemen berada di atas 75% compliance — program pelatihan berjalan baik.</span>
                )}
              </div>
            </div>
          </div>

          {/* STAT CARDS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '22px' }}>
            <div className="card" style={{ padding: '16px 20px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text3)', marginBottom: '4px' }}>Compliance Rate</div>
              <div style={{ fontSize: '24px', fontWeight: '600', color: overallCompliance >= 75 ? 'var(--green)' : 'var(--amber)' }}>
                {overallCompliance}%
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text3)', marginTop: '2px' }}>
                {uniqueGlobalSubmitters} dari {totalEmployees} karyawan sudah mengikuti kuis
              </div>
            </div>
            <div className="card" style={{ padding: '16px 20px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text3)', marginBottom: '4px' }}>Rata-rata Skor Kuis</div>
              <div style={{ fontSize: '24px', fontWeight: '600' }}>{overallAvgScore} / 100</div>
              <div style={{ fontSize: '10px', color: overallAvgScore >= passingScore ? 'var(--green)' : 'var(--amber)', marginTop: '2px' }}>
                {overallAvgScore >= passingScore ? `↑ Di atas batas kelulusan (${passingScore})` : `↓ Di bawah batas kelulusan (${passingScore})`}
              </div>
            </div>
            <div className="card" style={{ padding: '16px 20px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text3)', marginBottom: '4px' }}>Waktu Belajar Kolektif</div>
              <div style={{ fontSize: '24px', fontWeight: '600', color: 'var(--accent)' }}>{totalWatchHours} Jam</div>
              <div style={{ fontSize: '10px', color: 'var(--text3)', marginTop: '2px' }}>Estimasi total durasi nonton video SOP</div>
            </div>
          </div>

          {/* CHARTS */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '22px' }}>
            <div className="card" style={{ padding: '20px' }}>
              <div className="card-title" style={{ marginBottom: '16px' }}>Completion Rate per Departemen</div>
              {complianceMatrix.length === 0 ? (
                <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', fontSize: '13px' }}>
                  Belum ada data departemen.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={complianceMatrix} barSize={32} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="dept" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} domain={[0, 100]} tickFormatter={v => `${v}%`} />
                    <Tooltip formatter={(v) => [`${v}%`, 'Completion Rate']} cursor={{ fill: '#f1f5f9' }} />
                    <Bar dataKey="completedRate" radius={[4, 4, 0, 0]}>
                      {complianceMatrix.map((entry, idx) => (
                        <Cell key={idx} fill={getBarColor(entry.completedRate)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="card" style={{ padding: '20px' }}>
              <div className="card-title" style={{ marginBottom: '16px' }}>Tren Compliance (6 Bulan Terakhir)</div>
              {trendData.length < 2 ? (
                <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', fontSize: '13px', textAlign: 'center', lineHeight: '1.6' }}>
                  Data belum cukup.<br />Tren muncul setelah ada submission di 2+ bulan berbeda.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={trendData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} domain={[0, 100]} tickFormatter={v => `${v}%`} />
                    <Tooltip formatter={(v) => [`${v}%`, 'Compliance']} />
                    <Line
                      type="monotone"
                      dataKey="compliance"
                      stroke="#2F7BFF"
                      strokeWidth={2.5}
                      dot={{ fill: '#2F7BFF', r: 4, strokeWidth: 0 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* COMPLIANCE MATRIX TABLE */}
          <div className="card" style={{ marginBottom: '22px' }}>
            <div className="card-head" style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="card-title">Matriks Compliance & Risiko Departemen</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  style={{ ...inputStyle, height: 'auto', padding: '6px 12px', cursor: 'pointer', background: 'var(--surface2)', fontWeight: '500', border: '1px solid var(--border)' }}
                  onClick={handleExport}
                >
                  📥 Ekspor XLSX
                </button>
                <button
                  className="btn-primary"
                  style={{ fontSize: '12px', padding: '6px 14px', opacity: pdfLoading ? 0.7 : 1 }}
                  onClick={handleExportPDF}
                  disabled={pdfLoading}
                >
                  {pdfLoading ? '⏳ Memproses...' : '📄 Ekspor PDF'}
                </button>
              </div>
            </div>
            <div className="card-body">
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--surface2)', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '12px 20px', fontSize: '11px', color: 'var(--text3)' }}>DEPARTEMEN</th>
                    <th style={{ padding: '12px 20px', fontSize: '11px', color: 'var(--text3)' }}>SOP WAJIB</th>
                    <th style={{ padding: '12px 20px', fontSize: '11px', color: 'var(--text3)' }}>COMPLETED RATE</th>
                    <th style={{ padding: '12px 20px', fontSize: '11px', color: 'var(--text3)' }}>SKOR KUIS RATA-RATA</th>
                    <th style={{ padding: '12px 20px', fontSize: '11px', color: 'var(--text3)', textAlign: 'right' }}>STATUS COMPLIANCE</th>
                  </tr>
                </thead>
                <tbody>
                  {complianceMatrix.map(row => (
                    <tr key={row.dept} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '14px 20px', fontWeight: '500' }}>{row.dept}</td>
                      <td style={{ padding: '14px 20px' }}>{row.sopWajib} Video SOP</td>
                      <td style={{ padding: '14px 20px', fontWeight: row.completedRate < 75 ? '600' : '400', color: row.completedRate < 75 ? 'var(--amber)' : 'inherit' }}>
                        {row.completedRate}%
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        {row.avgScore !== null ? `${row.avgScore}%` : <span style={{ color: 'var(--text3)' }}>—</span>}
                      </td>
                      <td style={{ padding: '14px 20px', textAlign: 'right', color: row.status.color, fontWeight: '600' }}>
                        {row.status.label}
                      </td>
                    </tr>
                  ))}
                  {complianceMatrix.length === 0 && (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '24px', color: 'var(--text3)' }}>
                        Belum ada data departemen.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* PRE/POST TEST TABLE */}
          <div className="card">
            <div className="card-head" style={{ borderBottom: '1px solid var(--border)', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <div className="card-title">Evaluasi Efektivitas Pembelajaran (Pre-Test vs Post-Test)</div>
                <span style={{ fontSize: '12px', color: 'var(--text3)' }}>Membandingkan pemahaman sebelum & sesudah menonton SOP</span>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={handleFilterChange(setDateFrom)}
                  style={inputStyle}
                  title="Dari tanggal"
                />
                <span style={{ color: 'var(--text3)', fontSize: '12px' }}>—</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={handleFilterChange(setDateTo)}
                  style={inputStyle}
                  title="Sampai tanggal"
                />
                {(dateFrom || dateTo) && (
                  <button
                    onClick={() => { setDateFrom(''); setDateTo(''); setCurrentPage(1); }}
                    style={{ ...inputStyle, height: 'auto', padding: '5px 10px', cursor: 'pointer', color: 'var(--text3)', background: 'none' }}
                  >
                    ✕ Reset
                  </button>
                )}
                {!isSupervisor && (
                  <select
                    className="form-select"
                    style={{ fontSize: '12px', height: '32px', padding: '0 10px', minWidth: '160px' }}
                    value={histDeptFilter}
                    onChange={handleFilterChange(setHistDeptFilter)}
                  >
                    <option value="">Semua Departemen</option>
                    {activeDepts.map(d => (
                      <option key={d} value={d}>Divisi {d}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
            <div className="card-body">
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--surface2)', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '12px 20px', fontSize: '11px', color: 'var(--text3)' }}>NAMA KARYAWAN</th>
                    <th style={{ padding: '12px 20px', fontSize: '11px', color: 'var(--text3)' }}>JUDUL SOP / MATERI</th>
                    <th style={{ padding: '12px 20px', fontSize: '11px', color: 'var(--text3)', textAlign: 'center' }}>SKOR PRE-TEST</th>
                    <th style={{ padding: '12px 20px', fontSize: '11px', color: 'var(--text3)', textAlign: 'center' }}>SKOR POST-TEST</th>
                    <th style={{ padding: '12px 20px', fontSize: '11px', color: 'var(--text3)', textAlign: 'center' }}>PROGRESS KELULUSAN</th>
                    <th style={{ padding: '12px 20px', fontSize: '11px', color: 'var(--text3)', textAlign: 'right' }}>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedSubmissions.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: 'var(--text3)', fontSize: '13px' }}>
                        {filteredDisplaySubmissions.length === 0 ? 'Belum ada data evaluasi.' : 'Tidak ada data untuk filter ini.'}
                      </td>
                    </tr>
                  ) : paginatedSubmissions.map((sub) => {
                    const improvement = sub.postScore - sub.preScore;
                    const progressLabel = improvement > 0
                      ? `↑ ${improvement}% Meningkat`
                      : improvement < 0
                      ? `↓ ${Math.abs(improvement)}% Menurun`
                      : '= Tidak Berubah';
                    const progressColor = improvement > 0 ? 'var(--green)' : improvement < 0 ? 'var(--red)' : 'var(--text3)';
                    const progressBg = improvement > 0 ? '#ecfdf5' : improvement < 0 ? '#fef2f2' : '#f8fafc';
                    return (
                      <tr key={sub.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '14px 20px', fontWeight: '500' }}>{sub.employeeName}</td>
                        <td style={{ padding: '14px 20px', fontSize: '13px', color: 'var(--text2)', maxWidth: '240px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {sub.videoTitle}
                        </td>
                        <td style={{ padding: '14px 20px', textAlign: 'center', fontWeight: '500', color: 'var(--text3)' }}>{sub.preScore}%</td>
                        <td style={{ padding: '14px 20px', textAlign: 'center', fontWeight: '600' }}>{sub.postScore}%</td>
                        <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                          <span style={{ fontSize: '11px', background: progressBg, color: progressColor, padding: '2px 8px', borderRadius: '4px', fontWeight: '600' }}>
                            {progressLabel}
                          </span>
                        </td>
                        <td style={{ padding: '14px 20px', textAlign: 'right', fontWeight: '600', color: sub.status?.includes('Lulus') ? 'var(--green)' : 'var(--red)' }}>
                          {sub.status}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* PAGINATION */}
              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderTop: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text3)' }}>
                    Menampilkan {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredDisplaySubmissions.length)} dari {filteredDisplaySubmissions.length} data
                  </span>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--border)', background: currentPage === 1 ? 'var(--surface2)' : 'var(--surface)', cursor: currentPage === 1 ? 'default' : 'pointer', fontSize: '13px', color: currentPage === 1 ? 'var(--text3)' : 'var(--text1)' }}
                    >
                      ‹ Prev
                    </button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const page = totalPages <= 5 ? i + 1 : Math.min(Math.max(currentPage - 2, 1) + i, totalPages);
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--border)', background: currentPage === page ? 'var(--accent)' : 'var(--surface)', cursor: 'pointer', fontSize: '13px', color: currentPage === page ? '#fff' : 'var(--text1)', fontWeight: currentPage === page ? '600' : '400' }}
                        >
                          {page}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--border)', background: currentPage === totalPages ? 'var(--surface2)' : 'var(--surface)', cursor: currentPage === totalPages ? 'default' : 'pointer', fontSize: '13px', color: currentPage === totalPages ? 'var(--text3)' : 'var(--text1)' }}
                    >
                      Next ›
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
};
