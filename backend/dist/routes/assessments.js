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
// Public: get test by token (no auth needed - link is the auth)
router.get("/take/:token", async (req, res) => {
    const [attempts] = await mysql_1.default.query(`
    SELECT aa.*, a.questions, a.duration_minutes, j.title as job_title
    FROM assessment_attempts aa
    JOIN assessments a ON aa.assessment_id = a.id
    JOIN jobs j ON a.job_id = j.id
    WHERE aa.test_link = ? AND aa.status != 'completed'
  `, [req.params.token]);
    if (!attempts[0]) {
        res.status(404).json({ message: "Invalid or expired test link" });
        return;
    }
    const attempt = attempts[0];
    // Mark as in_progress if first access
    if (attempt.status === "pending") {
        await mysql_1.default.query("UPDATE assessment_attempts SET status = 'in_progress', started_at = NOW() WHERE id = ?", [attempt.id]);
    }
    const questions = typeof attempt.questions === "string"
        ? JSON.parse(attempt.questions)
        : attempt.questions;
    // Strip correct answers before sending to student
    const sanitized = questions.map((q) => ({
        id: q.id,
        type: q.type,
        question: q.question,
        options: q.options,
        difficulty: q.difficulty,
    }));
    res.json({
        attempt_id: attempt.id,
        job_title: attempt.job_title,
        duration_minutes: attempt.duration_minutes,
        started_at: attempt.started_at,
        questions: sanitized,
    });
});
// Public: submit test answers
router.post("/submit/:token", async (req, res) => {
    const { answers } = req.body; // { questionId: selectedOptionIndex }
    if (!answers || typeof answers !== "object") {
        res.status(400).json({ message: "answers object is required" });
        return;
    }
    const [attempts] = await mysql_1.default.query(`
    SELECT aa.*, a.questions
    FROM assessment_attempts aa
    JOIN assessments a ON aa.assessment_id = a.id
    WHERE aa.test_link = ? AND aa.status = 'in_progress'
  `, [req.params.token]);
    if (!attempts[0]) {
        res.status(404).json({ message: "Test not found or already submitted" });
        return;
    }
    const attempt = attempts[0];
    const questions = typeof attempt.questions === "string"
        ? JSON.parse(attempt.questions)
        : attempt.questions;
    const result = await (0, ai_1.evaluateAnswers)(questions, answers);
    await mysql_1.default.query("UPDATE assessment_attempts SET answers = ?, score = ?, status = 'completed', completed_at = NOW() WHERE id = ?", [JSON.stringify(answers), result.percentage, attempt.id]);
    res.json({
        message: "Assessment submitted successfully",
        score: result.score,
        total: result.total,
        percentage: result.percentage,
        breakdown: result.breakdown,
    });
});
// Admin: view all attempts for a job
router.get("/job/:jobId/results", auth_1.authenticate, auth_1.requireAdmin, async (_req, res) => {
    const [rows] = await mysql_1.default.query(`
    SELECT aa.id, aa.score, aa.status, aa.started_at, aa.completed_at,
           u.email as student_email, a.parsed_data
    FROM assessment_attempts aa
    JOIN users u ON aa.student_id = u.id
    JOIN applications a ON aa.application_id = a.id
    WHERE a.job_id = ?
    ORDER BY aa.score DESC
  `, [_req.params.jobId]);
    res.json(rows);
});
// Admin: get single attempt detail
router.get("/attempt/:id", auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
    const [rows] = await mysql_1.default.query(`
    SELECT aa.*, u.email as student_email, a.parsed_data, asmt.questions
    FROM assessment_attempts aa
    JOIN users u ON aa.student_id = u.id
    JOIN applications a ON aa.application_id = a.id
    JOIN assessments asmt ON aa.assessment_id = asmt.id
    WHERE aa.id = ?
  `, [req.params.id]);
    if (!rows[0]) {
        res.status(404).json({ message: "Not found" });
        return;
    }
    res.json(rows[0]);
});
exports.default = router;
