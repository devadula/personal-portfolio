// Sends contact-form enquiries to your inbox through Resend. Credentials stay in env vars.
import { randomUUID } from "node:crypto";
import { limit, today } from "./_ratelimit.js";
import { guardRequest, clientIp, logEvent } from "./_guard.js";

const TYPES = ["Freelance Project", "Website Development", "AI/ML Project", "Collaboration", "Other"];
const MAX_PER_10_MIN = 5; // per visitor

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const oneLine = (s) => String(s).replace(/[\r\n]+/g, " ").trim();

function readBody(req) {
  let d = req.body;
  if (typeof d === "string") {
    try { d = JSON.parse(d); } catch { return null; }
  }
  return d && typeof d === "object" ? d : null;
}

function validate(d) {
  const str = (v) => (typeof v === "string" ? v.trim() : "");
  const data = {
    name: str(d.name), email: str(d.email), subject: oneLine(str(d.subject)),
    type: str(d.type), budget: oneLine(str(d.budget)), timeline: oneLine(str(d.timeline)),
    message: str(d.message),
  };
  const errors = {};
  if (!data.name) errors.name = "Please enter your name.";
  else if (data.name.length > 80) errors.name = "Name is too long (max 80 characters).";
  if (!data.email) errors.email = "Please enter your email address.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email) || data.email.length > 120)
    errors.email = "Please enter a valid email address.";
  if (!data.subject) errors.subject = "Please enter a subject.";
  else if (data.subject.length < 3 || data.subject.length > 120)
    errors.subject = "Subject must be 3 to 120 characters.";
  if (!data.message) errors.message = "Please enter your message.";
  else if (data.message.length < 15 || data.message.length > 2000)
    errors.message = "Message must be 15 to 2000 characters.";
  if (data.type && !TYPES.includes(data.type)) errors.type = "Invalid inquiry type.";
  if (data.budget.length > 120 || data.timeline.length > 120) errors.budget = "Budget or timeline is too long.";
  return { data, errors };
}

// Sends through Resend with a timeout and at most one retry (exponential backoff + jitter) for temporary problems only
// (network error, timeout, HTTP 429/5xx). The same Idempotency-Key is sent on both tries so a retry cannot create a duplicate email.
async function sendEmail(payload, idempotencyKey, timeoutMs) {
  const attempts = 2;
  let why = "unknown error";
  for (let i = 0; i < attempts; i++) {
    try {
      const signal =
        typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function"
          ? AbortSignal.timeout(timeoutMs)
          : (() => {
              const controller = new AbortController();
              const timer = setTimeout(() => {
                const err = new Error("TimeoutError");
                err.name = "TimeoutError";
                controller.abort(err);
              }, timeoutMs);
              if (timer.unref) timer.unref();
              return controller.signal;
            })();

      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify(payload),
        signal,
      });
      let j = {};
      try { j = await r.json(); } catch { /* non-JSON response */ }
      // Success only when Resend confirms it accepted the email (HTTP OK and an email id).
      if (r.ok && j.id) return { ok: true, id: j.id };
      why = `Resend ${r.status}: ${j?.message || j?.name || "no details"}`;
      if (!(r.status === 429 || r.status >= 500)) return { ok: false, why };
    } catch (err) {
      why = err?.name === "TimeoutError" ? `Resend did not answer within ${timeoutMs} ms` : String(err?.message || err).slice(0, 200);
    }
    if (i < attempts - 1) await new Promise((r) => setTimeout(r, 400 * 2 ** i + Math.random() * 250));
  }
  return { ok: false, why };
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed." });
  if (guardRequest(req, res, { maxBytes: 16000 })) return;

  const toRaw = process.env.CONTACT_EMAIL || process.env.CONTACT_TO_EMAIL || "";
  const toEmails = toRaw.split(",").map((e) => e.trim()).filter(Boolean);
  const fromRaw = process.env.CONTACT_FROM_EMAIL || "Portfolio Contact <onboarding@resend.dev>";
  const fromEmail = fromRaw.trim();
  const dev =
    process.env.VERCEL_ENV !== "production" &&
    (process.env.DEV_MODE === "1" || process.env.VERCEL_ENV === "development");
  const timeoutMs = Number(process.env.RESEND_TIMEOUT_MS) || 10000;
  const dailyLimit = Number(process.env.CONTACT_DAILY_LIMIT) || 40;

  if (!process.env.RESEND_API_KEY || toEmails.length === 0)
    return res.status(500).json({ error: "Contact form is not configured." });

  const body = readBody(req);
  if (!body) return res.status(400).json({ error: "Invalid request." });

  const { data: d, errors } = validate(body);
  if (Object.keys(errors).length)
    return res.status(400).json({ error: "Please correct the highlighted fields.", errors });

  // Spam protection: a filled honeypot or a submission faster than a human can type is rejected.
  if ((typeof body.website === "string" && body.website) || !(Number(body.elapsed) >= 1500))
    return res.status(400).json({ error: "Something went wrong. Please try again." });

  // Rate limits apply to real, valid enquiries only (so junk requests cannot use up your daily email allowance).
  if (!(await limit(`contact:ip:${clientIp(req)}`, MAX_PER_10_MIN, 600)).allowed) {
    logEvent("rate_limited", req, { scope: "visitor" });
    return res.status(429).json({ error: "Too many messages. Please try again later." });
  }
  if (!(await limit(`contact:day:${today()}`, dailyLimit, 90000)).allowed) {
    logEvent("rate_limited", req, { scope: "site_day" });
    return res.status(429).json({ error: "Daily message limit reached. Please try again tomorrow." });
  }

  const rows = [
    ["Name", d.name], ["Email", d.email], ["Subject", d.subject], ["Inquiry type", d.type || "-"],
    ["Budget / scope", d.budget || "-"], ["Timeline", d.timeline || "-"],
  ];
  const text = rows.map(([k, v]) => `${k}: ${v}`).join("\n") + `\n\nMessage:\n${d.message}`;
  const html =
    `<table cellpadding="6" style="font-family:Arial,sans-serif;font-size:14px">` +
    rows.map(([k, v]) => `<tr><td><b>${k}</b></td><td>${esc(v)}</td></tr>`).join("") +
    `</table><p style="font-family:Arial,sans-serif;font-size:14px;white-space:pre-wrap"><b>Message</b><br>${esc(d.message)}</p>`;

  const out = await sendEmail(
    { from: fromEmail, to: toEmails, reply_to: d.email, subject: `[Portfolio] ${d.subject}`, html, text },
    randomUUID(),
    timeoutMs
  );
  if (!out.ok) {
    console.error("Email not sent ->", out.why);
    logEvent("email_failed", req);
    return res.status(502).json({ error: "Could not send your message right now.", ...(dev && { detail: out.why }) });
  }
  return res.status(200).json({ ok: true, ...(dev && { id: out.id }) });
}
