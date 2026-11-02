import assert from "node:assert/strict";
import test from "node:test";
import { FOOT_PAGES, MAIN_PAGES, pageExists } from "./navigation.ts";

test("la navigation commence par Accueil, Applications puis Productivité", () => {
  assert.deepEqual(MAIN_PAGES.map(({ id }) => id), ["home", "modules", "productivity"]);
});

test("les pages secondaires restent séparées du parcours principal", () => {
  assert.deepEqual(FOOT_PAGES.map(({ id }) => id), ["journal", "settings", "about"]);
});

test("seules les pages réellement livrées sont reconnues", () => {
  assert.equal(pageExists("home"), true);
  assert.equal(pageExists("discord"), false);
});
