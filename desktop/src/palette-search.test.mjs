import assert from "node:assert/strict";
import test from "node:test";
import { matchRange, rank, remember, score } from "./palette-search.ts";

const items = [{ id: "a", label: "Réglages › Apparence" }, { id: "b", label: "Ouvrir : Kairo" }, { id: "c", label: "Productivité › Tâches" }, { id: "d", label: "Tâches rapides" }];

test("ignore les accents et demande tous les mots", () => {
  assert.equal(score("Réglages › Apparence", "reglages app"), 0);
  assert.equal(score("Réglages › Apparence", "reglages kairo"), null);
});

test("met le début de libellé devant le milieu de mot", () => {
  assert.deepEqual(rank(items, "tach", []).list.map((item) => item.id), ["d", "c"]);
  assert.equal(score("Ouvrir : Kairo", "kai"), 1);
  assert.equal(score("Ouvrir : Kairo", "air"), 2);
});

test("les récents passent devant quand la recherche est vide", () => {
  const out = rank(items, "", ["c", "disparu", "b"]);
  assert.deepEqual(out.list.map((item) => item.id), ["c", "b", "a", "d"]);
  assert.equal(out.recentCount, 2);
  assert.equal(rank(items, "kai", ["c"]).recentCount, 0);
});

test("repère la partie à surligner sans se tromper avec les accents", () => {
  assert.deepEqual(matchRange("Réglages", "regl"), [0, 4]);
  assert.equal(matchRange("Réglages", "xyz"), null);
  assert.equal(matchRange("Réglages", " "), null);
});

test("la liste des récents reste courte et sans doublon", () => {
  assert.deepEqual(remember(["a", "b"], "b"), ["b", "a"]);
  assert.equal(remember(["1", "2", "3", "4", "5"], "6").length, 5);
});
