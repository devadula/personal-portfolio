import { GoogleGenAI } from "@google/generative-ai"; // Fixed SDK package name
import { KNOWLEDGE } from "./_knowledge.js";
import { limit, today } from "./_ratelimit.js";
import { guardRequest, clientIp, logEvent } from "./_guard.js";

// Development mode (npm run dev / vercel dev) returns the real error details; production never does.
// Detailed error text is shown only in development, and never on a production deployment.
const DEV =
  process.env.VERCEL_ENV !== "production" &&
  (process.env.DEV_MODE === "1" || process.env.VERCEL_ENV === "development");
const MAX_PER_MIN = Number(process.env.RATE_LIMIT_PER_MIN) || 12; // per visitor per minute
const PER_IP_DAILY = Number(process.env.CHAT_PER_IP_DAILY) || 60; // per visitor per day
const DAILY_LIMIT = Number(process.env.CHAT_DAILY_LIMIT) || 400; // whole site per day (protects your Gemini quota)
const ATTEMPT_TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS) || 20000; // wait for the first words, per model
const TOTAL_BUDGET_MS = Number(process.env.GEMINI_TOTAL_MS) || 40000; // all attempts together

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
let workingModel = null; // remembered after the first success (per server instance)
const deadModels = new Set();

const SYSTEM = `You are the assistant on Durgajanesh Devadula's portfolio website.
Answer using ONLY the portfolio facts below. Be friendly, professional and natural; keep answers brief (under 90 words). You may use simple Markdown (bold, short bullet lists). Encourage recruiters, clients and collaborators to explore the portfolio or use the inquiry form.
Never invent skills, projects, clients, experience, prices, delivery dates or links.
If the answer is not in the facts, politely say that information is not currently available and point to the Contact section.
Do not promise availability dates or pricing; scope, budget and timeline are discussed through the inquiry form.
If asked something unrelated to the portfolio, answer in one short sentence at most, then guide the visitor back to the portfolio.
Durgajanesh is looking for freelance and project work, not internships.

PORTFOLIO FACTS:
${KNOWLEDGE}`;

// Visitor messages are limited to 500 characters. The assistant's own earlier answers are sent back as
// history and are longer, so they are allowed up to 4000 characters (anything longer is shortened).
function parseMessages(body) {
  let data = body;
  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch {
      return { error: "Request body is not valid JSON" };
    }
  }
  const msgs = data && data.messages;
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
    .replace(/AIza[0-9A-Za-z_\-]{20,}/g, "[key]")
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
  return Promise.race([promise, timeout]).finally(() => clearTimeout(t));
}

const toContents = (messages) =>
  messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

// Gemini 3 models "think" before answering. For portfolio questions the minimum thinking level is plenty and much faster.
// If a model does not accept a level, the next one is tried (and finally none).
const levelsFor = (model) =>
  /^gemini-3/.test(model) ? ["MINIMAL", "LOW", null] : [null];
const isThinkingError = (err) =>
  classify(err) === "other" && /thinking/i.test(String(err?.message || ""));

// Modified: Build config for the generateContent parameters, ensuring systemInstruction is separate.
function buildParams(level, messages) {
  const params = {
    contents: toContents(messages),
    generationConfig: { maxOutputTokens: 800 },
    systemInstruction: SYSTEM,
  };
  if (level) {
    params.generationConfig.thinkingConfig = { thinkingLevel: level };
  }
  return params;
}

// Streams the answer to the browser word by word, so the visitor sees text almost immediately.
async function streamOut(modelRef, messages, level, ms, res) {
  const deadline = Date.now() + ms;
  const params = buildParams(level, messages);
  const gen = await withTimeout(
    modelRef.generateContentStream(params), // Correct parameter passing
    ms,
  );

  let started = false;
  try {
    for await (const chunk of gen.stream) {
      // Corrected streaming iteration
      const wait = started ? 60000 : Math.max(1000, deadline - Date.now());
      // Iteration already manages timeout/completion implicitly with stream and withTimeout.
      // Keeping this section mostly for value extraction consistency.
      const piece = chunk.text(); // Corrected value extraction
      if (!piece) continue;
      if (!started) {
        res.statusCode = 200;
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.setHeader("X-Accel-Buffering", "no");
        started = true;
      }
      res.write(piece);
    }
  } catch (err) {
    if (started) {
      res.write("\n\n(The answer was interrupted. Please ask again.)");
      res.end();
      return { streamed: true };
    }
    throw err;
  }
  if (!started)
    throw new Error(
      "Gemini returned no text (the answer may have been blocked)",
    );
  res.end();
  return { streamed: true };
}

async function generate(ai, model, messages, ms, res, stream) {
  const modelRef = ai.getGenerativeModel({ model }); // Must get model reference
  let lastErr;
  for (const level of levelsFor(model)) {
    try {
      if (stream) return await streamOut(modelRef, messages, level, ms, res);

      const params = buildParams(level, messages);
      const r = await withTimeout(
        modelRef.generateContent(params), // Correct parameter passing
        ms,
      );
      const result = await r;
      const response = await result.response;
      const text = (response.text() || "").trim(); // Correct value extraction
      if (!text)
        throw new Error(
          "Gemini returned no text (the answer may have been blocked)",
        );
      return { text };
    } catch (err) {
      lastErr = err;
      if (res?.headersSent || !isThinkingError(err)) throw err;
    }
  }
  throw lastErr;
}

export default async function handler(req, res) {
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

  // Abuse protection (checked only for valid requests): per visitor per minute, per visitor per day, whole site per day.
  const ip = clientIp(req);
  const day = today();
  if (!(await limit(`chat:min:${ip}`, MAX_PER_MIN, 60)).allowed) {
    logEvent("rate_limited", req, { scope: "visitor_minute" });
    return res.status(429).json({
      error: "Too many messages. Please wait a minute.",
      code: "rate_limit",
    });
  }
  if (!(await limit(`chat:ipday:${day}:${ip}`, PER_IP_DAILY, 90000)).allowed) {
    logEvent("rate_limited", req, { scope: "visitor_day" });
    return res
      .status(429)
      .json({ error: "Daily message limit reached.", code: "visitor_limit" });
  }
  if (!(await limit(`chat:day:${day}`, DAILY_LIMIT, 90000)).allowed) {
    logEvent("rate_limited", req, { scope: "site_day" });
    return res.status(429).json({
      error: "The assistant reached its limit for today.",
      code: "daily_limit",
    });
  }

  const preferred = (process.env.GEMINI_MODEL || "").trim();
  const candidates = [
    ...new Set([workingModel, preferred, ...FALLBACK_MODELS].filter(Boolean)),
  ].filter((m) => !deadModels.has(m));

  const ai = new GoogleGenAI(apiKey); // Fixed SDK Initialization
  const started = Date.now();
  let lastErr = null,
    lastCode = "model",
    lastModel = "",
    tries = 0;
  for (const model of candidates) {
    const left = TOTAL_BUDGET_MS - (Date.now() - started);
    if (tries >= 6 || left < 3000) break;
    tries++;
    lastModel = model;
    try {
      const out = await generate(
        ai,
        model,
        messages,
        Math.min(ATTEMPT_TIMEOUT_MS, left),
        res,
        stream,
      );
      workingModel = model;
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
      // A wrong key will fail on every model, so stop. A timeout or missing model moves on to the next model.
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
