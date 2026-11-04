import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { limit } from "../api/_ratelimit.js";

test("memory limiter counts and blocks after the maximum", async () => {
  const k = "t:" + Math.random();
  const r = [];
  for (let i = 0; i < 4; i++) r.push((await limit(k, 3, 60)).allowed);
  assert.deepEqual(r, [true, true, true, false]);
});
test("shared Redis limiter sends INCR + EXPIRE NX with the token, and falls back to memory when Redis is down", async () => {
  const seen = []; let n = 0;
  const srv = http.createServer((req, res) => { let d = ""; req.on("data", (c) => (d += c)); req.on("end", () => { seen.push({ url: req.url, auth: req.headers.authorization, cmds: JSON.parse(d) }); res.setHeader("content-type", "application/json"); res.end(JSON.stringify([{ result: ++n }, { result: 1 }])); }); });
  await new Promise((r) => srv.listen(0, r));
  process.env.UPSTASH_REDIS_REST_URL = `http://127.0.0.1:${srv.address().port}`; process.env.UPSTASH_REDIS_REST_TOKEN = "TOK";
  const a = await limit("shared", 1, 60), b = await limit("shared", 1, 60);
  assert.equal(a.allowed, true); assert.equal(b.allowed, false);
  assert.equal(seen[0].url, "/pipeline"); assert.equal(seen[0].auth, "Bearer TOK");
  assert.deepEqual(seen[0].cmds[0], ["INCR", "portfolio:shared"]); assert.deepEqual(seen[0].cmds[1], ["EXPIRE", "portfolio:shared", 60, "NX"]);
  srv.closeAllConnections?.(); await new Promise((r) => srv.close(r));
  const c = await limit("after-outage", 5, 60); // must not throw
  assert.equal(c.allowed, true);
  delete process.env.UPSTASH_REDIS_REST_URL; delete process.env.UPSTASH_REDIS_REST_TOKEN;
});
