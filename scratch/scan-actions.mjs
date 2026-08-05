import fs from "node:fs";

const actionsReg = fs.readFileSync("v8/core/actions.mjs", "utf8");
const registered = new Set();
for (const m of actionsReg.matchAll(/register\(\s*["']([^"']+)["']/g)) {
  registered.add(m[1]);
}

const referenced = new Map(); // id -> array of files
function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = `${d}/${e.name}`;
    if (e.isDirectory() && e.name !== "node_modules" && e.name !== ".git") {
      walk(p);
    } else if (e.isFile() && p.endsWith(".mjs")) {
      const c = fs.readFileSync(p, "utf8");
      const m1 = c.match(/actionId:\s*["']([^"']+)["']/g) || [];
      const m2 = c.match(/\.dispatch\(\s*["']([^"']+)["']/g) || [];
      for (const s of m1.concat(m2)) {
        const id = s.split(/["']/)[1];
        if (id && id.startsWith("v8.")) {
          if (!referenced.has(id)) referenced.set(id, []);
          referenced.get(id).push(p);
        }
      }
    }
  }
}
walk("v8");

console.log("=== MISSING ACTION REGISTRATIONS ===");
for (const [id, files] of referenced.entries()) {
  if (!registered.has(id)) {
    console.log(`MISSING: ${id} (in ${Array.from(new Set(files)).join(", ")})`);
  }
}
