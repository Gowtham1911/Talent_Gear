import { Router, Response } from "express";
import multer from "multer";
import * as XLSX from "xlsx";
import bcrypt from "bcryptjs";
import { ResultSetHeader } from "mysql2";
import pool from "../lib/mysql";
import { authenticate, requireAdmin, AuthRequest } from "../lib/auth";
import {
  getAllEmployees,
  getEmployeeById,
  getEmployeeByUserId,
  createEmployee,
  updateEmployee,
  deleteEmployee,
} from "../models/Employee";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.get("/", authenticate, async (req: AuthRequest, res: Response) => {
  if (req.user!.role === "admin") {
    const employees = await getAllEmployees();
    res.status(200).json(employees);
  } else {
    const employee = await getEmployeeByUserId(req.user!.id);
    res.status(200).json(employee ?? {});
  }
});

router.post("/", authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  const id = await createEmployee(req.body);
  res.status(201).json({ id });
});

router.get("/:id", authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ message: "Invalid ID" }); return; }
  const employee = await getEmployeeById(id);
  if (!employee) { res.status(404).json({ message: "Not found" }); return; }
  res.status(200).json(employee);
});

router.put("/:id", authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ message: "Invalid ID" }); return; }
  await updateEmployee(id, req.body);
  res.status(200).json({ message: "Updated successfully" });
});

router.delete("/:id", authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ message: "Invalid ID" }); return; }
  await deleteEmployee(id);
  res.status(200).json({ message: "Deleted successfully" });
});

function normalizeKey(key: string) {
  return key.trim().toLowerCase().replace(/\s+/g, "_");
}

router.post("/bulk", authenticate, requireAdmin, upload.single("file"), async (req: AuthRequest, res: Response) => {
  if (!req.file) { res.status(400).json({ message: "No file uploaded" }); return; }
  try {
    const workbook = XLSX.read(req.file.buffer, { type: "buffer", cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    const employees = rows.map((row) => {
      const normalized: any = {};
      for (const key of Object.keys(row)) normalized[normalizeKey(key)] = row[key];
      return normalized;
    });

    if (employees.length === 0) { res.status(400).json({ message: "No data found in file" }); return; }

    const results = { success: 0, failed: 0, errors: [] as string[] };

    for (const emp of employees) {
      try {
        const defaultPassword = bcrypt.hashSync("Welcome@123", 10);
        let hireDate = emp.hire_date;
        if (hireDate instanceof Date) hireDate = hireDate.toISOString().split("T")[0];
        const [userResult] = await pool.query<ResultSetHeader>(
          "INSERT INTO users (email, password, role) VALUES (?, ?, 'employee')",
          [emp.email, defaultPassword]
        );
        await pool.query(
          `INSERT INTO employees (user_id, first_name, last_name, phone, department, position, salary, hire_date, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [userResult.insertId, emp.first_name, emp.last_name, emp.phone || null,
           emp.department || null, emp.position || null, emp.salary || null,
           hireDate || null, emp.status || "active"]
        );
        results.success++;
      } catch (err: any) {
        results.failed++;
        results.errors.push(`${emp.email}: ${err.message}`);
      }
    }
    res.status(200).json(results);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
