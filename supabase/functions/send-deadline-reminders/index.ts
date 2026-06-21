import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY')!;
const SENDER_EMAIL = 'noreply@myaxara.com';
const SENDER_NAME = 'Axara LMS';

async function sendEmail(to: { email: string; name: string }, subject: string, html: string) {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sender: { name: SENDER_NAME, email: SENDER_EMAIL },
      to: [to],
      subject,
      htmlContent: html,
    }),
  });
  return res.ok;
}

function buildEmailHtml(empName: string, sopTitle: string, daysLeft: number, deadline: string) {
  const urgency = daysLeft === 1 ? '🔴 HARI INI TERAKHIR!' : daysLeft <= 3 ? '🟠 Segera Selesaikan' : '🟡 Pengingat Deadline';
  const badgeColor = daysLeft === 1 ? '#dc2626' : daysLeft <= 3 ? '#ea580c' : '#ca8a04';

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb;">
      <div style="background: #1e3a5f; color: white; padding: 24px 28px; border-radius: 12px 12px 0 0;">
        <div style="font-size: 13px; opacity: 0.7; margin-bottom: 4px;">Axara LMS</div>
        <h2 style="margin: 0; font-size: 20px;">⏰ Pengingat Deadline SOP</h2>
      </div>
      <div style="padding: 28px; background: white; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
        <p style="margin: 0 0 16px; font-size: 15px;">Halo <strong>${empName}</strong>,</p>
        <p style="margin: 0 0 20px; color: #374151;">Anda memiliki SOP yang belum diselesaikan dan mendekati batas waktu:</p>

        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid ${badgeColor}; border-radius: 8px; padding: 16px 20px; margin-bottom: 20px;">
          <div style="font-size: 16px; font-weight: 700; color: #1e3a5f; margin-bottom: 8px;">${sopTitle}</div>
          <div style="display: flex; gap: 16px; flex-wrap: wrap;">
            <div>
              <span style="font-size: 11px; color: #9ca3af; text-transform: uppercase; font-weight: 600;">Deadline</span>
              <div style="font-weight: 600; color: #374151; margin-top: 2px;">${deadline}</div>
            </div>
            <div>
              <span style="font-size: 11px; color: #9ca3af; text-transform: uppercase; font-weight: 600;">Sisa Waktu</span>
              <div style="font-weight: 700; color: ${badgeColor}; margin-top: 2px;">${daysLeft === 1 ? 'Hari ini!' : `${daysLeft} hari lagi`}</div>
            </div>
          </div>
        </div>

        <div style="background: ${badgeColor}15; border: 1px solid ${badgeColor}40; border-radius: 8px; padding: 12px 16px; margin-bottom: 24px;">
          <strong style="color: ${badgeColor};">${urgency}</strong>
          <p style="margin: 6px 0 0; font-size: 13px; color: #374151;">
            ${daysLeft === 1
              ? 'Ini adalah hari terakhir Anda. Selesaikan SOP ini sekarang agar tidak melewati deadline.'
              : `Segera login ke portal Axara LMS dan selesaikan SOP ini dalam ${daysLeft} hari ke depan.`}
          </p>
        </div>

        <p style="margin: 0 0 24px; color: #6b7280; font-size: 13px;">
          Setelah menyelesaikan SOP, hasil Anda akan direview oleh Supervisor dan HRD untuk penerbitan sertifikat.
        </p>

        <div style="padding-top: 20px; border-top: 1px solid #f3f4f6; color: #9ca3af; font-size: 11px;">
          Email ini dikirim otomatis oleh sistem Axara LMS. Jangan balas email ini.
        </div>
      </div>
    </div>
  `;
}

Deno.serve(async (_req) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Target: H-7, H-3, H-1 dari sekarang
    const targetDates = [1, 3, 7].map((d) => {
      const date = new Date(today);
      date.setDate(date.getDate() + d);
      return date.toISOString().split('T')[0];
    });

    // Ambil semua SOP dengan deadline = target dates
    const { data: sopVideos, error: sopErr } = await supabase
      .from('sop_videos')
      .select('id, title, dept, deadline')
      .in('deadline', targetDates)
      .eq('archived', false);

    if (sopErr) throw sopErr;
    if (!sopVideos?.length) {
      return new Response(JSON.stringify({ message: 'Tidak ada deadline hari ini.' }), { status: 200 });
    }

    // Ambil semua karyawan aktif yang punya email
    const { data: employees, error: empErr } = await supabase
      .from('employees')
      .select('name, email, dept')
      .eq('status', 'Aktif')
      .not('email', 'is', null)
      .neq('email', '');

    if (empErr) throw empErr;
    if (!employees?.length) {
      return new Response(JSON.stringify({ message: 'Tidak ada karyawan dengan email.' }), { status: 200 });
    }

    // Ambil semua submission yang sudah approved
    const { data: approved } = await supabase
      .from('quiz_submissions')
      .select('employee_name, video_title')
      .eq('cert_status', 'approved');

    const approvedSet = new Set(
      (approved || []).map((s) => `${s.employee_name}::${s.video_title}`)
    );

    let sent = 0;
    const errors: string[] = [];

    for (const sop of sopVideos) {
      const deadline = sop.deadline as string;
      const deadlineDate = new Date(deadline);
      const daysLeft = Math.round((deadlineDate.getTime() - today.getTime()) / 86400000);

      // Karyawan di dept yang sama, belum approved SOP ini
      const targets = employees.filter(
        (emp) =>
          emp.dept.toLowerCase() === sop.dept.toLowerCase() &&
          !approvedSet.has(`${emp.name}::${sop.title}`)
      );

      for (const emp of targets) {
        const subject = `[Axara LMS] Deadline SOP "${sop.title}" — ${daysLeft === 1 ? 'Hari ini!' : `${daysLeft} hari lagi`}`;
        const html = buildEmailHtml(emp.name, sop.title, daysLeft, deadline);
        const ok = await sendEmail({ email: emp.email, name: emp.name }, subject, html);
        if (ok) sent++;
        else errors.push(`Gagal kirim ke ${emp.email}`);
      }
    }

    return new Response(
      JSON.stringify({ message: `Selesai. ${sent} email terkirim.`, errors }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
