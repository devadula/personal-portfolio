// Page behaviour: navigation, header state, contact form.
// Kept in a separate file (not inline) so a strict Content-Security-Policy works.
(function () {
  "use strict";

  // --- Footer year ---------------------------------------------------------
  const year = document.getElementById("yr");
  if (year) year.textContent = new Date().getFullYear();

  // --- Mobile navigation ----------------------------------------------------
  const menu = document.getElementById("menu");
  const links = document.getElementById("links");

  function setMenu(open) {
    links.classList.toggle("open", open);
    menu.setAttribute("aria-expanded", String(open));
    menu.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  }

  if (menu && links) {
    menu.addEventListener("click", () => setMenu(!links.classList.contains("open")));
    links.addEventListener("click", (e) => {
      if (e.target.closest("a")) setMenu(false);
    });
    document.addEventListener("click", (e) => {
      if (!links.classList.contains("open")) return;
      if (!e.target.closest(".nav")) setMenu(false);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && links.classList.contains("open")) {
        setMenu(false);
        menu.focus();
      }
    });
  }

  // --- The assistant, opened from the bar or the menu ------------------------
  const askChat = document.getElementById("ask-chat");
  if (askChat) {
    askChat.addEventListener("click", () => {
      if (menu && links) setMenu(false);
      if (window.portfolioAssistant) window.portfolioAssistant.open(askChat);
    });
  }

  // --- Anchors --------------------------------------------------------------
  // The page does not scroll smoothly by default: that makes keyboard focus
  // crawl down a long page. Clicking a link animates instead, and only when
  // the visitor has not asked for reduced motion.
  const calm = window.matchMedia("(prefers-reduced-motion: reduce)");
  document.addEventListener("click", (e) => {
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;
    // The skip link keeps the browser's own jump: it moves the keyboard's
    // starting point to the content, which a scripted scroll cannot do.
    if (link.classList.contains("skip")) return;
    const id = link.getAttribute("href");
    if (!id || id === "#") return;
    const target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: calm.matches ? "auto" : "smooth", block: "start" });
    if (history.replaceState) history.replaceState(null, "", id);
  });

  // --- Header state (the one authored motion moment) ------------------------
  const onScroll = () => {
    document.body.classList.toggle("is-scrolled", window.scrollY > 8);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  // --- Marks the section you are reading in the navigation -------------------
  const navLinks = Array.from(document.querySelectorAll(".links a[href^='#']"));
  const sections = navLinks
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);

  if (sections.length && "IntersectionObserver" in window) {
    const spy = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const id = `#${entry.target.id}`;
          navLinks.forEach((link) => {
            if (link.getAttribute("href") === id) link.setAttribute("aria-current", "true");
            else link.removeAttribute("aria-current");
          });
        });
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    sections.forEach((section) => spy.observe(section));
  }

  // --- Section entrances ----------------------------------------------------
  // One block per section, once. Rows and cards never enter one by one.
  const revealTargets = document.querySelectorAll("[data-reveal]");
  if (revealTargets.length && "IntersectionObserver" in window) {
    document.documentElement.classList.add("js-reveal");
    let observerAnswered = false;
    const revealObserver = new IntersectionObserver(
      (entries) => {
        observerAnswered = true;
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -6% 0px" },
    );
    revealTargets.forEach((target) => revealObserver.observe(target));
    // Safety net: the entrance is decoration, the text is the content. If the
    // observer never calls back — a blocked script, a browser that refuses it —
    // everything is shown rather than left invisible.
    window.setTimeout(() => {
      if (observerAnswered) return;
      revealTargets.forEach((target) => target.classList.add("is-visible"));
    }, 1500);
  }

  // --- Contact form ---------------------------------------------------------
  const form = document.getElementById("contact-form");
  if (!form) return;

  const loadedAt = Date.now();
  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const V = {
    n: (v) => (!v ? "Please enter your name." : ""),
    e: (v) =>
      !v ? "Please enter your email address." : EMAIL.test(v) ? "" : "Please enter a valid email address.",
    s: (v) =>
      !v ? "Please enter a subject." : v.length < 3 ? "Please enter a subject of at least 3 characters." : "",
    d: (v) =>
      !v
        ? "Please enter your message."
        : v.length < 15
          ? "Please write a little more — at least 15 characters."
          : "",
  };
  // Field id -> id of the element that shows its error message.
  const E = { n: "en", e: "ee", s: "es", d: "ed" };
  // Server error key -> field id.
  const MAP = { name: "n", email: "e", subject: "s", message: "d" };

  const status = document.getElementById("ok");
  let hideTimer = null;

  function showStatus(text, good) {
    clearTimeout(hideTimer);
    status.textContent = text;
    status.dataset.type = good ? "success" : "error";
    if (good) hideTimer = setTimeout(hideStatus, 6000);
  }

  function hideStatus() {
    clearTimeout(hideTimer);
    hideTimer = null;
    status.textContent = "";
    status.dataset.type = "";
  }

  function check(id) {
    const input = document.getElementById(id);
    const message = V[id](input.value.trim());
    input.setAttribute("aria-invalid", message ? "true" : "false");
    input.setAttribute("aria-describedby", E[id]);
    document.getElementById(E[id]).textContent = message;
    return message;
  }

  Object.keys(V).forEach((id) => {
    const input = document.getElementById(id);
    input.addEventListener("blur", () => {
      if (input.value.trim() || input.getAttribute("aria-invalid") === "true") check(id);
    });
    input.addEventListener("input", () => {
      if (input.getAttribute("aria-invalid") === "true") check(id);
      if (status.dataset.type === "error") hideStatus();
    });
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const button = document.getElementById("sb");
    if (button.disabled) return;
    hideStatus();

    let first = null;
    for (const id of Object.keys(V)) {
      if (check(id) && !first) first = id;
    }
    if (first) {
      document.getElementById(first).focus();
      return;
    }

    const value = (id) => document.getElementById(id).value.trim();
    button.disabled = true;
    button.textContent = "Sending…";

    let sent = false;
    let message = "Something went wrong while sending. Please try again, or email me directly.";

    try {
      const response = await fetch("/api/contact", {
        signal:
          window.AbortSignal && AbortSignal.timeout ? AbortSignal.timeout(25000) : undefined,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: value("n"),
          email: value("e"),
          subject: value("s"),
          type: value("t"),
          budget: value("b"),
          timeline: value("tl"),
          message: value("d"),
          website: value("hp"),
          elapsed: Date.now() - loadedAt,
        }),
      });

      const json = await response.json().catch(() => ({}));
      if (response.ok && json.ok === true) {
        sent = true;
      } else {
        if (response.status === 400 && json.errors) {
          let shown = false;
          for (const key in json.errors) {
            const id = MAP[key];
            if (!id) continue;
            document.getElementById(id).setAttribute("aria-invalid", "true");
            document.getElementById(E[id]).textContent = json.errors[key];
            shown = true;
          }
          if (shown) message = "Please correct the highlighted fields and send again.";
        }
        if (response.status === 404) {
          message =
            "The enquiry service is not reachable from this page. Please email janeshdevadula8@gmail.com instead.";
        } else if (response.status === 429) {
          message = "Too many enquiries from this connection. Please try again later.";
        }
      }
    } catch (err) {
      message =
        "I could not reach the enquiry service. Please email janeshdevadula8@gmail.com and I will pick it up from there.";
    }

    if (sent) {
      form.reset();
      Object.keys(V).forEach((id) => {
        document.getElementById(id).setAttribute("aria-invalid", "false");
        document.getElementById(E[id]).textContent = "";
      });
      showStatus("Your enquiry has been sent. I will reply from janeshdevadula8@gmail.com.", true);
    } else {
      showStatus(message, false);
    }

    button.disabled = false;
    button.textContent = "Send enquiry";
  });
})();
