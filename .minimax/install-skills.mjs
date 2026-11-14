// One-off installer: copies a skill package into the MCode project skill root.
// Source: a local clone of an upstream repository (Impeccable: Apache-2.0; Taste Skill: MIT).
// Usage: node .minimax/install-skills.mjs <source-skill-dir> <target-skill-name>
import fs from "node:fs";
import path from "node:path";

const [src, name] = process.argv.slice(2);
if (!src || !name || !fs.existsSync(src)) {
  console.error("Usage: node .minimax/install-skills.mjs <source-dir> <target-name>");
  process.exit(1);
}

const dst = path.join(process.cwd(), ".minimax", "skills", name);
fs.rmSync(dst, { recursive: true, force: true });
fs.mkdirSync(dst, { recursive: true });

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

walk(src);
console.log(`Installed ${copied} files into ${dst}`);
