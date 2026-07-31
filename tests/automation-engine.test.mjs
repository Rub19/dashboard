import assert from "node:assert/strict";
import test from "node:test";

import {
  AUTOMATION_ACTIONS,
  AUTOMATION_TRIGGER_TYPES,
  actionLabel,
  createAutomationWatcher,
  matchRules,
  sanitizeAutomationRule,
  sanitizeAutomationRules,
  sanitizeAutomationTrigger,
  triggerLabel
} from "../v8/core/automation-engine.mjs";
import { createActionFacade } from "../v8/core/actions.mjs";
import { createPresentationStore } from "../v8/core/store.mjs";

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key)
  };
}

test("trigger types cover route, space and time", () => {
  assert.deepEqual(AUTOMATION_TRIGGER_TYPES, ["route", "space", "time"]);
});

test("every automation action id maps to a real dispatchable v8 action namespace", () => {
  assert.ok(AUTOMATION_ACTIONS.length > 0);
  AUTOMATION_ACTIONS.forEach((entry) => {
    assert.match(entry.id, /^v8\.(space|density|theme)\./);
    assert.ok(entry.label.length > 0);
  });
});

test("sanitizeAutomationTrigger falls back to safe defaults for unknown values", () => {
  assert.deepEqual(sanitizeAutomationTrigger({ type: "route", value: "notes" }), { type: "route", value: "notes" });
  assert.deepEqual(sanitizeAutomationTrigger({ type: "space", value: "bogus" }), { type: "space", value: "focus" });
  assert.deepEqual(sanitizeAutomationTrigger({ type: "time", value: "9:00" }), { type: "time", value: "09:00" });
  assert.deepEqual(sanitizeAutomationTrigger({ type: "time", value: "14:30" }), { type: "time", value: "14:30" });
  assert.deepEqual(sanitizeAutomationTrigger({}), { type: "route", value: "home" });
});

test("sanitizeAutomationRule rejects an unknown action id", () => {
  const rule = sanitizeAutomationRule({ id: "auto-1", actionId: "v8.danger.delete-everything", trigger: { type: "space", value: "focus" } });
  assert.equal(rule.actionId, AUTOMATION_ACTIONS[0].id);
  assert.equal(rule.enabled, true);
});

test("sanitizeAutomationRules drops duplicates and caps the list at 20", () => {
  const input = Array.from({ length: 25 }, (_, index) => ({ id: `auto-${index % 10}`, actionId: "v8.theme.day", trigger: { type: "route", value: "home" } }));
  const rules = sanitizeAutomationRules(input);
  assert.equal(rules.length, 10);
  assert.equal(new Set(rules.map((rule) => rule.id)).size, 10);
});

test("actionLabel and triggerLabel produce readable French copy", () => {
  assert.equal(actionLabel("v8.theme.day"), "Theme Jour");
  assert.equal(actionLabel("v8.unknown"), "v8.unknown");
  assert.match(triggerLabel({ type: "time", value: "09:00" }), /09:00/);
  assert.match(triggerLabel({ type: "space", value: "focus" }), /Focus/);
});

test("matchRules only returns enabled rules whose trigger matches the event", () => {
  const rules = sanitizeAutomationRules([
    { id: "a", enabled: true, actionId: "v8.theme.day", trigger: { type: "route", value: "notes" } },
    { id: "b", enabled: false, actionId: "v8.theme.night", trigger: { type: "route", value: "notes" } },
    { id: "c", enabled: true, actionId: "v8.space.focus", trigger: { type: "space", value: "focus" } }
  ]);
  const fired = matchRules(rules, { type: "route", value: "notes" });
  assert.deepEqual(fired.map((rule) => rule.id), ["a"]);
});

test("createAutomationWatcher only fires on actual route, space and time transitions", () => {
  const rules = sanitizeAutomationRules([
    { id: "route-rule", enabled: true, actionId: "v8.theme.day", trigger: { type: "route", value: "notes" } },
    { id: "space-rule", enabled: true, actionId: "v8.space.focus", trigger: { type: "space", value: "focus" } },
    { id: "time-rule", enabled: true, actionId: "v8.theme.night", trigger: { type: "time", value: "09:00" } }
  ]);
  const watcher = createAutomationWatcher({ getRules: () => rules });
  watcher.prime({ route: "home", space: "personal", localTime: "08:59" });

  assert.deepEqual(watcher.check({ route: "home", space: "personal", localTime: "08:59" }), []);
  assert.deepEqual(watcher.check({ route: "notes", space: "personal", localTime: "08:59" }).map((rule) => rule.id), ["route-rule"]);
  assert.deepEqual(watcher.check({ route: "notes", space: "personal", localTime: "08:59" }), []);
  assert.deepEqual(watcher.check({ route: "notes", space: "focus", localTime: "09:00" }).map((rule) => rule.id).sort(), ["space-rule", "time-rule"]);
});

test("v8.automation.* actions create, toggle, remove and run rules through the store", () => {
  const store = createPresentationStore({}, { storage: memoryStorage() });
  const actions = createActionFacade({ getState: store.getState, setState: store.setState });

  const created = actions.dispatch("v8.automation.create", { trigger: { type: "space", value: "focus" }, targetActionId: "v8.theme.day" });
  assert.equal(created.ok, true);
  assert.equal(store.getState().brainPreferences.automations.length, 1);
  const rule = store.getState().brainPreferences.automations[0];
  assert.equal(rule.actionId, "v8.theme.day");
  assert.equal(rule.enabled, true);

  const toggled = actions.dispatch("v8.automation.toggle", { id: rule.id });
  assert.equal(toggled.ok, true);
  assert.equal(store.getState().brainPreferences.automations[0].enabled, false);

  const ran = actions.dispatch("v8.automation.run", { id: rule.id });
  assert.equal(ran.ok, true);
  assert.equal(store.getState().theme, "day");

  const missing = actions.dispatch("v8.automation.run", { id: "does-not-exist" });
  assert.equal(missing.ok, false);

  const removed = actions.dispatch("v8.automation.remove", { id: rule.id });
  assert.equal(removed.ok, true);
  assert.equal(store.getState().brainPreferences.automations.length, 0);
  actions.destroy();
});
