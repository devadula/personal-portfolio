const nav = document.querySelector("#links");
const menu = document.querySelector("#menu");
const styles = Array.from(document.querySelectorAll("style, link[rel=stylesheet]")).length;

return {
  linksDisplay: nav ? getComputedStyle(nav).display : null,
  linksVisible: nav ? nav.getClientRects().length > 0 : false,
  linkCount: nav ? nav.querySelectorAll("a").length : 0,
  menuDisplay: menu ? getComputedStyle(menu).display : null,
  stylesheetTags: styles,
  bodyText: document.body.innerText.length,
};
