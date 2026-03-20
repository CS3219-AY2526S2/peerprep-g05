import { spawn } from "node:child_process";

const baseUrl = process.env.LOADTEST_BASE_URL || "http://localhost:3002";
const path = process.env.LOADTEST_PATH || "/api/v1/questions?limit=20&page=1";
const duration = String(process.env.LOADTEST_DURATION_SECONDS || 30);
const users = String(process.env.LOADTEST_USERS || 200);
const target = `${baseUrl}${path}`;

const npxCmd = process.platform === "win32" ? "npx.cmd" : "npx";
const args = [
    "--yes",
    "autocannon",
    "-c",
    users,
    "-d",
    duration,
    "--renderStatusCodes",
    "-j",
    target,
];

console.log(`Running load test: ${npxCmd} ${args.join(" ")}`);

const child = spawn(npxCmd, args, { stdio: "inherit", shell: false });

child.on("exit", (code) => {
    process.exit(code ?? 1);
});

child.on("error", (err) => {
    console.error("Failed to run load test:", err);
    process.exit(1);
});
