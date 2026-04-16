import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const count = String(process.env.SEED_COUNT || 10000);
const seedScriptPath = path.resolve(__dirname, "../../scripts/seed.js");
const args = [seedScriptPath, "--load-test", "--count", count];

console.log(`Running seed script: ${process.execPath} ${args.join(" ")}`);

const child = spawn(process.execPath, args, { stdio: "inherit", shell: false });

child.on("exit", (code) => {
    process.exit(code ?? 1);
});

child.on("error", (err) => {
    console.error("Failed to run seed script:", err);
    process.exit(1);
});
