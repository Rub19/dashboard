import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import { brainPreferenceLabel } from "../v8/brain/preferences.mjs";
import { SUPPORTED_LOCALES, V8_SOURCE_KEYS, sourceEntry } from "../v8/i18n/catalog.mjs";

function read(relative) {
  return fs.readFileSync(new URL(`../${relative}`, import.meta.url), "utf8");
}

test("responsive shell preserves compact context and readable mobile briefing copy", () => {
  const shell = read("v8/styles/shell.css");

  assert.match(shell, /@media \(max-width:\s*1366px\) and \(min-width:\s*821px\)[\s\S]*\.v8-breadcrumb-context__item--space,[\s\S]*\.v8-breadcrumb-context__item--flow\s*\{\s*display:\s*none/);
  assert.match(shell, /\.v8-brain-settings-inline\s*>\s*\.v8-button\s*\{\s*flex:\s*0 0 auto/);
  assert.match(shell, /\.v8-briefing-signal__copy strong,[\s\S]*\.v8-briefing-signal__copy small\s*\{[\s\S]*white-space:\s*normal/);
  assert.match(shell, /\.v8-button\.v8-briefing-signal\s*\{[\s\S]*min-height:\s*92px/);
});

test("design surfaces use shared radius tokens instead of one-off pixel values", () => {
  const styles = ["activity.css", "components.css", "shell.css"].map((name) => read(`v8/styles/${name}`));

  for (const source of styles) assert.doesNotMatch(source, /border-radius:\s*[0-9]+px/);
  assert.match(styles[2], /\.v8-floating-dock\s*\{\s*border-radius:\s*var\(--v8-radius-dock\)/);
});

test("login password field opts out of decorative character counting", () => {
  const login = read("v8/entry/login.mjs");
  const forms = read("v8/ui/form-system.mjs");

  assert.match(login, /password\.node,[\s\S]{0,120}counter:\s*false/);
  assert.match(forms, /counter\s*=\s*true/);
  assert.match(forms, /root\.dataset\.counter\s*===\s*"off"\s*\?\s*null/);
});

test("Brain exposes human preference labels instead of implementation values", () => {
  const brain = read("v8/pages/brain.mjs");

  assert.equal(brainPreferenceLabel("persona", "balanced"), "Equilibre");
  assert.equal(brainPreferenceLabel("detail", "brief"), "concises");
  assert.equal(brainPreferenceLabel("detailOption", "brief"), "Concis");
  assert.equal(brainPreferenceLabel("automationLevel", "suggest-only"), "sur suggestion");
  assert.equal(brainPreferenceLabel("automationOption", "suggest-only"), "Suggestions uniquement");
  assert.doesNotMatch(brain, /Persona \$\{preferences\.persona\}/);
  assert.match(brain, /brainPreferenceLabel\("persona",\s*preferences\.persona\)/);
});

test("newly polished visible strings are translated for every supported locale", () => {
  const required = [
    "Reglages",
    "Equilibre",
    "Capturer une idee",
    "Integrations et synchronisation",
    "Voir les memoires",
    "Types de taches",
    "Style de reponse",
    "Personnalite Brain",
    "Lecture et cibles tactiles genereuses.",
    "Langue de reponse",
    "Un contexte minimal, des permissions explicites et aucune cle privee dans le navigateur.",
    "Diagnostic explicite, sans surveillance ni requete en arriere-plan."
  ];

  for (const key of required) {
    const entry = sourceEntry(key);
    assert.ok(entry, `missing translation for ${key}`);
    for (const locale of SUPPORTED_LOCALES) assert.ok(entry[locale]?.trim(), `${key} missing ${locale}`);
  }
  for (const key of V8_SOURCE_KEYS) {
    const entry = sourceEntry(key);
    assert.deepEqual(Object.keys(entry).sort(), [...SUPPORTED_LOCALES].sort(), `${key} has an inconsistent locale set`);
  }
});

test("responsive QA harness accepts viewport and route parameters", () => {
  const html = read("tests/responsive-harness.html");
  const harness = read("tests/responsive-harness.mjs");

  assert.match(html, /responsive-harness\.mjs/);
  assert.match(harness, /dimension\("width",\s*390,\s*320,\s*2560\)/);
  assert.match(harness, /dimension\("height",\s*844,\s*480,\s*1440\)/);
  assert.match(harness, /params\.get\("route"\)/);
  assert.match(harness, /frame\.src\s*=\s*`\/index\.html/);
});
