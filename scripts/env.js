// Loads variables from the .env file in the project folder (used by the test scripts).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
export const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
export function loadEnv() {
  const file = path.join(root, ".env");
  if (!fs.existsSync(file)) return false;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m || line.trim().startsWith("#")) continue;
    if (process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, "$2");
  }
  return true;
}
