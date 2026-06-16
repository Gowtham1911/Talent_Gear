import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendTestInvite(
  to: string,
  candidateName: string,
  jobTitle: string,
  testLink: string,
  durationMinutes: number
) {
  await transporter.sendMail({
    from: `"TalentGear Recruitment" <${process.env.SMTP_USER}>`,
    to,
    subject: `🎉 You're Shortlisted! Round 1 Assessment — ${jobTitle}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">

        <div style="background:#f97316;padding:28px 32px;text-align:center;">
          <div style="font-size:24px;font-weight:800;color:white;letter-spacing:-0.5px;">TalentGear</div>
          <div style="color:#fed7aa;font-size:13px;margin-top:4px;">AI-Powered Recruitment Platform</div>
        </div>

        <div style="padding:32px;">
          <h2 style="color:#111827;font-size:20px;margin:0 0 8px;">Congratulations, ${candidateName}! 🎉</h2>
          <p style="color:#6b7280;font-size:14px;margin:0 0 24px;line-height:1.6;">
            You have been <strong style="color:#16a34a;">shortlisted</strong> for the <strong>${jobTitle}</strong> position.
            You are invited to complete <strong>Round 1</strong> of our selection process.
          </p>

          <div style="background:#fffbf7;border:1px solid #fed7aa;border-radius:10px;padding:20px;margin-bottom:24px;">
            <p style="margin:0 0 14px;font-weight:700;color:#92400e;font-size:14px;">📋 Round 1 — Online Assessment</p>
            <table style="width:100%;font-size:13px;color:#374151;border-collapse:collapse;">
              <tr>
                <td style="padding:6px 0;width:40%;"><strong>⏱ Duration</strong></td>
                <td style="padding:6px 0;color:#f97316;font-weight:600;">${durationMinutes} minutes</td>
              </tr>
              <tr>
                <td style="padding:6px 0;"><strong>📝 Section 1</strong></td>
                <td style="padding:6px 0;">10 Aptitude MCQs (Logical &amp; Quantitative)</td>
              </tr>
              <tr>
                <td style="padding:6px 0;"><strong>💼 Section 2</strong></td>
                <td style="padding:6px 0;">10 Domain MCQs (${jobTitle} specific)</td>
              </tr>
              <tr>
                <td style="padding:6px 0;"><strong>💻 Section 3</strong></td>
                <td style="padding:6px 0;">2 Coding Problems (LeetCode style)</td>
              </tr>
            </table>
          </div>

          <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:16px;margin-bottom:28px;">
            <p style="margin:0 0 10px;font-weight:700;color:#dc2626;font-size:13px;">⚠️ Rules &amp; Guidelines</p>
            <ul style="margin:0;padding-left:18px;font-size:13px;color:#7f1d1d;line-height:2;">
              <li>Front camera must be ON throughout the test</li>
              <li>No tab switching — 3 violations = automatic disqualification</li>
              <li>This link is unique to you and can only be used once</li>
              <li>Ensure a stable internet connection before starting</li>
            </ul>
          </div>

          <div style="text-align:center;margin:28px 0;">
            <a href="${testLink}"
              style="display:inline-block;background:#f97316;color:white;padding:14px 40px;border-radius:8px;text-decoration:none;font-weight:700;font-size:16px;">
              🚀 Start Round 1 Assessment
            </a>
          </div>

          <p style="color:#9ca3af;font-size:12px;text-align:center;word-break:break-all;">
            Can't click the button? Copy this link:<br/>
            <a href="${testLink}" style="color:#f97316;">${testLink}</a>
          </p>
        </div>

        <div style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 32px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#9ca3af;">This is an automated email from TalentGear Recruitment.</p>
          <p style="margin:4px 0 0;font-size:12px;color:#9ca3af;">Questions? Contact <a href="mailto:${process.env.SMTP_USER}" style="color:#f97316;">${process.env.SMTP_USER}</a></p>
        </div>
      </div>
    `,
  });
}

export async function sendApplicationStatus(
  to: string,
  candidateName: string,
  jobTitle: string,
  status: "shortlisted" | "rejected"
) {
  const isShortlisted = status === "shortlisted";
  await transporter.sendMail({
    from: `"TalentGear Recruitment" <${process.env.SMTP_USER}>`,
    to,
    subject: `Application Update — ${jobTitle}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
        <div style="background:#f97316;padding:24px 32px;text-align:center;">
          <div style="font-size:22px;font-weight:800;color:white;">TalentGear</div>
        </div>
        <div style="padding:32px;">
          <h2 style="color:${isShortlisted ? "#16a34a" : "#dc2626"};margin:0 0 12px;">
            ${isShortlisted ? "Great News! 🎉" : "Application Update"}
          </h2>
          <p style="color:#374151;font-size:14px;line-height:1.7;">Dear ${candidateName},</p>
          <p style="color:#6b7280;font-size:14px;line-height:1.7;">
            ${isShortlisted
              ? `We are pleased to inform you that your application for <strong>${jobTitle}</strong> has been shortlisted. You will receive a separate email with your Round 1 assessment link shortly.`
              : `Thank you for applying for <strong>${jobTitle}</strong>. After careful review of your application, we will not be moving forward at this time. We encourage you to keep improving and apply for future openings.`
            }
          </p>
          <p style="color:#6b7280;font-size:14px;margin-top:24px;">Best regards,<br/><strong>TalentGear Recruitment Team</strong></p>
        </div>
      </div>
    `,
  });
}
