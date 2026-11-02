import assert from "node:assert/strict";
import test from "node:test";
import { FOOT_PAGES, MAIN_PAGES, pageExists } from "./navigation.ts";

test("la navigation suit l'ordre des domaines", () => {
  assert.deepEqual(MAIN_PAGES.map(({ id }) => id), ["home", "modules", "productivity", "files", "mail", "tracker", "games", "discord", "brain", "team", "insights"]);
});

test("les pages secondaires restent séparées du parcours principal", () => {
  assert.deepEqual(FOOT_PAGES.map(({ id }) => id), ["settings"]);
});

test("seules les pages réellement livrées sont reconnues", () => {
  assert.equal(pageExists("home"), true);
  assert.equal(pageExists("inconnue"), false);
});
