// One-off helper: WCAG contrast ratios for the palette.
const lin = (v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
const L = (hex) => {
  const h = hex.replace("#", "");
  const c = [0, 2, 4].map((i) => lin(parseInt(h.slice(i, i + 2), 16) / 255));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const R = (a, b) => {
  const x = L(a);
  const y = L(b);
  const hi = Math.max(x, y);
  const lo = Math.min(x, y);
  return (hi + 0.05) / (lo + 0.05);
};

const grounds = { paper: "#f3f2ee", surface: "#fbfaf8", wash: "#e7edf3", sunk: "#eae9e3" };
const inks = ["#54534d", "#504f4a", "#4d4c47", "#4a4944", "#43423d", "#191917"];
for (const ink of inks) {
  const row = Object.entries(grounds)
    .map(([name, g]) => `${name} ${R(ink, g).toFixed(2)}`)
    .join(" | ");
  console.log(ink, row);
}
console.log("accent #1f4d7a", Object.entries(grounds).map(([n, g]) => `${n} ${R("#1f4d7a", g).toFixed(2)}`).join(" | "));
console.log("ink-2 #43423d", Object.entries(grounds).map(([n, g]) => `${n} ${R("#43423d", g).toFixed(2)}`).join(" | "));
