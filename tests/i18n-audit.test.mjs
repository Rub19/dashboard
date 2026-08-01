import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import { SUPPORTED_LOCALES, V8_SOURCE_KEYS, sourceEntry } from "../v8/i18n/catalog.mjs";

function read(relative) {
  return fs.readFileSync(new URL(`../${relative}`, import.meta.url), "utf8");
}

test("createSelect propagates its trigger's translate attribute onto the floating listbox", () => {
  const source = read("v8/ui/select.mjs");
  assert.match(source, /translate:\s*trigger\.getAttribute\("translate"\)/);
});

test("language-name selects mark the whole control untranslatable at the select level, not on discarded option nodes", () => {
  const login = read("v8/entry/login.mjs");
  const panel = read("v8/ui/panel.mjs");
  const settings = read("v8/pages/settings.mjs");

  assert.match(login, /createSelect\(\{ className: "v8-entry__locale", attributes: \{ "aria-label": "Langue de l'interface", translate: "no" \} \}/);
  assert.doesNotMatch(login.slice(login.indexOf("v8-entry__locale")), /element\("option", \{ text: "Français", attributes: \{ value: "fr", translate: "no" \} \}\)/);

  assert.match(panel, /createSelect\(\{ className: "v8-input", attributes: \{ "aria-label": "Langue de l'interface", translate: "no" \} \}/);

  assert.match(settings, /attributes:\s*\{\s*"aria-label":\s*"Pack sonore",\s*disabled:\s*!soundSupported \|\| null,\s*translate:\s*"no"\s*\}/);
});

test("a representative sample of the full i18n audit (entry, activity, connections, settings, brain, live cards) is registered", () => {
  const required = [
    "Authentification",
    "Récupération du compte ETHONE",
    "Nouvel environnement",
    "Activity Hub",
    "Gerer les connexions",
    "Catalogue des intégrations",
    "Se connecter avec GitHub",
    "Density Engine",
    "Couleur d'accent",
    "Sections Brain",
    "Type de declencheur",
    "Statistiques Valorant",
    "Voir le détail météo",
    "Chaine Twitch",
    "SECURITY",
    "Tache",
    "Changer de thème"
  ];
  for (const key of required) {
    const entry = sourceEntry(key);
    assert.ok(entry, `missing translation for ${JSON.stringify(key)}`);
    for (const locale of SUPPORTED_LOCALES) assert.ok(entry[locale]?.trim(), `${key} missing ${locale}`);
  }
  // every catalog entry (including the ~350 added by this audit) has a complete, consistent locale set
  for (const key of V8_SOURCE_KEYS) {
    const entry = sourceEntry(key);
    assert.deepEqual(Object.keys(entry).sort(), [...SUPPORTED_LOCALES].sort(), `${key} has an inconsistent locale set`);
  }
});
