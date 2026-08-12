import fs from "node:fs";
import path from "node:path";

const dir = "test-results";
const map = new Map();

function walk(dirPath) {
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const full = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      walk(full);
    } else if (entry.name === "error-context.md") {
      const content = fs.readFileSync(full, "utf8");
      const m = content.match(/"description": "(.+?)"/);
      const rel = path.relative(dir, full);
      const routeMatch = rel.match(/a11y-a11y-([a-z0-9-]+?)-(?:Desktop|Pixel|iPad|Mobile|Tablet|chromium)/) || rel.match(/routes-page-([a-z0-9-]+?)-loads/) || rel.match(/auth-audit/);
      const route = routeMatch ? routeMatch[1] : "unknown";
      if (m) {
        if (!map.has(route)) map.set(route, new Set());
        map.get(route).add(m[1]);
      }
    }
  }
}

walk(dir);

for (const [route, descs] of map) {
  for (const d of descs) {
    console.log(`${route} | ${d}`);
  }
}
