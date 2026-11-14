const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const ask = document.querySelector("#ask-chat");
const chat = document.querySelector("#chat");
const input = document.querySelector("#ci");
const log = document.querySelector("#cl");

ask.click();
await sleep(400);

const opened = chat.classList.contains("open");
const expanded = ask.getAttribute("aria-expanded");
const focusedAfterOpen = document.activeElement === input;

// Ask a question and wait for the reply to land.
input.value = "Which technologies are listed in the stack section? Answer in one sentence.";
document.querySelector("#cfm").dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));

let reply = "";
for (let i = 0; i < 60; i += 1) {
  await sleep(1000);
  const bots = Array.from(log.querySelectorAll(".msg.bot"));
  const last = bots[bots.length - 1];
  const text = last ? last.textContent : "";
  if (text && !text.includes("Writing a reply")) {
    reply = text;
    break;
  }
}

// Close it again and check where focus lands.
document.querySelector("#cx").click();
await sleep(300);
const focusAfterClose = document.activeElement ? document.activeElement.id || document.activeElement.tagName : null;

return {
  opened,
  expanded,
  focusedAfterOpen,
  replyLength: reply.length,
  reply: reply.slice(0, 220),
  closed: !chat.classList.contains("open"),
  expandedAfterClose: ask.getAttribute("aria-expanded"),
  focusAfterClose,
};
