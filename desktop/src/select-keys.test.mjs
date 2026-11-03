import assert from "node:assert/strict";
import test from "node:test";
import { nextOption, typeAhead } from "./select-keys.ts";

const options = [{ label: "Ares" }, { label: "Bandit", disabled: true }, { label: "Bulldog" }, { label: "Vandal" }];

test("arrow keys skip disabled options and stop at the ends", () => {
  assert.equal(nextOption(options, 0, "ArrowDown"), 2);
  assert.equal(nextOption(options, 2, "ArrowUp"), 0);
  assert.equal(nextOption(options, 3, "ArrowDown"), 3);
  assert.equal(nextOption(options, 0, "End"), 3);
  assert.equal(nextOption(options, 3, "Home"), 0);
  assert.equal(nextOption(options, 0, "x"), null);
});

test("typing a letter finds the next match", () => {
  assert.equal(typeAhead(options, 0, "b"), 2);
  assert.equal(typeAhead(options, 2, "V"), 3);
  assert.equal(typeAhead(options, 3, "z"), null);
});
