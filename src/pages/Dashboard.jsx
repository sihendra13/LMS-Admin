import React from 'react';
import { useTenant } from '../context/TenantContext';
import { getEmployeeLimit } from '../utils/featureGates';

export const Dashboard = () => {
  const { tenant, employees, videos, activities, setActivePage } = useTenant();

  // Calculate stats dynamically based on mock data
  const totalSOPs = videos.length;
  const activeEmployees = employees.length;
  const employeeLimit = getEmployeeLimit(tenant.plan);

  return (
    <div className="content">
      {/* STATS ROW */}
      <div className="stats-grid">
        <div className="stat-card blue">
          <div className="stat-icon blue">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
          </div>
          <div className="stat-label">Total Video SOP</div>
          <div className="stat-value">{totalSOPs}</div>
          <div className="stat-change info">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 5 5 12"/></svg>
            +6 video bulan ini
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
            <div className="card-title">Video SOP Terbaru & Progress</div>
            <div className="card-action" onClick={() => setActivePage('sop')}>Lihat semua →</div>
          </div>
          <div className="card-body">
            {videos.slice(0, 6).map((video) => (
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
                  <div className="video-meta">
                    <span className={`dept-tag ${video.tagClass}`}>{video.dept}</span>
                    <span className="video-dur">{video.duration}</span>
                  </div>
                  <div className="prog-wrap">
                    <div className="prog-bar">
                      <div className="prog-fill" style={{ width: `${video.progress}%`, background: 'var(--accent)' }}></div>
                    </div>
                    <div className="prog-pct">{video.progress}%</div>
                  </div>
                </div>
                <div className="video-views">{video.views} karyawan</div>
              </div>
            ))}
          </div>
        </div>

        {/* SIDE COLUMN */}
        <div className="side-col">
          {/* COMPLETION PER DEPT */}
          <div className="card">
            <div className="card-head">
              <div className="card-title">Completion per Departemen</div>
            </div>
            <div className="card-body">
              <div className="dept-item">
                <div className="dept-ic" style={{ background: '#eff6ff' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2F7BFF" strokeWidth="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
                </div>
                <div className="dept-label">
                  <div className="dept-name">Sales</div>
                  <div className="dept-pbar"><div class="dept-pfill" style={{ width: '89%', background: '#2F7BFF' }}></div></div>
                </div>
                <div className="dept-num">89%</div>
              </div>
              <div className="dept-item">
                <div className="dept-ic" style={{ background: '#f0fdf4' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                </div>
                <div className="dept-label">
                  <div className="dept-name">HRD</div>
                  <div className="dept-pbar"><div class="dept-pfill" style={{ width: '76%', background: '#10b981' }}></div></div>
                </div>
                <div className="dept-num">76%</div>
              </div>
              <div className="dept-item">
                <div className="dept-ic" style={{ background: '#fffbeb' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><rect x="1" y="3" width="15" height="13" rx="2"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                </div>
                <div className="dept-label">
                  <div className="dept-name">Operasional</div>
                  <div className="dept-pbar"><div class="dept-pfill" style={{ width: '61%', background: '#f59e0b' }}></div></div>
                </div>
                <div className="dept-num">61%</div>
              </div>
              <div className="dept-item">
                <div className="dept-ic" style={{ background: '#f5f3ff' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                </div>
                <div className="dept-label">
                  <div className="dept-name">Finance</div>
                  <div className="dept-pbar"><div class="dept-pfill" style={{ width: '94%', background: '#8b5cf6' }}></div></div>
                </div>
                <div className="dept-num">94%</div>
              </div>
              <div className="dept-item">
                <div className="dept-ic" style={{ background: '#ecfeff' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                </div>
                <div className="dept-label">
                  <div className="dept-name">Customer Service</div>
                  <div className="dept-pbar"><div class="dept-pfill" style={{ width: '70%', background: '#06b6d4' }}></div></div>
                </div>
                <div className="dept-num">70%</div>
              </div>
            </div>
          </div>

          {/* LEADERBOARD */}
          <div className="card">
            <div className="card-head">
              <div className="card-title">Top Learners Bulan Ini</div>
              <div className="card-action" onClick={() => setActivePage('karyawan')}>Lihat semua</div>
            </div>
            <div className="card-body">
              {employees.slice(0, 5).map((emp, i) => {
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
            {activities.slice(0, 5).map((act) => {
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
            <div className="card-title">Video Ditonton Minggu Ini</div>
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
                <div style={{ fontSize: '18px', fontWeight: 600, fontFamily: "'Plus Jakarta Sans',sans-serif", color: 'var(--text1)' }}>312 <span style={{ fontSize: '12px', color: 'var(--green)', fontWeight: 400 }}>↑ 18%</span></div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '11px', color: 'var(--text3)' }}>Avg/hari</div>
                <div style={{ fontSize: '18px', fontWeight: 600, fontFamily: "'Plus Jakarta Sans',sans-serif", color: 'var(--text1)' }}>44</div>
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
              <div className="mini-val">18</div>
              <div className="mini-sub" style={{ color: 'var(--accent)', fontSize: '11px' }}>SOP aktif</div>
            </div>
            <div className="mini-stat">
              <div className="mini-label">Belum selesai</div>
              <div className="mini-val" style={{ color: 'var(--red)' }}>54</div>
              <div className="mini-sub" style={{ color: 'var(--red)', fontSize: '11px' }}>karyawan</div>
            </div>
            <div className="mini-stat">
              <div className="mini-label">Quiz lulus</div>
              <div className="mini-val">186</div>
              <div className="mini-sub" style={{ color: 'var(--green)', fontSize: '11px' }}>dari 248</div>
            </div>
            <div className="mini-stat">
              <div className="mini-label">Avg. skor quiz</div>
              <div className="mini-val">82<span style={{ fontSize: '14px', fontWeight: 400 }}>%</span></div>
              <div className="mini-sub" style={{ color: 'var(--green)', fontSize: '11px' }}>↑ baik</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
