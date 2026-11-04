// Run AFTER you know your live address:   npm run set-url -- https://your-site.vercel.app
// Adds the canonical link and social-preview image tags to index.html, writes sitemap.xml
// and adds the Sitemap line to robots.txt. Safe to run again (it replaces its earlier output).
import fs from "node:fs";
import path from "node:path";
import { root } from "./env.js";

const arg = process.argv[2];
if (!arg || !/^https:\/\/[a-z0-9.-]+(:\d+)?(\/.*)?$/i.test(arg)) {
  console.log("Usage: npm run set-url -- https://your-live-address   (must start with https://)");
  process.exit(1);
}
const site = arg.replace(/\/+$/, "");

const htmlPath = path.join(root, "index.html");
let html = fs.readFileSync(htmlPath, "utf8");
const start = html.indexOf("<!-- SEO-URL-START");
const end = html.indexOf("<!-- SEO-URL-END -->");
if (start === -1 || end === -1) {
  console.log("Could not find the SEO-URL markers in index.html.");
  process.exit(1);
}
const startLineEnd = html.indexOf("-->", start) + 3;
const block = `
    <link rel="canonical" href="${site}/" />
    <meta property="og:url" content="${site}/" />
    <meta property="og:image" content="${site}/og-image.png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:image" content="${site}/og-image.png" />
    `;
html = html.slice(0, startLineEnd) + block + html.slice(end);
fs.writeFileSync(htmlPath, html);

fs.writeFileSync(
  path.join(root, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${site}/</loc></url>\n</urlset>\n`
);

const robotsPath = path.join(root, "robots.txt");
const robots = fs.readFileSync(robotsPath, "utf8").split(/\r?\n/).filter((l) => l.trim() && !/^sitemap:/i.test(l));
fs.writeFileSync(robotsPath, robots.join("\n") + `\nSitemap: ${site}/sitemap.xml\n`);

console.log(`Done. Site address set to ${site}`);
console.log("Updated: index.html (canonical + social preview tags), sitemap.xml, robots.txt. Commit and push, then redeploy.");
