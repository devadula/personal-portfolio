# Durgajanesh Devadula – Portfolio

One-page portfolio with a Gemini chat assistant, an email contact form and a resume download.
Plain HTML/CSS/JavaScript for the page, plus two small server functions in `api/`.

## Folder structure

```
index.html                         the website (design, sections, SEO tags)
site.js                            page behaviour: menu, scroll reveal, contact form (no inline scripts, so a strict security policy works)
chat-widget.js                     the chat window in the browser (calls /api/chat)
Durgajanesh_Devadula_Resume.pdf    resume (Download Resume buttons)
og-image.png, robots.txt           sharing image and search-engine rules
api/chat.js                        server: asks Gemini
api/contact.js                     server: sends enquiries through Resend (timeout, safe retry, idempotency key)
api/health.js                      health check for uptime monitors
api/_guard.js                      request guard: other websites, content type, body size, real client IP, security log lines
api/_ratelimit.js                  shared rate limits and daily caps
api/_knowledge.js                  facts the chat may use (edit when your details change)
dev-server.js                      runs everything on your computer (npm run dev), with the same security headers as production
tests/                             automated security and behaviour tests (npm test)
scripts/                           live-gemini.js, live-email.js (real services), set-site-url.js, check-secrets.js, env.js
.github/                           CI workflow (checks and tests only, never deploys) and Dependabot settings
package.json / package-lock.json   scripts and the one dependency (@google/genai)
vercel.json / .vercelignore        host settings: security headers, resend download, files not to publish
.env.example                       template for your secrets; copy to .env (never share .env)
SECURITY.md                        security rules, monitoring, backup and recovery
```

`.env` is NOT part of the project files: you create it yourself (below).

## 1. Setup on your computer

1. Install Node.js LTS (https://nodejs.org).
2. In the project folder:
   ```
   npm install
   copy .env.example .env      (Mac/Linux: cp .env.example .env)
   ```
3. Open `.env` and fill in (no spaces around `=`):
   `GEMINI_API_KEY` (https://aistudio.google.com/apikey), `RESEND_API_KEY` (https://resend.com/api-keys),
   `CONTACT_EMAIL` (where enquiries go). Leave the optional lines empty.
4. Test the real services, then run the site:
   ```
   npm run check            syntax check of all JavaScript + secrets scan
   npm test                 automated security and behaviour tests (no keys needed, no real services called)
   npm run check:secrets    only the secrets scan
   npm run test:gemini      real Gemini test (shows which model answers and how fast)
   npm run test:email       sends one real test email
   npm run dev              open http://localhost:3000
   ```
   Always use `npm run dev`; do not double-click `index.html` (the chat and form need the `/api` server).
   Resend's free test sender only delivers to the email address of your own Resend account.
