// Health check for uptime monitors and load balancers. Reveals nothing about your configuration.
export default function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET" && req.method !== "HEAD") return res.status(405).json({ error: "Method not allowed." });
  return res.status(200).json({ status: "ok", time: new Date().toISOString() });
}
