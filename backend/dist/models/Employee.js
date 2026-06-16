"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllEmployees = getAllEmployees;
exports.getEmployeeByUserId = getEmployeeByUserId;
exports.getEmployeeById = getEmployeeById;
exports.createEmployee = createEmployee;
exports.updateEmployee = updateEmployee;
exports.deleteEmployee = deleteEmployee;
const mysql_1 = __importDefault(require("../lib/mysql"));
async function getAllEmployees() {
    const [rows] = await mysql_1.default.query(`
    SELECT e.*, u.email FROM employees e
    JOIN users u ON e.user_id = u.id
    ORDER BY e.first_name ASC
  `);
    return rows;
}
async function getEmployeeByUserId(userId) {
    const [rows] = await mysql_1.default.query("SELECT e.*, u.email FROM employees e JOIN users u ON e.user_id = u.id WHERE e.user_id = ? LIMIT 1", [userId]);
    return rows[0] ?? null;
}
async function getEmployeeById(id) {
    const [rows] = await mysql_1.default.query("SELECT e.*, u.email FROM employees e JOIN users u ON e.user_id = u.id WHERE e.id = ? LIMIT 1", [id]);
    return rows[0] ?? null;
}
async function createEmployee(data) {
    const [result] = await mysql_1.default.query(`INSERT INTO employees (user_id, first_name, last_name, phone, department, position, salary, hire_date, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [data.user_id, data.first_name, data.last_name, data.phone, data.department, data.position, data.salary, data.hire_date, data.status]);
    return result.insertId;
}
async function updateEmployee(id, data) {
    const fields = Object.keys(data).map((k) => `${k} = ?`).join(", ");
    const values = [...Object.values(data), id];
    await mysql_1.default.query(`UPDATE employees SET ${fields} WHERE id = ?`, values);
}
async function deleteEmployee(id) {
    await mysql_1.default.query("DELETE FROM employees WHERE id = ?", [id]);
}
