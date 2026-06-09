import React from 'react';
import { useTenant } from '../context/TenantContext';
import { hasFullComplianceReports } from '../utils/featureGates';

export const Reports = () => {
  const { tenant, quizSubmissions, videos, currentUser } = useTenant();
  const isSupervisor = currentUser.role === 'supervisor';

  const displaySubmissions = isSupervisor
    ? quizSubmissions.filter(sub => {
        const videoObj = videos.find(v => v.title.toLowerCase() === sub.videoTitle.toLowerCase());
        return videoObj && videoObj.dept.toLowerCase() === currentUser.dept.toLowerCase();
      })
    : quizSubmissions;

  const isFullReportEnabled = hasFullComplianceReports(tenant.plan);

  return (
    <div className="content">
      <div style={{ marginBottom: '22px' }}>
        <h2 style={{ fontSize: '20px' }}>Laporan Pelatihan & Compliance</h2>
        <p style={{ fontSize: '12px', color: 'var(--text3)' }}>
          Pantau statistik penyelesaian SOP, audit kesiapan kerja, dan skor evaluasi kuis.
        </p>
      </div>

      {!isFullReportEnabled ? (
        // 1. BASIC REPORTING (Starter Plan)
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
        // 2. COMPLIANCE & FULL REPORTING (Business & Enterprise Plans)
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '22px' }}>
            <div className="card" style={{ padding: '16px 20px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text3)', marginBottom: '4px' }}>Compliance Rate</div>
              <div style={{ fontSize: '24px', fontWeight: '600', color: 'var(--green)' }}>92.4%</div>
              <div style={{ fontSize: '10px', color: 'var(--text3)', marginTop: '2px' }}>Standar audit regulasi terpenuhi</div>
            </div>
            <div className="card" style={{ padding: '16px 20px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text3)', marginBottom: '4px' }}>Rata-rata Skor Kuis</div>
              <div style={{ fontSize: '24px', fontWeight: '600' }}>84.8 / 100</div>
              <div style={{ fontSize: '10px', color: 'var(--green)', marginTop: '2px' }}>↑ Baik (Di atas standar target 80.0)</div>
            </div>
            <div className="card" style={{ padding: '16px 20px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text3)', marginBottom: '4px' }}>Waktu Belajar Kolektif</div>
              <div style={{ fontSize: '24px', fontWeight: '600', color: 'var(--accent)' }}>1,480 Jam</div>
              <div style={{ fontSize: '10px', color: 'var(--text3)', marginTop: '2px' }}>Total durasi nonton video SOP</div>
            </div>
          </div>

          {/* COMPLIANCE DEPT */}
          <div className="card" style={{ marginBottom: '22px' }}>
            <div className="card-head" style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="card-title">Matriks Compliance & Risiko Departemen</div>
              <button className="btn-primary" style={{ fontSize: '12px', padding: '6px 12px' }} onClick={() => alert('Mengekspor data ke Excel...')}>
                📥 Ekspor Laporan Lengkap (.XLSX)
              </button>
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
                  {(!isSupervisor || currentUser.dept.toLowerCase() === 'sales') && (
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '14px 20px', fontWeight: '500' }}>Sales</td>
                      <td style={{ padding: '14px 20px' }}>4 Video SOP</td>
                      <td style={{ padding: '14px 20px' }}>89%</td>
                      <td style={{ padding: '14px 20px' }}>85%</td>
                      <td style={{ padding: '14px 20px', textAlign: 'right', color: 'var(--green)', fontWeight: '600' }}>Sangat Aman</td>
                    </tr>
                  )}
                  {(!isSupervisor || currentUser.dept.toLowerCase() === 'hrd') && (
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '14px 20px', fontWeight: '500' }}>HRD</td>
                      <td style={{ padding: '14px 20px' }}>3 Video SOP</td>
                      <td style={{ padding: '14px 20px' }}>76%</td>
                      <td style={{ padding: '14px 20px' }}>80%</td>
                      <td style={{ padding: '14px 20px', textAlign: 'right', color: 'var(--green)', fontWeight: '600' }}>Aman</td>
                    </tr>
                  )}
                  {(!isSupervisor || currentUser.dept.toLowerCase() === 'operasional') && (
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '14px 20px', fontWeight: '500' }}>Operasional</td>
                      <td style={{ padding: '14px 20px' }}>6 Video SOP</td>
                      <td style={{ padding: '14px 20px', color: 'var(--amber)', fontWeight: '600' }}>61%</td>
                      <td style={{ padding: '14px 20px' }}>78%</td>
                      <td style={{ padding: '14px 20px', textAlign: 'right', color: 'var(--amber)', fontWeight: '600' }}>Butuh Perhatian</td>
                    </tr>
                  )}
                  {(!isSupervisor || currentUser.dept.toLowerCase() === 'finance') && (
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '14px 20px', fontWeight: '500' }}>Finance</td>
                      <td style={{ padding: '14px 20px' }}>2 Video SOP</td>
                      <td style={{ padding: '14px 20px' }}>94%</td>
                      <td style={{ padding: '14px 20px' }}>90%</td>
                      <td style={{ padding: '14px 20px', textAlign: 'right', color: 'var(--green)', fontWeight: '600' }}>Sangat Aman</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* NEW PRE-TEST & POST-TEST MONITORING */}
          <div className="card">
            <div className="card-head" style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="card-title">Evaluasi Efektivitas Pembelajaran (Pre-Test vs Post-Test)</div>
              <span style={{ fontSize: '12px', color: 'var(--text3)' }}>Membandingkan pemahaman sebelum & sesudah menonton SOP</span>
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
                  {displaySubmissions.map((sub) => {
                    const improvement = sub.postScore - sub.preScore;
                    return (
                      <tr key={sub.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '14px 20px', fontWeight: '500' }}>{sub.employeeName}</td>
                        <td style={{ padding: '14px 20px', fontSize: '13px', color: 'var(--text2)', maxWidth: '240px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {sub.videoTitle}
                        </td>
                        <td style={{ padding: '14px 20px', textAlign: 'center', fontWeight: '500', color: 'var(--text3)' }}>{sub.preScore}%</td>
                        <td style={{ padding: '14px 20px', textAlign: 'center', fontWeight: '600', color: 'var(--text1)' }}>{sub.postScore}%</td>
                        <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                          <span style={{ fontSize: '11px', background: '#ecfdf5', color: 'var(--green)', padding: '2px 8px', borderRadius: '4px', fontWeight: '600' }}>
                            ↑ {improvement}% Meningkat
                          </span>
                        </td>
                        <td style={{ padding: '14px 20px', textAlign: 'right', fontWeight: '600', color: sub.status.includes('Lulus') ? 'var(--green)' : 'var(--red)' }}>
                          {sub.status}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};
