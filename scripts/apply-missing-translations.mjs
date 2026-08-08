import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MISSING_TRANSLATIONS } from "./missing-translations.mjs";
import { MISSING_TRANSLATIONS as MISSING_TRANSLATIONS_SUPPLEMENT } from "./missing-translations-supplement.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const catalogPath = path.join(root, "v8/i18n/catalog.mjs");
let catalog = fs.readFileSync(catalogPath, "utf8");

const allMissing = { ...MISSING_TRANSLATIONS, ...MISSING_TRANSLATIONS_SUPPLEMENT };
const entries = Object.entries(allMissing)
  .map(([key, { en, es, de }]) => {
    const fr = key;
    return `  ${JSON.stringify(fr)}: { "fr": ${JSON.stringify(fr)}, "en": ${JSON.stringify(en)}, "es": ${JSON.stringify(es)}, "de": ${JSON.stringify(de)} }`;
  })
  .join(",\n");

const insertMarker = "  // -- missing translations --\n";
const existingMarkerIndex = catalog.indexOf(insertMarker);
if (existingMarkerIndex !== -1) {
  const endEntries = catalog.lastIndexOf("\n};\n");
  catalog = catalog.slice(0, existingMarkerIndex - 2) + catalog.slice(endEntries);
}

const endEntries = catalog.lastIndexOf("\n};\n");
if (endEntries === -1) throw new Error("Could not find end of ENTRIES object");
catalog = catalog.slice(0, endEntries) + ",\n" + insertMarker + entries + "\n" + catalog.slice(endEntries + 1);

fs.writeFileSync(catalogPath, catalog);
console.log(`Applied ${Object.keys(MISSING_TRANSLATIONS).length} missing translations.`);
