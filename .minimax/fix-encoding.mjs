// One-off repair: files written through a Windows-1252 round trip came back as mojibake.
// Re-encode the text as windows-1252 bytes, then decode those bytes as UTF-8.
import fs from "node:fs";

const SPECIAL = {
  0x20ac: 0x80, 0x201a: 0x82, 0x0192: 0x83, 0x201e: 0x84, 0x2026: 0x85,
  0x2020: 0x86, 0x2021: 0x87, 0x02c6: 0x88, 0x2030: 0x89, 0x0160: 0x8a,
  0x2039: 0x8b, 0x0152: 0x8c, 0x017d: 0x8e, 0x2018: 0x91, 0x2019: 0x92,
  0x201c: 0x93, 0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97,
  0x02dc: 0x98, 0x2122: 0x99, 0x0161: 0x9a, 0x203a: 0x9b, 0x0153: 0x9c,
  0x017e: 0x9e, 0x0178: 0x9f,
};

for (const file of process.argv.slice(2)) {
  const text = fs.readFileSync(file, "utf8");
  const bytes = Buffer.from(
    Array.from(text, (ch) => {
      const code = ch.codePointAt(0);
      if (code <= 0xff) return code;
      if (SPECIAL[code]) return SPECIAL[code];
      return code;
    }),
  );
  const fixed = bytes.toString("utf8");
  if (fixed.includes("\uFFFD")) {
    console.error(`${file}: still has undecodable bytes, left untouched`);
    continue;
  }
  fs.writeFileSync(file, fixed, "utf8");
  console.log(`${file}: repaired`);
}
