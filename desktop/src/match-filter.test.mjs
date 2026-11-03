import assert from "node:assert/strict";
import test from "node:test";
import { filterActive, keepMatch, NO_FILTER, options } from "./match-filter.ts";

const line = { won: false, draw: false, mode: "Compétition", pick: "Jett" };

test("the result filter keeps wins or losses, a draw is neither", () => {
  assert.equal(keepMatch({ ...NO_FILTER, result: "win" }, { ...line, won: true }), true);
  assert.equal(keepMatch({ ...NO_FILTER, result: "win" }, line), false);
  assert.equal(keepMatch({ ...NO_FILTER, result: "loss" }, line), true);
  assert.equal(keepMatch({ ...NO_FILTER, result: "loss" }, { ...line, draw: true }), false);
});

test("mode and pick combine, and no filter keeps everything", () => {
  assert.equal(keepMatch(NO_FILTER, line), true);
  assert.equal(keepMatch({ ...NO_FILTER, mode: "Compétition", pick: "Jett" }, line), true);
  assert.equal(keepMatch({ ...NO_FILTER, mode: "Non classé" }, line), false);
  assert.equal(keepMatch({ ...NO_FILTER, pick: "Sage" }, line), false);
  assert.equal(filterActive(NO_FILTER), false);
  assert.deepEqual(options(["b", "", "a", "b"]), ["a", "b"]);
});
