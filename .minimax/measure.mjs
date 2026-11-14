// Minimal Chrome DevTools Protocol harness: opens a URL at a given viewport size
// and evaluates a probe expression inside the page, then prints the JSON result.
//
//   node .minimax/measure.mjs <url> <width> <height> <probe-file>
//
// The probe file must export an async function body that returns a JSON-able
// value (the expression is evaluated as `async () => { ... }`).

import { spawn } from "node:child_process";
import { readFileSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const [, , url, widthArg, heightArg, probeFile, shotPath, preFile] = process.argv;
const width = Number(widthArg || 1440);
const height = Number(heightArg || 900);

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const port = 9223 + Math.floor(Math.random() * 400);
const profile = mkdtempSync(join(tmpdir(), "mcode-measure-"));

const chrome = spawn(
  CHROME,
  [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-extensions",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    `--window-size=${width},${height}`,
    "about:blank",
  ],
  { stdio: "ignore" },
);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function endpoint() {
  for (let i = 0; i < 60; i += 1) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (r.ok) return (await r.json()).webSocketDebuggerUrl;
    } catch {
      /* not up yet */
    }
    await sleep(150);
  }
  throw new Error("Chrome DevTools endpoint did not come up");
}

class CDP {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.events = [];
    ws.addEventListener("message", (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(JSON.stringify(msg.error)));
        else resolve(msg.result);
      } else if (msg.method) {
        this.events.push(msg);
      }
    });
  }

  send(method, params = {}, sessionId) {
    const id = ++this.id;
    const payload = { id, method, params };
    if (sessionId) payload.sessionId = sessionId;
    this.ws.send(JSON.stringify(payload));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }
}

function connect(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    ws.addEventListener("open", () => resolve(new CDP(ws)));
    ws.addEventListener("error", (e) => reject(new Error(`websocket error: ${e.message || e}`)));
  });
}

try {
  const browserWs = await endpoint();
  const browser = await connect(browserWs);
  const { targetId } = await browser.send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await browser.send("Target.attachToTarget", { targetId, flatten: true });

  await browser.send(
    "Page.enable",
    {},
    sessionId,
  );

  if (preFile) {
    // Runs before any page script: used to simulate a broken environment.
    await browser.send(
      "Page.addScriptToEvaluateOnNewDocument",
      { source: readFileSync(preFile, "utf8") },
      sessionId,
    );
  }

  if (process.env.NO_JS === "1") {
    await browser.send("Emulation.setScriptExecutionDisabled", { value: true }, sessionId);
  }

  await browser.send(
    "Emulation.setDeviceMetricsOverride",
    { width, height, deviceScaleFactor: 1, mobile: false },
    sessionId,
  );
  await browser.send("Page.navigate", { url }, sessionId);

  // Wait for the load event (or a short timeout).
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    if (browser.events.some((e) => e.method === "Page.loadEventFired")) break;
    await sleep(100);
  }
  await sleep(900);

  const body = readFileSync(probeFile, "utf8");
  const { result, exceptionDetails } = await browser.send(
    "Runtime.evaluate",
    { expression: `(async () => { ${body} })()`, awaitPromise: true, returnByValue: true },
    sessionId,
  );

  if (exceptionDetails) {
    console.error("PROBE ERROR:", JSON.stringify(exceptionDetails, null, 2));
    process.exitCode = 1;
  } else {
    console.log(JSON.stringify(result.value, null, 2));
  }

  if (shotPath) {
    const { data } = await browser.send(
      "Page.captureScreenshot",
      { format: "png", captureBeyondViewport: false },
      sessionId,
    );
    writeFileSync(shotPath, Buffer.from(data, "base64"));
    console.error(`screenshot: ${shotPath}`);
  }
} finally {
  chrome.kill();
}
