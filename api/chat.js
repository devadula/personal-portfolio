import { GoogleGenAI } from "@google/genai";
import { KNOWLEDGE } from "./_knowledge.js";
import { limit, today } from "./_ratelimit.js";
import { guardRequest, clientIp, logEvent } from "./_guard.js";

// ---------------------------------------------------------------------------------------------------------------------
// Settings (all optional environment variables; names unchanged)
// ---------------------------------------------------------------------------------------------------------------------
// Detailed error text is shown only in development, and never on a production deployment.
const DEV =
  process.env.VERCEL_ENV !== "production" &&
  (process.env.DEV_MODE === "1" || process.env.VERCEL_ENV === "development");
const MAX_PER_MIN = Number(process.env.RATE_LIMIT_PER_MIN) || 12; // per visitor per minute
const PER_IP_DAILY = Number(process.env.CHAT_PER_IP_DAILY) || 60; // per visitor per day
const DAILY_LIMIT = Number(process.env.CHAT_DAILY_LIMIT) || 400; // whole site per day (protects your Gemini quota)
const ATTEMPT_TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS) || 15000; // wait for the FIRST words, per model
const TOTAL_BUDGET_MS = Number(process.env.GEMINI_TOTAL_MS) || 40000; // all model attempts together
const STREAM_IDLE_MS = 15000; // once words are flowing, the longest allowed pause between two pieces
const HISTORY_KEEP = 6; // conversation messages sent to Gemini (the newest ones)
const HISTORY_ASSISTANT_CHARS = 700; // earlier answers are shortened to this length (answers are under ~90 words)
const CACHE_TTL_MS = 10 * 60 * 1000; // identical first questions are answered from memory for 10 minutes
const CACHE_MAX = 100;

// If GEMINI_MODEL is set it is tried first. Otherwise the models below are tried in order, fastest first.
// A model Google reports as not found is skipped and remembered, so a retired name costs almost no time.
const FALLBACK_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-3.5-flash",
  "gemini-3.6-flash",
  "gemini-3.7-flash",
  "gemini-2.5-flash",
];

// Remembered per server instance, so later requests skip work that already failed once.
let workingModel = null;
const deadModels = new Set(); // models Google reported as not found
const levelByModel = new Map(); // model -> thinking level that worked (or null for "none")
const answerCache = new Map(); // normalised first question -> { text, exp }
let client = null;
let clientKey = null;

const SYSTEM = `You are the assistant on Durgajanesh Devadula's portfolio website.
Answer using ONLY the portfolio facts below. Be friendly, professional and natural; keep answers brief (under 90 words). You may use simple Markdown (bold, short bullet lists). Point visitors to the portfolio sections or the enquiry form where that helps.
Never invent skills, projects, clients, experience, prices, delivery dates, metrics or links. If a fact is not in the list below, say it is not documented here and point to the Contact section.
Do not promise availability dates or pricing; scope, budget and timeline are discussed through the enquiry form.
If asked something unrelated to the portfolio, answer in one short sentence at most, then guide the visitor back to the portfolio.
Describe the artificial-intelligence and machine-learning work as foundation level when the level of a project is relevant.
Durgajanesh is looking for freelance and project-based work, not internships.

PORTFOLIO FACTS:
${KNOWLEDGE}`;

// ---------------------------------------------------------------------------------------------------------------------
// Request parsing
// ---------------------------------------------------------------------------------------------------------------------
// Visitor messages are limited to 500 characters. The assistant's own earlier answers are sent back as history and are
// longer, so they are allowed up to 4000 characters here (they are shortened again before they reach Gemini).
function parseMessages(body) {
  let data = body;
  if (Buffer.isBuffer(data)) data = data.toString("utf8");
  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch {
      return { error: "Request body is not valid JSON" };
    }
  }
  if (!data || typeof data !== "object")
    return { error: "Request body must be a JSON object" };
  const msgs = data.messages;
  if (!Array.isArray(msgs) || msgs.length < 1 || msgs.length > 12)
    return { error: "messages must be a list of 1 to 12 items" };
  const clean = [];
  for (const m of msgs) {
    if (!m || (m.role !== "user" && m.role !== "assistant"))
      return { error: "each message needs role user or assistant" };
    if (typeof m.content !== "string")
      return { error: "message content must be text" };
    let content = m.content.trim();
    if (!content) return { error: "a message is empty" };
    if (m.role === "user" && content.length > 500)
      return { error: "a visitor message is longer than 500 characters" };
    if (m.role === "assistant") content = content.slice(0, 4000);
    clean.push({ role: m.role, content });
  }
  if (clean[clean.length - 1].role !== "user")
    return { error: "the last message must be from the visitor" };
  return { messages: clean, stream: data.stream === true };
}

// Keeps the newest messages (always starting with a visitor message) and shortens old answers.
// Smaller context = fewer tokens = a faster first word and a lower chance of hitting size limits.
function trimHistory(messages) {
  let kept = messages.slice(-HISTORY_KEEP);
  while (kept.length > 1 && kept[0].role !== "user") kept = kept.slice(1);
  return kept.map((m) =>
    m.role === "assistant" && m.content.length > HISTORY_ASSISTANT_CHARS
      ? { ...m, content: m.content.slice(0, HISTORY_ASSISTANT_CHARS) + "…" }
      : m,
  );
}

const toContents = (messages) =>
  messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

// ---------------------------------------------------------------------------------------------------------------------
// Answer cache (only for a conversation's very first question, e.g. the suggestion buttons)
// ---------------------------------------------------------------------------------------------------------------------
const cacheKeyFor = (msg) =>
  msg.content.toLowerCase().replace(/\s+/g, " ").trim();
function cacheGet(key) {
  const e = answerCache.get(key);
  if (!e) return null;
  if (e.exp < Date.now()) {
    answerCache.delete(key);
    return null;
  }
  return e.text;
}
function cacheSet(key, text) {
  if (!key || !text) return;
  answerCache.delete(key);
  answerCache.set(key, { text, exp: Date.now() + CACHE_TTL_MS });
  while (answerCache.size > CACHE_MAX)
    answerCache.delete(answerCache.keys().next().value);
}

// ---------------------------------------------------------------------------------------------------------------------
// Errors and timeouts
// ---------------------------------------------------------------------------------------------------------------------
function classify(err) {
  const status = Number(err?.status) || 0;
  const m = String(err?.message || err || "").toLowerCase();
  if (err?.code === "TIMEOUT") return "timeout";
  if (
    status === 401 ||
    m.includes("api key not valid") ||
    m.includes("api_key_invalid") ||
    m.includes("api key expired")
  )
    return "bad_key";
  if (status === 403 || m.includes("permission_denied")) return "permission";
  if (
    status === 404 ||
    m.includes("is not found") ||
    m.includes("no longer available") ||
    m.includes("not supported for generatecontent")
  )
    return "model";
  if (status === 429 || m.includes("resource_exhausted") || m.includes("quota"))
    return "quota";
  return "other";
}

const safeDetail = (err) =>
  String(err?.message || err || "unknown error")
    .replace(/AIza[0-9A-Za-z_-]{20,}/g, "[key]")
    .replace(/\s+/g, " ")
    .slice(0, 300);

function withTimeout(promise, ms) {
  let t;
  const timeout = new Promise((_, rej) => {
    t = setTimeout(
      () =>
        rej(
          Object.assign(new Error(`Timed out after ${ms} ms`), {
            code: "TIMEOUT",
          }),
        ),
      ms,
    );
  });
  // Promise.race subscribes to both promises, so a late failure of the slower one never becomes an unhandled rejection.
  return Promise.race([promise, timeout]).finally(() => clearTimeout(t));
}

// ---------------------------------------------------------------------------------------------------------------------
// Talking to Gemini
// ---------------------------------------------------------------------------------------------------------------------
// One client for the whole server instance (connection and setup are reused between requests).
function getClient(apiKey) {
  if (!client || clientKey !== apiKey) {
    client = new GoogleGenAI({ apiKey });
    clientKey = apiKey;
  }
  return client;
}

// Gemini 3 models "think" before answering. For portfolio questions the minimum thinking level is plenty and much
// faster. If a model does not accept a level, the next one is tried (and finally none); the level that works is
// remembered so later requests do not repeat the failed attempt.
const levelsFor = (model) =>
  /^gemini-3/.test(model) ? ["MINIMAL", "LOW", null] : [null];
const isThinkingError = (err) =>
  classify(err) === "other" && /thinking/i.test(String(err?.message || ""));

function buildConfig(level) {
  const config = { systemInstruction: SYSTEM, maxOutputTokens: 800 };
  if (level) config.thinkingConfig = { thinkingLevel: level };
  return config;
}

const closeQuietly = (it) => {
  try {
    Promise.resolve(it.return?.()).catch(() => {}); // not awaited: closing must never block the request
  } catch {
    /* ignore */
  }
};

// Streams the answer to the browser piece by piece, so the visitor sees text almost immediately.
async function streamOut(ai, model, messages, config, ms, res, ctx) {
  const deadline = Date.now() + ms;
  const gen = await withTimeout(
    ai.models.generateContentStream({
      model,
      contents: toContents(messages),
      config,
    }),
    ms,
  );
  const it = gen[Symbol.asyncIterator]();
  let started = false;
  let text = "";
  try {
    for (;;) {
      if (ctx.clientGone) {
        closeQuietly(it); // the visitor left: stop paying for words nobody reads
        return { streamed: true, text, complete: false };
      }
      const wait = started
        ? STREAM_IDLE_MS
        : Math.max(1000, deadline - Date.now()); // first words / pause between pieces
      const { value, done } = await withTimeout(it.next(), wait);
      if (done) break;
      const piece = value?.text || "";
      if (!piece) continue;
      if (!started) {
        res.statusCode = 200;
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.setHeader("X-Accel-Buffering", "no");
        started = true;
      }
      text += piece;
      res.write(piece);
    }
  } catch (err) {
    closeQuietly(it);
    if (started) {
      res.write("\n\n(The answer was interrupted. Please ask again.)");
      res.end();
      return { streamed: true, text, complete: false };
    }
    throw err;
  }
  if (!started)
    throw new Error(
      "Gemini returned no text (the answer may have been blocked)",
    );
  res.end();
  return { streamed: true, text, complete: true };
}

async function generate(ai, model, messages, ms, res, stream, ctx) {
  const all = levelsFor(model);
  const known = levelByModel.get(model);
  const levels =
    known === undefined ? all : [known, ...all.filter((l) => l !== known)];
  let lastErr;
  for (const level of levels) {
    try {
      const config = buildConfig(level);
      let out;
      if (stream) {
        out = await streamOut(ai, model, messages, config, ms, res, ctx);
      } else {
        const r = await withTimeout(
          ai.models.generateContent({
            model,
            contents: toContents(messages),
            config,
          }),
          ms,
        );
        const text = (r?.text || "").trim();
        if (!text)
          throw new Error(
            "Gemini returned no text (the answer may have been blocked)",
          );
        out = { text, complete: true };
      }
      levelByModel.set(model, level);
      return out;
    } catch (err) {
      lastErr = err;
      if (res.headersSent || !isThinkingError(err)) throw err;
    }
  }
  throw lastErr;
}

function sendCached(res, text, stream) {
  if (stream) {
    res.statusCode = 200;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end(text);
    return;
  }
  res.status(200).json({ reply: text, ...(DEV && { cached: true }) });
}

// ---------------------------------------------------------------------------------------------------------------------
// The request handler
// ---------------------------------------------------------------------------------------------------------------------
async function run(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed." });
  if (guardRequest(req, res, { maxBytes: 64000 })) return;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey)
    return res.status(500).json({
      error: "Chat is not configured.",
      code: "not_configured",
      ...(DEV && {
        detail:
          "GEMINI_API_KEY is missing. Add it to your .env file and restart npm run dev.",
      }),
    });

  const parsed = parseMessages(req.body);
  if (parsed.error)
    return res.status(400).json({
      error: "Invalid request.",
      code: "bad_request",
      ...(DEV && { detail: parsed.error }),
    });
  const { messages, stream } = parsed;

  // Abuse protection (valid requests only). The two per-visitor counters are independent, so they run together
  // (one network round trip instead of two when a shared Redis store is configured).
  const ip = clientIp(req);
  const day = today();
  const [perMinute, perDay] = await Promise.all([
    limit(`chat:min:${ip}`, MAX_PER_MIN, 60),
    limit(`chat:ipday:${day}:${ip}`, PER_IP_DAILY, 90000),
  ]);
  if (!perMinute.allowed) {
    logEvent("rate_limited", req, { scope: "visitor_minute" });
    return res.status(429).json({
      error: "Too many messages. Please wait a minute.",
      code: "rate_limit",
    });
  }
  if (!perDay.allowed) {
    logEvent("rate_limited", req, { scope: "visitor_day" });
    return res
      .status(429)
      .json({ error: "Daily message limit reached.", code: "visitor_limit" });
  }

  // A first question seen recently is answered from memory: no Gemini call, no waiting, no whole-site quota used.
  const cacheKey = messages.length === 1 ? cacheKeyFor(messages[0]) : null;
  const cached = cacheKey ? cacheGet(cacheKey) : null;
  if (cached) return sendCached(res, cached, stream);

  // The whole-site daily cap is checked after the per-visitor limits, so one blocked visitor cannot use up the site's allowance.
  if (!(await limit(`chat:day:${day}`, DAILY_LIMIT, 90000)).allowed) {
    logEvent("rate_limited", req, { scope: "site_day" });
    return res.status(429).json({
      error: "The assistant reached its limit for today.",
      code: "daily_limit",
    });
  }

  const history = trimHistory(messages);
  const preferred = (process.env.GEMINI_MODEL || "").trim();
  const candidates = [
    ...new Set([workingModel, preferred, ...FALLBACK_MODELS].filter(Boolean)),
  ].filter((m) => !deadModels.has(m));

  const ctx = { clientGone: false };
  res.on?.("close", () => {
    if (!res.writableFinished) ctx.clientGone = true;
  });

  const ai = getClient(apiKey);
  const started = Date.now();
  let lastErr = null;
  let lastCode = "model";
  let lastModel = "";
  let tries = 0;
  for (const model of candidates) {
    const left = TOTAL_BUDGET_MS - (Date.now() - started);
    if (tries >= 6 || left < 3000) break;
    tries++;
    lastModel = model;
    try {
      const out = await generate(
        ai,
        model,
        history,
        Math.min(ATTEMPT_TIMEOUT_MS, left),
        res,
        stream,
        ctx,
      );
      workingModel = model;
      if (out.complete) cacheSet(cacheKey, out.text);
      if (out.streamed) return;
      return res.status(200).json({ reply: out.text, ...(DEV && { model }) });
    } catch (err) {
      lastErr = err;
      lastCode = classify(err);
      console.error(
        `Gemini error [model ${model}] [${lastCode}] ${err?.status || ""}: ${safeDetail(err)}`,
      );
      if (lastCode === "model") deadModels.add(model);
      if (workingModel === model && lastCode !== "quota") workingModel = null;
      // A wrong key will fail on every model, so stop. A timeout, quota or missing model moves on to the next model.
      if (lastCode === "bad_key" || lastCode === "permission") break;
    }
  }

  const detail = lastErr
    ? `${lastModel}: ${safeDetail(lastErr)}`
    : "No usable Gemini model. Set GEMINI_MODEL to a model from your Google AI Studio list (run: npm run test:gemini).";
  return res.status(503).json({
    error: "The assistant is unavailable right now.",
    code: lastCode,
    ...(DEV && { detail }),
  });
}

// Safety net: whatever goes wrong, the visitor gets a controlled JSON answer (and the real error goes to the server log),
// never an uncontrolled platform error page.
export default async function handler(req, res) {
  try {
    return await run(req, res);
  } catch (err) {
    console.error("Unexpected chat error:", safeDetail(err));
    try {
      if (res.headersSent) return res.end();
      return res.status(500).json({
        error: "Server error.",
        code: "server_error",
        ...(DEV && { detail: safeDetail(err) }),
      });
    } catch {
      /* nothing more can be done */
    }
  }
}
