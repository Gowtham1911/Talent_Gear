"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendTestInvite = sendTestInvite;
exports.sendApplicationStatus = sendApplicationStatus;
const nodemailer_1 = __importDefault(require("nodemailer"));
const transporter = nodemailer_1.default.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});
async function sendTestInvite(to, candidateName, jobTitle, testLink, durationMinutes) {
    await transporter.sendMail({
        from: `"TalentGear Recruitment" <${process.env.SMTP_USER}>`,
        to,
        subject: `Round 1 Assessment Invitation - ${jobTitle}`,
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Congratulations, ${candidateName}!</h2>
        <p>You have been shortlisted for the <strong>${jobTitle}</strong> position.</p>
        <p>You are invited to complete <strong>Round 1: Aptitude & DSA Assessment</strong>.</p>
        
        <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Duration:</strong> ${durationMinutes} minutes</p>
          <p><strong>Format:</strong> Aptitude (15 questions) + DSA Medium (10 questions)</p>
          <p><strong>Note:</strong> The test link is unique to you and can only be used once.</p>
        </div>

        <a href="${testLink}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">
          Start Assessment
        </a>

        <p style="margin-top: 20px; color: #6b7280; font-size: 14px;">
          This link expires in 48 hours. If you have any issues, contact us at ${process.env.SMTP_USER}
        </p>
      </div>
    `,
    });
}
async function sendApplicationStatus(to, candidateName, jobTitle, status) {
    const isShortlisted = status === "shortlisted";
    await transporter.sendMail({
        from: `"TalentGear Recruitment" <${process.env.SMTP_USER}>`,
        to,
        subject: `Application Update - ${jobTitle}`,
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: ${isShortlisted ? "#16a34a" : "#dc2626"};">
          ${isShortlisted ? "Great News!" : "Application Update"}
        </h2>
        <p>Dear ${candidateName},</p>
        <p>
          ${isShortlisted
            ? `We are pleased to inform you that your application for <strong>${jobTitle}</strong> has been shortlisted. You will receive a separate email with your assessment link shortly.`
            : `Thank you for applying for <strong>${jobTitle}</strong>. After careful review, we will not be moving forward with your application at this time.`}
        </p>
        <p>Best regards,<br/>TalentGear Recruitment Team</p>
      </div>
    `,
    });
}
