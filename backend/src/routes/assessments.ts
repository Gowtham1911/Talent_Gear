import { Router, Response, Request } from "express";
import pool from "../lib/mysql";
import { authenticate, requireAdmin, AuthRequest } from "../lib/auth";
import { evaluateAnswers, AssessmentQuestion, CodingProblem, MCQQuestion } from "../lib/ai";
import { RowDataPacket } from "mysql2";
import nodemailer from "nodemailer";

const router = Router();

function getTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

async function sendRound2Invite(to: string, name: string, jobTitle: string, score: number) {
  const transporter = getTransport();
  await transporter.sendMail({
    from: `"TalentGear Recruitment" <${process.env.SMTP_USER}>`,
    to,
    subject: `🎉 Congratulations! You cleared Round 1 — ${jobTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fffbf7; padding: 32px; border-radius: 12px;">
        <div style="text-align:center; margin-bottom: 24px;">
          <div style="background: #f97316; display: inline-block; padding: 12px 24px; border-radius: 8px;">
            <span style="color: white; font-size: 20px; font-weight: bold;">TalentGear</span>
          </div>
        </div>
        <h2 style="color: #111827;">Congratulations, ${name}! 🎉</h2>
        <p style="color: #6b7280;">You have successfully cleared <strong>Round 1</strong> of the selection process for <strong>${jobTitle}</strong>.</p>

        <div style="background: #fff7ed; border: 1px solid #fed7aa; border-radius: 10px; padding: 20px; margin: 20px 0;">
          <p style="margin:0; color: #92400e; font-size: 14px;"><strong>Your Round 1 Score:</strong></p>
          <p style="margin: 8px 0 0; font-size: 36px; font-weight: 800; color: #f97316;">${score}%</p>
        </div>

        <h3 style="color: #111827;">What's Next — Round 2: Technical Interview</h3>
        <p style="color: #6b7280; font-size: 14px;">Our team will schedule your <strong>AI-powered Technical Interview (Round 2)</strong> shortly. You will receive a separate email with the interview link and time slot.</p>

        <div style="background: #f9fafb; border-radius: 10px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0; font-size: 13px; color: #6b7280;"><strong>Round 2 Format:</strong> AI-driven technical Q&A · 30–45 minutes · Video/Text based</p>
        </div>

        <p style="color: #6b7280; font-size: 13px;">Keep an eye on your inbox. If you have any questions, reply to this email.</p>
        <p style="color: #6b7280; font-size: 13px;">Best regards,<br/><strong>TalentGear Recruitment Team</strong></p>
      </div>
    `,
  });
}

async function sendRound1Rejection(to: string, name: string, jobTitle: string, score: number) {
  const transporter = getTransport();
  await transporter.sendMail({
    from: `"TalentGear Recruitment" <${process.env.SMTP_USER}>`,
    to,
    subject: `Round 1 Result — ${jobTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
        <h2 style="color: #111827;">Hi ${name},</h2>
        <p style="color: #6b7280;">Thank you for completing Round 1 of the assessment for <strong>${jobTitle}</strong>.</p>
        <p style="color: #6b7280;">Your score was <strong>${score}%</strong>. Unfortunately, we are not moving forward with your application at this time.</p>
        <p style="color: #6b7280;">We encourage you to keep improving and apply again in the future.</p>
        <p style="color: #6b7280;">Best regards,<br/><strong>TalentGear Recruitment Team</strong></p>
      </div>
    `,
  });
}

// Public: disqualify attempt due to malpractice
router.post("/disqualify/:token", async (req: Request, res: Response) => {
  try {
    const { reason } = req.body;
    const [attempts] = await pool.query<RowDataPacket[]>(
      "SELECT aa.*, u.email as student_email, ap.parsed_data, j.title as job_title FROM assessment_attempts aa JOIN applications ap ON aa.application_id = ap.id JOIN users u ON aa.student_id = u.id JOIN jobs j ON ap.job_id = j.id WHERE aa.test_link = ? AND aa.status != 'completed'",
      [req.params.token]
    );
    if (!attempts[0]) { res.status(404).json({ message: "Attempt not found" }); return; }
    const attempt = attempts[0];
    await pool.query(
      "UPDATE assessment_attempts SET status = 'completed', score = 0, completed_at = NOW(), answers = ? WHERE test_link = ?",
      [JSON.stringify({ disqualified: true, reason }), req.params.token]
    );
    await pool.query("UPDATE applications SET status = 'rejected' WHERE id = ?", [attempt.application_id]);
    // Send disqualification email
    const parsed = typeof attempt.parsed_data === "string" ? JSON.parse(attempt.parsed_data) : (attempt.parsed_data || {});
    const name = parsed?.name || attempt.student_email;
    const transporter = getTransport();
    transporter.sendMail({
      from: `"TalentGear Recruitment" <${process.env.SMTP_USER}>`,
      to: attempt.student_email,
      subject: `Assessment Disqualified — ${attempt.job_title}`,
      html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px"><h2 style="color:#dc2626">Assessment Disqualified</h2><p>Dear ${name},</p><p>Your Round 1 assessment for <strong>${attempt.job_title}</strong> has been disqualified due to: <strong>${reason}</strong>.</p><p>Malpractice is strictly not allowed. Your application has been cancelled.</p><p>TalentGear Recruitment Team</p></div>`,
    }).catch(console.error);
    res.json({ message: "Disqualified" });
  } catch (e) { console.error(e); res.status(500).json({ message: "Server error" }); }
});

// Public: get test by token
router.get("/take/:token", async (req: Request, res: Response) => {
  try {
    const [attempts] = await pool.query<RowDataPacket[]>(`
      SELECT aa.*, a.questions, a.duration_minutes, j.title as job_title
      FROM assessment_attempts aa
      JOIN assessments a ON aa.assessment_id = a.id
      JOIN jobs j ON a.job_id = j.id
      WHERE aa.test_link = ? AND aa.status != 'completed'
    `, [req.params.token]);

    if (!attempts[0]) { res.status(404).json({ message: "Invalid or expired test link" }); return; }

    const attempt = attempts[0];
    if (attempt.status === "pending") {
      await pool.query("UPDATE assessment_attempts SET status = 'in_progress', started_at = NOW() WHERE id = ?", [attempt.id]);
    }

    const allQuestions: AssessmentQuestion[] = typeof attempt.questions === "string"
      ? JSON.parse(attempt.questions) : attempt.questions;

    const mcqs = (allQuestions.filter(q => q.type !== "coding") as MCQQuestion[]).map(q => ({
      id: q.id, type: q.type, question: q.question, options: q.options, difficulty: q.difficulty,
    }));
    const coding = (allQuestions.filter(q => q.type === "coding") as CodingProblem[]).map(q => ({
      id: q.id, type: q.type, title: q.title, difficulty: q.difficulty,
      description: q.description, examples: q.examples, constraints: q.constraints,
    }));

    res.json({
      attempt_id: attempt.id, job_title: attempt.job_title,
      duration_minutes: attempt.duration_minutes, started_at: attempt.started_at,
      mcqs, coding,
      sections: {
        aptitude: mcqs.filter(q => q.type === "aptitude").length,
        dsa_mcq: mcqs.filter(q => q.type === "dsa_mcq").length,
        domain: mcqs.filter(q => q.type === "domain").length,
        coding: coding.length,
      },
    });
  } catch (e) { console.error(e); res.status(500).json({ message: "Server error" }); }
});

// Public: submit test
router.post("/submit/:token", async (req: Request, res: Response) => {
  try {
    const { answers, code_answers } = req.body;
    if (!answers || typeof answers !== "object") {
      res.status(400).json({ message: "answers object is required" }); return;
    }

    const [attempts] = await pool.query<RowDataPacket[]>(`
      SELECT aa.*, a.questions FROM assessment_attempts aa
      JOIN assessments a ON aa.assessment_id = a.id
      WHERE aa.test_link = ? AND aa.status = 'in_progress'
    `, [req.params.token]);

    if (!attempts[0]) { res.status(404).json({ message: "Test not found or already submitted" }); return; }

    const attempt = attempts[0];
    const allQuestions: AssessmentQuestion[] = typeof attempt.questions === "string"
      ? JSON.parse(attempt.questions) : attempt.questions;

    const result = evaluateAnswers(allQuestions, answers);

    await pool.query(
      "UPDATE assessment_attempts SET answers = ?, score = ?, status = 'completed', completed_at = NOW() WHERE id = ?",
      [JSON.stringify({ mcq: answers, code: code_answers || {} }), result.percentage, attempt.id]
    );

    res.json({
      message: "Assessment submitted successfully",
      score: result.score, total: result.total,
      percentage: result.percentage, breakdown: result.breakdown,
    });
  } catch (e) { console.error(e); res.status(500).json({ message: "Server error" }); }
});

// Admin: summary of all jobs with attempt counts — for results index page
router.get("/jobs-summary", authenticate, requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT 
        j.id, j.title, j.status,
        COUNT(aa.id) as total_attempts,
        SUM(CASE WHEN aa.status = 'completed' THEN 1 ELSE 0 END) as completed_attempts,
        COALESCE(AVG(CASE WHEN aa.status = 'completed' THEN aa.score END), 0) as avg_score
      FROM jobs j
      LEFT JOIN applications ap ON ap.job_id = j.id
      LEFT JOIN assessment_attempts aa ON aa.application_id = ap.id
      GROUP BY j.id
      HAVING total_attempts > 0
      ORDER BY completed_attempts DESC, j.created_at DESC
    `);
    res.json(rows);
  } catch (e) { console.error(e); res.status(500).json({ message: "Server error" }); }
});

// Admin: get all results for a job
router.get("/job/:jobId/results", authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT aa.id, aa.score, aa.status, aa.started_at, aa.completed_at, aa.round2_status,
             u.email as student_email, ap.parsed_data, ap.id as application_id
      FROM assessment_attempts aa
      JOIN users u ON aa.student_id = u.id
      JOIN applications ap ON aa.application_id = ap.id
      WHERE ap.job_id = ?
      ORDER BY aa.score DESC
    `, [req.params.jobId]);
    res.json(rows);
  } catch (e) { console.error(e); res.status(500).json({ message: "Server error" }); }
});

// Admin: shortlist candidate for Round 2 — sends email
router.post("/attempt/:id/shortlist-round2", authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT aa.*, aa.score, u.email as student_email, ap.parsed_data, j.title as job_title
      FROM assessment_attempts aa
      JOIN users u ON aa.student_id = u.id
      JOIN applications ap ON aa.application_id = ap.id
      JOIN jobs j ON ap.job_id = j.id
      WHERE aa.id = ?
    `, [req.params.id]);

    if (!rows[0]) { res.status(404).json({ message: "Attempt not found" }); return; }
    const attempt = rows[0];
    const parsed = typeof attempt.parsed_data === "string" ? JSON.parse(attempt.parsed_data) : (attempt.parsed_data || {});
    const name = parsed?.name || attempt.student_email;

    // Mark as shortlisted for round 2
    await pool.query("UPDATE assessment_attempts SET round2_status = 'shortlisted' WHERE id = ?", [req.params.id]);
    await pool.query("UPDATE applications SET status = 'interview_scheduled' WHERE id = ?", [attempt.application_id]);

    // Send congratulations email
    await sendRound2Invite(attempt.student_email, name, attempt.job_title, Math.round(attempt.score));

    res.json({ message: `Round 2 invite sent to ${attempt.student_email}` });
  } catch (e) { console.error(e); res.status(500).json({ message: "Server error" }); }
});

// Admin: reject after round 1
router.post("/attempt/:id/reject", authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT aa.*, u.email as student_email, ap.parsed_data, j.title as job_title
      FROM assessment_attempts aa
      JOIN users u ON aa.student_id = u.id
      JOIN applications ap ON aa.application_id = ap.id
      JOIN jobs j ON ap.job_id = j.id
      WHERE aa.id = ?
    `, [req.params.id]);

    if (!rows[0]) { res.status(404).json({ message: "Attempt not found" }); return; }
    const attempt = rows[0];
    const parsed = typeof attempt.parsed_data === "string" ? JSON.parse(attempt.parsed_data) : (attempt.parsed_data || {});
    const name = parsed?.name || attempt.student_email;

    await pool.query("UPDATE assessment_attempts SET round2_status = 'rejected' WHERE id = ?", [req.params.id]);
    await pool.query("UPDATE applications SET status = 'rejected' WHERE id = ?", [attempt.application_id]);

    sendRound1Rejection(attempt.student_email, name, attempt.job_title, Math.round(attempt.score)).catch(console.error);

    res.json({ message: "Candidate rejected" });
  } catch (e) { console.error(e); res.status(500).json({ message: "Server error" }); }
});

export default router;
