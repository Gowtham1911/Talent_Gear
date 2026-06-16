"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const mysql_1 = __importDefault(require("../lib/mysql"));
const auth_1 = require("../lib/auth");
const ai_1 = require("../lib/ai");
const email_1 = require("../lib/email");
const uuid_1 = require("uuid");
const router = (0, express_1.Router)();
const uploadDir = path_1.default.join(process.cwd(), "uploads", "resumes");
if (!fs_1.default.existsSync(uploadDir))
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
const storage = multer_1.default.diskStorage({
    destination: uploadDir,
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const allowed = [".pdf", ".doc", ".docx"];
        cb(null, allowed.includes(path_1.default.extname(file.originalname).toLowerCase()));
    },
});
async function extractTextFromResume(filePath) {
    const ext = path_1.default.extname(filePath).toLowerCase();
    if (ext === ".pdf") {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const pdfParse = require("pdf-parse");
        const buffer = fs_1.default.readFileSync(filePath);
        const data = await pdfParse(buffer);
        return data.text;
    }
    return fs_1.default.readFileSync(filePath, "utf-8").replace(/[^\x20-\x7E\n]/g, " ");
}
// Student: my applications — MUST be before /:id routes
router.get("/my", auth_1.authenticate, async (req, res) => {
    const [rows] = await mysql_1.default.query(`
    SELECT a.id, a.status, a.match_score, a.applied_at, j.title as job_title, j.location
    FROM applications a
    JOIN jobs j ON a.job_id = j.id
    WHERE a.student_id = ?
    ORDER BY a.applied_at DESC
  `, [req.user.id]);
    res.json(rows);
});
// Admin: get all applications for a job — MUST be before /:id routes
router.get("/job/:jobId", auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
    const [rows] = await mysql_1.default.query(`
    SELECT a.*, u.email as student_email
    FROM applications a
    JOIN users u ON a.student_id = u.id
    WHERE a.job_id = ?
    ORDER BY a.match_score DESC
  `, [req.params.jobId]);
    res.json(rows);
});
// Admin: bulk shortlist — MUST be before /:id routes
router.post("/job/:jobId/bulk-shortlist", auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
    const { top_n = 50, min_score = 60 } = req.body;
    const [apps] = await mysql_1.default.query(`
    SELECT a.id FROM applications a
    WHERE a.job_id = ? AND a.status = 'pending' AND a.match_score >= ?
    ORDER BY a.match_score DESC
    LIMIT ?
  `, [req.params.jobId, min_score, top_n]);
    let sent = 0;
    for (const app of apps) {
        const [fullApp] = await mysql_1.default.query(`
      SELECT a.*, u.email as student_email, j.title as job_title, j.id as job_id
      FROM applications a JOIN users u ON a.student_id = u.id JOIN jobs j ON a.job_id = j.id
      WHERE a.id = ?
    `, [app.id]);
        if (!fullApp[0])
            continue;
        const fa = fullApp[0];
        const parsedData = typeof fa.parsed_data === "string" ? JSON.parse(fa.parsed_data) : (fa.parsed_data || {});
        const candidateName = parsedData?.name || fa.student_email;
        const [assessments] = await mysql_1.default.query("SELECT * FROM assessments WHERE job_id = ? AND round_number = 1", [fa.job_id]);
        if (!assessments[0])
            continue;
        const testToken = (0, uuid_1.v4)();
        const testLink = `${process.env.FRONTEND_URL}/assessment/${testToken}`;
        await mysql_1.default.query("INSERT INTO assessment_attempts (assessment_id, application_id, student_id, test_link) VALUES (?, ?, ?, ?)", [assessments[0].id, app.id, fa.student_id, testToken]);
        await mysql_1.default.query("UPDATE applications SET status = 'interview_scheduled' WHERE id = ?", [app.id]);
        (0, email_1.sendTestInvite)(fa.student_email, candidateName, fa.job_title, testLink, assessments[0].duration_minutes).catch(console.error);
        sent++;
    }
    res.json({ message: `Bulk shortlisted ${sent} candidates` });
});
// Student: apply for a job
router.post("/:jobId/apply", auth_1.authenticate, upload.single("resume"), async (req, res) => {
    const jobId = Number(req.params.jobId);
    const studentId = req.user.id;
    if (!req.file) {
        res.status(400).json({ message: "Resume file is required" });
        return;
    }
    const [existing] = await mysql_1.default.query("SELECT id FROM applications WHERE job_id = ? AND student_id = ?", [jobId, studentId]);
    if (existing[0]) {
        res.status(400).json({ message: "Already applied for this job" });
        return;
    }
    const [jobs] = await mysql_1.default.query("SELECT * FROM jobs WHERE id = ? AND status = 'open'", [jobId]);
    if (!jobs[0]) {
        res.status(404).json({ message: "Job not found or closed" });
        return;
    }
    const job = jobs[0];
    const [result] = await mysql_1.default.query("INSERT INTO applications (job_id, student_id, resume_path, status) VALUES (?, ?, ?, 'pending')", [jobId, studentId, req.file.path]);
    const applicationId = result.insertId;
    extractTextFromResume(req.file.path).then(async (resumeText) => {
        const parsed = await (0, ai_1.parseResumeAgainstJob)(resumeText, job.title, job.description, job.requirements);
        await mysql_1.default.query("UPDATE applications SET parsed_data = ?, match_score = ? WHERE id = ?", [JSON.stringify(parsed), parsed.match_score, applicationId]);
    }).catch(console.error);
    res.status(201).json({ message: "Application submitted successfully", application_id: applicationId });
});
// Admin: shortlist or reject + send email/test link
router.patch("/:id/status", auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
    const { status } = req.body;
    if (!["shortlisted", "rejected"].includes(status)) {
        res.status(400).json({ message: "status must be shortlisted or rejected" });
        return;
    }
    const [apps] = await mysql_1.default.query(`
    SELECT a.*, u.email as student_email, j.title as job_title, j.id as job_id
    FROM applications a
    JOIN users u ON a.student_id = u.id
    JOIN jobs j ON a.job_id = j.id
    WHERE a.id = ?
  `, [req.params.id]);
    if (!apps[0]) {
        res.status(404).json({ message: "Application not found" });
        return;
    }
    const app = apps[0];
    const parsedData = typeof app.parsed_data === "string" ? JSON.parse(app.parsed_data) : (app.parsed_data || {});
    const candidateName = parsedData?.name || app.student_email;
    await mysql_1.default.query("UPDATE applications SET status = ? WHERE id = ?", [status, req.params.id]);
    if (status === "shortlisted") {
        const [assessments] = await mysql_1.default.query("SELECT * FROM assessments WHERE job_id = ? AND round_number = 1", [app.job_id]);
        if (assessments[0]) {
            const testToken = (0, uuid_1.v4)();
            const testLink = `${process.env.FRONTEND_URL}/assessment/${testToken}`;
            await mysql_1.default.query("INSERT INTO assessment_attempts (assessment_id, application_id, student_id, test_link) VALUES (?, ?, ?, ?)", [assessments[0].id, req.params.id, app.student_id, testToken]);
            await mysql_1.default.query("UPDATE applications SET status = 'interview_scheduled' WHERE id = ?", [req.params.id]);
            await (0, email_1.sendTestInvite)(app.student_email, candidateName, app.job_title, testLink, assessments[0].duration_minutes);
            res.json({ message: "Shortlisted and test link sent", test_link: testLink });
            return;
        }
    }
    res.json({ message: `Application ${status}` });
});
exports.default = router;
