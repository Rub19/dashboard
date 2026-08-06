import { CHANGELOG, CHANGELOG_KIND_LABELS } from "../v8/data/changelog.mjs";
import { CHANGELOG_TRANSLATIONS } from "./changelog-translations.mjs";

const strings = new Set();
for (const e of CHANGELOG) {
  strings.add(e.title);
  for (const item of e.items) {
    if (item.text) strings.add(item.text);
  }
}
for (const label of Object.values(CHANGELOG_KIND_LABELS)) {
  strings.add(label);
}

const missing = [...strings].filter(Boolean).filter((s) => !CHANGELOG_TRANSLATIONS[s]);
missing.sort((a, b) => a.localeCompare(b));
console.log(`${missing.length} missing translations:`);
for (const s of missing) {
  console.log(JSON.stringify(s));
}
