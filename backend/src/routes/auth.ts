import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import multer from "multer";
import path from "path";
import fs from "fs";
import { findUserByEmail, createUser } from "../models/User";
import { signToken } from "../lib/jwt";
import { authenticate, requireAdmin, AuthRequest } from "../lib/auth";
import pool from "../lib/mysql";
import { RowDataPacket } from "mysql2";

const photoDir = path.join(process.cwd(), "uploads", "photos");
if (!fs.existsSync(photoDir)) fs.mkdirSync(photoDir, { recursive: true });

const photoUpload = multer({
  storage: multer.diskStorage({
    destination: photoDir,
    filename: (_req, file, cb) => cb(null, `photo_${Date.now()}${path.extname(file.originalname)}`),
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    cb(null, ["image/jpeg", "image/png", "image/webp"].includes(file.mimetype));
  },
});

const router = Router();

router.post("/password/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ message: "Email and password are required" });
    return;
  }
  const user = await findUserByEmail(email);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    res.status(401).json({ message: "Invalid credentials" });
    return;
  }
  const token = signToken({ id: user.id, email: user.email, role: user.role });
  res.status(200).json({ token, role: user.role });
});

router.post("/password/register", async (req: Request, res: Response) => {
  const { email, password, role } = req.body;
  if (!email || !password) {
    res.status(400).json({ message: "Email and password are required" });
    return;
  }
  const existing = await findUserByEmail(email);
  if (existing) {
    res.status(400).json({ message: "User already exists" });
    return;
  }
  const hashedPassword = bcrypt.hashSync(password, 10);
  const userRole = role === "admin" ? "admin" : "student";
  await createUser(email, hashedPassword, userRole);
  res.status(201).json({ message: "Account created successfully" });
});

router.get("/me", authenticate, (req: AuthRequest, res: Response) => {
  res.status(200).json(req.user);
});

router.get("/profile", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT id, email, role, full_name, phone, location, linkedin, github, photo_url, resume_url, skills, experience_years, bio FROM users WHERE id = ?",
      [req.user!.id]
    );
    if (!rows[0]) { res.status(404).json({ message: "User not found" }); return; }
    const u = rows[0];
    res.json({
      ...u,
      skills: typeof u.skills === "string" ? JSON.parse(u.skills || "[]") : (u.skills || []),
    });
  } catch (e) { console.error(e); res.status(500).json({ message: "Server error" }); }
});

router.put("/profile", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { full_name, phone, location, linkedin, github, skills, experience_years, bio } = req.body;
    await pool.query(
      "UPDATE users SET full_name=?, phone=?, location=?, linkedin=?, github=?, skills=?, experience_years=?, bio=? WHERE id=?",
      [full_name||null, phone||null, location||null, linkedin||null, github||null, JSON.stringify(skills||[]), experience_years||null, bio||null, req.user!.id]
    );
    res.json({ message: "Profile updated" });
  } catch (e) { console.error(e); res.status(500).json({ message: "Server error" }); }
});

router.post("/profile/photo", authenticate, photoUpload.single("photo"), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) { res.status(400).json({ message: "No file uploaded" }); return; }
    const url = `/uploads/photos/${req.file.filename}`;
    await pool.query("UPDATE users SET photo_url=? WHERE id=?", [url, req.user!.id]);
    res.json({ photo_url: url });
  } catch (e) { console.error(e); res.status(500).json({ message: "Server error" }); }
});

router.get("/user-by-email", authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  const { email } = req.query;
  if (!email) { res.status(400).json({ message: "Email required" }); return; }
  const user = await findUserByEmail(email as string);
  if (!user) { res.status(404).json({ message: "Not found" }); return; }
  res.status(200).json({ id: user.id, email: user.email, role: user.role });
});

router.post("/logout", (_req: Request, res: Response) => {
  res.status(200).json({ message: "Logged out" });
});

export default router;
