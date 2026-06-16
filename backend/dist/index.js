"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const auth_1 = __importDefault(require("./routes/auth"));
const jobs_1 = __importDefault(require("./routes/jobs"));
const applications_1 = __importDefault(require("./routes/applications"));
const assessments_1 = __importDefault(require("./routes/assessments"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        const allowed = process.env.FRONTEND_URL;
        if (!origin || !allowed || origin === allowed || origin.startsWith(allowed)) {
            callback(null, true);
        }
        else {
            callback(new Error(`CORS blocked: ${origin}`));
        }
    },
    credentials: true,
}));
app.use(express_1.default.json());
app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.use("/api/auth", auth_1.default);
app.use("/api/jobs", jobs_1.default);
app.use("/api/applications", applications_1.default);
app.use("/api/assessments", assessments_1.default);
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
