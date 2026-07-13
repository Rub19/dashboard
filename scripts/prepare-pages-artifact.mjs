import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const output = path.join(root, "dist");
const allowed = Object.freeze([
  ".nojekyll",
  "404.html",
  "CNAME",
  "index.html",
  "manifest.webmanifest",
  "sw.js",
  "icons",
  "v8"
]);

if (path.dirname(output) !== root) throw new Error("Artifact output escaped the workspace root.");
fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });

for (const relative of allowed) {
  const source = path.join(root, relative);
  if (!fs.existsSync(source)) throw new Error(`Missing deployment source: ${relative}`);
  const destination = path.join(output, relative);
  const stat = fs.statSync(source);
  if (stat.isDirectory()) fs.cpSync(source, destination, { recursive: true });
  else {
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(source, destination);
  }
}

const publishedFiles = [];
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(absolute);
    else publishedFiles.push(path.relative(output, absolute).replaceAll("\\", "/"));
  }
}
walk(output);

const forbidden = publishedFiles.filter((file) => /^(?:actions|components|core|pages|services|state|ui|utils|widgets)\//i.test(file) || /(?:legacy|dashboard-v[1-7]|v7-os-shell)/i.test(file));
if (forbidden.length) throw new Error(`Legacy files entered the Pages artifact: ${forbidden.join(", ")}`);

console.log(`Pages artifact prepared: ${publishedFiles.length} V8-only files.`);
