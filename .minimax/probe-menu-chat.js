const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const menu = document.querySelector("#menu");
const links = document.querySelector("#links");
const ask = document.querySelector("#ask-chat");
const chat = document.querySelector("#chat");
const input = document.querySelector("#ci");

const id = (el) => (el ? el.id || el.className || el.tagName : null);

// Open the mobile menu, then use the assistant entry inside it.
menu.click();
await sleep(250);
const menuOpen = links.classList.contains("open");
const askVisible = ask.getClientRects().length > 0;

ask.click();
await sleep(400);
const chatOpen = chat.classList.contains("open");
const menuClosedAfterAsk = !links.classList.contains("open");
const focusInInput = document.activeElement === input;

// Escape closes the panel; focus must land somewhere usable.
document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
await sleep(250);
const closedByEscape = !chat.classList.contains("open");
const focusAfterEscape = id(document.activeElement);

return {
  menuOpen,
  askVisible,
  chatOpen,
  menuClosedAfterAsk,
  focusInInput,
  closedByEscape,
  focusAfterEscape,
  askStillVisible: ask.getClientRects().length > 0,
};
