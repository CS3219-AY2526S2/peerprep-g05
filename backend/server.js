import express from "express";
import http from "http";
import dotenv from "dotenv";
import { createProxyMiddleware } from "http-proxy-middleware";
import cors from "cors";

dotenv.config();

const app = express();

//CORS
app.use(cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-lock-holder"],
}));

const server = http.createServer(app);

// ─── HTTP Proxy Routes ────────────────────────────────────────────────────────

function initProxyRoutes() {

    app.use("/api/v1/auth", createProxyMiddleware({
        target: process.env.USER_SERVICE_URL,
        changeOrigin: true,
        pathRewrite: (path, req) => {
            return `/api/v1/auth${path}`;
        },
        on: {
            proxyReq: (proxyReq, req, res) => {
            console.log("➡️ Incoming:", req.method, req.originalUrl);
            console.log("➡️ Forwarding to:", proxyReq.path);
            },
            error: (err, req, res) => {
                console.error("[Proxy] auth:", err.message);
                res.status(502).json({ error: "User service unavailable" });
            }
        }
    }));

    app.use("/api/v1/admin", createProxyMiddleware({
        target: process.env.USER_SERVICE_URL,
        changeOrigin: true,
        pathRewrite: (path, req) => {
            return `/api/v1/admin${path}`;
        },
        on: {
            error: (err, req, res) => {
                console.error("[Proxy] admin:", err.message);
                res.status(502).json({ error: "User service unavailable" });
            }
        }
    }));

    app.use("/api/v1/matches", createProxyMiddleware({
        target: process.env.MATCHING_SERVICE_URL,
        changeOrigin: true,
        pathRewrite : (path) => `/api/v1/matches${path}`,
        on: {
            error: (err, req, res) => {
                console.error("[Proxy] matching:", err.message);
                res.status(502).json({ error: "Matching service unavailable" });
            }
        }
    }));

    app.use("/api/v1/users", createProxyMiddleware({
        target: process.env.USER_SERVICE_URL,
        changeOrigin: true,
        pathRewrite: (path, req) => {
            return `/api/v1/users${path}`;
        },
        on: {
            error: (err, req, res) => {
                console.error("[Proxy] user:", err.message);
                res.status(502).json({ error: "User service unavailable" });
            }
        }
    }));

    app.use("/api/v1/questions", createProxyMiddleware({
        target: process.env.QUESTION_SERVICE_URL,
        changeOrigin: true,
        pathRewrite: (path, req) => {
            return `/api/v1/questions${path}`;
        },
        on: {
            error: (err, req, res) => {
                console.error("[Proxy] questions:", err.message);
                res.status(502).json({ error: "Question service unavailable" });
            }
        }
    }));

    console.log("[Gateway] Proxy routes ready");
}

// ─── Health Check ─────────────────────────────────────────────────────────────

app.get("/health", (req, res) => res.json({ status: "ok" }));

// ─── Boot ─────────────────────────────────────────────────────────────────────

async function init() {
    try {
        initProxyRoutes();

        const PORT = process.env.GATEWAY_PORT || 4000;
        server.listen(PORT, () => {
            console.log(`[Gateway] Running on :${PORT}`);
        });

    } catch (err) {
        console.error("[Gateway] Startup failed:", err);
        process.exit(1);
    }
}

init();