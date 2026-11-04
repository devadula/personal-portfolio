export function mkRes() {
  return {
    code: 0, body: null, headers: {}, chunks: [], headersSent: false, statusCode: 0,
    setHeader(k, v) { this.headers[k] = v; },
    status(c) { this.code = c; return this; },
    json(b) { this.body = b; return this; },
    write(c) { this.headersSent = true; this.chunks.push(c); },
    end() {},
  };
}
let n = 0;
export const nextIp = () => `10.20.${Math.floor(n / 250)}.${(n++ % 250) + 1}`;
export function mkReq({ method = "POST", headers = {}, body, ip = nextIp() } = {}) {
  return {
    method, url: "/api/test", body, socket: { remoteAddress: ip },
    headers: { host: "site.test", "content-type": "application/json", ...headers },
  };
}
export async function call(handler, req) { const res = mkRes(); await handler(req, res); return res; }
