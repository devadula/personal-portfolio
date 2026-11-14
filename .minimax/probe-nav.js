const rect = (el) => {
  const r = el.getBoundingClientRect();
  return {
    x: Math.round(r.x),
    right: Math.round(r.right),
    w: Math.round(r.width),
    h: Math.round(r.height),
  };
};

const fab = document.querySelector("#cf");
const ask = document.querySelector("#ask-chat");
const links = document.querySelector("#links");
const bar = document.querySelector("header .wrap");

const fabR = fab.getBoundingClientRect();
const fabOn = getComputedStyle(fab).display !== "none" && fabR.width > 0;
const askR = ask.getBoundingClientRect();
const askOn = getComputedStyle(ask).display !== "none" && askR.width > 0;

const controls = Array.from(
  document.querySelectorAll(
    "main input:not([tabindex='-1']), main textarea, main select, main button, main a.btn, main a[href$='.pdf']",
  ),
).filter((c) => c.getBoundingClientRect().width > 0);

// A floating button can sit over anything that scrolls under it, so the test is
// horizontal: does the button's column cross a control's column?
const underFab = fabOn
  ? controls
      .filter((c) => {
        const r = c.getBoundingClientRect();
        return fabR.left < r.right && fabR.right > r.left;
      })
      .map((c) => ({ id: c.id || c.className, right: Math.round(c.getBoundingClientRect().right) }))
  : [];

const navItems = Array.from(links.children).map((c) => ({
  tag: c.tagName,
  cls: c.className,
  w: Math.round(c.getBoundingClientRect().width),
  display: getComputedStyle(c).display,
}));

const barR = bar.getBoundingClientRect();
const linksR = links.getBoundingClientRect();

return {
  viewport: { w: window.innerWidth, h: window.innerHeight },
  fabOn,
  fabRect: rect(fab),
  askOn,
  askRect: rect(ask),
  askTextVisible: ask.querySelector(".links-action-text")
    ? getComputedStyle(ask.querySelector(".links-action-text")).display !== "none"
    : null,
  barRight: Math.round(barR.right),
  linksRight: Math.round(linksR.right),
  linksOverflow: links.scrollWidth > links.clientWidth + 1,
  navItems,
  underFab,
};
