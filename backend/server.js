import express from "express";
import http from "http";
import dotenv from "dotenv";
import { createProxyMiddleware } from "http-proxy-middleware";
import cors from "cors";

dotenv.config();

export class GatewayServer {
    constructor(config = {}) {
        this.port = config.port || process.env.GATEWAY_PORT || 5000;

        this.serviceUrls = {
            user: config.userServiceUrl || process.env.USER_SERVICE_URL,
            match: config.matchingServiceUrl || process.env.MATCHING_SERVICE_URL,
            question: config.questionServiceUrl || process.env.QUESTION_SERVICE_URL,
            collaboration: config.collabServiceUrl || process.env.COLLAB_SERVICE_URL,
        };

        this.frontendUrl = config.frontendUrl || process.env.FRONTEND_URL || "http://localhost:5173";

        this.app = express();
        this.server = http.createServer(this.app);

        this._initMiddleware();
        this._initRoutes();
    }

    _initMiddleware() {
        this.app.use(cors({
            origin: this.frontendUrl,
            credentials: true,
            methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
            allowedHeaders: ["Content-Type", "Authorization"],
        }));
    }

    _initRoutes() {
        this.app.get("/health", (req, res) => res.json({ status: "ok" }));
        this._initProxyRoutes();
    }

    _initProxyRoutes() {
        const createProxy = (basePath, target, label) => {
            this.app.use(basePath, createProxyMiddleware({
                target,
                changeOrigin: true,
                pathRewrite: (path) => path, // keep original path
                on: {
                    proxyReq: (proxyReq, req, res) => {
                        console.log(`➡️ [${label}] ${req.method} ${req.originalUrl} -> ${target}${req.url}`);
                    },
                    error: (err, req, res) => {
                        console.error(`[Proxy] ${label}:`, err.message);
                        res.status(502).json({ error: `${label} service unavailable` });
                    }
                }
            }));
        };

        createProxy("/api/v1/auth", this.serviceUrls.user, "auth");
        createProxy("/api/v1/admin", this.serviceUrls.user, "admin");
        createProxy("/api/v1/users", this.serviceUrls.user, "user");
        createProxy("/api/v1/matches", this.serviceUrls.match, "matching");
        createProxy("/api/v1/questions", this.serviceUrls.question, "questions");
        createProxy("/api/v1/collaboration", this.serviceUrls.collaboration, "collaboration");

        console.log("[Gateway] Proxy routes ready");
    }

    start() {
        return new Promise((resolve, reject) => {
            this.server.listen(this.port, () => {
                console.log(`[Gateway] Running on :${this.port}`);
                resolve();
            });
            this.server.on("error", reject);
        });
    }

    stop() {
        return new Promise((resolve, reject) => {
            this.server.close(err => err ? reject(err) : resolve());
        });
    }
}