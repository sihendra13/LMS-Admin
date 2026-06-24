import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend,
} from 'recharts';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { useTenant } from '../context/TenantContext';
import { hasFullComplianceReports } from '../utils/featureGates';

const MAX_RETAKES = 3;

const STATUS_COLORS = {
  tersertifikasi: '#22c55e',
  lulusMenunggu:  '#3b82f6',
  remedial:       '#f59e0b',
  tidakLulus:     '#ef4444',
  belumIkut:      '#cbd5e1',
};

export const Reports = () => {
  const { tenant, quizSubmissions, videos, employees, currentUser, passingScore } = useTenant();
  const isSupervisor = currentUser.role !== 'admin';
  const reportRef = useRef(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const now = new Date();
  const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [selectedPeriod, setSelectedPeriod] = useState(currentPeriod);
  const [deptFilter, setDeptFilter] = useState('');

  const isFullReportEnabled = hasFullComplianceReports(tenant.plan);

  // --- Periode options ---
  const periodOptions = Array.from({ length: 13 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    return { value, label };
  });
  const selectedLabel = periodOptions.find(o => o.value === selectedPeriod)?.label ?? selectedPeriod;

  const [selYear, selMonthIdx] = selectedPeriod.split('-').map(Number);
  const prevDate = new Date(selYear, selMonthIdx - 2, 1);
  const prevPeriod = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

  // --- Helpers ---
  const parseDuration = (str) => {
    if (!str) return 0;
    const [m, s] = str.split(':').map(Number);
    return (m || 0) + (s || 0) / 60;
  };

  // --- All submissions (scoped by supervisor dept if needed) ---
  const displaySubmissions = isSupervisor
    ? quizSubmissions.filter(sub => {
        const v = videos.find(v => v.title.toLowerCase() === sub.videoTitle.toLowerCase());
        return v && v.dept.toLowerCase() === currentUser.dept.toLowerCase();
      })
    : quizSubmissions;

  const periodSubs    = displaySubmissions.filter(s => s.date?.startsWith(selectedPeriod));
  const prevPeriodSubs = displaySubmissions.filter(s => s.date?.startsWith(prevPeriod));

  // --- Dept list ---
  const activeDepts = isSupervisor
    ? [currentUser.dept]
    : [...new Set(videos.filter(v => !v.archived && v.dept !== 'Semua').map(v => v.dept))].sort();

  // --- Compliance matrix (KUMULATIF — pernah selesai kapanpun) ---
  const complianceMatrix = activeDepts.map(dept => {
    const deptVideos    = videos.filter(v => !v.archived && (v.dept === dept || v.dept === 'Semua'));
    const deptEmployees = employees.filter(e => e.dept?.toLowerCase() === dept.toLowerCase());
    const total         = deptEmployees.length;

    // Semua submission kumulatif untuk dept ini
    const allDeptSubs = displaySubmissions.filter(s =>
      (s.dept || '').toLowerCase() === dept.toLowerCase()
    );

    // Per karyawan: ambil status terbaik
    // Prioritas: approved > supervisor_ok > pending > remedial<3 > remedial>=3
    const getPriority = (s) => {
      if (s.certStatus === 'approved')      return 5;
      if (s.certStatus === 'supervisor_ok') return 4;
      if (s.certStatus === 'pending')       return 3;
      if (s.certStatus === 'remedial' && (s.retakeCount || 0) < MAX_RETAKES) return 2;
      return 1;
    };

    const bestPerEmployee = {};
    allDeptSubs.forEach(s => {
      const cur = bestPerEmployee[s.employeeName];
      if (!cur || getPriority(s) > getPriority(cur)) bestPerEmployee[s.employeeName] = s;
    });
    const statuses = Object.values(bestPerEmployee);

    const tersertifikasi = statuses.filter(s => s.certStatus === 'approved').length;
    const lulusMenunggu  = statuses.filter(s => ['pending', 'supervisor_ok'].includes(s.certStatus)).length;
    const tidakLulus     = statuses.filter(s => s.certStatus === 'remedial' && (s.retakeCount || 0) >= MAX_RETAKES).length;
    const remedial       = statuses.filter(s => s.certStatus === 'remedial' && (s.retakeCount || 0) < MAX_RETAKES).length;
    const belumIkut      = Math.max(0, total - statuses.length);

    return {
      dept,
      sopWajib: deptVideos.length,
      total,
      tersertifikasi,
      lulusMenunggu,
      remedial,
      tidakLulus,
      belumIkut,
      tersertifikasiRate: total > 0 ? Math.round((tersertifikasi / total) * 100) : 0,
    };
  });

  // --- Global stats (periode terpilih) ---
  const totalEmployees   = employees.length;
  const uniqueSubmitters = new Set(periodSubs.map(s => s.employeeName)).size;
  const overallCompliance = totalEmployees > 0 ? Math.round((uniqueSubmitters / totalEmployees) * 100) : 0;
  const overallAvgScore  = periodSubs.length > 0
    ? Math.round(periodSubs.reduce((sum, s) => sum + (s.postScore || 0), 0) / periodSubs.length)
    : 0;
  const avgVideoDurationMinutes = videos.length > 0
    ? videos.reduce((sum, v) => sum + parseDuration(v.duration), 0) / videos.length
    : 0;
  const totalWatchHours = Math.round((periodSubs.length * avgVideoDurationMinutes) / 60);

  // --- Trend data (6 bulan, tidak difilter periode) ---
  const trendData = (() => {
    const monthMap = {};
    displaySubmissions.forEach(s => {
      if (!s.date) return;
      const d = new Date(s.date);
      if (isNaN(d)) return;
      const key   = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
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
  const prevUniqueSubmitters = new Set(prevPeriodSubs.map(s => s.employeeName)).size;
  const prevCompliance   = totalEmployees > 0 ? Math.round((prevUniqueSubmitters / totalEmployees) * 100) : 0;
  const complianceChange = overallCompliance - prevCompliance;

  const totalTidakLulus = complianceMatrix.reduce((sum, r) => sum + r.tidakLulus, 0);
  const totalRemedial   = complianceMatrix.reduce((sum, r) => sum + r.remedial, 0);
  const bestDept  = complianceMatrix.length > 0
    ? complianceMatrix.reduce((b, d) => d.tersertifikasiRate > b.tersertifikasiRate ? d : b) : null;
  const worstDept = complianceMatrix.filter(d => d.tersertifikasiRate < 75).length > 0
    ? complianceMatrix.filter(d => d.tersertifikasiRate < 75).reduce((w, d) => d.tersertifikasiRate < w.tersertifikasiRate ? d : w) : null;
  const periodCerts = periodSubs.filter(s => s.certStatus === 'approved').length;
  const upcomingDeadlines = videos.filter(v => {
    if (!v.deadline || v.archived) return false;
    const diff = (new Date(v.deadline) - now) / 86400000;
    return diff >= 0 && diff <= 7;
  });

  // --- Pre/Post Test table (periode + dept filter) ---
  const filteredTableSubs = periodSubs.filter(s => {
    if (!isSupervisor && deptFilter && (s.dept || '').toLowerCase() !== deptFilter.toLowerCase()) return false;
    return true;
  });
  const totalPages    = Math.ceil(filteredTableSubs.length / ITEMS_PER_PAGE);
  const paginatedSubs = filteredTableSubs.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const handlePeriodChange = (e) => { setSelectedPeriod(e.target.value); setCurrentPage(1); };
  const handleDeptChange   = (e) => { setDeptFilter(e.target.value);     setCurrentPage(1); };

  // --- Export XLSX ---
  const handleExport = () => {
    const wb = XLSX.utils.book_new();

    const complianceRows = complianceMatrix.map(row => ({
      'Periode': selectedLabel,
      'Departemen': row.dept,
      'Total Karyawan': row.total,
      'Tersertifikasi': row.tersertifikasi,
      'Tersertifikasi (%)': row.total > 0 ? Math.round(row.tersertifikasi / row.total * 100) : 0,
      'Lulus (Menunggu Approval)': row.lulusMenunggu,
      'Remedial': row.remedial,
      'Tidak Lulus (>3x)': row.tidakLulus,
      'Belum Ikut Kuis': row.belumIkut,
      'SOP Wajib': row.sopWajib,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(complianceRows), 'Status Compliance');

    const prePostRows = filteredTableSubs.map(sub => {
      const video = videos.find(v => v.title === sub.videoTitle);
      const subDate = sub.date && sub.date.length > 10 ? new Date(sub.date) : null;
      const deadlineStatus = !video?.deadline ? '-'
        : !subDate ? 'Tidak diketahui'
        : subDate <= new Date(video.deadline) ? 'Tepat Waktu' : 'Terlambat';
      return {
        'Periode': selectedLabel,
        'Nama Karyawan': sub.employeeName,
        'Departemen': sub.dept || '-',
        'SOP / Materi': sub.videoTitle,
        'Tanggal Penyelesaian': subDate
          ? subDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
            + ' ' + String(subDate.getHours()).padStart(2, '0') + ':' + String(subDate.getMinutes()).padStart(2, '0')
          : sub.date || '-',
        'Deadline': video?.deadline || '-',
        'Status Deadline': deadlineStatus,
        'Dikonfirmasi Karyawan': sub.acknowledged ? 'Ya' : 'Tidak',
        'Skor Pre-Test (%)': sub.preScore,
        'Skor Post-Test (%)': sub.postScore,
        'Peningkatan (%)': sub.postScore - sub.preScore,
        'Status Kelulusan': sub.status,
        'Status Sertifikat': sub.certStatus || '-',
      };
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(prePostRows), 'Evaluasi Pre-Post Test');

    XLSX.writeFile(wb, `Laporan_LMS_${selectedLabel.replace(' ', '_')}.xlsx`);
  };

  // --- Export PDF ---
  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    setPdfLoading(true);
    try {
      const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false });
      const imgData  = canvas.toDataURL('image/png');
      const pdf      = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pgHeight = pdf.internal.pageSize.getHeight();
      const imgH     = (canvas.height * pdfWidth) / canvas.width;
      let yOffset    = 0;
      while (yOffset < imgH) {
        pdf.addImage(imgData, 'PNG', 0, -yOffset, pdfWidth, imgH);
        yOffset += pgHeight;
        if (yOffset < imgH) pdf.addPage();
      }
      pdf.save(`Laporan_LMS_${selectedLabel.replace(' ', '_')}.pdf`);
    } finally {
      setPdfLoading(false);
    }
  };

  const selectStyle = { height: '36px', minWidth: '160px' };

  // --- Stacked bar chart data ---
  const barData = complianceMatrix.map(r => ({
    dept:            r.dept,
    Tersertifikasi:  r.tersertifikasi,
    'Lulus (Menunggu)': r.lulusMenunggu,
    Remedial:        r.remedial,
    'Tidak Lulus':   r.tidakLulus,
    'Belum Ikut':    r.belumIkut,
  }));

  const customTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const total = payload.reduce((s, p) => s + (p.value || 0), 0);
    return (
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', minWidth: '160px' }}>
        <div style={{ fontWeight: '700', marginBottom: '8px', color: '#0f172a' }}>{label}</div>
        {payload.map(p => (
          <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', color: '#475569', marginBottom: '2px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.fill, display: 'inline-block' }} />
              {p.name}
            </span>
            <span style={{ fontWeight: '600', color: '#0f172a' }}>{p.value} ({total > 0 ? Math.round(p.value / total * 100) : 0}%)</span>
          </div>
        ))}
        <div style={{ borderTop: '1px solid #e2e8f0', marginTop: '6px', paddingTop: '6px', display: 'flex', justifyContent: 'space-between', fontWeight: '700' }}>
          <span>Total</span><span>{total} karyawan</span>
        </div>
      </div>
    );
  };

  return (
    <div className="content" ref={reportRef}>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '20px' }}>Laporan Pelatihan & Compliance</h2>
        <p style={{ fontSize: '12px', color: 'var(--text3)' }}>
          Pantau status sertifikasi, aktivitas kuis, dan efektivitas pembelajaran per periode.
        </p>
      </div>

      {!isFullReportEnabled ? (
        <div>
          <div style={{ background: '#eff6ff', border: '1px solid #dbeafe', borderRadius: '8px', padding: '14px', marginBottom: '22px', fontSize: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>ℹ️ Akun Anda menggunakan <strong>Paket Starter</strong>. Fitur laporan compliance lengkap terkunci.</span>
            <span style={{ color: 'var(--accent)', fontWeight: '600', cursor: 'pointer' }}>Upgrade ke Paket Business →</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="card" style={{ padding: '20px' }}>
              <div className="card-title" style={{ marginBottom: '14px' }}>Statistik Kehadiran Dasar</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[['Rata-rata Menonton', '12.5 menit/hari'], ['Kelulusan Ujian', '86%'], ['Sertifikat Terbit', '186 Lembar']].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '6px' }}>
                    <span style={{ color: 'var(--text2)' }}>{k}</span><strong>{v}</strong>
                  </div>
                ))}
              </div>
            </div>
            <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', border: '1px dashed var(--border)' }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>🔒</div>
              <h4 style={{ fontWeight: '600', marginBottom: '4px' }}>Laporan Compliance Lengkap Terkunci</h4>
              <p style={{ fontSize: '11px', color: 'var(--text3)', maxWidth: '240px', margin: 0 }}>
                Dapatkan ekspor Excel/PDF, status sertifikasi per karyawan, dan evaluasi Pre/Post Test.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div>

          {/* FILTER BAR */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text3)', fontWeight: '600' }}>PERIODE</span>
              <select value={selectedPeriod} onChange={handlePeriodChange} className="form-select" style={selectStyle}>
                {periodOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            {!isSupervisor && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text3)', fontWeight: '600' }}>DEPARTEMEN</span>
                <select value={deptFilter} onChange={handleDeptChange} className="form-select" style={selectStyle}>
                  <option value="">Semua</option>
                  {activeDepts.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            )}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
              <button onClick={handleExport}
                style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface2)', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>
                📥 Ekspor XLSX
              </button>
              <button className="btn-primary" style={{ fontSize: '13px', padding: '6px 14px', opacity: pdfLoading ? 0.7 : 1 }}
                onClick={handleExportPDF} disabled={pdfLoading}>
                {pdfLoading ? '⏳ Memproses...' : '📄 Ekspor PDF'}
              </button>
            </div>
          </div>

          {/* SUMMARY INSIGHT */}
          <div className="card" style={{ marginBottom: '20px', background: 'linear-gradient(135deg, #f0f4ff 0%, #ffffff 100%)', border: '1px solid #dbeafe' }}>
            <div style={{ padding: '18px 24px' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
                📊 Ringkasan {selectedLabel}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '13px', color: 'var(--text1)', lineHeight: '1.8' }}>
                {prevPeriodSubs.length > 0
                  ? complianceChange > 0
                    ? <span>✅ Aktivitas periode ini <strong>{overallCompliance}%</strong>, naik dari {prevCompliance}% bulan lalu <strong style={{ color: 'var(--green)' }}>(+{complianceChange}%)</strong>.</span>
                    : complianceChange < 0
                    ? <span>⚠️ Aktivitas periode ini <strong>{overallCompliance}%</strong>, turun dari {prevCompliance}% bulan lalu <strong style={{ color: 'var(--red)' }}>({complianceChange}%)</strong>.</span>
                    : <span>📈 Aktivitas periode ini <strong>{overallCompliance}%</strong>, sama dengan bulan lalu.</span>
                  : <span>📈 Aktivitas kuis periode ini <strong>{overallCompliance}%</strong> dari {totalEmployees} karyawan aktif.</span>
                }
                {bestDept && bestDept.tersertifikasiRate > 0 && (
                  <span>🏆 Departemen <strong>{bestDept.dept}</strong> terbaik — <strong>{bestDept.tersertifikasi}</strong> dari {bestDept.total} karyawan tersertifikasi ({bestDept.tersertifikasiRate}%).</span>
                )}
                {worstDept && (
                  <span>⚠️ Departemen <strong>{worstDept.dept}</strong> perlu perhatian — tersertifikasi hanya <strong style={{ color: 'var(--red)' }}>{worstDept.tersertifikasiRate}%</strong>.</span>
                )}
                {totalTidakLulus > 0 && (
                  <span>🚨 <strong>{totalTidakLulus}</strong> karyawan gagal setelah {MAX_RETAKES}x remedial — perlu intervensi HRD segera.</span>
                )}
                {totalRemedial > 0 && (
                  <span>🔄 <strong>{totalRemedial}</strong> karyawan sedang dalam proses remedial.</span>
                )}
                {periodCerts > 0 && (
                  <span>🎓 <strong>{periodCerts}</strong> sertifikat diterbitkan periode ini.</span>
                )}
                {selectedPeriod === currentPeriod && upcomingDeadlines.length > 0 && (
                  <span>🔔 <strong>{upcomingDeadlines.length}</strong> SOP mendekati deadline 7 hari ke depan: <em>{upcomingDeadlines.map(v => v.title).join(', ')}</em>.</span>
                )}
                {periodSubs.length === 0 && (
                  <span style={{ color: 'var(--text3)' }}>Belum ada aktivitas kuis untuk periode ini.</span>
                )}
              </div>
            </div>
          </div>

          {/* STAT CARDS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '20px' }}>
            <div className="card" style={{ padding: '16px 20px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text3)', marginBottom: '4px' }}>Aktivitas Kuis Periode Ini</div>
              <div style={{ fontSize: '24px', fontWeight: '600', color: overallCompliance >= 75 ? 'var(--green)' : 'var(--amber)' }}>{overallCompliance}%</div>
              <div style={{ fontSize: '10px', color: 'var(--text3)', marginTop: '2px' }}>{uniqueSubmitters} dari {totalEmployees} karyawan submit kuis</div>
            </div>
            <div className="card" style={{ padding: '16px 20px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text3)', marginBottom: '4px' }}>Rata-rata Skor Kuis</div>
              <div style={{ fontSize: '24px', fontWeight: '600' }}>{overallAvgScore > 0 ? `${overallAvgScore} / 100` : '—'}</div>
              <div style={{ fontSize: '10px', color: overallAvgScore > 0 ? (overallAvgScore >= passingScore ? 'var(--green)' : 'var(--amber)') : 'var(--text3)', marginTop: '2px' }}>
                {overallAvgScore > 0 ? (overallAvgScore >= passingScore ? `↑ Di atas passing score (${passingScore})` : `↓ Di bawah passing score (${passingScore})`) : 'Belum ada data'}
              </div>
            </div>
            <div className="card" style={{ padding: '16px 20px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text3)', marginBottom: '4px' }}>Waktu Belajar Kolektif</div>
              <div style={{ fontSize: '24px', fontWeight: '600', color: 'var(--accent)' }}>{totalWatchHours} Jam</div>
              <div style={{ fontSize: '10px', color: 'var(--text3)', marginTop: '2px' }}>Estimasi total durasi nonton video SOP</div>
            </div>
          </div>

          {/* CHARTS */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            {/* STACKED BAR CHART */}
            <div className="card" style={{ padding: '20px' }}>
              <div className="card-title" style={{ marginBottom: '2px' }}>Status Sertifikasi per Departemen</div>
              <div style={{ fontSize: '11px', color: 'var(--text3)', marginBottom: '14px' }}>Kumulatif — semua periode</div>
              {barData.length === 0 ? (
                <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', fontSize: '13px' }}>
                  Belum ada data departemen.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={barData} barSize={36} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="dept" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                    <Tooltip content={customTooltip} />
                    <Bar dataKey="Tersertifikasi"    stackId="a" fill={STATUS_COLORS.tersertifikasi} radius={[0,0,0,0]} />
                    <Bar dataKey="Lulus (Menunggu)"  stackId="a" fill={STATUS_COLORS.lulusMenunggu} />
                    <Bar dataKey="Remedial"          stackId="a" fill={STATUS_COLORS.remedial} />
                    <Bar dataKey="Tidak Lulus"       stackId="a" fill={STATUS_COLORS.tidakLulus} />
                    <Bar dataKey="Belum Ikut"        stackId="a" fill={STATUS_COLORS.belumIkut} radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
              {/* Legend */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '12px' }}>
                {[
                  ['Tersertifikasi', STATUS_COLORS.tersertifikasi],
                  ['Lulus (Menunggu)', STATUS_COLORS.lulusMenunggu],
                  ['Remedial', STATUS_COLORS.remedial],
                  ['Tidak Lulus', STATUS_COLORS.tidakLulus],
                  ['Belum Ikut', STATUS_COLORS.belumIkut],
                ].map(([label, color]) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#475569' }}>
                    <span style={{ width: 10, height: 10, borderRadius: '2px', background: color, display: 'inline-block' }} />
                    {label}
                  </div>
                ))}
              </div>
            </div>

            {/* LINE CHART */}
            <div className="card" style={{ padding: '20px' }}>
              <div className="card-title" style={{ marginBottom: '2px' }}>Tren Aktivitas Kuis</div>
              <div style={{ fontSize: '11px', color: 'var(--text3)', marginBottom: '14px' }}>6 bulan terakhir</div>
              {trendData.length < 2 ? (
                <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', fontSize: '13px', textAlign: 'center', lineHeight: '1.6' }}>
                  Data belum cukup.<br />Tren muncul setelah ada submission di 2+ bulan berbeda.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={trendData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} domain={[0, 100]} tickFormatter={v => `${v}%`} />
                    <Tooltip formatter={(v) => [`${v}%`, 'Aktivitas']} />
                    <Line type="monotone" dataKey="compliance" stroke="#2F7BFF" strokeWidth={2.5}
                      dot={{ fill: '#2F7BFF', r: 4, strokeWidth: 0 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* COMPLIANCE MATRIX TABLE */}
          <div className="card" style={{ marginBottom: '20px' }}>
            <div className="card-head" style={{ borderBottom: '1px solid var(--border)' }}>
              <div>
                <div className="card-title">Status Sertifikasi per Departemen</div>
                <span style={{ fontSize: '11px', color: 'var(--text3)' }}>Kumulatif semua periode · data terkini per karyawan</span>
              </div>
            </div>
            <div className="card-body" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '720px' }}>
                <thead>
                  <tr style={{ background: 'var(--surface2)', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '12px 16px', fontSize: '11px', color: 'var(--text3)' }}>DEPARTEMEN</th>
                    <th style={{ padding: '12px 16px', fontSize: '11px', color: 'var(--text3)', textAlign: 'center' }}>TOTAL</th>
                    <th style={{ padding: '12px 16px', fontSize: '11px', color: STATUS_COLORS.tersertifikasi, textAlign: 'center' }}>TERSERTIFIKASI</th>
                    <th style={{ padding: '12px 16px', fontSize: '11px', color: STATUS_COLORS.lulusMenunggu, textAlign: 'center' }}>LULUS (MENUNGGU APPROVAL)</th>
                    <th style={{ padding: '12px 16px', fontSize: '11px', color: STATUS_COLORS.remedial, textAlign: 'center' }}>REMEDIAL</th>
                    <th style={{ padding: '12px 16px', fontSize: '11px', color: STATUS_COLORS.tidakLulus, textAlign: 'center' }}>TIDAK LULUS</th>
                    <th style={{ padding: '12px 16px', fontSize: '11px', color: 'var(--text3)', textAlign: 'center' }}>BELUM IKUT</th>
                  </tr>
                </thead>
                <tbody>
                  {complianceMatrix.map(row => (
                    <tr key={row.dept} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '14px 16px', fontWeight: '600' }}>{row.dept}</td>
                      <td style={{ padding: '14px 16px', textAlign: 'center', color: 'var(--text2)' }}>{row.total}</td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <span style={{ fontWeight: '700', color: STATUS_COLORS.tersertifikasi }}>{row.tersertifikasi}</span>
                        <span style={{ fontSize: '11px', color: 'var(--text3)', marginLeft: '4px' }}>
                          ({row.total > 0 ? Math.round(row.tersertifikasi / row.total * 100) : 0}%)
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: row.lulusMenunggu > 0 ? '600' : '400', color: row.lulusMenunggu > 0 ? STATUS_COLORS.lulusMenunggu : 'var(--text3)' }}>
                        {row.lulusMenunggu}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: row.remedial > 0 ? '600' : '400', color: row.remedial > 0 ? STATUS_COLORS.remedial : 'var(--text3)' }}>
                        {row.remedial}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: row.tidakLulus > 0 ? '700' : '400', color: row.tidakLulus > 0 ? STATUS_COLORS.tidakLulus : 'var(--text3)' }}>
                        {row.tidakLulus > 0 ? `⚠️ ${row.tidakLulus}` : '0'}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center', color: row.belumIkut > 0 ? 'var(--text2)' : 'var(--text3)' }}>
                        {row.belumIkut}
                      </td>
                    </tr>
                  ))}
                  {complianceMatrix.length === 0 && (
                    <tr><td colSpan="7" style={{ textAlign: 'center', padding: '24px', color: 'var(--text3)' }}>Belum ada data departemen.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* PRE/POST TEST TABLE */}
          <div className="card">
            <div className="card-head" style={{ borderBottom: '1px solid var(--border)' }}>
              <div>
                <div className="card-title">Evaluasi Efektivitas Pembelajaran (Pre-Test vs Post-Test)</div>
                <span style={{ fontSize: '12px', color: 'var(--text3)' }}>
                  {selectedLabel}{deptFilter ? ` · ${deptFilter}` : ''} · {filteredTableSubs.length} data
                </span>
              </div>
            </div>
            <div className="card-body">
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--surface2)', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '12px 16px', fontSize: '11px', color: 'var(--text3)' }}>NAMA KARYAWAN</th>
                    <th style={{ padding: '12px 16px', fontSize: '11px', color: 'var(--text3)' }}>SOP / MATERI</th>
                    <th style={{ padding: '12px 16px', fontSize: '11px', color: 'var(--text3)', textAlign: 'center' }}>PRE-TEST</th>
                    <th style={{ padding: '12px 16px', fontSize: '11px', color: 'var(--text3)', textAlign: 'center' }}>POST-TEST</th>
                    <th style={{ padding: '12px 16px', fontSize: '11px', color: 'var(--text3)', textAlign: 'center' }}>PROGRESS</th>
                    <th style={{ padding: '12px 16px', fontSize: '11px', color: 'var(--text3)', textAlign: 'right' }}>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedSubs.length === 0 ? (
                    <tr><td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: 'var(--text3)', fontSize: '13px' }}>
                      Belum ada data untuk periode {selectedLabel}.
                    </td></tr>
                  ) : paginatedSubs.map(sub => {
                    const imp = sub.postScore - sub.preScore;
                    const progressLabel = imp > 0 ? `↑ ${imp}% Meningkat` : imp < 0 ? `↓ ${Math.abs(imp)}% Menurun` : '= Tidak Berubah';
                    const progressColor = imp > 0 ? 'var(--green)' : imp < 0 ? 'var(--red)' : 'var(--text3)';
                    const progressBg    = imp > 0 ? '#ecfdf5'      : imp < 0 ? '#fef2f2'    : '#f8fafc';
                    return (
                      <tr key={sub.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '14px 16px', fontWeight: '500' }}>{sub.employeeName}</td>
                        <td style={{ padding: '14px 16px', fontSize: '13px', color: 'var(--text2)', maxWidth: '220px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub.videoTitle}</td>
                        <td style={{ padding: '14px 16px', textAlign: 'center', color: 'var(--text3)' }}>{sub.preScore}%</td>
                        <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: '600' }}>{sub.postScore}%</td>
                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                          <span style={{ fontSize: '11px', background: progressBg, color: progressColor, padding: '2px 8px', borderRadius: '4px', fontWeight: '600' }}>{progressLabel}</span>
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: '600', color: sub.status?.includes('Lulus') ? 'var(--green)' : 'var(--red)' }}>{sub.status}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderTop: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text3)' }}>
                    {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredTableSubs.length)} dari {filteredTableSubs.length} data
                  </span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                      style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--border)', background: currentPage === 1 ? 'var(--surface2)' : 'var(--surface)', cursor: currentPage === 1 ? 'default' : 'pointer', fontSize: '13px', color: currentPage === 1 ? 'var(--text3)' : 'var(--text1)' }}>
                      ‹ Prev
                    </button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const page = totalPages <= 5 ? i + 1 : Math.min(Math.max(currentPage - 2, 1) + i, totalPages);
                      return (
                        <button key={page} onClick={() => setCurrentPage(page)}
                          style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--border)', background: currentPage === page ? 'var(--accent)' : 'var(--surface)', cursor: 'pointer', fontSize: '13px', color: currentPage === page ? '#fff' : 'var(--text1)', fontWeight: currentPage === page ? '600' : '400' }}>
                          {page}
                        </button>
                      );
                    })}
                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                      style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--border)', background: currentPage === totalPages ? 'var(--surface2)' : 'var(--surface)', cursor: currentPage === totalPages ? 'default' : 'pointer', fontSize: '13px', color: currentPage === totalPages ? 'var(--text3)' : 'var(--text1)' }}>
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
