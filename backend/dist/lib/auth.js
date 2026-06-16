"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
exports.requireAdmin = requireAdmin;
const jwt_1 = require("../lib/jwt");
function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }
    try {
        req.user = (0, jwt_1.verifyToken)(authHeader.slice(7));
        next();
    }
    catch {
        res.status(401).json({ message: "Invalid token" });
    }
}
function requireAdmin(req, res, next) {
    if (req.user?.role !== "admin") {
        res.status(403).json({ message: "Forbidden" });
        return;
    }
    next();
}
