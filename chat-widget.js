(function () {
  const fab = document.getElementById("cf"),
    box = document.getElementById("chat"),
    log = document.getElementById("cl"),
    inp = document.getElementById("ci"),
    sg = document.getElementById("cs"),
    form = document.getElementById("cfm"),
    sendBtn = document.getElementById("cb");
  const GREETING =
    "Hi! \uD83D\uDC4B I'm the AI assistant for this portfolio. Feel free to ask me anything about my skills, projects, experience, or background. How can I help you today?";
  // Minimal, safe Markdown: input is HTML-escaped first, links must be http(s).
  function esc(s) {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function inline(s) {
    s = esc(s);
    s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
    s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>");
    s = s.replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
    );
    return s;
  }
  function md(text) {
    let out = "",
      list = null,
      m;
    const close = () => {
      if (list) {
        out += "</" + list + ">";
        list = null;
      }
    };
    for (const ln of text.split(/\r?\n/)) {
      if ((m = ln.match(/^\s*[-*]\s+(.*)/))) {
        if (list !== "ul") {
          close();
          out += "<ul>";
          list = "ul";
        }
        out += "<li>" + inline(m[1]) + "</li>";
      } else if ((m = ln.match(/^\s*\d+[.)]\s+(.*)/))) {
        if (list !== "ol") {
          close();
          out += "<ol>";
          list = "ol";
        }
        out += "<li>" + inline(m[1]) + "</li>";
      } else if (ln.trim() === "") {
        close();
      } else {
        close();
        const hd = ln.match(/^#{1,6}\s+(.*)/);
        out += "<p>" + inline(hd ? "**" + hd[1] + "**" : ln) + "</p>";
      }
    }
    close();
    return out;
  }
  let history = [];
  let busy = false;

  function add(cls, text) {
    const d = document.createElement("div");
    d.className = "msg " + cls;
    d.textContent = text;
    log.appendChild(d);
    log.scrollTop = log.scrollHeight;
    return d;
  }

  function reset() {
    history = [];
    log.textContent = "";
    sg.style.display = "";
    add("bot", GREETING);
  }

  function toggle(open) {
    box.classList.toggle("open", open);
    fab.setAttribute("aria-expanded", open);
    if (open) {
      if (!log.children.length) add("bot", GREETING);
      inp.focus();
      // If the panel was not visible yet, try once more on the next frame.
      if (document.activeElement !== inp) requestAnimationFrame(() => inp.focus());
    } else fab.focus();
  }

  async function ask(q) {
    if (busy) return;
    busy = true;
    sendBtn.disabled = true;
    sg.style.display = "none";
    add("me", q);
    history.push({ role: "user", content: q });
    const el = add("bot", "");
    el.innerHTML =
      '<span class="typing" role="status" aria-label="Assistant is typing"><i></i><i></i><i></i></span>';
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 45000);
    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history.slice(-10), stream: true }),
        signal: ctl.signal,
      });
      const ctype = r.headers.get("content-type") || "";
      let answer = "";
      if (!r.ok || ctype.includes("application/json")) {
        const data = await r.json().catch(() => ({}));
        if (!r.ok || !data.reply) {
          const err = new Error(data.error || "Request failed");
          err.code = data.code;
          err.detail = data.detail;
          err.status = r.status;
          throw err;
        }
        answer = data.reply;
        el.innerHTML = md(answer);
      } else if (r.body && r.body.getReader) {
        // The answer arrives word by word: show it as it is written.
        const reader = r.body.getReader();
        const dec = new TextDecoder();
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          answer += dec.decode(value, { stream: true });
          el.innerHTML = md(answer);
          log.scrollTop = log.scrollHeight;
        }
        answer += dec.decode();
        el.innerHTML = md(answer);
      } else {
        answer = await r.text();
        el.innerHTML = md(answer);
      }
      if (!answer.trim()) throw new Error("Empty answer");
      history.push({ role: "assistant", content: answer });
    } catch (e) {
      history.pop();
      let msg;
      if (e.code === "not_configured")
        msg =
          "The assistant isn't set up yet, so it can't answer right now. Please use the Contact section to reach Durgajanesh.";
      else if (e.code === "visitor_limit" || e.code === "daily_limit")
        msg = "The assistant has reached its message limit for today. Please use the Contact section to reach Durgajanesh, or try again tomorrow.";
      else if (e.code === "quota" || e.code === "rate_limit")
        msg = "The assistant is busy right now. Please try again in a minute.";
      else if (e.code === "bad_request")
        msg =
          "Sorry, that message could not be processed. Please shorten it (max 500 characters) and try again.";
      else if (e.code === "timeout" || e.name === "AbortError")
        msg = "The assistant took too long to answer. Please try again.";
      else if (e.name === "TypeError" || e.status === 404)
        msg =
          "Can't reach the chat service. If you are running this locally, start the site with: npm run dev (not by opening index.html).";
      else
        msg =
          "Sorry, the assistant is unavailable right now. Please use the Contact section or email janeshdevadula8@gmail.com.";
      // The server only sends "detail" in development mode, so visitors never see technical details.
      if (e.detail) msg += "\n\n[Developer details] " + e.detail;
      el.textContent = msg;
    } finally {
      clearTimeout(timer);
      busy = false;
      sendBtn.disabled = false;
      log.scrollTop = log.scrollHeight;
    }
  }

  function submit() {
    const q = inp.value.trim();
    if (!q || busy) return;
    inp.value = "";
    inp.style.height = "";
    ask(q);
  }

  fab.addEventListener("click", () => toggle(!box.classList.contains("open")));
  document.getElementById("cx").addEventListener("click", () => toggle(false));
  document.getElementById("cc").addEventListener("click", reset);
  // Escape closes the chat from anywhere (not only when focus is inside it).
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && box.classList.contains("open")) toggle(false);
  });
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    submit();
  });
  inp.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  });
  inp.addEventListener("input", () => {
    inp.style.height = "auto";
    inp.style.height = Math.min(inp.scrollHeight, 110) + "px";
  });
  sg.querySelectorAll("button").forEach((b) =>
    b.addEventListener("click", () => ask(b.textContent)),
  );
})();
