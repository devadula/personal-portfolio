import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const root = new URL("../", import.meta.url);
const read = (p) => fs.readFileSync(new URL(p, root), "utf8");
const headersFor = (src) => Object.fromEntries(JSON.parse(read("vercel.json")).headers.find((h) => h.source === src).headers.map((x) => [x.key, x.value]));

test("security headers are configured for every page", () => {
  const h = headersFor("/(.*)");
  for (const k of ["Content-Security-Policy", "Strict-Transport-Security", "X-Content-Type-Options", "X-Frame-Options", "Referrer-Policy", "Permissions-Policy", "Cross-Origin-Opener-Policy"]) assert.ok(h[k], k + " missing");
  const csp = h["Content-Security-Policy"];
  assert.match(csp, /default-src 'self'/); assert.match(csp, /frame-ancestors 'none'/); assert.match(csp, /object-src 'none'/);
  const script = csp.split(";").find((d) => d.trim().startsWith("script-src"));
  assert.ok(!/unsafe-inline|unsafe-eval/.test(script), "script-src must not allow inline or eval");
});
test("the page has no inline executable scripts or inline event handlers", () => {
  const html = read("index.html");
  assert.equal((html.match(/<script(?![^>]*\b(src=|type="application\/ld\+json"))[^>]*>/g) || []).length, 0);
  assert.equal((html.match(/\son[a-z]+\s*=\s*["']/gi) || []).length, 0);
});
test("the API folder contains exactly the expected files (no stray browser files)", () => {
  assert.deepEqual(fs.readdirSync(new URL("api/", root)).sort(), ["_guard.js", "_knowledge.js", "_ratelimit.js", "chat.js", "contact.js", "health.js"]);
});
test(".env is git-ignored and Vercel-ignored, and project files contain no key-like text", () => {
  assert.match(read(".gitignore"), /^\.env\s*$/m); assert.match(read(".vercelignore"), /^\.env\s*$/m);
  for (const f of ["index.html", "site.js", "chat-widget.js", "api/chat.js", "api/contact.js", ".env.example", "README.md"])
    assert.ok(!/AIza[0-9A-Za-z_-]{20,}|AQ\.[0-9A-Za-z_-]{20,}|\bre_[0-9A-Za-z]{20,}/.test(read(f)), "key-like text in " + f);
});
test("frontend files never mention the secret variable names", () => {
  for (const f of ["index.html", "site.js", "chat-widget.js"]) assert.ok(!/GEMINI_API_KEY|RESEND_API_KEY/.test(read(f)), f);
});
