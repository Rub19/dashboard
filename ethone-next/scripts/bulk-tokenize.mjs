import fs from "node:fs";
import path from "node:path";

const patterns = [
  { re: /\btext-white\b(?!\d|\/)/g, sub: "text-[var(--text-primary)]" },
  { re: /text-white\/\[([\d.]+)\]/g, sub: "text-[var(--text-primary)]/[$1]" },
  { re: /\bbg-white\b(?!\d|\/)/g, sub: "bg-[var(--text-primary)]" },
  { re: /bg-white\/\[([\d.]+)\]/g, sub: "bg-[var(--text-primary)]/[$1]" },
  { re: /\bborder-white\b(?!\d|\/)/g, sub: "border-[var(--text-primary)]" },
  { re: /border-white\/\[([\d.]+)\]/g, sub: "border-[var(--text-primary)]/[$1]" },
  { re: /\bring-white\b(?!\d|\/)/g, sub: "ring-[var(--text-primary)]" },
  { re: /ring-white\/\[([\d.]+)\]/g, sub: "ring-[var(--text-primary)]/[$1]" },
  { re: /\btext-zinc-(?:50|100|200|300)\b(?!\d|\/)/g, sub: "text-[var(--text-primary)]" },
  { re: /text-zinc-(?:50|100|200|300)\/\[([\d.]+)\]/g, sub: "text-[var(--text-primary)]/[$1]" },
  { re: /\btext-zinc-(?:400|500|600)\b(?!\d|\/)/g, sub: "text-[var(--text-muted)]" },
  { re: /text-zinc-(?:400|500|600)\/\[([\d.]+)\]/g, sub: "text-[var(--text-muted)]/[$1]" },
  { re: /\bbg-zinc-950\b(?!\d|\/)/g, sub: "bg-[var(--background)]" },
  { re: /bg-zinc-950\/\[([\d.]+)\]/g, sub: "bg-[var(--background)]/[$1]" },
  { re: /\bborder-zinc-950\b(?!\d|\/)/g, sub: "border-[var(--background)]" },
  { re: /border-zinc-950\/\[([\d.]+)\]/g, sub: "border-[var(--background)]/[$1]" },
  { re: /bg-black\/\[([\d.]+)\]/g, sub: "bg-[var(--background)]/[$1]" },
];

function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (p.endsWith(".tsx") || p.endsWith(".ts")) {
      let s = fs.readFileSync(p, "utf8");
      const o = s;
      patterns.forEach(({ re, sub }) => { s = s.replace(re, sub); });
      if (s !== o) { console.log("updated", p); fs.writeFileSync(p, s); }
    }
  }
}

walk("C:/Users/storm/dashboard/ethone-next/components");
