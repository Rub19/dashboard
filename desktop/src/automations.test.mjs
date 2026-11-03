import assert from "node:assert/strict";
import test from "node:test";
import { clockKey, inQuietHours, interactionStats, rulesForPage, rulesForTime } from "./automations.ts";

const rule = (id, enabled, trigger) => ({ id, enabled, trigger, action: { type: "look", value: "aurora" } });

test("rules fire on their minute or their page, only when enabled", () => {
  const rules = [rule("a", true, { type: "time", value: "09:05" }), rule("b", false, { type: "time", value: "09:05" }), rule("c", true, { type: "page", value: "mail" })];
  const at = new Date(2026, 10, 3, 9, 5);
  assert.equal(clockKey(at), "09:05");
  assert.deepEqual(rulesForTime(rules, at).map(({ id }) => id), ["a"]);
  assert.deepEqual(rulesForTime(rules, new Date(2026, 10, 3, 9, 6)), []);
  assert.deepEqual(rulesForPage(rules, "mail").map(({ id }) => id), ["c"]);
});

test("quiet hours handle the night and can be off", () => {
  const at = (hour, minute = 0) => new Date(2026, 10, 3, hour, minute);
  assert.equal(inQuietHours(at(23), true, "22:00", "08:00"), true);
  assert.equal(inQuietHours(at(7, 59), true, "22:00", "08:00"), true);
  assert.equal(inQuietHours(at(8), true, "22:00", "08:00"), false);
  assert.equal(inQuietHours(at(13), true, "12:00", "14:00"), true);
  assert.equal(inQuietHours(at(23), false, "22:00", "08:00"), false);
  assert.equal(inQuietHours(at(23), true, "10:00", "10:00"), false);
});

test("interactions are counted by kind, most frequent first", () => {
  assert.deepEqual(interactionStats([{ eventType: "a" }, { eventType: "b" }, { eventType: "b" }, {}]), [["b", 2], ["a", 1], ["other", 1]]);
});
