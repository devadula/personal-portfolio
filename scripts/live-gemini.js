// Real Gemini test. Run: npm run test:gemini
// Shows which models your key can use and which one answers. Never prints your key.
import { loadEnv } from "./env.js";
import { GoogleGenAI } from "@google/genai";

if (!loadEnv())
  console.log(
    "No .env file found. Create it first (copy .env.example to .env).",
  );
const key = process.env.GEMINI_API_KEY;
if (!key) {
  console.log(
    "FAIL: GEMINI_API_KEY is empty. Paste your key after GEMINI_API_KEY= in .env",
  );
  process.exit(1);
}
console.log(`Key found (${key.length} characters).`);
const ai = new GoogleGenAI({ apiKey: key });
const clean = (e) =>
  String(e?.message || e)
    .replace(/AIza[0-9A-Za-z_\-]{20,}/g, "[key]")
    .replace(/\s+/g, " ")
    .slice(0, 400);

try {
  const names = [];
  for await (const m of await ai.models.list()) {
    if (
      /gemini/i.test(m.name) &&
      (!m.supportedActions || m.supportedActions.includes("generateContent"))
    )
      names.push(m.name.replace(/^models\//, ""));
  }
  console.log(
    `\nModels your key can use for chat (${names.length}):\n  ` +
      (names.slice(0, 40).join("\n  ") || "(none listed)"),
  );
} catch (e) {
  console.log("\nCould not list models:", clean(e));
}

const tried = [
  ...new Set(
    [
      process.env.GEMINI_MODEL?.trim(),
      "gemini-3.5-flash-lite",
      "gemini-3.1-flash-lite",
      "gemini-3.5-flash",
      "gemini-3.6-flash",
      "gemini-3.7-flash",
      "gemini-2.5-flash",
    ].filter(Boolean),
  ),
];
console.log(
  "\nSending a real question to each model (shows how fast the first words appear)...",
);
const good = [];
for (const model of tried) {
  const levels = /^gemini-3/.test(model) ? ["MINIMAL", "LOW", null] : [null];
  let shown = false;
  for (const level of levels) {
    const config = { maxOutputTokens: 800 };
    if (level) config.thinkingConfig = { thinkingLevel: level };
    const t0 = Date.now();
    try {
      let first = null,
        text = "";
      const stream = await ai.models.generateContentStream({
        model,
        contents: "Reply with one short friendly sentence saying hello.",
        config,
      });
      await Promise.race([
        (async () => {
          for await (const c of stream) {
            if (c.text && first === null) first = Date.now() - t0;
            text += c.text || "";
          }
        })(),
        new Promise((_, rej) =>
          setTimeout(() => rej(new Error("no answer after 30 seconds")), 30000),
        ),
      ]);
      if (!text.trim()) throw new Error("empty answer");
      console.log(
        `PASS  ${model}${level ? " (thinking " + level + ")" : ""}  first words after ${(first / 1000).toFixed(1)}s, complete after ${((Date.now() - t0) / 1000).toFixed(1)}s`,
      );
      good.push({ model, ms: first });
      shown = true;
      break;
    } catch (e) {
      const msg = clean(e);
      if (/thinking/i.test(msg) && level !== null) continue; // this model does not accept that level, try the next one
      console.log(`FAIL  ${model}: ${msg}`);
      shown = true;
      const low = msg.toLowerCase();
      if (
        low.includes("api key not valid") ||
        low.includes("api_key_invalid") ||
        low.includes("permission_denied")
      ) {
        console.log(
          "\nYour API key was rejected. Create a new key at https://aistudio.google.com/apikey and paste it into .env.",
        );
        process.exit(1);
      }
      break;
    }
  }
  if (!shown) console.log(`FAIL  ${model}: thinking settings were rejected`);
}
if (!good.length) {
  console.log(
    "\nNo model worked. Read the messages above, or pick a model from the list and set GEMINI_MODEL in .env.",
  );
  process.exit(1);
}
good.sort((a, b) => a.ms - b.ms);
console.log(
  `\nYour chatbot will work. Fastest model for your key: ${good[0].model} (first words after ${(good[0].ms / 1000).toFixed(1)}s).`,
);
console.log(
  `To use it, put  GEMINI_MODEL=${good[0].model}  in .env (optional; the app also picks a working model itself).`,
);
process.exit(0);
