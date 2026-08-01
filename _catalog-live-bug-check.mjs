import fs from "node:fs";
import path from "node:path";
import { V8_SOURCE_KEYS, sourceEntry } from "./v8/i18n/catalog.mjs";

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith(".mjs") && path.resolve(full) !== path.resolve("v8/i18n/catalog.mjs")) out.push(full);
  }
  return out;
}

const files = walk("v8");
const contents = files.map((f) => ({ f, text: fs.readFileSync(f, "utf8") }));

function quotedForms(s) {
  const dq = `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  const sq = `'${s.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
  return [dq, sq];
}

function findUsages(str) {
  const hits = [];
  for (const [dq, sq] of [quotedForms(str)]) {}
  const forms = quotedForms(str);
  for (const { f, text } of contents) {
    for (const form of forms) {
      if (text.includes(form)) { hits.push(f); break; }
    }
  }
  return hits;
}

let liveBugs = [];
let noSourceMatch = [];

for (const key of V8_SOURCE_KEYS) {
  const entry = sourceEntry(key);
  if (!entry || entry.fr === key) continue;
  const accented = entry.fr;
  const accentedHits = findUsages(accented);
  const unaccentedHits = findUsages(key);
  if (accentedHits.length > 0) {
    liveBugs.push({ key, accented, accentedHits, unaccentedHits });
  } else if (unaccentedHits.length === 0) {
    noSourceMatch.push({ key, accented });
  }
}

console.log(`=== CONFIRMED LIVE BUGS (exact quoted accented string found in source) — ${liveBugs.length} ===`);
for (const { key, accented, accentedHits, unaccentedHits } of liveBugs) {
  console.log(`${JSON.stringify(key)} -> ${JSON.stringify(accented)}`);
  console.log(`   accented in: ${accentedHits.map((f) => f.replace(/^v8[\\/]/, "")).join(", ")}`);
  if (unaccentedHits.length) console.log(`   ALSO unaccented in: ${unaccentedHits.map((f) => f.replace(/^v8[\\/]/, "")).join(", ")}`);
}
console.log(`\n=== NO EXACT MATCH EITHER FORM (dead entry or dynamic construction) — ${noSourceMatch.length} ===`);
for (const { key, accented } of noSourceMatch) {
  console.log(`${JSON.stringify(key)} -> ${JSON.stringify(accented)}`);
}
