import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

function read(relative) {
  return fs.readFileSync(new URL(`../${relative}`, import.meta.url), "utf8");
}

test("both context-menu implementations (v8/ui/context-menu.mjs's .v8-context-menu and v8/ui/dense-content.mjs's row-action .v8-row-menu) truncate long item labels with an ellipsis instead of wrapping and overlapping the row below - verified live in the browser with a long label", () => {
  const shell = read("v8/styles/shell.css");
  assert.match(shell, /\.v8-context-menu__item span \{\s*overflow: hidden;\s*text-overflow: ellipsis;\s*white-space: nowrap;\s*\}/);

  const components = read("v8/styles/components.css");
  assert.match(components, /\.v8-row-menu > button span \{ min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; \}/);
});

test("breadcrumb button and context-item labels truncate on one line (white-space: nowrap was missing, letting them wrap and overflow their fixed-height pill)", () => {
  const shell = read("v8/styles/shell.css");
  assert.match(shell, /\.v8-breadcrumb-button span \{\s*overflow: hidden;\s*font-size: var\(--v8-font-xs\);\s*font-weight: var\(--v8-weight-medium\);\s*text-overflow: ellipsis;\s*white-space: nowrap;\s*\}/);
  assert.match(shell, /\.v8-breadcrumb-context__item strong \{ max-width: 92px; overflow: hidden; color: var\(--v8-text-secondary\); font-size: inherit; font-weight: var\(--v8-weight-medium\); text-overflow: ellipsis; white-space: nowrap; \}/);
});

test("density/theme choice titles and Brain permission labels truncate instead of wrapping (white-space: nowrap was missing on the title element even though ellipsis was declared)", () => {
  const shell = read("v8/styles/shell.css");
  assert.match(shell, /\.v8-density-choice strong \{ font-size:var\(--v8-font-xs\);white-space:nowrap; \}/);
  assert.match(shell, /\.v8-theme-choice strong \{ font-size:var\(--v8-font-xs\);white-space:nowrap; \}/);
  assert.match(shell, /\.v8-brain-settings-permissions strong \{ overflow:hidden;min-width:0;font-size:var\(--v8-font-xs\);text-overflow:ellipsis;white-space:nowrap; \}/);
});

test("Home/Activity live-widget customize row labels, connection inspector tabs, connection card signal meta, and compact resource links all have min-width:0 on the actual flex item holding the ellipsis rule (the flex container alone having it doesn't let the item itself shrink)", () => {
  const activity = read("v8/styles/activity.css");
  const shell = read("v8/styles/shell.css");
  assert.match(activity, /\.v8-now-customize-row__label span \{ overflow: hidden; min-width: 0; text-overflow: ellipsis; white-space: nowrap; font-size: var\(--v8-font-xs\); \}/);
  assert.match(shell, /\.v8-home-live-customize-row__label span \{ overflow: hidden; min-width: 0; text-overflow: ellipsis; white-space: nowrap; font-size: var\(--v8-font-xs\); \}/);
  assert.match(activity, /\.v8-connection-tab span \{ overflow: hidden; min-width: 0; text-overflow: ellipsis; white-space: nowrap; \}/);
  assert.match(activity, /\.v8-connection-card__signal small \{ flex: 0 1 auto; min-width: 0; margin-left: auto;/);
  assert.match(activity, /\.v8-resource-link--compact > span \{ min-width: 0; overflow: hidden; \}/);
});
