import { Router, Response } from "express";
import pool from "../lib/mysql";
import { authenticate, requireAdmin, AuthRequest } from "../lib/auth";
import { generateAssessmentQuestions } from "../lib/ai";
import { ResultSetHeader, RowDataPacket } from "mysql2";

const router = Router();

// Global unhandled rejection guard — prevents Node from crashing
process.on("unhandledRejection", (reason) => {
  console.error("[unhandledRejection]", reason);
});

// Admin: AI-generate job description
router.post("/generate-description", authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { title, experience_level } = req.body;
    if (!title) { res.status(400).json({ message: "title is required" }); return; }
    const level = experience_level || "fresher";
    const expMap: Record<string, string> = {
      fresher: "0–1 year", junior: "1–3 years", mid: "3–5 years", senior: "5+ years",
    };
    const expLabel = expMap[level] || level;
    res.json({
      description: `We are looking for a ${title} with ${expLabel} of experience to join our growing team. You will be responsible for designing, developing, and maintaining high-quality software solutions. You will collaborate with cross-functional teams to deliver impactful products.`,
      requirements: `${expLabel} of relevant experience\nStrong problem-solving and analytical skills\nProficiency in relevant programming languages and tools\nExperience with version control (Git)\nGood communication and teamwork skills\nAbility to write clean, maintainable code\nFamiliarity with Agile/Scrum methodologies`,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Server error" });
  }
});

// Admin: list all jobs — MUST be before /:id
router.get("/admin/all", authenticate, requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT j.*, COUNT(a.id) as application_count
      FROM jobs j
      LEFT JOIN applications a ON j.id = a.job_id
      GROUP BY j.id
      ORDER BY j.created_at DESC
    `);
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Server error" });
  }
});

// Public: list open jobs
router.get("/", async (_req, res: Response) => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT id, title, description, requirements, location, salary_range, created_at FROM jobs WHERE status = 'open' ORDER BY created_at DESC"
    );
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Server error" });
  }
});

// Admin: create job
router.post("/", authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, requirements, location, salary_range } = req.body;
    if (!title || !description || !requirements) {
      res.status(400).json({ message: "title, description, requirements are required" });
      return;
    }
    const [result] = await pool.query<ResultSetHeader>(
      "INSERT INTO jobs (title, description, requirements, location, salary_range, posted_by) VALUES (?, ?, ?, ?, ?, ?)",
      [title, description, requirements, location || null, salary_range || null, req.user!.id]
    );
    const jobId = result.insertId;

    // Background — never crashes the server
    setImmediate(() => {
      generateAssessmentQuestions(title, requirements)
        .then((questions) =>
          pool.query(
            "INSERT INTO assessments (job_id, round_number, questions, duration_minutes) VALUES (?, 1, ?, 60)",
            [jobId, JSON.stringify(questions)]
          )
        )
        .catch((e) => console.error("[assessment gen failed]", e?.message));
    });

    res.status(201).json({ message: "Job posted successfully", job_id: jobId });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Server error" });
  }
});

// Public: get single job
router.get("/:id", async (req, res: Response) => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT id, title, description, requirements, location, salary_range, created_at FROM jobs WHERE id = ? AND status = 'open'",
      [req.params.id]
    );
    if (!rows[0]) { res.status(404).json({ message: "Job not found" }); return; }
    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Server error" });
  }
});

// Admin: toggle job status
router.patch("/:id/status", authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.body;
    if (!["open", "closed"].includes(status)) {
      res.status(400).json({ message: "status must be open or closed" });
      return;
    }
    await pool.query("UPDATE jobs SET status = ? WHERE id = ?", [status, req.params.id]);
    res.json({ message: "Job status updated" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
