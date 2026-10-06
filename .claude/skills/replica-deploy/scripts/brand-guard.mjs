#!/usr/bin/env node
// Replica brand gate: fails (exit 1) while the original app's names, terms or
// brand colors appear in the project. Reads replica/brand-blocklist.json.
// Usage: node brand-guard.mjs [projectRoot] [--json]

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, extname, resolve } from "node:path";

const args = process.argv.slice(2);
const asJson = args.includes("--json");
const root = resolve(args.find((a) => !a.startsWith("--")) ?? process.cwd());
const blocklistPath = join(root, "replica", "brand-blocklist.json");

const SKIP_DIRS = new Set([
  "node_modules", ".git", ".next", "dist", "build", "out", ".vercel",
  ".turbo", ".cache", "coverage", ".claude",
]);
const BINARY_EXT = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".avif", ".bmp",
  ".woff", ".woff2", ".ttf", ".otf", ".eot", ".mp4", ".mov", ".webm",
  ".mp3", ".wav", ".pdf", ".zip", ".gz", ".tgz", ".lock", ".tsbuildinfo",
]);
const SKIP_FILES = new Set(["package-lock.json", "yarn.lock", "pnpm-lock.yaml", "bun.lockb"]);
const MAX_BYTES = 2 * 1024 * 1024;

let blocklist;
try {
  blocklist = JSON.parse(readFileSync(blocklistPath, "utf8"));
} catch (err) {
  console.error(`brand-guard: cannot read ${relative(root, blocklistPath)} (${err.code ?? err.message}).`);
  console.error("Run /replica-recon first — deploy is blocked without a blocklist.");
  process.exit(2);
}

const words = [...(blocklist.names ?? []), ...(blocklist.terms ?? [])]
  .map((w) => String(w).trim())
  .filter(Boolean);
const tolerance = Number(blocklist.colorTolerance ?? 24);
const ignorePaths = (blocklist.ignorePaths ?? ["replica/"]).map((p) => p.replace(/^\.\//, ""));
if (!ignorePaths.includes("replica/")) ignorePaths.push("replica/");

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// Match whole words, and tolerate space/hyphen/underscore/no separator between parts
// so "Acme Cal", "acme-cal", "acme_cal" and "AcmeCal" all match.
const wordPatterns = words.map((w) => {
  const parts = w.split(/[\s\-_]+/).filter(Boolean).map(escapeRe);
  const body = parts.join("[\\s\\-_]?");
  return { word: w, re: new RegExp(`(?<![A-Za-z0-9])${body}(?![A-Za-z0-9])`, "gi") };
});

function parseColor(str) {
  const s = str.trim().toLowerCase();
  let m = s.match(/^#([0-9a-f]{3,8})$/);
  if (m) {
    let h = m[1];
    if (h.length === 3 || h.length === 4) h = [...h.slice(0, 3)].map((c) => c + c).join("");
    else if (h.length === 8) h = h.slice(0, 6);
    else if (h.length !== 6) return null;
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  }
  m = s.match(/^rgba?\(\s*(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})/);
  if (m) return m.slice(1, 4).map(Number);
  return null;
}
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const brandColors = (blocklist.colors ?? [])
  .map((c) => ({ raw: c, rgb: parseColor(c) }))
  .filter((c) => c.rgb);
const COLOR_RE = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![0-9a-fA-F])|rgba?\(\s*\d{1,3}[\s,]+\d{1,3}[\s,]+\d{1,3}[^)]*\)/g;

const isIgnored = (rel) =>
  ignorePaths.some((p) => (p.endsWith("/") ? rel.startsWith(p) : rel === p || rel.startsWith(p + "/")));

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const rel = relative(root, full).split("\\").join("/");
    let st;
    try { st = statSync(full); } catch { continue; }
    if (st.isDirectory()) {
      if (SKIP_DIRS.has(name) || isIgnored(rel + "/")) continue;
      yield* walk(full);
    } else if (st.isFile()) {
      if (isIgnored(rel) || SKIP_FILES.has(name)) continue;
      if (BINARY_EXT.has(extname(name).toLowerCase()) || st.size > MAX_BYTES) continue;
      yield { full, rel };
    }
  }
}

const findings = [];
// Filenames count too: a route like /acme-cal/ ships the name in URLs.
for (const { full, rel } of walk(root)) {
  for (const { word, re } of wordPatterns) {
    re.lastIndex = 0;
    if (re.test(rel)) findings.push({ file: rel, line: 0, kind: "name", match: word, text: "(in file path)" });
  }
  let text;
  try { text = readFileSync(full, "utf8"); } catch { continue; }
  if (text.includes("\u0000")) continue; // binary
  const lines = text.split(/\r?\n/);
  lines.forEach((line, i) => {
    for (const { word, re } of wordPatterns) {
      re.lastIndex = 0;
      if (re.test(line)) findings.push({ file: rel, line: i + 1, kind: "name", match: word, text: line.trim().slice(0, 160) });
    }
    if (brandColors.length) {
      for (const m of line.matchAll(COLOR_RE)) {
        const rgb = parseColor(m[0]);
        if (!rgb) continue;
        for (const bc of brandColors) {
          const d = dist(rgb, bc.rgb);
          if (d <= tolerance) {
            findings.push({ file: rel, line: i + 1, kind: "color", match: `${m[0]} ≈ ${bc.raw} (Δ${d.toFixed(1)})`, text: line.trim().slice(0, 160) });
            break;
          }
        }
      }
    }
  });
}

if (asJson) {
  console.log(JSON.stringify({ ok: findings.length === 0, findings }, null, 2));
} else if (findings.length === 0) {
  console.log(`brand-guard: PASS — no blocklisted names, terms or colors (tolerance Δ${tolerance}) found.`);
} else {
  console.log(`brand-guard: FAIL — ${findings.length} finding(s). Deploy is blocked.\n`);
  for (const f of findings) {
    console.log(`  ${f.file}:${f.line}  [${f.kind}] ${f.match}`);
    console.log(`      ${f.text}`);
  }
  console.log("\nRemove or replace each one (see replica/design.md), then rerun.");
}
process.exit(findings.length === 0 ? 0 : 1);
