// Real email test. Run: npm run test:email
// Sends one test message through Resend and prints exactly what Resend answers. Never prints your key.
import { loadEnv } from "./env.js";

if (!loadEnv()) console.log("No .env file found. Create it first (copy .env.example to .env).");
const key = process.env.RESEND_API_KEY;
const to = process.env.CONTACT_EMAIL || process.env.CONTACT_TO_EMAIL;
const from = process.env.CONTACT_FROM_EMAIL || "Portfolio Contact <onboarding@resend.dev>";
if (!key) { console.log("FAIL: RESEND_API_KEY is empty in .env"); process.exit(1); }
if (!to) { console.log("FAIL: CONTACT_EMAIL is empty in .env"); process.exit(1); }
console.log(`Sending a test email\n  from: ${from}\n  to:   ${to}`);
try {
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject: "[Portfolio] Test email", text: "If you can read this, your contact form email setup works." }),
  });
  const j = await r.json().catch(() => ({}));
  if (r.ok && j.id) {
    console.log(`\nPASS: Resend accepted the email (id ${j.id}).`);
    console.log("Now check the inbox of " + to + " (and the Spam folder). You can also see it in the Resend dashboard under Logs.");
  } else {
    console.log(`\nFAIL: Resend answered HTTP ${r.status}: ${j.message || j.name || "no details"}`);
    const msg = String(j.message || "").toLowerCase();
    if (msg.includes("own email") || msg.includes("testing emails") || msg.includes("verify a domain"))
      console.log("\nFix: with Resend's test sender you can only send to the email address of your own Resend account.\nEither set CONTACT_EMAIL to that exact address, or verify your own domain in Resend and set CONTACT_FROM_EMAIL to an address on it.");
    else if (r.status === 401 || r.status === 403 || msg.includes("api key"))
      console.log("\nFix: the Resend key is missing, wrong or restricted. Create a new key at https://resend.com/api-keys.");
    process.exit(1);
  }
} catch (e) {
  console.log("\nFAIL: could not reach Resend:", String(e?.message || e));
  process.exit(1);
}
