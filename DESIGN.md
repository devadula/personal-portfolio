---
name: Durgajanesh Devadula — Portfolio
description: Drafting-table portfolio. Graphite ink on paper stock, one prussian-blue annotation colour, an editorial display serif against a technical grotesque. The page is a document, not a poster.
colors:
  # Paper and surfaces
  paper: "#f3f2ee"          # page ground — warm-neutral stock, never cream
  paper-sunk: "#eae9e3"     # alternating band, footer
  surface: "#fbfaf8"        # cards, panels, inputs
  white: "#ffffff"          # label text on the accent fill, print ground
  # Ink
  ink: "#191917"            # headings, strong text
  ink-2: "#43423d"          # body copy
  ink-3: "#4d4c47"          # meta, captions, secondary
  # Rules
  line: "#dedcd4"           # default hairline
  line-strong: "#c7c5bb"    # structural divider, active border
  # Accent — prussian drafting ink
  accent: "#1f4d7a"
  accent-deep: "#163a5e"
  accent-wash: "#e7edf3"
  # Functional states
  ok: "#2c6a4a"
  ok-wash: "#e6f0ea"
  err: "#a33229"
  err-wash: "#f7eae8"
typography:
  scale:
    "12": "0.75rem"       # meta, labels
    "13": "0.8125rem"     # secondary UI text
    "14": "0.875rem"      # dense body, chips
    "15": "0.9375rem"     # controls, list rows, secondary copy
    "16": "1rem"          # body
    "18": "1.125rem"      # lead paragraph
    "20": "1.25rem"       # card titles
    "22": "1.375rem"      # wordmark, project titles
    "24": "1.5rem"        # subsection heads
    "32": "2rem"          # section heads
    "40": "2.5rem"        # sub-display
    "56": "3.5rem"        # display
    "68": "4.25rem"       # hero display
  display:
    fontFamily: "Tiro Telugu, Georgia, serif"
    fontSize: "clamp(2.75rem, 6vw, 4.25rem)"
    fontWeight: 400
    letterSpacing: "-0.015em"
    lineHeight: 1.04
  headline:
    fontFamily: "Tiro Telugu, Georgia, serif"
    fontSize: "clamp(1.75rem, 3.2vw, 2.25rem)"
    fontWeight: 400
    letterSpacing: "-0.01em"
    lineHeight: 1.1
  title:
    fontFamily: "Schibsted Grotesk, Segoe UI, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 500
    lineHeight: 1.4
  body:
    fontFamily: "Schibsted Grotesk, Segoe UI, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.65
  mono:
    fontFamily: "ui-monospace, Cascadia Mono, Consolas, monospace"
    fontSize: "0.875rem"
    fontWeight: 400
  email:
    fontFamily: "'Segoe UI', Tahoma, Geneva, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
rounded:
  none: "0"
  sm: "4px"
  control: "6px"
  md: "10px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  "2xl": "32px"
  "3xl": "48px"
  "4xl": "64px"
  "5xl": "96px"
  "6xl": "128px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.white}"
    typography: "{typography.title}"
    rounded: "{rounded.control}"
    padding: "0 22px"
  button-primary-hover:
    backgroundColor: "{colors.accent-deep}"
    textColor: "{colors.white}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    borderColor: "{colors.line-strong}"
    rounded: "{rounded.control}"
    padding: "0 22px"
  input-text:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    borderColor: "{colors.line-strong}"
    rounded: "{rounded.control}"
    padding: "11px 13px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-2}"
    borderColor: "{colors.line}"
    rounded: "{rounded.md}"
    padding: "28px"
  nav-link:
    textColor: "{colors.ink-2}"
    typography: "{typography.body}"
  nav-link-hover:
    textColor: "{colors.accent}"
---

# Design System: Durgajanesh Devadula — Portfolio

## Overview

**Creative North Star: "Drafting Table."**

The subject is an engineering student and developer. His world is the engineering drawing sheet:
paper stock, graphite line work, technical lettering, dimensioned rows, and one pen colour used
for annotation. The page behaves like a well-kept drawing sheet — calm, measured, precise — and
the work itself is the drawing.

This replaces the previous dark neon-blue "sci-fi HUD" look entirely. That look is evidence of what
the site used to be, not authority over what it becomes. The new world is not a skin over the old
one: the grid backdrop, the glowing cube, the gradient buttons, and the decorative SVG panels are
all gone, not restyled.

**Key characteristics**

- Light paper ground with graphite text. One annotation colour (prussian ink) and nothing else.
- An editorial display serif against a technical grotesque. Two voices, clear jobs.
- Hairline rules do the structural work; cards are the exception, not the default.
- Wide margins, a 12-column mental model, and a single measure for reading.
- One ink panel in the whole page, carrying one sentence.
- Motion: a hero entrance, section entrances, and a hover layer. Nothing moves on its own.

## Colors

### Primary

- **Ink** (`#191917`): headings and strong text. Never pure black — the ground is warm, so the ink
  is warm-black too.
- **Paper** (`#f3f2ee`): the page ground. Warm-neutral stock, deliberately cooler and greyer than
  cream so it does not read as "bookish".

### Secondary

- **Prussian** (`#1f4d7a`): the only accent. Links on hover, primary buttons, the active project
  tag, focus rings. It is the ink colour of a drafting pen, not a brand "pop" colour.
  - Prussian-deep (`#163a5e`) for button hover; prussian-wash (`#e7edf3`) for the quiet callout
    panel and the active tag.

### Tertiary

None. There is no third hue. Functional green (`#2c6a4a`) and red (`#a33229`) appear only as form
validation states and never as decoration.

### Neutral

- **Ink-2** (`#43423d`): body copy.
- **Ink-3** (`#4d4c47`): meta lines, captions, secondary text. Verified at or above 7:1 on paper, on
  the sunken band and on the wash panel, so secondary text is as readable as body copy.
- **Line** (`#dedcd4`): default hairline. **Line-strong** (`#c7c5bb`): structural dividers, input
  borders, active borders.

### Named Rules

- **One accent.** Prussian is the only colour that carries meaning. If something is coloured, it
  is either an action or the current state.
- **Secondary text is never grey.** It is ink-3 — a warm dark, tinted from the palette.
- **No colour on a rule.** Hairlines stay neutral so the accent always means something.

## Typography

- **Display:** Tiro Telugu. Used for the hero name, section heads, and project titles. Its Latin is
  drawn on eighteenth-century proportions and the same file carries Telugu — the owner's first
  language — so the display voice belongs to him rather than to a font trend.
- **Text:** Schibsted Grotesk. Used for paragraphs, navigation, form controls, labels, and meta.
  Chosen for a technical, slightly condensed rhythm that holds up at small sizes.
- **Mono:** a system monospace, for code and data only. Never as a costume for "technical".
- **Fallbacks:** Georgia and Segoe UI / system-ui respectively, so the page stays readable if the
  font request fails.
- **Scale:** 12 / 13 / 14 / 15 / 16 / 18 / 20 / 22 / 24 / 32 / 40 / 56 / 68 px. Every `font-size`
  in the codebase lands on one of these steps, or on a fluid display endpoint.
- **Measure:** body copy is capped at 58ch of the text face — about 78 characters on the line.
  Display type is capped at 4.25rem.
- **Tracking:** display −0.015em, headlines −0.01em, body 0. Never below −0.04em.

### Named Rules

- **Two families, two jobs.** The serif never sets a form label; the grotesque never sets the hero.
- **One weight step per role.** Section heads are display serif; card titles are 1.125rem
  grotesque. Nothing sits between them.
- **Meta text is 13px** and never smaller than 12px.
- **No uppercase display type.** Only 12px meta labels may be tracked and uppercase.

## Layout

- **Container:** 1240px maximum with a 24px gutter. The gutter is taken out of the width
  (`width: min(100% - 2 * var(--gutter), var(--container))`), so the bar and every section share one
  content edge — nothing is inset further than anything else.
- **Grid:** two columns at desktop (1.15fr / 0.85fr) for the hero and the contact block; a single
  column below 900px. Content sections are single-column with a 58ch measure.
- **Rhythm:** 96px of section padding at desktop, 64px at tablet, 48px on phones. More space above
  a heading than below it.
- **Structure is drawn with rules, not boxes.** Sections are separated by hairlines and whitespace;
  the only repeated container is the project feature, where a bordered panel earns its place.
- **Equal left and right content edges** on every section, at every width.

## Elevation & Depth

Depth comes from **borders first**. Cards use a 1px `--line` border on `--surface` with no shadow.
Shadow is reserved for surfaces that genuinely float above the page:

- Chat launcher: `0 10px 30px -12px rgba(25,25,23,.45)`.
- Chat panel: `0 24px 60px -28px rgba(25,25,23,.45)`.

There is no card that carries both a border and a wide soft shadow — that combination reads as a
ghost card rather than a designed one.

## Shapes

- Cards 10px, inputs and buttons 6px, chips 4px, status pills full-round.
- Nothing is more rounded than 10px except small pills.
- No circular icon tiles above headings, no rounded-square badges, no blob shapes.

## Motion

Motion is a budget, not a layer. Three things happen and nothing else does.

1. **The hero enters once on load.** The name rises line by line out of its mask (700ms per line,
   80ms apart); the status, role, lede, actions and facts panel fade up after it, 40–60ms apart.
2. **Each section enters once as a block** when it first comes into view: a 14px rise for the
   ruled sections, a plain fade for the prose sections. Rows, cards and list items never enter one
   by one — the page reads as blocks arriving, not as a parade.
3. **Hover and press answer.** The project feature lifts 2px and darkens its border; a button steps
   up 1px on hover and sinks 1px with a 0.985 scale on press; an arrow in a button travels 3px and
   settles back; a nav underline draws left to right.

Rules that keep it honest: transform, scale and opacity only (never width, height or position);
one easing curve for UI steps (`cubic-bezier(.2,.8,.2,1)`) and one softer curve for entrances
(`cubic-bezier(.22,1,.36,1)`); no bounce, no overshoot, no perpetual animation, no parallax;
hover moves only for a fine pointer, and keyboard focus shows the same state; everything collapses
to a static state under `prefers-reduced-motion`.

Scrolling is not a motion effect. The page does not scroll smoothly by default — that makes
keyboard focus crawl down a long page — so an anchor click is animated in `site.js` instead, and
only when the visitor has not asked for reduced motion.

The entrance is decoration; the text is the content. The hidden state lives under a class the
script adds on its live path, and if the observer never calls back — a blocked script, a browser
that refuses it — a 1.5s fallback shows everything rather than leaving the page blank.

## Components

### Buttons

- **Primary:** prussian fill, white label, 6px radius, 22px horizontal padding, 44px minimum
  height. Hover deepens to prussian-deep.
- **Secondary:** transparent with a `--line-strong` border, ink label. Hover fills `--surface`.
- **Icon buttons:** the chat launcher (52px round) and header actions. Drawn SVG only.

### Chips

Small 4px-radius labels used for technology tags only. `--surface` fill, `--line` border, `--ink-2`
text. No coloured chips except the one active-state tag.

### Cards / Containers

- **Project feature:** the completed internship project gets a wide bordered panel; the washed aside
  is a spec table — role, organisation and length as label/value rows across the full width — not a
  short list in a wide box.
- **Project list:** the four AI/ML projects are a ruled list — one row per project, hairline
  between rows, no repeated boxes. This is deliberately not a four-card grid.
- **Fact table:** the hero's "at a glance" panel is a definition list with hairline row dividers.
- **Skills:** a ruled two-column table of groups and technologies, not a grid of icon cards.
- **Statement panel:** one inset ink panel carrying one sentence, set in the display face, with the
  accent as a short rule above it. It sits inside the container rather than running edge to edge.

### Inputs / Fields

`--surface` fill, `--line-strong` border, 6px radius, 11px/13px padding, 46px minimum height.
Focus keeps the border and adds a prussian ring drawn *inside* the control, so the focused state is
visible on every field and never changes the shape of the thing it marks. Invalid fields get a red
border and a message that names the problem, not just the fact of the problem.

Every field carries a visible label. The assistant's question box labels itself "Your question"
above the input; placeholders and `aria-label`s are never the only label.

### Navigation

Sticky, opaque paper ground with a hairline bottom rule (no blur, no glass). Wordmark in the
display serif; nav links in grotesque at 15px with an underline that grows on hover and on focus.
One action at the end: an outline "Résumé" button on desktop. Below 900px the links collapse into
a panel opened by an SVG menu button, and the résumé stays in the bar as a filled prussian button
so the bar always carries one clear action. The panel also carries an "Ask the assistant" entry.

The assistant always has exactly one trigger on screen, and it never covers content:

- **Below 900px** — a row inside the menu panel.
- **901–1383px** — a 44px icon button at the end of the bar (the link gap tightens to 1.3rem so
  the row still fits inside the content edge).
- **1384px and up** — the round floating button, which only appears once the viewport is wide
  enough for it to sit in the page margin beside the 1240px container.

Focus returns to whichever trigger opened the panel; if that trigger is gone (the menu closed),
it falls back to the menu button.

## Do's and Don'ts

### Do:

- Let real content carry the page; the layout is a frame around it.
- Use one accent for actions and current state.
- Draw every icon as SVG in a single stroke weight (1.6) and size (20px).
- Show status honestly: "in progress", "completed during the internship".
- Keep whitespace generous and let sections breathe.

### Don't:

- Don't use purple, neon, gradients, glow, glassmorphism, or a grid backdrop.
- Don't use a rotating cube, floating blobs, sparklines, progress rings, or decorative geometry.
- Don't animate rows, cards or list items one by one as the page scrolls; enter sections as blocks.
- Don't add a second band, a second accent, or a second display face. One ink band, one accent.
- Don't use eyebrow labels above headings, numbered section markers, or a row of identical cards.
- Don't use monospace as a costume for "technical" — code and data only.
- Don't use emoji or unicode glyphs as icons.
- Don't invent metrics, clients, dates, or outcomes.
