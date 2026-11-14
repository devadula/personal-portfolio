// One-off helper: print slices of the Taste consistency checker so fixes can
// target the real criterion instead of guessing.
import fs from "node:fs";

const src = fs.readFileSync(".minimax/skills/design-taste-frontend/scripts/consistency.mjs", "utf8");
const needles = process.argv.slice(2);
const before = Number(process.env.PEEK_BEFORE || 300);
const after = Number(process.env.PEEK_AFTER || 1200);

for (const needle of needles) {
  const i = src.indexOf(needle);
  if (i < 0) {
    console.log(`===== ${needle} NOT FOUND =====`);
    continue;
  }
  console.log(`===== ${needle} @${i} =====`);
  console.log(src.slice(Math.max(0, i - before), i + after));
  console.log("");
}
