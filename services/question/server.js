import express from "express";
import dotenv from "dotenv";
import cors from "cors";

import questionRoutes from "./api/routes/questionRoutes.js";
import { postgres, initDatabase } from "./infrastructure/postgres/client.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.use((req, _res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.originalUrl}`);
    next();
});

async function init() {
    try {
        await postgres.query("SELECT 1");
        console.log("PostgreSQL connected");

        await initDatabase();

        app.get("/health", async (_req, res) => {
            try {
                await postgres.query("SELECT 1");
                res.json({ status: "ok", service: "question", uptime: process.uptime() });
            } catch {
                res.status(503).json({ status: "degraded", service: "question" });
            }
        });

        app.use("/api/v1/questions", questionRoutes);

        app.use((_req, res) => {
            res.status(404).json({ success: false, error: "Route not found" });
        });

        app.use((err, _req, res, _next) => {
            console.error("Unhandled error:", err);
            res.status(err.status || 500).json({
                success: false,
                error: process.env.NODE_ENV === "production" ? "Internal server error" : err.message,
            });
        });

        const PORT = process.env.PORT || 3002;
        const server = app.listen(PORT, () => {
            console.log(`Question service running on port ${PORT}`);
        });

        const shutdown = async (signal) => {
            console.log(`\n${signal} received — shutting down gracefully`);
            server.close(async () => {
                await postgres.end();
                console.log("PostgreSQL pool closed");
                process.exit(0);
            });
            setTimeout(() => process.exit(1), 10_000);
        };
        process.on("SIGINT", () => shutdown("SIGINT"));
        process.on("SIGTERM", () => shutdown("SIGTERM"));

    } catch (err) {
        console.error("Server startup failed:", err);
        process.exit(1);
    }
}

init();
