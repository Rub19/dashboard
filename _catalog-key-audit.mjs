import { V8_SOURCE_KEYS, sourceEntry } from "./v8/i18n/catalog.mjs";

let count = 0;
for (const key of V8_SOURCE_KEYS) {
  const entry = sourceEntry(key);
  if (entry && entry.fr !== key) {
    count++;
    console.log(JSON.stringify(key), "->", JSON.stringify(entry.fr));
  }
}
console.log(`\nTotal mismatched keys: ${count}`);
