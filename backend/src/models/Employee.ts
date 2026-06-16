import pool from "../lib/mysql";
import { RowDataPacket, ResultSetHeader } from "mysql2";

export interface IEmployee {
  id: number;
  user_id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  department: string;
  position: string;
  salary: number;
  hire_date: string;
  status: "active" | "inactive";
}

export async function getAllEmployees(): Promise<IEmployee[]> {
  const [rows] = await pool.query<RowDataPacket[]>(`
    SELECT e.*, u.email FROM employees e
    JOIN users u ON e.user_id = u.id
    ORDER BY e.first_name ASC
  `);
  return rows as IEmployee[];
}

export async function getEmployeeByUserId(userId: number): Promise<IEmployee | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT e.*, u.email FROM employees e JOIN users u ON e.user_id = u.id WHERE e.user_id = ? LIMIT 1",
    [userId]
  );
  return (rows[0] as IEmployee) ?? null;
}

export async function getEmployeeById(id: number): Promise<IEmployee | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT e.*, u.email FROM employees e JOIN users u ON e.user_id = u.id WHERE e.id = ? LIMIT 1",
    [id]
  );
  return (rows[0] as IEmployee) ?? null;
}

export async function createEmployee(data: Omit<IEmployee, "id" | "email">): Promise<number> {
  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO employees (user_id, first_name, last_name, phone, department, position, salary, hire_date, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [data.user_id, data.first_name, data.last_name, data.phone, data.department, data.position, data.salary, data.hire_date, data.status]
  );
  return result.insertId;
}

export async function updateEmployee(id: number, data: Partial<Omit<IEmployee, "id" | "user_id" | "email">>): Promise<void> {
  const fields = Object.keys(data).map((k) => `${k} = ?`).join(", ");
  const values = [...Object.values(data), id];
  await pool.query(`UPDATE employees SET ${fields} WHERE id = ?`, values);
}

export async function deleteEmployee(id: number): Promise<void> {
  await pool.query("DELETE FROM employees WHERE id = ?", [id]);
}
