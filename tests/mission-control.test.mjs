import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { WORKSPACES } from "../v8/data/workspaces.mjs";
import { missionTargetIndex } from "../v8/ui/mission-control.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFileSync(path.join(ROOT, file), "utf8");

test("workspace catalog owns every Space, Flow and live widget once", () => {
  assert.deepEqual(WORKSPACES.map(({ id }) => id), ["personal", "focus", "studio"]);
  assert.equal(new Set(WORKSPACES.map(({ flow }) => flow)).size, WORKSPACES.length);
  WORKSPACES.forEach((workspace) => {
    assert.match(workspace.actionId, /^v8\.space\./);
    assert.equal(workspace.widgets.length, 4);
    assert.equal(new Set(workspace.widgets.map(({ actionId }) => actionId)).size, 4);
  });
});

test("Mission Control arrow navigation wraps without losing keyboard focus", () => {
  assert.equal(missionTargetIndex("ArrowRight", 2, 3), 0);
  assert.equal(missionTargetIndex("ArrowDown", 0, 3), 1);
  assert.equal(missionTargetIndex("ArrowLeft", 0, 3), 2);
  assert.equal(missionTargetIndex("ArrowUp", 1, 3), 0);
  assert.equal(missionTargetIndex("Home", 2, 3), 0);
  assert.equal(missionTargetIndex("End", 0, 3), 2);
  assert.equal(missionTargetIndex("Escape", 1, 3), null);
  assert.equal(missionTargetIndex("ArrowDown", 0, 0), null);
});

test("Mission Control exposes every requested system surface", () => {
  const source = read("v8/ui/mission-control.mjs");
  const runtime = read("v8/app/app-runtime.mjs");
  ["Spaces", "Flows", "Fenêtres", "Dashboards", "Widgets ouverts", "Activités Brain"].forEach((label) => assert.match(source, new RegExp(`"${label}"`)));
  assert.match(source, /dataset:\s*\{[^}]*missionItem:/s);
  assert.match(source, /category\s*===\s*"brain"/);
  assert.match(source, /aria-current/);
  assert.match(source, /v8\.dashboard\.\$\{workspace\.id\}/);
  assert.match(source, /event\.key === "Enter"[\s\S]*focused\.click\(\)/);
  assert.match(runtime, /activity:\s*\(\)\s*=>\s*activityJournal\.entries\(\)/);
  assert.match(runtime, /event\.key\s*===\s*"F2"/);
});

test("Mission Control motion recedes the shell without layout animation", () => {
  const styles = read("v8/styles/shell.css");
  const recession = styles.match(/\.v8-shell\.is-mission-control-open \.v8-stage-wrap\s*\{[^}]*\}/s)?.[0] || "";
  const entrance = styles.match(/@keyframes v8-mission-item-enter\s*\{[\s\S]*?\n\}/)?.[0] || "";
  assert.match(recession, /transform:\s*scale\(/);
  assert.doesNotMatch(recession, /(?:width|height|top|left|margin|padding)\s*:/);
  assert.match(entrance, /opacity:/);
  assert.match(entrance, /transform:/);
  assert.doesNotMatch(entrance, /(?:width|height|top|left|margin|padding|filter)\s*:/);
  assert.match(styles, /prefers-reduced-motion[\s\S]*\.v8-mission-item/);
});
