"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const User_1 = require("../models/User");
const jwt_1 = require("../lib/jwt");
const auth_1 = require("../lib/auth");
const router = (0, express_1.Router)();
router.post("/password/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        res.status(400).json({ message: "Email and password are required" });
        return;
    }
    const user = await (0, User_1.findUserByEmail)(email);
    if (!user || !bcryptjs_1.default.compareSync(password, user.password)) {
        res.status(401).json({ message: "Invalid credentials" });
        return;
    }
    const token = (0, jwt_1.signToken)({ id: user.id, email: user.email, role: user.role });
    res.status(200).json({ token, role: user.role });
});
router.post("/password/register", async (req, res) => {
    const { email, password, role } = req.body;
    if (!email || !password) {
        res.status(400).json({ message: "Email and password are required" });
        return;
    }
    const existing = await (0, User_1.findUserByEmail)(email);
    if (existing) {
        res.status(400).json({ message: "User already exists" });
        return;
    }
    const hashedPassword = bcryptjs_1.default.hashSync(password, 10);
    const userRole = role === "admin" ? "admin" : "student";
    await (0, User_1.createUser)(email, hashedPassword, userRole);
    res.status(201).json({ message: "Account created successfully" });
});
router.get("/me", auth_1.authenticate, (req, res) => {
    res.status(200).json(req.user);
});
router.get("/user-by-email", auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
    const { email } = req.query;
    if (!email) {
        res.status(400).json({ message: "Email required" });
        return;
    }
    const user = await (0, User_1.findUserByEmail)(email);
    if (!user) {
        res.status(404).json({ message: "Not found" });
        return;
    }
    res.status(200).json({ id: user.id, email: user.email, role: user.role });
});
router.post("/logout", (_req, res) => {
    res.status(200).json({ message: "Logged out" });
});
exports.default = router;
