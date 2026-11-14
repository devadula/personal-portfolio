import { readFileSync } from "node:fs";

const path = process.argv[2];
const want = (process.argv[3] || "").split(",").filter(Boolean);
const report = JSON.parse(readFileSync(path, "utf8"));

const list = report.checks || report.results || [];
const rows = Array.isArray(list) ? list : Object.values(list);

for (const row of rows) {
  const name = row.name || row.check || row.id || "";
  const status = row.status || row.result || row.outcome || "";
  if (want.length && !want.includes(name)) continue;
  if (want.length === 0 && !/fail|warn/i.test(String(status))) continue;
  const detail =
    row.detail || row.message || row.text || row.note || row.reason || "";
  console.log(`\n### ${name} — ${String(status).toUpperCase()}`);
  if (Array.isArray(detail)) detail.forEach((d) => console.log(`  - ${typeof d === "string" ? d : JSON.stringify(d)}`));
  else console.log(`  ${typeof detail === "string" ? detail : JSON.stringify(detail)}`);
  if (row.viewport || row.width) console.log(`  viewport: ${row.viewport || row.width}`);
  if (row.element) console.log(`  element: ${JSON.stringify(row.element)}`);
  if (row.evidence) console.log(`  evidence: ${JSON.stringify(row.evidence).slice(0, 400)}`);
}
