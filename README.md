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

## 2. Put it on GitHub
```
git init
git add .
git status          (".env" must NOT appear; ".env.example" is fine)
git commit -m "Portfolio"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
git push -u origin main
```

## 3. Deploy on Vercel
1. https://vercel.com > sign in with GitHub > Add New > Project > Import your repository.
2. Framework Preset: Other. Leave Build Command and Output Directory empty.
3. Environment Variables: `GEMINI_API_KEY`, `RESEND_API_KEY`, `CONTACT_EMAIL` (optional: `GEMINI_MODEL`, `ALLOWED_ORIGIN`).
4. Deploy. Test the preview address (checklist below) before telling anyone.
5. Note: Vercel's free Hobby plan is meant for non-commercial personal use. If your site is used to win paid client work,
   check Vercel's current terms or consider the Pro plan or another host.

## 4. After you know your live address
```
npm run set-url -- https://your-live-address
```
This adds the canonical link and the social-preview image tags to `index.html` and creates `sitemap.xml`
(and the Sitemap line in `robots.txt`). Commit, push, redeploy. Then set `ALLOWED_ORIGIN` in Vercel to the same address.

## 5. Checklist on the preview / live site
- Page loads; all menu links work; Download Resume saves the PDF.
- Chat: ask a question and a follow-up. Contact form: send an empty form (errors), then a real message (arrives in your inbox).
- `/.env` and `/package.json` do not download.
- Browser console has no errors.

## 6. Protect your Gemini quota and email allowance (do this before going live)
The chat and the form are public, so bots could use up your free daily allowance. Built-in protections:
per-visitor limit per minute (12), per-visitor limit per day (60), a daily cap for the whole site (400 chat answers, 40 enquiries),
only valid requests are counted, and `ALLOWED_ORIGIN` blocks other websites from calling your chat.
By default these counters live in each server's memory, which is easy to bypass online. To make them exact:
1. Create a free account at https://upstash.com, create a Redis database, open it and copy the **REST URL** and **REST TOKEN**.
2. Put them in `.env` (local) and in Vercel > Settings > Environment Variables as `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.
3. Set `ALLOWED_ORIGIN` to your live address (for example `https://your-site.vercel.app`) and redeploy.
4. Optional second layer: in the Vercel dashboard open your project > Firewall and add a rate-limit rule for `/api/*`
   (feature availability depends on your plan; check Vercel's current docs).
If the Upstash service is unreachable the site falls back to memory limits and keeps working.
Change the caps with `CHAT_DAILY_LIMIT`, `CHAT_PER_IP_DAILY`, `CONTACT_DAILY_LIMIT` (see `.env.example`).
Free Gemini plans have small daily limits; lower `CHAT_DAILY_LIMIT` if your key's limit is smaller than 400.

## 7. Rotate your keys (required if a key was ever shared, zipped or uploaded)
1. Gemini: https://aistudio.google.com/apikey > create a new key > delete the old key.
2. Resend: https://resend.com/api-keys > create a new key > delete the old key.
3. Put the new values in `.env` and in Vercel's Environment Variables, then redeploy.
4. Run `npm run test:gemini` and `npm run test:email` to confirm the new keys work.
5. Before sharing or deploying run `npm run check:secrets` (looks for key-like text and checks that `.env` is not in Git).
Never put keys in `index.html` or `chat-widget.js`; never zip the project with `.env` or `node_modules` inside.

## 8. Hosting decision
This project runs as it is on **Vercel** (static page + two functions in `api/`). Vercel's free Hobby plan is for non-commercial
personal use, so if the site is used to win paid client work, either ask Vercel whether your use is allowed, or use Vercel Pro
(about $20 per month, verify current price). A free alternative that allows commercial use is **Cloudflare Pages**, but its functions
run on a different runtime and `api/chat.js` and `api/contact.js` would need small, tested changes. Netlify needs the same kind of
adaptation, and GitHub Pages cannot run the two functions. Decide first, then follow section 3.
Nothing in this project deploys by itself.

## 9. What changed in the latest update (security hardening)
- Request guard: other websites can no longer call the chat or the form; only JSON, only small bodies (`api/_guard.js`).
- Rate limits can no longer be bypassed with a fake `X-Forwarded-For` header.
- Email: 10 s timeout, one safe retry with an idempotency key, a 25 s timeout in the browser.
- Security headers added: Content-Security-Policy (no inline scripts allowed), HSTS, Permissions-Policy, COOP.
- The page script moved from `index.html` to `site.js` (same behaviour) so the strict policy can be used.
- `/api/health` added; security log lines added; detailed errors can never appear on a production deployment.
- Automated tests (`npm test`), CI workflow, Dependabot, restored `.env.example`.
- The live-service scripts were renamed `live-gemini.js` / `live-email.js` so the test runner can never run them by accident (`npm run test:gemini` and `npm run test:email` still work).
Design, colours, layout and content are unchanged (verified pixel-for-pixel against the previous version).

## 10. Troubleshooting
| Problem | Fix |
|---|---|
| Chat says it isn't set up / unavailable | While `npm run dev` runs, read the "[Developer details]" line in the chat and the terminal; run `npm run test:gemini` |
| Chat says the daily limit was reached | The daily caps in section 6 were hit; raise `CHAT_DAILY_LIMIT` or wait until tomorrow |
| Form says "Something went wrong" | Run `npm run test:email`; check RESEND_API_KEY, CONTACT_EMAIL and Resend's Logs |
| Chat or form do nothing | You opened `index.html` directly; use `npm run dev` |
| Chat or form say "Forbidden" | The request did not come from your own site address. Open the site through the same address you set in `ALLOWED_ORIGIN` (or leave it empty) |
| `.env` shows in `git status` | `git rm --cached .env`; make sure `.gitignore` contains `.env`; rotate any key that was uploaded |
| `npm run check` reports a secret | Remove the key-like text from the named file and rotate that key |
| Changed env vars on Vercel | Redeploy (Deployments > latest > Redeploy) |

## 11. Next steps (not done yet)
Custom domain with a verified Resend domain; Lighthouse check on the live site; move static files into a `public/` folder;
bot check (Turnstile) on the contact form if spam appears; external error monitoring if you want alerts by email;
run the CI workflow once the project is on GitHub and read its result.
