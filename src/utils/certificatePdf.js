// Membuat file PDF sertifikat (A4 landscape) langsung dengan jsPDF.
// Menggantikan window.print(), yang di HP menghasilkan PDF kosong (Android) atau
// sertifikat kecil di tengah halaman (iPhone).
import { jsPDF } from 'jspdf';

const NAVY = [15, 23, 42];
const ACCENT = [47, 123, 255];
const MUTED = [100, 116, 139];
const LIGHT = [203, 213, 225];
const GREEN = [22, 163, 74];

// Logo perusahaan (paket Enterprise) → data URL agar bisa ditempel di PDF. Gagal = tanpa logo.
const loadImage = (url) => new Promise((resolve) => {
  if (!url || typeof Image === 'undefined') return resolve(null);
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    try {
      // Perkecil & jadikan JPEG berlatar putih — PNG asli membuat PDF ratusan KB
      const scale = Math.min(1, 600 / img.naturalWidth);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.naturalWidth * scale);
      canvas.height = Math.round(img.naturalHeight * scale);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve({ dataUrl: canvas.toDataURL('image/jpeg', 0.9), width: canvas.width, height: canvas.height });
    } catch {
      resolve(null);
    }
  };
  img.onerror = () => resolve(null);
  img.src = url;
});

// signer: { name, title, signatureUrl } dari Pengaturan → Tanda Tangan Sertifikat (semua opsional).
// Nama kosong = nama HRD yang menerbitkan (cert.approvedBy); jabatan kosong = "HR Manager".
export const buildCertificatePdf = async (cert, { tenantName = '', logoUrl = null, signer = {} } = {}) => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
  const W = doc.internal.pageSize.getWidth();   // 297
  const H = doc.internal.pageSize.getHeight();  // 210
  const cx = W / 2;

  // Bingkai ganda
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(1.2);
  doc.rect(10, 10, W - 20, H - 20);
  doc.setLineWidth(0.4);
  doc.rect(14, 14, W - 28, H - 28);

  let y = 42;
  const logo = await loadImage(logoUrl);
  if (logo) {
    const h = 14;
    const w = Math.min(60, (logo.width / logo.height) * h);
    doc.addImage(logo.dataUrl, 'JPEG', cx - w / 2, y - 8, w, h);
    y += 12;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...MUTED);
  doc.text((tenantName || '').toUpperCase(), cx, y, { align: 'center', charSpace: 0.6 });

  y += 20;
  doc.setFont('times', 'bold');
  doc.setFontSize(30);
  doc.setTextColor(...NAVY);
  doc.text('SERTIFIKAT KELULUSAN', cx, y, { align: 'center', charSpace: 0.8 });

  y += 6;
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.8);
  doc.line(cx - 15, y, cx + 15, y);

  y += 16;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(11);
  doc.setTextColor(...MUTED);
  doc.text('Dengan ini secara resmi menyatakan dan menganugerahkan penghargaan kepada:', cx, y, { align: 'center' });

  y += 18;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(26);
  doc.setTextColor(...NAVY);
  doc.text(cert.employeeName || '-', cx, y, { align: 'center' });
  const nameW = doc.getTextWidth(cert.employeeName || '-');
  doc.setLineWidth(0.4);
  doc.line(cx - nameW / 2, y + 2, cx + nameW / 2, y + 2);

  y += 16;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(...MUTED);
  const intro = doc.splitTextToSize('Atas kelulusan dan kompetensi penuh yang ditunjukkan dalam menyelesaikan pelatihan SOP standar perusahaan:', 170);
  doc.text(intro, cx, y, { align: 'center' });

  y += intro.length * 5 + 9;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.setTextColor(...ACCENT);
  const title = doc.splitTextToSize(cert.videoTitle || '-', 220);
  doc.text(title, cx, y, { align: 'center' });

  // Garis pemisah bagian bawah
  const footY = H - 50;
  doc.setDrawColor(...LIGHT);
  doc.setLineWidth(0.3);
  doc.line(30, footY, W - 30, footY);

  // Detail sertifikat (kiri)
  const details = [
    ['ID Sertifikat', cert.id],
    ['Tanggal Terbit', cert.issueDate],
    ['Masa Berlaku', cert.expiryDate],
    ['Skor Kuis', `${cert.score}%`],
  ];
  let dy = footY + 10;
  doc.setFontSize(10);
  details.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...NAVY);
    doc.text(`${label}:`, 32, dy);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...(label === 'Skor Kuis' ? GREEN : MUTED));
    doc.text(String(value ?? '-'), 66, dy);
    dy += 6;
  });

  // Tanda tangan (kanan)
  const sx = W - 80;
  const signerName = (signer.name || '').trim() || cert.approvedBy || 'HRD';
  const signerTitle = ((signer.title || '').trim() || 'HR Manager').toUpperCase();
  const company = (tenantName || '').toUpperCase();
  const signature = await loadImage(signer.signatureUrl);
  const lineY = footY + 19;
  if (signature) {
    // Gambar tanda tangan di atas garis
    const maxW = 50, maxH = 15;
    const ratio = signature.width / signature.height;
    const w = Math.min(maxW, maxH * ratio);
    const h = w / ratio;
    doc.addImage(signature.dataUrl, 'JPEG', sx - w / 2, lineY - 1 - h, w, h);
  } else {
    doc.setFont('times', 'italic');
    doc.setFontSize(18);
    doc.setTextColor(30, 58, 138);
    doc.text(signerName, sx, lineY - 4, { align: 'center' });
  }
  doc.setDrawColor(...LIGHT);
  doc.line(sx - 30, lineY, sx + 30, lineY);

  // Di bawah garis: (nama bila ada gambar), jabatan, perusahaan — masing-masing satu baris
  let ty = lineY + 5;
  if (signature) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...NAVY);
    doc.text(signerName, sx, ty, { align: 'center' });
    ty += 4.5;
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(doc.splitTextToSize(signerTitle, 100)[0], sx, ty, { align: 'center' });
  if (company) {
    doc.setFont('helvetica', 'normal');
    doc.text(doc.splitTextToSize(company, 100)[0], sx, ty + 4, { align: 'center' });
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...LIGHT);
  // Di kiri bawah (di bawah detail) agar tidak bertabrakan dengan jabatan penanda tangan
  doc.text('Sertifikat ini diterbitkan melalui platform myAxara', 32, footY + 34);

  return doc;
};

const fileNameFor = (cert) =>
  `Sertifikat - ${cert.employeeName} - ${cert.videoTitle}`.replace(/[\\/:*?"<>|]+/g, '').slice(0, 120) + '.pdf';

// iPhone/iPad: file tidak bisa diunduh langsung dari web app → pakai menu Share
// (Simpan ke Files, kirim, cetak). Perangkat lain: unduh langsung.
export const downloadCertificatePdf = async (cert, options) => {
  const doc = await buildCertificatePdf(cert, options);
  const fileName = fileNameFor(cert);
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (isIos && navigator.canShare) {
    const file = new File([doc.output('blob')], fileName, { type: 'application/pdf' });
    if (navigator.canShare({ files: [file] })) {
      try {
        // Hanya file — menambahkan title/text membuat iPhone menyimpan file teks tambahan di Files
        await navigator.share({ files: [file] });
        return;
      } catch (err) {
        if (err?.name === 'AbortError') return; // user menutup menu Share
      }
    }
  }
  doc.save(fileName);
};
