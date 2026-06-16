"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const XLSX = __importStar(require("xlsx"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const mysql_1 = __importDefault(require("../lib/mysql"));
const auth_1 = require("../lib/auth");
const Employee_1 = require("../models/Employee");
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
router.get("/", auth_1.authenticate, async (req, res) => {
    if (req.user.role === "admin") {
        const employees = await (0, Employee_1.getAllEmployees)();
        res.status(200).json(employees);
    }
    else {
        const employee = await (0, Employee_1.getEmployeeByUserId)(req.user.id);
        res.status(200).json(employee ?? {});
    }
});
router.post("/", auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
    const id = await (0, Employee_1.createEmployee)(req.body);
    res.status(201).json({ id });
});
router.get("/:id", auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) {
        res.status(400).json({ message: "Invalid ID" });
        return;
    }
    const employee = await (0, Employee_1.getEmployeeById)(id);
    if (!employee) {
        res.status(404).json({ message: "Not found" });
        return;
    }
    res.status(200).json(employee);
});
router.put("/:id", auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) {
        res.status(400).json({ message: "Invalid ID" });
        return;
    }
    await (0, Employee_1.updateEmployee)(id, req.body);
    res.status(200).json({ message: "Updated successfully" });
});
router.delete("/:id", auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) {
        res.status(400).json({ message: "Invalid ID" });
        return;
    }
    await (0, Employee_1.deleteEmployee)(id);
    res.status(200).json({ message: "Deleted successfully" });
});
function normalizeKey(key) {
    return key.trim().toLowerCase().replace(/\s+/g, "_");
}
router.post("/bulk", auth_1.authenticate, auth_1.requireAdmin, upload.single("file"), async (req, res) => {
    if (!req.file) {
        res.status(400).json({ message: "No file uploaded" });
        return;
    }
    try {
        const workbook = XLSX.read(req.file.buffer, { type: "buffer", cellDates: true });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
        const employees = rows.map((row) => {
            const normalized = {};
            for (const key of Object.keys(row))
                normalized[normalizeKey(key)] = row[key];
            return normalized;
        });
        if (employees.length === 0) {
            res.status(400).json({ message: "No data found in file" });
            return;
        }
        const results = { success: 0, failed: 0, errors: [] };
        for (const emp of employees) {
            try {
                const defaultPassword = bcryptjs_1.default.hashSync("Welcome@123", 10);
                let hireDate = emp.hire_date;
                if (hireDate instanceof Date)
                    hireDate = hireDate.toISOString().split("T")[0];
                const [userResult] = await mysql_1.default.query("INSERT INTO users (email, password, role) VALUES (?, ?, 'employee')", [emp.email, defaultPassword]);
                await mysql_1.default.query(`INSERT INTO employees (user_id, first_name, last_name, phone, department, position, salary, hire_date, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [userResult.insertId, emp.first_name, emp.last_name, emp.phone || null,
                    emp.department || null, emp.position || null, emp.salary || null,
                    hireDate || null, emp.status || "active"]);
                results.success++;
            }
            catch (err) {
                results.failed++;
                results.errors.push(`${emp.email}: ${err.message}`);
            }
        }
        res.status(200).json(results);
    }
    catch (err) {
        res.status(500).json({ message: err.message });
    }
});
exports.default = router;
