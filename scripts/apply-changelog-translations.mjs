import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CHANGELOG_TRANSLATIONS } from "./changelog-translations.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const catalogPath = path.join(root, "v8/i18n/catalog.mjs");
let catalog = fs.readFileSync(catalogPath, "utf8");

const entries = Object.entries(CHANGELOG_TRANSLATIONS)
  .map(([key, { en, es, de }]) => {
    const fr = key;
    return `  ${JSON.stringify(fr)}: { "fr": ${JSON.stringify(fr)}, "en": ${JSON.stringify(en)}, "es": ${JSON.stringify(es)}, "de": ${JSON.stringify(de)} }`;
  })
  .join(",\n");

// Remove any existing changelog translations block, then insert before the closing `};` of ENTRIES
const insertMarker = "  // -- changelog translations --\n";
const existingMarkerIndex = catalog.indexOf(insertMarker);
if (existingMarkerIndex !== -1) {
  const nextMarker = catalog.indexOf("\n  // -- ", existingMarkerIndex + insertMarker.length);
  const cutTo = nextMarker === -1 ? catalog.lastIndexOf("\n};\n") : nextMarker;
  catalog = catalog.slice(0, existingMarkerIndex - 2) + catalog.slice(cutTo);
}

const endEntries = catalog.lastIndexOf("\n};\n");
if (endEntries === -1) throw new Error("Could not find end of ENTRIES object");
catalog = catalog.slice(0, endEntries) + ",\n" + insertMarker + entries + "\n" + catalog.slice(endEntries + 1);

fs.writeFileSync(catalogPath, catalog);
console.log(`Applied ${Object.keys(CHANGELOG_TRANSLATIONS).length} changelog translations.`);
