import test from "node:test";
import assert from "node:assert/strict";
import { mkReq, mkRes } from "./_helpers.mjs";
import { guardRequest, clientIp } from "../api/_guard.js";

const run = (req) => { const res = mkRes(); const rejected = guardRequest(req, res, { maxBytes: 1000 }); return { rejected, res }; };

test("a normal same-origin JSON request passes", () => {
  assert.equal(run(mkReq({ headers: { origin: "https://site.test".replace("https", "http"), "sec-fetch-site": "same-origin" } })).rejected, false);
  assert.equal(run(mkReq()).rejected, false); // no Origin header (server-to-server tools)
});
test("requests from another website are refused (Sec-Fetch-Site)", () => {
  const { rejected, res } = run(mkReq({ headers: { "sec-fetch-site": "cross-site" } }));
  assert.equal(rejected, true); assert.equal(res.code, 403);
});
test("requests whose Origin is a different host are refused", () => {
  const { res } = run(mkReq({ headers: { origin: "https://evil.example" } }));
  assert.equal(res.code, 403);
  assert.equal(run(mkReq({ headers: { origin: "null" } })).res.code, 403);
});
test("ALLOWED_ORIGIN must match exactly when set", () => {
  process.env.ALLOWED_ORIGIN = "http://other.test";
  assert.equal(run(mkReq({ headers: { origin: "http://site.test" } })).res.code, 403);
  process.env.ALLOWED_ORIGIN = "http://site.test/";
  assert.equal(run(mkReq({ headers: { origin: "http://site.test" } })).rejected, false);
  delete process.env.ALLOWED_ORIGIN;
});
test("only JSON bodies are accepted (text/plain would skip the browser preflight)", () => {
  assert.equal(run(mkReq({ headers: { "content-type": "text/plain" } })).res.code, 415);
  assert.equal(run(mkReq({ headers: { "content-type": "" } })).res.code, 415);
  assert.equal(run(mkReq({ headers: { "content-type": "application/json; charset=utf-8" } })).rejected, false);
});
test("oversized bodies are refused", () => {
  assert.equal(run(mkReq({ headers: { "content-length": "5000" } })).res.code, 413);
  assert.equal(run(mkReq({ headers: { "content-length": "900" } })).rejected, false);
});
test("client IP ignores a faked X-Forwarded-For unless TRUST_PROXY=1", () => {
  const prev = { v: process.env.VERCEL, t: process.env.TRUST_PROXY };
  delete process.env.VERCEL; delete process.env.TRUST_PROXY;
  const req = mkReq({ ip: "5.5.5.5", headers: { "x-forwarded-for": "1.1.1.1", "x-vercel-forwarded-for": "2.2.2.2" } });
  assert.equal(clientIp(req), "5.5.5.5");
  process.env.TRUST_PROXY = "1"; assert.equal(clientIp(req), "1.1.1.1");
  delete process.env.TRUST_PROXY; process.env.VERCEL = "1"; assert.equal(clientIp(req), "2.2.2.2");
  if (prev.v === undefined) delete process.env.VERCEL; else process.env.VERCEL = prev.v;
  if (prev.t !== undefined) process.env.TRUST_PROXY = prev.t;
});
