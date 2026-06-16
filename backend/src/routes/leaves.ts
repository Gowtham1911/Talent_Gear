import { Router, Response } from "express";
import pool from "../lib/mysql";
import { authenticate, requireAdmin, AuthRequest } from "../lib/auth";
import { RowDataPacket, ResultSetHeader } from "mysql2";

const router = Router();

// Ensure leaves table exists
pool.query(`
  CREATE TABLE IF NOT EXISTS leaves (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    type ENUM('annual','sick','casual','unpaid') NOT NULL DEFAULT 'annual',
    from_date DATE NOT NULL,
    to_date DATE NOT NULL,
    days INT NOT NULL,
    reason TEXT,
    status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
    admin_note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
  )
`).catch(console.error);

// Employee: submit leave request
router.post("/", authenticate, async (req: AuthRequest, res: Response) => {
  const { type, from_date, to_date, reason } = req.body;
  if (!from_date || !to_date) { res.status(400).json({ message: "Dates required" }); return; }

  const from = new Date(from_date);
  const to = new Date(to_date);
  if (to < from) { res.status(400).json({ message: "End date must be after start date" }); return; }
  const days = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  // Get employee id from user id
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT id FROM employees WHERE user_id = ? LIMIT 1",
    [req.user!.id]
  );
  if (!rows.length) { res.status(404).json({ message: "Employee profile not found" }); return; }
  const employeeId = rows[0].id;

  const [result] = await pool.query<ResultSetHeader>(
    "INSERT INTO leaves (employee_id, type, from_date, to_date, days, reason) VALUES (?, ?, ?, ?, ?, ?)",
    [employeeId, type || "annual", from_date, to_date, days, reason || null]
  );
  res.status(201).json({ id: result.insertId, message: "Leave request submitted" });
});

// Employee: get own leave requests
router.get("/my", authenticate, async (req: AuthRequest, res: Response) => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT l.* FROM leaves l
     JOIN employees e ON l.employee_id = e.id
     WHERE e.user_id = ?
     ORDER BY l.created_at DESC`,
    [req.user!.id]
  );
  res.json(rows);
});

// Admin: get approved leaves for a date range (for the leave calendar panel)
router.get("/upcoming", authenticate, requireAdmin, async (_req: AuthRequest, res: Response) => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT l.*, e.first_name, e.last_name, e.department, e.position
     FROM leaves l
     JOIN employees e ON l.employee_id = e.id
     WHERE l.status = 'approved' AND l.to_date >= CURDATE()
     ORDER BY l.from_date ASC
     LIMIT 60`
  );
  res.json(rows);
});

// Admin: get all leave requests
router.get("/", authenticate, requireAdmin, async (_req: AuthRequest, res: Response) => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT l.*, e.first_name, e.last_name, e.department, e.position
     FROM leaves l
     JOIN employees e ON l.employee_id = e.id
     ORDER BY l.created_at DESC`
  );
  res.json(rows);
});

// Admin: approve or reject
router.patch("/:id", authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  const { status, admin_note } = req.body;
  if (!["approved", "rejected"].includes(status)) { res.status(400).json({ message: "Invalid status" }); return; }
  await pool.query(
    "UPDATE leaves SET status = ?, admin_note = ? WHERE id = ?",
    [status, admin_note || null, id]
  );
  res.json({ message: `Leave ${status}` });
});

// Admin: delete a leave request
router.delete("/:id", authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  await pool.query("DELETE FROM leaves WHERE id = ?", [Number(req.params.id)]);
  res.json({ message: "Deleted" });
});

export default router;
