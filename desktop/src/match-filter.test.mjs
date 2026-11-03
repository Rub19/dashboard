import assert from "node:assert/strict";
import test from "node:test";
import { filterActive, keepMatch, NO_FILTER, options, timeAgo } from "./match-filter.ts";

test("a match time reads like a short delay", () => {
  const now = Date.parse("2026-11-03T12:00:00Z");
  assert.equal(timeAgo("2026-11-03T11:47:00Z", now, "fr"), "il y a 13min");
  assert.equal(timeAgo("2026-11-03T10:35:00Z", now, "fr"), "il y a 1h 25min");
  assert.equal(timeAgo("2026-10-31T10:00:00Z", now, "en"), "3d ago");
  assert.equal(timeAgo(null, now, "fr"), "");
});

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
