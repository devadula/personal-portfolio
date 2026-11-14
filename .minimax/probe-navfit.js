const bar = document.querySelector("header .wrap");
const nav = document.querySelector(".nav");
const brand = document.querySelector(".brand");
const links = document.querySelector("#links");

const rect = (el) => {
  const r = el.getBoundingClientRect();
  return {
    x: Math.round(r.x),
    right: Math.round(r.right),
    w: Math.round(r.width),
  };
};

const navChildren = Array.from(nav.children).map((c) => ({
  cls: c.className,
  ...rect(c),
}));

const doc = document.documentElement;

return {
  viewport: { w: window.innerWidth },
  docScrollWidth: doc.scrollWidth,
  horizontalOverflow: doc.scrollWidth > window.innerWidth + 1,
  bar: rect(bar),
  nav: rect(nav),
  navScrollWidth: nav.scrollWidth,
  navClientWidth: nav.clientWidth,
  brand: { ...rect(brand), fontSize: getComputedStyle(brand).fontSize },
  links: rect(links),
  linksGap: getComputedStyle(links).gap,
  navChildren,
};
