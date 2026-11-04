// Local development server: serves the site and runs the /api functions.
// Reads secrets from .env (never served to the browser). Usage: npm run dev
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));

// Development mode: API errors include real details so problems are easy to find (never set this in production).
process.env.DEV_MODE = "1";

// Tiny .env loader (works on every Node version >= 18)
const envFile = path.join(root, ".env");
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m || line.trim().startsWith("#")) continue;
    const val = m[2].replace(/^(['"])(.*)\1$/, "$2");
    if (process.env[m[1]] === undefined) process.env[m[1]] = val;
  }
} else {
  console.warn('Warning: no .env file found. Copy ".env.example" to ".env" and add your keys.');
}

// Only these files are ever served, so .env, package.json and source files stay private.
const STATIC = {
  "/": ["index.html", "text/html; charset=utf-8"],
  "/index.html": ["index.html", "text/html; charset=utf-8"],
  "/site.js": ["site.js", "text/javascript; charset=utf-8"],
  "/chat-widget.js": ["chat-widget.js", "text/javascript; charset=utf-8"],
  "/robots.txt": ["robots.txt", "text/plain; charset=utf-8"],
  "/sitemap.xml": ["sitemap.xml", "application/xml; charset=utf-8"],
  "/og-image.png": ["og-image.png", "image/png"],
  "/Durgajanesh_Devadula_Resume.pdf": ["Durgajanesh_Devadula_Resume.pdf", "application/pdf"],
};
const API = { "/api/chat": "api/chat.js", "/api/contact": "api/contact.js", "/api/health": "api/health.js" };

// Same security headers as production (from vercel.json), so problems show up locally.
const vercel = JSON.parse(fs.readFileSync(path.join(root, "vercel.json"), "utf8"));
const GLOBAL_HEADERS = ((vercel.headers || []).find((h) => h.source === "/(.*)") || {}).headers || [];
const MAX_BODY = 100000;

function readBody(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (c) => { data += c; if (data.length > MAX_BODY) { req.destroy(); resolve(null); } });
    req.on("end", () => { try { resolve(JSON.parse(data)); } catch { resolve(data); } });
    req.on("error", () => resolve(""));
  });
}

const server = http.createServer(async (req, res) => {
  for (const { key, value } of GLOBAL_HEADERS) res.setHeader(key, value);
  const url = new URL(req.url, "http://localhost");
  const route = url.pathname;

  if (API[route]) {
    res.status = (c) => { res.statusCode = c; return res; };
    res.json = (o) => { res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(o)); };
    try {
      if (Number(req.headers["content-length"]) > MAX_BODY) {
        res.setHeader("Connection", "close"); // answer first, then drop the rest of the upload
        return res.status(413).json({ error: "Request too large.", code: "too_large" });
      }
      req.body = req.method === "POST" ? await readBody(req) : undefined;
      if (req.body === null) return res.status(413).json({ error: "Request too large.", code: "too_large" });
      const mod = await import(pathToFileURL(path.join(root, API[route])).href);
      await mod.default(req, res);
    } catch (err) {
      console.error("API error:", err.message);
      if (!res.headersSent) res.status(500).json({ error: "Server error." });
    }
    return;
  }

  const file = STATIC[route];
  if (file && (req.method === "GET" || req.method === "HEAD")) {
    res.setHeader("Content-Type", file[1]);
    if (file[0].endsWith(".pdf"))
      res.setHeader("Content-Disposition", 'attachment; filename="Durgajanesh_Devadula_Resume.pdf"');
    return fs.createReadStream(path.join(root, file[0])).on("error", () => { res.statusCode = 404; res.end("Not found"); }).pipe(res);
  }

  res.statusCode = 404;
  res.end("Not found");
});

const port = Number(process.env.PORT) || 3000;
server.listen(port, () => {
  const on = (k) => (process.env[k] ? "set" : "MISSING");
  console.log(`\nPortfolio running at http://localhost:${port}`);
  console.log(`GEMINI_API_KEY: ${on("GEMINI_API_KEY")} | RESEND_API_KEY: ${on("RESEND_API_KEY")} | CONTACT_EMAIL: ${on("CONTACT_EMAIL")}\n`);
});
