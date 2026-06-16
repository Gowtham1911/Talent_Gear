import pool from "../lib/mysql";
import { RowDataPacket } from "mysql2";

export interface IUser {
  id: number;
  email: string;
  password: string;
  role: "admin" | "employee" | "student";
}

export async function findUserByEmail(email: string): Promise<IUser | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM users WHERE email = ? LIMIT 1",
    [email]
  );
  return (rows[0] as IUser) ?? null;
}

export async function createUser(
  email: string,
  hashedPassword: string,
  role: "admin" | "employee" | "student" = "student"
): Promise<void> {
  await pool.query(
    "INSERT INTO users (email, password, role) VALUES (?, ?, ?)",
    [email, hashedPassword, role]
  );
}
