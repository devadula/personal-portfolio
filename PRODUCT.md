# PRODUCT — Durgajanesh Devadula, Portfolio

## Platform

Web. A single-page static site (plain HTML, CSS, and JavaScript) served over HTTPS, with two
serverless functions behind `/api` (a chat assistant and a contact-form mailer).

## Stack

- Static front end: hand-written HTML, one CSS file, two classic (deferred, non-module) scripts.
  No framework, no build step, no client-side dependencies.
- Server: Vercel serverless functions in `api/` (Node.js), Gemini for the assistant,
  Resend for contact-form email.
- Local development: a small Node server (`dev-server.js`) that mirrors the production
  security headers and runs the same API functions.
- Tests: `node --test` over the API layer.

## Users

Two audiences, in order of likely frequency:

1. **Clients and collaborators** looking for someone to build or fix a web application, and who
   want to judge capability quickly before making contact.
2. **Recruiters and reviewers** (including internship and campus hiring) who scan for education,
   stack, and project evidence.

Both arrive from a link (resume, profile, search) on a phone as often as on a laptop.

## Product Purpose

A working portfolio for a web developer and AI & ML student that (a) makes his real work legible
and (b) gives a visitor a low-friction way to reach him.

## Positioning

A hands-on developer early in his career who has shipped one production web application
(commercially, during an internship) and is building AI/ML projects alongside a B.Tech. The site
should read as *precise and current*, not as a design showcase and not as a resume dump.

## Operating Context

Read on a phone in a waiting room, on a laptop in an office, and once in a while on a large
monitor. Light environment most of the time (offices, campuses, daytime browsing), so a light
paper ground is the right default rather than a dark one. Nothing here needs to be read in a hurry
or in a dark room.

## Capabilities and Constraints

- Must work as a static page with no JavaScript at all: all content is in the HTML.
- Must keep working with the existing stack: no framework, no bundler, no new runtime dependency.
- Contact form and chat assistant depend on `/api`; the page must degrade gracefully and explain
  itself when those endpoints are unavailable.
- Strict Content-Security-Policy: no inline scripts, no external scripts, no third-party embeds.
- The only external asset is the Google Fonts stylesheet; the site must stay readable if it fails.
- The résumé PDF and the chat knowledge base are the authoritative record of employment, dates,
  and stack claims. The page may not assert anything they do not contain.

## Brand Commitments

- **Genuine content only.** No invented clients, metrics, testimonials, certifications, dates, or
  outcomes. Where a project is in progress, the page says so.
- **No "AI slop".** No purple/violet gradients, no neon, no glassmorphism, no glowing edges, no
  decorative shapes, no generic illustrations, no fake product screenshots, no gradients on text.
- **Work leads.** The projects and the internship are the evidence; the interface stays quiet.
- **Honest imagery.** Real photographs and real screenshots only. The site ships no fabricated
  imagery, and generated visuals are never presented as the person's own work.
- **The résumé is downloadable** and is the single source for credentials.

## Evidence on Hand

- Résumé PDF: `Durgajanesh_Devadula_Resume.pdf` (authoritative for education, dates, percentage
  marks, internship, certification, and language skills).
- Five named projects: JARVIS AI (system control assistant), Vehicle Detection, Disaster Detection
  (in progress), College Small Business IT Incident Management (in progress), Mini Supermarket
  (completed during the internship).
- One internship: Web Development Intern, Rashmitha Information System, six months, completed.
- Stack: C#, .NET, HTML, CSS, JavaScript, Bootstrap, SQL, foundational AI/ML and computer vision,
  MS Office.
- Education: B.Tech AI & ML (in progress), Diploma CSE (2022–2025, 80%), ITI Wood Work Technician
  (NSQF, 2024), SSC (2021–2022, 75%) — all at Visakha Institute of Engineering and Technology,
  Narava / Sri Ramu Memorial ITI / Z.P.H. High School.
- Languages: Telugu, English.
- Certification: MS Office Certificate (HP).
- Contact: email, phone, Visakhapatnam (Andhra Pradesh, India), GitHub, LinkedIn.
- No project screenshots, no client logos, no testimonials, no photographs of the person.

## Product Principles

1. **Show the work, not the claims.** The internship and the projects lead; copy explains what
   was built and with what.
2. **One idea per section.** Each section answers a different question a visitor actually has.
3. **Say what is true.** Status is stated ("in progress", "completed during the internship").
   Nothing is implied that the résumé does not state.
4. **Quiet interface, strong type.** The page is a document with a layout, not a poster.
5. **Reach out is one click from anywhere.** Contact details and the enquiry form are always
   reachable from the navigation.

## Accessibility & Inclusion

- WCAG 2.2 AA is the floor: contrast, focus visibility, keyboard operation, labels and error
  messaging for every control, and no content that depends on motion or on JavaScript.
- Text remains selectable, the caret is visible, and focus rings are part of the design.
- Motion is limited to one authored moment and is fully disabled under
  `prefers-reduced-motion`.
- Tap targets are at least 44 × 44 CSS px on touch layouts.
- The résumé download works from the keyboard and from assistive technology.

### Completion gate

The page ships when: every claim on the page traces to the résumé or the knowledge base; the
detector and the browser checks are clean; keyboard-only navigation reaches every control; the
form reports success and failure honestly; and the layout holds from 320 px to 1440 px.
