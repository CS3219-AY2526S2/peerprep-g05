import express from "express";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";

import authRoutes from "./api/routes/authRoutes.js";
import userRoutes from "./api/routes/userRoutes.js";
import adminRoutes from "./api/routes/adminRoutes.js";
import { postgres } from "./infrastructure/database/client.js";
import config from "./config/index.js";

dotenv.config();

const app = express();
app.use(express.json());

// ─── Rate limiting on auth endpoints ──────────────────
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // limit each IP to 50 requests per window
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests, please try again later" },
});

async function init() {
    try {
        // Connect to PostgreSQL
        await postgres.connect();
        console.log("[user-service] Database connected");

        // ─── Health endpoint ──────────────────────────
        app.get("/health", (_req, res) => {
            res.status(200).json({ status: "ok", service: "user-service" });
        });

        // ─── Routes ──────────────────────────────────
        app.use("/api/v1/auth", authLimiter, authRoutes);
        app.use("/api/v1/users", userRoutes);
        app.use("/api/v1/admin", adminRoutes);

        // ─── Global error handler ────────────────────
        app.use((err, _req, res, _next) => {
            const status = err.status || 500;
            const message = err.message || "Internal server error";

            if (status === 500) {
                console.error("[user-service] Unhandled error:", err);
            }

            res.status(status).json({ error: message });
        });

        // ─── Start server ────────────────────────────
        app.listen(config.port, "0.0.0.0", () => {
            console.log(`[user-service] Running on port ${config.port}`);
        });

    } catch (err) {
        console.error("[user-service] Startup failed:", err);
        process.exit(1);
    }
}

init();
