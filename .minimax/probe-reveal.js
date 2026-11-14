const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const blocks = Array.from(document.querySelectorAll("[data-reveal]"));
const hidden = () =>
  blocks.filter((b) => Number(getComputedStyle(b).opacity) < 0.99).length;

await sleep(2600); // the check measures 2.4 s after load

const stillHidden = hidden();
const text = blocks.length ? blocks[0].textContent.trim().slice(0, 40) : "";

return {
  revealBlocks: blocks.length,
  stillHidden,
  firstBlock: text,
  visible: blocks.length > 0 ? Number(getComputedStyle(blocks[0]).opacity) : 1,
};
