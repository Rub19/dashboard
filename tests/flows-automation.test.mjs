import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

function read(relative) {
  return fs.readFileSync(new URL(`../${relative}`, import.meta.url), "utf8");
}

test("Flows are wired to Brain's automation engine: existing space-triggered rules render on the flow row, new ones can be attached inline", () => {
  const page = read("v8/pages/system.mjs");
  assert.match(page, /import \{ AUTOMATION_ACTIONS, actionLabel \} from "\.\.\/core\/automation-engine\.mjs";/);
  assert.match(page, /function automationsForSpace\(spaceId\) \{/);
  assert.match(page, /rule\.trigger\.type === "space" && rule\.trigger\.value === spaceId/);
  assert.match(page, /actions\.dispatch\("v8\.automation\.create", \{ trigger: \{ type: "space", value: spaceId \}, targetActionId: select\.value \}\)/);
  assert.match(page, /actions\.dispatch\("v8\.automation\.toggle", \{ id: toggle\.dataset\.flowAutomationToggle \}\)/);
  assert.match(page, /actions\.dispatch\("v8\.automation\.remove", \{ id: remove\.dataset\.flowAutomationDelete \}\)/);
  assert.match(page, /const attachableActions = AUTOMATION_ACTIONS\.filter\(\(entry\) => entry\.group !== "space"\)/);

  const runtime = read("v8/app/app-runtime.mjs");
  assert.match(runtime, /mountFlows\(shell\.stage, \{ repository, actions, state: store\.getState\(\), subscribeState: store\.subscribe, notify: \(notice\) => toasts\.show\(notice\) \}\)/);

  const styles = read("v8/styles/shell.css");
  assert.match(styles, /\.v8-flow-row__automations \{/);
  assert.match(styles, /\.v8-flow-automation \{/);
});
