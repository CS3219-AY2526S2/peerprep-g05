import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REPO = "liquidslr/interview-company-wise-problems";
const TARGET = 200;

function normalizeTitle(title) {
    return String(title || "").trim().replace(/\s+/g, " ").toLowerCase();
}

function parseCsvLine(line) {
    const cols = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
        const ch = line[i];
        if (ch === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i += 1;
            } else {
                inQuotes = !inQuotes;
            }
            continue;
        }

        if (ch === "," && !inQuotes) {
            cols.push(current);
            current = "";
            continue;
        }

        current += ch;
    }
    cols.push(current);
    return cols;
}

function parseCsv(content) {
    const lines = content.split(/\r?\n/).filter(Boolean);
    if (lines.length <= 1) return [];

    const header = parseCsvLine(lines[0]).map((h) => h.trim());
    const titleIdx = header.findIndex((h) => /title/i.test(h));
    const difficultyIdx = header.findIndex((h) => /difficulty/i.test(h));
    const topicsIdx = header.findIndex((h) => /topics?/i.test(h));

    if (titleIdx < 0) return [];

    const rows = [];
    for (let i = 1; i < lines.length; i += 1) {
        const cols = parseCsvLine(lines[i]);
        rows.push({
            title: (cols[titleIdx] || "").trim(),
            difficulty: (cols[difficultyIdx] || "").trim(),
            topics: (cols[topicsIdx] || "").trim(),
        });
    }
    return rows;
}

function normalizeDifficulty(value) {
    const v = String(value || "").trim().toLowerCase();
    if (v === "easy") return "Easy";
    if (v === "medium") return "Medium";
    if (v === "hard") return "Hard";
    return "Medium";
}

async function fetchJson(url) {
    const res = await fetch(url, {
        headers: {
            "User-Agent": "peerprep-seed-generator",
            "Accept": "application/vnd.github+json",
        },
    });
    if (!res.ok) throw new Error(`GitHub request failed ${res.status}: ${url}`);
    return res.json();
}

async function fetchText(url) {
    const res = await fetch(url, {
        headers: { "User-Agent": "peerprep-seed-generator" },
    });
    if (!res.ok) return "";
    return res.text();
}

async function main() {
    const treeUrl = `https://api.github.com/repos/${REPO}/git/trees/main?recursive=1`;
    const tree = await fetchJson(treeUrl);

    const allCsvPaths = (tree.tree || [])
        .filter((node) => node.type === "blob" && /\/5\. All\.csv$/i.test(node.path))
        .map((node) => node.path)
        .sort((a, b) => a.localeCompare(b));

    const byTitle = new Map();

    for (const csvPath of allCsvPaths) {
        const company = csvPath.split("/")[0];
        const rawUrl = `https://raw.githubusercontent.com/${REPO}/main/${csvPath.replace(/ /g, "%20")}`;
        const content = await fetchText(rawUrl);
        if (!content) continue;

        const rows = parseCsv(content);
        for (const row of rows) {
            if (!row.title) continue;
            const key = normalizeTitle(row.title);
            if (!key) continue;

            if (!byTitle.has(key)) {
                byTitle.set(key, {
                    title: row.title,
                    complexity: normalizeDifficulty(row.difficulty),
                    topics: row.topics
                        ? row.topics.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 4)
                        : ["Algorithms"],
                    companies: [],
                    source: "liquidslr/interview-company-wise-problems",
                });
            }

            const item = byTitle.get(key);
            if (!item.companies.includes(company)) {
                item.companies.push(company);
            }
        }
    }

    const list = Array.from(byTitle.values())
        .map((q) => ({
            ...q,
            companies: q.companies.sort((a, b) => a.localeCompare(b)).slice(0, 8),
            topics: q.topics.length ? q.topics : ["Algorithms"],
        }))
        .sort((a, b) => b.companies.length - a.companies.length || a.title.localeCompare(b.title));

    const selected = list.slice(0, TARGET);
    if (selected.length < TARGET) {
        throw new Error(`Only found ${selected.length} unique titles; expected at least ${TARGET}`);
    }

    const outPath = path.join(__dirname, "data", "liquidslr-200-unique.json");
    await fs.writeFile(outPath, JSON.stringify(selected, null, 2) + "\n", "utf8");

    console.log(`Generated ${selected.length} unique questions at ${outPath}`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
