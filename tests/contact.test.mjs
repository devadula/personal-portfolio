import test from "node:test";
import assert from "node:assert/strict";
import { mkReq, call, nextIp } from "./_helpers.mjs";

Object.assign(process.env, { RESEND_API_KEY: "re_TEST", CONTACT_EMAIL: "owner@example.com", VERCEL_ENV: "production", RESEND_TIMEOUT_MS: "150", CONTACT_DAILY_LIMIT: "1000" });
delete process.env.DEV_MODE;
let responder = async () => ({ ok: true, status: 200, json: async () => ({ id: "mail-1" }) });
const calls = [];
globalThis.fetch = async (url, opts) => { calls.push({ url, opts, body: JSON.parse(opts.body) }); return responder(url, opts); };
const handler = (await import("../api/contact.js")).default;
const good = { name: "Ravi", email: "ravi@example.com", subject: "Website help", type: "Website Development", message: "I need a small business website soon.", website: "", elapsed: 5000 };
const post = (body, o = {}) => call(handler, mkReq({ body, ...o }));

test("valid enquiry is delivered to the owner only, with idempotency key and bearer token", async () => {
  calls.length = 0;
  const r = await post({ ...good, to: "attacker@evil.example", from: "x@evil.example", is_admin: true, role: "admin" });
  assert.equal(r.code, 200); assert.equal(r.body.ok, true);
  assert.deepEqual(calls[0].body.to, ["owner@example.com"]);
  assert.equal(calls[0].body.reply_to, "ravi@example.com");
  assert.ok(calls[0].opts.headers["Idempotency-Key"]); assert.equal(calls[0].opts.headers.Authorization, "Bearer re_TEST");
  assert.equal("is_admin" in calls[0].body, false);
});
test("HTML in the message is escaped in the email", async () => {
  calls.length = 0;
  await post({ ...good, message: "Hello <script>alert(1)</script> <img src=x onerror=1> thanks" });
  assert.ok(!/<script|<img/i.test(calls[0].body.html)); assert.ok(calls[0].body.html.includes("&lt;script&gt;"));
});
test("subject line breaks cannot inject email headers", async () => {
  calls.length = 0;
  await post({ ...good, subject: "Hi\r\nBcc: evil@x.com" });
  assert.ok(!/[\r\n]/.test(calls[0].body.subject));
});
test("production responses never contain technical details", async () => {
  responder = async () => ({ ok: false, status: 403, json: async () => ({ message: "SECRET PROVIDER DETAIL" }) });
  const r = await post(good);
  assert.equal(r.code, 502); assert.ok(!JSON.stringify(r.body).includes("SECRET")); assert.equal(r.body.ok, undefined);
});
test("empty / invalid input is rejected by the server", async () => {
  responder = async () => ({ ok: true, status: 200, json: async () => ({ id: "m" }) });
  calls.length = 0;
  for (const bad of [{}, { ...good, name: "  " }, { ...good, email: "" }, { ...good, email: "abc@" }, { ...good, message: "short" }]) assert.equal((await post(bad)).code, 400);
  assert.equal(calls.length, 0);
});
test("spam (honeypot) and too-fast submissions are refused and send nothing", async () => {
  calls.length = 0;
  assert.equal((await post({ ...good, website: "bot" })).code, 400);
  assert.equal((await post({ ...good, elapsed: 100 })).code, 400);
  assert.equal(calls.length, 0);
});
test("temporary provider error is retried once with the SAME idempotency key", async () => {
  calls.length = 0; let n = 0;
  responder = async () => (++n === 1 ? { ok: false, status: 503, json: async () => ({ message: "busy" }) } : { ok: true, status: 200, json: async () => ({ id: "m2" }) });
  const r = await post(good);
  assert.equal(r.code, 200); assert.equal(calls.length, 2);
  assert.equal(calls[0].opts.headers["Idempotency-Key"], calls[1].opts.headers["Idempotency-Key"]);
});
test("permanent provider error (4xx) is NOT retried", async () => {
  calls.length = 0; responder = async () => ({ ok: false, status: 422, json: async () => ({ message: "bad" }) });
  const r = await post(good); assert.equal(r.code, 502); assert.equal(calls.length, 1);
});
test("a stuck provider times out instead of hanging", async () => {
  calls.length = 0;
  responder = (url, opts) => new Promise((_, rej) => opts.signal.addEventListener("abort", () => rej(opts.signal.reason)));
  const keepAlive = setInterval(() => {}, 50); // a real network socket would keep the process alive; this stands in for it
  const t = Date.now(); const r = await post(good); clearInterval(keepAlive);
  assert.equal(r.code, 502); assert.ok(Date.now() - t < 3000, "should give up within a few seconds"); assert.equal(calls.length, 2);
});
test("other websites / wrong content type / oversize are blocked before anything is sent", async () => {
  responder = async () => ({ ok: true, status: 200, json: async () => ({ id: "m" }) }); calls.length = 0;
  assert.equal((await post(good, { headers: { "sec-fetch-site": "cross-site" } })).code, 403);
  assert.equal((await post(JSON.stringify(good), { headers: { "content-type": "text/plain" } })).code, 415);
  assert.equal((await post(good, { headers: { origin: "https://evil.example" } })).code, 403);
  assert.equal((await post(good, { headers: { "content-length": "99999" } })).code, 413);
  assert.equal(calls.length, 0);
});
test("each visitor is limited to 5 valid enquiries per 10 minutes; junk does not count", async () => {
  const ip = nextIp(); calls.length = 0;
  for (let i = 0; i < 10; i++) await post({ ...good, email: "bad" }, { ip });
  const codes = []; for (let i = 0; i < 6; i++) codes.push((await post(good, { ip })).code);
  assert.deepEqual(codes, [200, 200, 200, 200, 200, 429]);
});
test("only POST is accepted", async () => { assert.equal((await call(handler, mkReq({ method: "GET" }))).code, 405); });
