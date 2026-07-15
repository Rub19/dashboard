import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { exceedsTouchSlop, isVirtualKeyboardOpen } from "../v8/ui/touch-interactions.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFileSync(path.join(ROOT, file), "utf8");

test("touch slop distinguishes a tap from a scroll gesture", () => {
  assert.equal(exceedsTouchSlop(10, 10, 16, 17, 10), false);
  assert.equal(exceedsTouchSlop(10, 10, 24, 10, 10), true);
});

test("virtual keyboard detection ignores ordinary resize noise", () => {
  assert.equal(isVirtualKeyboardOpen(844, 550, true), true);
  assert.equal(isVirtualKeyboardOpen(844, 790, true), false);
  assert.equal(isVirtualKeyboardOpen(844, 550, false), false);
});

test("global touch manager owns long press and mobile keyboard recovery", () => {
  const source = read("v8/ui/touch-interactions.mjs");
  const main = read("v8/main.mjs");
  assert.match(source, /\(max-width: 820px\), \(pointer: coarse\)/);
  assert.match(source, /LONG_PRESS_SELECTOR[\s\S]*data-task-id[\s\S]*data-file-entry[\s\S]*data-profile-id/);
  assert.match(source, /visualViewport[\s\S]*scrollIntoView/);
  assert.match(source, /dataset\.v8MobileKeyboard/);
  assert.match(source, /removeEventListener\("pointerdown"/);
  assert.match(main, /createTouchInteractionManager/);
  assert.match(main, /touchInteractions\.destroy\(\)/);
});

test("mobile design tokens guarantee touch targets and Dock clearance", () => {
  const tokens = read("v8/styles/tokens.css");
  const components = read("v8/styles/components.css");
  const shell = read("v8/styles/shell.css");
  const workspaces = read("v8/styles/workspaces.css");
  const activity = read("v8/styles/activity.css");
  const entry = read("v8/styles/entry.css");
  const panels = read("v8/ui/panel.mjs");
  const mobileDockAnimation = shell.match(/@keyframes v8-dock-enter-mobile\s*\{[\s\S]*?\n\}/)?.[0] || "";
  assert.match(tokens, /--v8-touch-target:\s*44px/);
  assert.match(components, /@media \(max-width: 820px\)[\s\S]*min-height:\s*var\(--v8-touch-target\)/);
  assert.match(components, /\.v8-collection-density > button,[\s\S]*width:\s*var\(--v8-touch-target\)/);
  assert.match(shell, /--v8-mobile-dock-clearance/);
  assert.match(shell, /margin-bottom:\s*calc\(var\(--v8-mobile-dock-clearance\) - var\(--v8-mobile-status-height\)\)/);
  assert.match(shell, /@keyframes v8-dock-enter-mobile/);
  assert.match(mobileDockAnimation, /translate3d/);
  assert.doesNotMatch(mobileDockAnimation, /scale\(/);
  assert.match(shell, /\.v8-dock-apps\s*\{[^}]*overflow:\s*visible/s);
  assert.match(shell, /\.v8-dock-editor__actions \.v8-icon-button\s*\{[^}]*width:var\(--v8-touch-target\)[^}]*height:var\(--v8-touch-target\)/s);
  assert.match(shell, /is-command-hud-open[^}]*\.v8-stage\s*\{\s*overflow:\s*hidden/);
  assert.match(shell, /v8-mobile-dock-clearance[^}]*env\(safe-area-inset-bottom\)/);
  assert.match(shell, /data-v8-mobile-keyboard="open"[\s\S]*v8-dock-host/);
  assert.match(shell, /max-height:620px[\s\S]*:has\(input:focus/);
  assert.match(shell, /\.v8-brain-tabs\s*\{\s*position:static;flex-wrap:wrap;overflow:visible/);
  assert.match(workspaces, /\.v8-notes-list\s*\{[\s\S]*overflow:\s*visible/);
  assert.match(activity, /\.v8-activity-filters,\.v8-connection-categories\{flex-wrap:wrap;overflow:visible\}/);
  assert.match(entry, /has-profile-dialog \.v8-profile-select__main\s*\{\s*overflow:\s*hidden/);
  assert.match(panels, /classList\.add\("has-open-panel"\)[\s\S]*classList\.remove\("has-open-panel"\)/);
  assert.doesNotMatch(workspaces, /@media \(max-width: 480px\)[\s\S]*\.v8-calendar-toolbar\s*\{[^}]*overflow-x:\s*auto/);
  assert.match(workspaces, /\.v8-files-toolbar__tools > \.v8-collection-density\s*\{[^}]*grid-column:\s*1 \/ -1/s);
});
