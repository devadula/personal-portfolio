// Page behaviour: menu, scroll reveal, contact form (moved out of index.html so a strict Content-Security-Policy works).
document.getElementById("yr").textContent = new Date().getFullYear();
const m = document.querySelector(".menu"),
  l = document.getElementById("links");
m.addEventListener("click", () => {
  const o = l.classList.toggle("open");
  m.setAttribute("aria-expanded", o);
});
l.addEventListener("click", (e) => {
  if (e.target.tagName === "A") {
    l.classList.remove("open");
    m.setAttribute("aria-expanded", "false");
  }
});
const io = new IntersectionObserver(
  (es) =>
    es.forEach((x) => {
      if (x.isIntersecting) {
        x.target.classList.add("in");
        io.unobserve(x.target);
      }
    }),
  { threshold: 0.08 },
);
document.querySelectorAll(".rv").forEach((el) => io.observe(el));
const f = document.getElementById("contact-form"),
  loadedAt = Date.now(),
  EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const V = {
  n: (v) => (!v ? "Please enter your name." : ""),
  e: (v) =>
    !v
      ? "Please enter your email address."
      : EMAIL.test(v)
        ? ""
        : "Please enter a valid email address.",
  s: (v) =>
    !v
      ? "Please enter a subject."
      : v.length < 3
        ? "Please enter a subject (at least 3 characters)."
        : "",
  d: (v) =>
    !v
      ? "Please enter your message."
      : v.length < 15
        ? "Please enter your message (at least 15 characters)."
        : "",
};
const E = { n: "en", e: "ee", s: "es", d: "ed" };
function check(id) {
  const i = document.getElementById(id),
    m = V[id](i.value.trim());
  i.setAttribute("aria-invalid", m ? "true" : "false");
  i.setAttribute("aria-describedby", E[id]);
  document.getElementById(E[id]).textContent = m;
  return m;
}
Object.keys(V).forEach((id) => {
  const i = document.getElementById(id);
  i.addEventListener("blur", () => {
    if (i.value.trim() || i.getAttribute("aria-invalid") === "true")
      check(id);
  });
  i.addEventListener("input", () => {
    if (i.getAttribute("aria-invalid") === "true") check(id);
  });
});
const MAP = { name: "n", email: "e", subject: "s", message: "d" };
const box = document.getElementById("ok");
let hideTimer = null;
function showMsg(text, good) {
  clearTimeout(hideTimer);
  box.dataset.type = good ? "success" : "error";
  box.style.borderColor = good ? "#3ddc97" : "#ff8b8b";
  box.textContent = text;
  box.style.display = "block";
  if (good) hideTimer = setTimeout(hideMsg, 4000);
}
function hideMsg() {
  clearTimeout(hideTimer);
  hideTimer = null;
  box.style.display = "none";
  box.textContent = "";
  box.dataset.type = "";
}
Object.keys(V).forEach((id) =>
  document.getElementById(id).addEventListener("input", () => {
    if (box.dataset.type === "error") hideMsg();
  }),
);
f.addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = document.getElementById("sb");
  if (btn.disabled) return;
  hideMsg();
  let first = null;
  for (const id of Object.keys(V)) {
    if (check(id) && !first) first = id;
  }
  if (first) {
    document.getElementById(first).focus();
    return;
  }
  const g = (id) => document.getElementById(id).value.trim();
  btn.disabled = true;
  btn.textContent = "Sending...";
  let sent = false,
    msg = "Something went wrong. Please try again.";
  try {
    const r = await fetch("/api/contact", {
          signal: window.AbortSignal && AbortSignal.timeout ? AbortSignal.timeout(25000) : undefined,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: g("n"),
        email: g("e"),
        subject: g("s"),
        type: g("t"),
        budget: g("b"),
        timeline: g("tl"),
        message: g("d"),
        website: g("hp"),
        elapsed: Date.now() - loadedAt,
      }),
    });
    const j = await r.json().catch(() => ({}));
    if (r.ok && j.ok === true) {
      sent = true;
    } else {
      if (r.status === 400 && j.errors) {
        let shown = false;
        for (const k in j.errors) {
          const id = MAP[k];
          if (id) {
            document
              .getElementById(id)
              .setAttribute("aria-invalid", "true");
            document.getElementById(E[id]).textContent = j.errors[k];
            shown = true;
          }
        }
        if (shown) msg = "Please correct the highlighted fields.";
      }
      if (j.detail) msg += " [Developer details] " + j.detail;
      if (r.status === 404)
        msg +=
          " [Developer details] The /api/contact service was not found. Start the site with npm run dev instead of opening index.html.";
    }
  } catch (err) {
    if (location.hostname === "localhost")
      msg +=
        " [Developer details] Could not reach the server. Start the site with npm run dev.";
  }
  if (sent) {
    f.reset();
    Object.keys(V).forEach((id) => {
      document.getElementById(id).setAttribute("aria-invalid", "false");
      document.getElementById(E[id]).textContent = "";
    });
    showMsg("Your message has been sent successfully!", true);
  } else showMsg(msg, false);
  btn.disabled = false;
  btn.textContent = "Send";
});
