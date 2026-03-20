import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { postgres } from "./client.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(__dirname, "migrations");

/**
 * Run all .sql files in /migrations in alphabetical order.
 * Idempotent — uses IF NOT EXISTS where possible.
 */
async function migrate() {
    try {
        await postgres.connect();

        const files = fs.readdirSync(migrationsDir)
            .filter((f) => f.endsWith(".sql"))
            .sort();

        for (const file of files) {
            const sql = fs.readFileSync(path.join(migrationsDir, file), "utf-8");
            console.log(`[migrate] Running ${file} ...`);
            await postgres.query(sql);
            console.log(`[migrate] ${file} ✔`);
        }

        console.log("[migrate] All migrations complete");
        process.exit(0);
    } catch (err) {
        console.error("[migrate] Migration failed:", err);
        process.exit(1);
    }
}

migrate();
