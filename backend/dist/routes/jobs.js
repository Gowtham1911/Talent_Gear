"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const mysql_1 = __importDefault(require("../lib/mysql"));
const auth_1 = require("../lib/auth");
const ai_1 = require("../lib/ai");
const router = (0, express_1.Router)();
// Admin: AI-generate job description (fallback if no Ollama)
router.post("/generate-description", auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
    const { title, experience_level } = req.body;
    if (!title) {
        res.status(400).json({ message: "title is required" });
        return;
    }
    const level = experience_level || "fresher";
    const expMap = {
        fresher: "0–1 year", junior: "1–3 years", mid: "3–5 years", senior: "5+ years"
    };
    const expLabel = expMap[level] || level;
    // Try Ollama if configured
    const ollamaUrl = process.env.OLLAMA_URL;
    if (ollamaUrl) {
        try {
            const model = process.env.OLLAMA_MODEL || "llama3.2";
            const prompt = `Write a professional job posting for "${title}" (${expLabel} experience). Return ONLY valid JSON with keys "description" (3-4 sentences) and "requirements" (6-8 skills as newline list).`;
            const r = await fetch(`${ollamaUrl}/api/generate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ model, prompt, stream: false, format: "json" }),
                signal: AbortSignal.timeout(15000),
            });
            if (r.ok) {
                const data = await r.json();
                const parsed = JSON.parse(data.response);
                if (parsed.description && parsed.requirements) {
                    res.json(parsed);
                    return;
                }
            }
        }
        catch { /* fall through to template */ }
    }
    // Template fallback — always works
    res.json({
        description: `We are looking for a ${title} with ${expLabel} of experience to join our growing team. You will be responsible for designing, developing, and maintaining high-quality software solutions. You will collaborate with cross-functional teams to deliver impactful products. This is an exciting opportunity to work in a fast-paced, innovative environment.`,
        requirements: `${expLabel} of relevant experience in ${title} role\nStrong problem-solving and analytical skills\nProficiency in relevant programming languages and tools\nExperience with version control systems (Git)\nGood communication and teamwork skills\nAbility to write clean, maintainable code\nFamiliarity with Agile/Scrum methodologies`,
    });
});
// Admin: list all jobs — MUST be before /:id
router.get("/admin/all", auth_1.authenticate, auth_1.requireAdmin, async (_req, res) => {
    const [rows] = await mysql_1.default.query(`
    SELECT j.*, COUNT(a.id) as application_count
    FROM jobs j
    LEFT JOIN applications a ON j.id = a.job_id
    GROUP BY j.id
    ORDER BY j.created_at DESC
  `);
    res.json(rows);
});
// Public: list open jobs
router.get("/", async (_req, res) => {
    const [rows] = await mysql_1.default.query("SELECT id, title, description, requirements, location, salary_range, created_at FROM jobs WHERE status = 'open' ORDER BY created_at DESC");
    res.json(rows);
});
// Admin: create job
router.post("/", auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
    const { title, description, requirements, location, salary_range } = req.body;
    if (!title || !description || !requirements) {
        res.status(400).json({ message: "title, description, requirements are required" });
        return;
    }
    const [result] = await mysql_1.default.query("INSERT INTO jobs (title, description, requirements, location, salary_range, posted_by) VALUES (?, ?, ?, ?, ?, ?)", [title, description, requirements, location || null, salary_range || null, req.user.id]);
    const jobId = result.insertId;
    (0, ai_1.generateAssessmentQuestions)(title, requirements).then(async (questions) => {
        await mysql_1.default.query("INSERT INTO assessments (job_id, round_number, questions, duration_minutes) VALUES (?, 1, ?, 60)", [jobId, JSON.stringify(questions)]);
    }).catch(console.error);
    res.status(201).json({ message: "Job posted successfully", job_id: jobId });
});
// Public: get single job — dynamic route AFTER static routes
router.get("/:id", async (req, res) => {
    const [rows] = await mysql_1.default.query("SELECT id, title, description, requirements, location, salary_range, created_at FROM jobs WHERE id = ? AND status = 'open'", [req.params.id]);
    if (!rows[0]) {
        res.status(404).json({ message: "Job not found" });
        return;
    }
    res.json(rows[0]);
});
// Admin: toggle job status
router.patch("/:id/status", auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
    const { status } = req.body;
    if (!["open", "closed"].includes(status)) {
        res.status(400).json({ message: "status must be open or closed" });
        return;
    }
    await mysql_1.default.query("UPDATE jobs SET status = ? WHERE id = ?", [status, req.params.id]);
    res.json({ message: "Job status updated" });
});
exports.default = router;
