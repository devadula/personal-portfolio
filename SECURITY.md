# Security notes

## Rules
- **Never commit or share `.env`.** It holds your Gemini and Resend keys (and optional Upstash token). `.gitignore` already excludes it.
  Share the project through Git, or a ZIP built WITHOUT `.env` and `node_modules`.
- **If a key was ever shared, zipped or uploaded, rotate it** (README section 7), then update `.env` and Vercel's Environment Variables.
- Keys are read only by the server code in `api/`. They never appear in `index.html`, `site.js` or `chat-widget.js`.
- Before sharing or publishing run `npm run check` (syntax + secret scan) and `npm test`.
- **Never set `DEV_MODE` on a live site.** It makes error messages show technical details. (Production deployments ignore it, but do not rely on that.)
- Turn on two-factor authentication (2FA/MFA) for your GitHub, Vercel, Google, Resend and Upstash accounts. Anyone who takes over those accounts controls the site.

## What the code enforces
| Protection | Where |
|---|---|
| Only requests from your own website are accepted; other websites, wrong content types and oversized bodies are refused (403 / 415 / 413) | `api/_guard.js` |
| Visitor IP for limits comes from the platform, not from a header a visitor can fake | `api/_guard.js` (`TRUST_PROXY` only if you run your own proxy) |
| Per-visitor and whole-site limits for chat and enquiries; shared across servers when Upstash is configured | `api/_ratelimit.js` |
| Input validation on the server; extra fields such as `to`, `from`, `role`, `is_admin` are ignored | `api/chat.js`, `api/contact.js` |
| Timeouts everywhere (Gemini 20 s per model, Resend 10 s, browser 25 s); one safe retry for the email with an idempotency key | `api/contact.js`, `api/chat.js`, `site.js` |
| Production error responses contain no technical details | `api/chat.js`, `api/contact.js` |
| Content-Security-Policy, HSTS, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy, COOP | `vercel.json` |
| Health check for monitors (reveals nothing about configuration) | `api/health.js` |

## Monitoring
Security events are written as one JSON line each to the function logs (Vercel: your project > Logs). They never contain message text, keys or the raw IP address (only a short hash):
`blocked_forbidden`, `blocked_unsupported_type`, `blocked_too_large`, `rate_limited` (with `scope`), `email_failed`.
Suggested alerts: a sudden rise in `rate_limited` or `blocked_*` lines, any `email_failed`, a Gemini or Resend usage spike. Point a free uptime monitor at `/api/health` and at the home page.

## Backup and recovery
There is no database. Everything needed to rebuild the site is:
1. **The code**: keep it in a private-or-public GitHub repository (that is your backup). Do not rely on one laptop.
2. **The secrets**: keep a copy of the values from `.env` in a password manager. `.env.example` lists every variable name.
3. **Accounts**: Vercel project, Resend account, Google AI Studio key, optional Upstash database, your domain/DNS records.

Restore steps: create a new Vercel project from the GitHub repository, add the environment variables, deploy, point the domain at it, run the checklist in README section 5.
Roll back a bad release: in Vercel open Deployments, choose an earlier good deployment and promote/redeploy it (check the exact button names in the dashboard).
If keys leak: rotate them (README section 7) before anything else.
Practise the restore once on a free preview project; an untested backup is only a hope.

## Reporting a problem
Email janeshdevadula8@gmail.com.
