import React, { useState } from 'react';
import { useTenant } from '../context/TenantContext';
import { PLANS, hasHeyGenIntegration } from '../utils/featureGates';

export const HeyGen = () => {
  const { tenant } = useTenant();
  const [script, setScript] = useState('');
  const [avatar, setAvatar] = useState('Sarah - Corporate Presenter');

  // Gating check
  if (!hasHeyGenIntegration(tenant.plan)) {
    return (
      <div className="content">
        <div className="disabled-feature-overlay">
          <div className="disabled-badge">Fitur Premium Enterprise</div>
          <h2>Integrasi HeyGen AI Terkunci</h2>
          <p style={{ color: 'var(--text2)', maxWidth: '460px', margin: '10px auto 20px', lineHeight: '1.5' }}>
            Akses langsung ke API HeyGen untuk generate video SOP otomatis melalui avatar AI hanya tersedia untuk <strong>Paket Enterprise</strong>.
          </p>
          <button className="btn-primary">Hubungi Tim Sales Axara</button>
        </div>
      </div>
    );
  }

  const handleGenerate = (e) => {
    e.preventDefault();
    if (!script.trim()) return alert('Naskah/Script tidak boleh kosong!');
    alert(`Naskah dikirim ke API HeyGen! Video SOP dengan Avatar "${avatar}" sedang diproduksi oleh AI Axara.`);
    setScript('');
  };

  return (
    <div className="content">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '20px' }}>
        
        {/* CREATE FORM */}
        <div>
          <div className="section-header">
            <div className="section-title">Pembuatan Video SOP dengan AI (Powered by HeyGen)</div>
          </div>
          <div className="card" style={{ padding: '24px' }}>
            <form onSubmit={handleGenerate}>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label">Pilih Avatar Presenter</label>
                <select className="form-select" value={avatar} onChange={(e) => setAvatar(e.target.value)}>
                  <option value="Sarah - Corporate Presenter">Sarah (Profesional - Formal)</option>
                  <option value="Budi - Workshop Trainer">Budi (Santai - Edukatif)</option>
                  <option value="Jane - Customer Relation">Jane (Ramah - CS Specialist)</option>
                  <option value="Michael - Tech Lead">Michael (Gaya IT - Semi Formal)</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="form-label">Naskah Video (Text-to-Speech)</label>
                <textarea
                  className="form-input"
                  style={{ minHeight: '180px', fontFamily: 'inherit', resize: 'vertical' }}
                  placeholder="Ketikkan instruksi kerja di sini. Avatar AI akan membacakannya dengan intonasi natural dan gerakan profesional... \n\nContoh: Selamat pagi rekan-rekan, hari ini saya akan menjelaskan cara melakukan refund transaksi di dashboard kasir..."
                  value={script}
                  onChange={(e) => setScript(e.target.value)}
                />
              </div>

              <button type="submit" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>✨</span> Generate Video AI SOP
              </button>
            </form>
          </div>
        </div>

        {/* WORKFLOW / TEMPLATE PREVIEW */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="section-header">
            <div className="section-title">Pratinjau Avatar</div>
          </div>
          <div className="card" style={{ padding: '20px', textAlign: 'center', background: 'var(--navy2)', color: '#fff' }}>
            <div style={{ width: '120px', height: '120px', borderRadius: '50%', background: 'linear-gradient(135deg, #2F7BFF, #8b5cf6)', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justify: 'center', fontSize: '32px' }}>
              👩‍💼
            </div>
            <h4 style={{ fontWeight: '600', marginBottom: '4px' }}>{avatar.split(' - ')[0]}</h4>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '14px' }}>
              Mode Presentasi: {avatar.split(' - ')[1]}
            </p>
            <div style={{ fontSize: '11px', background: 'rgba(255,255,255,0.06)', padding: '8px 12px', borderRadius: '6px', textAlign: 'left', border: '1px solid rgba(255,255,255,0.1)' }}>
              <strong>Tipe Suara:</strong> Bahasa Indonesia (ID) - Perempuan (Sarah) / Laki-laki (Budi) - Professional Neutral Accent.
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
