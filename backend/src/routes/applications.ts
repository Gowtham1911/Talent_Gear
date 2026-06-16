import { Router, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import pool from "../lib/mysql";
import { authenticate, requireAdmin, AuthRequest } from "../lib/auth";
import { parseResumeAgainstJob } from "../lib/ai";
import { sendTestInvite, sendApplicationStatus } from "../lib/email";
import { ResultSetHeader, RowDataPacket } from "mysql2";
import { v4 as uuidv4 } from "uuid";

const router = Router();
const ATS_THRESHOLD = 70;

const uploadDir = path.join(process.cwd(), "uploads", "resumes");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [".pdf", ".doc", ".docx"];
    cb(null, allowed.includes(path.extname(file.originalname).toLowerCase()));
  },
});

async function extractTextFromResume(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".pdf") {
    const pdfParse = require("pdf-parse");
    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);
    return data.text as string;
  }
  return fs.readFileSync(filePath, "utf-8").replace(/[^\x20-\x7E\n]/g, " ");
}

async function sendTestLinkToCandidate(
  applicationId: number,
  studentId: number,
  jobId: number,
  studentEmail: string,
  candidateName: string,
  jobTitle: string
) {
  const [assessments] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM assessments WHERE job_id = ? AND round_number = 1",
    [jobId]
  );
  if (!assessments[0]) {
    console.log(`[ATS] No assessment found for job ${jobId} yet, skipping test link`);
    return;
  }
  const testToken = uuidv4();
  const testLink = `${process.env.FRONTEND_URL}/assessment/${testToken}`;
  await pool.query(
    "INSERT INTO assessment_attempts (assessment_id, application_id, student_id, test_link) VALUES (?, ?, ?, ?)",
    [assessments[0].id, applicationId, studentId, testToken]
  );
  await pool.query("UPDATE applications SET status = 'interview_scheduled' WHERE id = ?", [applicationId]);
  await sendTestInvite(studentEmail, candidateName, jobTitle, testLink, assessments[0].duration_minutes);
  console.log(`[ATS] Test link sent to ${studentEmail} — ${testLink}`);
}

// Admin: all candidates with pipeline status
router.get("/candidates", authenticate, requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT
        u.id as student_id,
        u.email,
        a.id as application_id,
        a.status,
        a.match_score,
        a.applied_at,
        j.id as job_id,
        j.title as job_title,
        j.location,
        a.parsed_data,
        aa.score as test_score,
        aa.status as test_status,
        aa.completed_at,
        aa.round2_status
      FROM applications a
      JOIN users u ON a.student_id = u.id
      JOIN jobs j ON a.job_id = j.id
      LEFT JOIN assessment_attempts aa ON aa.application_id = a.id
      ORDER BY a.applied_at DESC
    `);
    const candidates = rows.map(r => {
      const parsed = typeof r.parsed_data === "string" ? JSON.parse(r.parsed_data || "{}") : (r.parsed_data || {});
      return {
        student_id: r.student_id,
        email: r.email,
        name: parsed.name || r.email.split("@")[0],
        skills: parsed.skills || [],
        experience_years: parsed.experience_years ?? null,
        application_id: r.application_id,
        status: r.status,
        match_score: r.match_score,
        applied_at: r.applied_at,
        job_id: r.job_id,
        job_title: r.job_title,
        location: r.location,
        test_score: r.test_score,
        test_status: r.test_status,
        completed_at: r.completed_at,
        round2_status: r.round2_status,
      };
    });
    res.json(candidates);
  } catch (e) { console.error(e); res.status(500).json({ message: "Server error" }); }
});

// Student: my applications
router.get("/my", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT a.id, a.status, a.match_score, a.applied_at, j.title as job_title, j.location
      FROM applications a
      JOIN jobs j ON a.job_id = j.id
      WHERE a.student_id = ?
      ORDER BY a.applied_at DESC
    `, [req.user!.id]);
    res.json(rows);
  } catch (e) { console.error(e); res.status(500).json({ message: "Server error" }); }
});

// Admin: get all applications for a job
router.get("/job/:jobId", authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT a.*, u.email as student_email
      FROM applications a
      JOIN users u ON a.student_id = u.id
      WHERE a.job_id = ?
      ORDER BY a.match_score DESC
    `, [req.params.jobId]);
    res.json(rows);
  } catch (e) { console.error(e); res.status(500).json({ message: "Server error" }); }
});

// Admin: bulk shortlist
router.post("/job/:jobId/bulk-shortlist", authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { top_n = 50, min_score = ATS_THRESHOLD } = req.body;
    const [apps] = await pool.query<RowDataPacket[]>(`
      SELECT a.id FROM applications a
      WHERE a.job_id = ? AND a.status = 'pending' AND a.match_score >= ?
      ORDER BY a.match_score DESC LIMIT ?
    `, [req.params.jobId, min_score, top_n]);

    let sent = 0;
    for (const app of apps) {
      const [fullApp] = await pool.query<RowDataPacket[]>(`
        SELECT a.*, u.email as student_email, j.title as job_title, j.id as job_id
        FROM applications a JOIN users u ON a.student_id = u.id JOIN jobs j ON a.job_id = j.id
        WHERE a.id = ?
      `, [app.id]);
      if (!fullApp[0]) continue;
      const fa = fullApp[0];
      const parsedData = typeof fa.parsed_data === "string" ? JSON.parse(fa.parsed_data) : (fa.parsed_data || {});
      await sendTestLinkToCandidate(app.id, fa.student_id, fa.job_id, fa.student_email, parsedData?.name || fa.student_email, fa.job_title);
      sent++;
    }
    res.json({ message: `Bulk shortlisted ${sent} candidates` });
  } catch (e) { console.error(e); res.status(500).json({ message: "Server error" }); }
});

// Student: apply — AI parses resume, auto shortlist if ATS >= 70
router.post("/:jobId/apply", authenticate, upload.single("resume"), async (req: AuthRequest, res: Response) => {
  try {
    const jobId = Number(req.params.jobId);
    const studentId = req.user!.id;

    if (!req.file) { res.status(400).json({ message: "Resume file is required" }); return; }

    const [existing] = await pool.query<RowDataPacket[]>(
      "SELECT id FROM applications WHERE job_id = ? AND student_id = ?",
      [jobId, studentId]
    );
    if (existing[0]) { res.status(400).json({ message: "Already applied for this job" }); return; }

    const [jobs] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM jobs WHERE id = ? AND status = 'open'", [jobId]
    );
    if (!jobs[0]) { res.status(404).json({ message: "Job not found or closed" }); return; }
    const job = jobs[0];

    // Get student email — prefer submitted email from form
    const submittedEmail = req.body.email || "";
    const [users] = await pool.query<RowDataPacket[]>("SELECT email FROM users WHERE id = ?", [studentId]);
    const studentEmail = submittedEmail || users[0]?.email || "";
    const candidateName = req.body.name || "";
    const rollNo = req.body.rollno || "";

    // Insert application as pending first
    const [result] = await pool.query<ResultSetHeader>(
      "INSERT INTO applications (job_id, student_id, resume_path, status, candidate_name, candidate_email, roll_no) VALUES (?, ?, ?, 'pending', ?, ?, ?)",
      [jobId, studentId, req.file.path, candidateName || null, studentEmail || null, rollNo || null]
    );
    const applicationId = result.insertId;

    // Respond immediately — parsing happens in background
    res.status(201).json({ message: "Application submitted! We are analysing your resume…", application_id: applicationId });

    // Background: parse → ATS check → auto shortlist or reject
    setImmediate(async () => {
      try {
        const resumeText = await extractTextFromResume(req.file!.path);
        const parsed = await parseResumeAgainstJob(resumeText, job.title, job.description, job.requirements);
        const atsScore = parsed.match_score;

        console.log(`[ATS] ${studentEmail} scored ${atsScore} for "${job.title}"`);

        // Save resume_url to user profile
        const relPath = `/uploads/resumes/${path.basename(req.file!.path)}`;
        await pool.query("UPDATE users SET resume_url=? WHERE id=?", [relPath, studentId]);

        if (atsScore >= ATS_THRESHOLD) {
          // Auto shortlist
          await pool.query(
            "UPDATE applications SET parsed_data = ?, match_score = ?, status = 'shortlisted' WHERE id = ?",
            [JSON.stringify(parsed), atsScore, applicationId]
          );
          console.log(`[ATS] ✅ Shortlisted — score ${atsScore} >= ${ATS_THRESHOLD}`);
          await sendTestLinkToCandidate(applicationId, studentId, jobId, studentEmail, candidateName || parsed.name || studentEmail, job.title);
        } else {
          // Auto reject
          await pool.query(
            "UPDATE applications SET parsed_data = ?, match_score = ?, status = 'rejected' WHERE id = ?",
            [JSON.stringify(parsed), atsScore, applicationId]
          );
          console.log(`[ATS] ❌ Rejected — score ${atsScore} < ${ATS_THRESHOLD}`);
          sendApplicationStatus(studentEmail, candidateName || parsed.name || studentEmail, job.title, "rejected").catch(console.error);
        }
      } catch (e) {
        console.error("[ATS parse error]", e);
      }
    });

  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Server error" });
  }
});

// Admin: manually send test link to any candidate (including rejected)
router.post("/:id/send-test-link", authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const [apps] = await pool.query<RowDataPacket[]>(`
      SELECT a.*, u.email as student_email, j.title as job_title, j.id as job_id
      FROM applications a
      JOIN users u ON a.student_id = u.id
      JOIN jobs j ON a.job_id = j.id
      WHERE a.id = ?
    `, [req.params.id]);
    if (!apps[0]) { res.status(404).json({ message: "Application not found" }); return; }
    const app = apps[0];
    const parsedData = typeof app.parsed_data === "string" ? JSON.parse(app.parsed_data) : (app.parsed_data || {});
    const candidateName = app.candidate_name || parsedData?.name || app.student_email;
    const sendToEmail = app.candidate_email || app.student_email;
    await pool.query("UPDATE applications SET status = 'shortlisted' WHERE id = ?", [req.params.id]);
    await sendTestLinkToCandidate(Number(req.params.id), app.student_id, app.job_id, sendToEmail, candidateName, app.job_title);
    res.json({ message: `Test link sent to ${sendToEmail}` });
  } catch (e) { console.error(e); res.status(500).json({ message: "Server error" }); }
});

// Admin: manual shortlist or reject
router.patch("/:id/status", authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.body;
    if (!["shortlisted", "rejected"].includes(status)) {
      res.status(400).json({ message: "status must be shortlisted or rejected" }); return;
    }
    const [apps] = await pool.query<RowDataPacket[]>(`
      SELECT a.*, u.email as student_email, j.title as job_title, j.id as job_id
      FROM applications a
      JOIN users u ON a.student_id = u.id
      JOIN jobs j ON a.job_id = j.id
      WHERE a.id = ?
    `, [req.params.id]);
    if (!apps[0]) { res.status(404).json({ message: "Application not found" }); return; }

    const app = apps[0];
    const parsedData = typeof app.parsed_data === "string" ? JSON.parse(app.parsed_data) : (app.parsed_data || {});
    const candidateName = app.candidate_name || parsedData?.name || app.student_email;
    const sendToEmail = app.candidate_email || app.student_email;

    await pool.query("UPDATE applications SET status = ? WHERE id = ?", [status, req.params.id]);

    if (status === "shortlisted") {
      await sendTestLinkToCandidate(Number(req.params.id), app.student_id, app.job_id, sendToEmail, candidateName, app.job_title);
      res.json({ message: "Shortlisted and test link sent" });
    } else {
      sendApplicationStatus(sendToEmail, candidateName, app.job_title, "rejected").catch(console.error);
      res.json({ message: "Application rejected" });
    }
  } catch (e) { console.error(e); res.status(500).json({ message: "Server error" }); }
});

export default router;
