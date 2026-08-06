import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const catalogPath = path.join(root, "v8/i18n/catalog.mjs");

let content = fs.readFileSync(catalogPath, "utf8");

const declIndex = content.search(/const\s+ENTRIES\s*=\s*\{/);
if (declIndex === -1) {
  console.error("Could not find ENTRIES declaration");
  process.exit(1);
}

const objectStart = content.indexOf("{", declIndex);
let depth = 1;
let i = objectStart + 1;
let inString = false;
let escaped = false;
for (; i < content.length && depth > 0; i += 1) {
  const char = content[i];
  if (inString) {
    if (escaped) {
      escaped = false;
    } else if (char === "\\") {
      escaped = true;
    } else if (char === '"') {
      inString = false;
    }
    continue;
  }
  if (char === '"') {
    inString = true;
  } else if (char === "{") {
    depth += 1;
  } else if (char === "}") {
    depth -= 1;
  }
}

const objectEnd = i; // position after closing }
const before = content.slice(0, objectStart);
const objectSource = content.slice(objectStart, objectEnd);
const after = content.slice(objectEnd);

const entries = new Function("return " + objectSource)();
const lines = Object.entries(entries).map(([key, value]) => {
  return `  ${JSON.stringify(key)}: ${JSON.stringify(value)}`;
});
const compactObject = `{\n${lines.join(",\n")}\n}`;

content = before + compactObject + after;
fs.writeFileSync(catalogPath, content);
console.log(`Compacted catalog ENTRIES: ${objectSource.length} source bytes -> ${compactObject.length} source bytes (${lines.length} entries).`);
