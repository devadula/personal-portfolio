// Shared rate limiting for /api/chat and /api/contact.
// - If UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are set (free account at https://upstash.com),
//   counters live in Redis and are shared by every server instance: limits are exact.
// - Otherwise counters live in this server instance's memory: fine for local use, but easy to bypass online.
// - If Redis cannot be reached, it falls back to memory (and logs it) so the site keeps working.
const mem = new Map(); // key -> { count, resetAt }

function memoryHit(key, windowSec) {
  const now = Date.now();
  let e = mem.get(key);
  if (!e || e.resetAt <= now) {
    e = { count: 0, resetAt: now + windowSec * 1000 };
    mem.set(key, e);
  }
  e.count++;
  if (mem.size > 10000) for (const [k, v] of mem) if (v.resetAt <= now) mem.delete(k);
  return e.count;
}

async function redisHit(url, token, key, windowSec) {
  const r = await fetch(url.replace(/\/+$/, "") + "/pipeline", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify([["INCR", key], ["EXPIRE", key, windowSec, "NX"]]),
    signal: AbortSignal.timeout(2000),
  });
  if (!r.ok) throw new Error(`Upstash HTTP ${r.status}`);
  const j = await r.json();
  const n = Number(j?.[0]?.result);
  if (!Number.isFinite(n)) throw new Error("Upstash returned an unexpected reply");
  return n;
}

/** Counts one hit for `key` inside a time window and says whether it is still within `max`. */
export async function limit(key, max, windowSec) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  let count;
  if (url && token) {
    try {
      count = await redisHit(url, token, `portfolio:${key}`, windowSec);
    } catch (err) {
      console.error("Rate-limit store unavailable, using memory instead:", err.message);
    }
  }
  if (count === undefined) count = memoryHit(key, windowSec);
  return { allowed: count <= max, count };
}

export const today = () => new Date().toISOString().slice(0, 10);
