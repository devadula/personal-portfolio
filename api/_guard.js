// Request guard shared by the public endpoints (deny by default).
import { createHash } from "node:crypto";

/**
 * The visitor's IP address for rate limiting.
 * Headers a visitor can fake (x-forwarded-for) are NOT trusted unless you run behind your own proxy and set TRUST_PROXY=1.
 * On Vercel the platform sets x-vercel-forwarded-for / x-real-ip itself.
 */
export function clientIp(req) {
  const h = req.headers || {};
  if (process.env.VERCEL) {
    const v = String(h["x-vercel-forwarded-for"] || h["x-real-ip"] || "").split(",")[0].trim();
    if (v) return v;
  }
  if (process.env.TRUST_PROXY === "1") {
    const v = String(h["x-forwarded-for"] || "").split(",")[0].trim();
    if (v) return v;
  }
  return req.socket?.remoteAddress || "unknown";
}

/** One-line JSON security log. Never contains message text, keys or the raw IP (only a short hash). */
export function logEvent(event, req, extra = {}) {
  const ip = createHash("sha256").update(`${process.env.LOG_SALT || "portfolio"}:${clientIp(req)}`).digest("hex").slice(0, 10);
  console.warn(JSON.stringify({ t: new Date().toISOString(), event, route: String(req.url || "").split("?")[0], ip, ...extra }));
}

/**
 * Returns true when the request was rejected (a response has already been sent).
 *  - browsers on other websites are refused (Sec-Fetch-Site and Origin checks)
 *  - only JSON bodies are accepted (this also forces a CORS preflight for other sites, which is never granted)
 *  - oversized bodies are refused
 */
export function guardRequest(req, res, { maxBytes = 65536 } = {}) {
  const h = req.headers || {};
  const deny = (status, code, error) => {
    logEvent(`blocked_${code}`, req);
    res.status(status).json({ error, code });
    return true;
  };
  const site = h["sec-fetch-site"];
  if (site && site !== "same-origin" && site !== "none") return deny(403, "forbidden", "Forbidden.");
  if (h.origin) {
    let host;
    try { host = new URL(h.origin).host; } catch { return deny(403, "forbidden", "Forbidden."); }
    if (host !== h.host) return deny(403, "forbidden", "Forbidden.");
    const allowed = (process.env.ALLOWED_ORIGIN || "").replace(/\/+$/, "");
    if (allowed && h.origin !== allowed) return deny(403, "forbidden", "Forbidden.");
  }
  if (!String(h["content-type"] || "").toLowerCase().startsWith("application/json"))
    return deny(415, "unsupported_type", "Unsupported content type.");
  const len = Number(h["content-length"]);
  if (Number.isFinite(len) && len > maxBytes) return deny(413, "too_large", "Request too large.");
  return false;
}
