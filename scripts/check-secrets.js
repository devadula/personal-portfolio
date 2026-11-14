// Run before sharing or publishing:  npm run check:secrets
// Looks for key-like text inside your project files and checks that .env is not tracked by Git.
// It never prints a secret value.
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { root } from "./env.js";

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  ".vercel",
  ".minimax",
  ".taste-skill",
  ".impeccable",
]);
const SKIP_FILES = new Set([".env", "package-lock.json"]);
const PATTERNS = [
  [/AIza[0-9A-Za-z_-]{20,}/, "Google API key"],
  [/AQ\.[0-9A-Za-z_-]{20,}/, "Google AI Studio key"],
  [/\bre_[0-9A-Za-z]{20,}/, "Resend API key"],
  [/\bsk-[0-9A-Za-z]{20,}/, "secret key (sk-...)"],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, "private key"],
];

let problems = 0;
const bad = (msg) => { problems++; console.log("FAIL  " + msg); };

function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) { walk(full); continue; }
    if (SKIP_FILES.has(name) || st.size > 2_000_000) continue;
    if (/\.(png|jpe?g|gif|pdf|zip|ico|woff2?)$/i.test(name)) continue;
    let text;
    try {
      text = fs.readFileSync(full, "utf8");
    } catch {
      // A file another process is writing (a log, a cache) is not a secret.
      continue;
    }
    for (const [re, label] of PATTERNS)
      if (re.test(text)) bad(`${label} found in ${path.relative(root, full)} (value not shown)`);
  }
}
walk(root);

const gi = fs.existsSync(path.join(root, ".gitignore")) ? fs.readFileSync(path.join(root, ".gitignore"), "utf8") : "";
if (!/^\.env\s*$/m.test(gi)) bad(".gitignore does not list .env");

if (fs.existsSync(path.join(root, ".git"))) {
  const git = (c) => { try { return execSync(c, { cwd: root, stdio: ["ignore", "pipe", "ignore"] }).toString().trim(); } catch { return ""; } };
  if (git("git ls-files .env")) bad(".env is tracked by Git. Run: git rm --cached .env");
  if (git("git log --all --oneline -- .env"))
    bad(".env was committed in the past. Rotate every key in it and consider cleaning the Git history.");
} else {
  console.log("info  no .git folder here, so Git checks were skipped");
}

if (problems) { console.log(`\n${problems} problem(s) found. Fix them before sharing or deploying.`); process.exit(1); }
console.log("PASS  no key-like text in project files, .env is ignored by Git");
