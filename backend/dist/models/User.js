"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.findUserByEmail = findUserByEmail;
exports.createUser = createUser;
const mysql_1 = __importDefault(require("../lib/mysql"));
async function findUserByEmail(email) {
    const [rows] = await mysql_1.default.query("SELECT * FROM users WHERE email = ? LIMIT 1", [email]);
    return rows[0] ?? null;
}
async function createUser(email, hashedPassword, role = "student") {
    await mysql_1.default.query("INSERT INTO users (email, password, role) VALUES (?, ?, ?)", [email, hashedPassword, role]);
}
