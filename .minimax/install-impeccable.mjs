// One-off installer: copies the Impeccable skill package into the MCode project skill root.
// Source: a local clone of https://github.com/pbakaus/impeccable (Apache-2.0).
// Usage: node .minimax/install-impeccable.mjs <source-skill-dir>
import fs from "node:fs";
import path from "node:path";

const src = process.argv[2];
const dst = path.join(process.cwd(), ".minimax", "skills", "impeccable");

if (!src || !fs.existsSync(src)) {
  console.error("Source skill directory not found:", src);
  process.exit(1);
}

let copied = 0;
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const from = path.join(dir, entry.name);
    const to = path.join(dst, path.relative(src, from));
    if (entry.isDirectory()) {
      fs.mkdirSync(to, { recursive: true });
      walk(from);
    } else if (entry.isFile()) {
      fs.mkdirSync(path.dirname(to), { recursive: true });
      fs.copyFileSync(from, to);
      copied++;
    }
  }
}

fs.mkdirSync(dst, { recursive: true });
walk(src);
console.log(`Installed ${copied} files into ${dst}`);
