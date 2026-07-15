import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), "utf8");

test("the global layout grid is driven by shared rhythm tokens", () => {
  const tokens = read("../v8/styles/tokens.css");
  const shell = read("../v8/styles/shell.css");

  for (const token of [
    "page-max",
    "page-gutter",
    "section-gap",
    "major-gap",
    "column-gap",
    "card-padding",
    "toolbar-height",
    "rail-width",
    "panel-width",
    "inspector-width",
    "dashboard-columns"
  ]) assert.match(tokens, new RegExp(`--v8-layout-${token}:`), `missing --v8-layout-${token}`);

  assert.match(shell, /\.v8-page\s*\{[\s\S]*?width:\s*min\(100%, var\(--v8-layout-page-max\)\)[\s\S]*?padding:\s*var\(--v8-layout-section-gap\) var\(--v8-layout-page-gutter\)/);
  assert.match(shell, /\.v8-page-heading\s*\{[\s\S]*?gap:\s*var\(--v8-layout-column-gap\)[\s\S]*?margin-bottom:\s*var\(--v8-layout-section-gap\)/);
  assert.match(shell, /\.v8-home-primary,\s*\.v8-home-secondary\s*\{[^}]*grid-template-columns:\s*var\(--v8-layout-dashboard-columns\)[^}]*gap:\s*var\(--v8-layout-column-gap\)/);
  assert.match(shell, /\.v8-settings-layout\s*\{[^}]*grid-template-columns:\s*var\(--v8-layout-rail-width\) minmax\(0, 1fr\)[^}]*gap:\s*var\(--v8-layout-column-gap\)/);
  assert.match(shell, /\.v8-brain-grid\s*\{[^}]*var\(--v8-layout-panel-width\)[^}]*gap:\s*var\(--v8-layout-column-gap\)/);
  assert.match(shell, /\.v8-mission-body\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\) var\(--v8-layout-panel-width\)[^}]*padding:\s*var\(--v8-layout-card-padding\)/);
});

test("workspace toolbars and side columns share the same sizing contract", () => {
  const workspaces = read("../v8/styles/workspaces.css");
  const activity = read("../v8/styles/activity.css");
  const activityPage = read("../v8/pages/activity.mjs");

  assert.match(workspaces, /\.v8-note-toolbar,\s*\.v8-work-toolbar,\s*\.v8-files-toolbar,\s*\.v8-calendar-toolbar\s*\{[^}]*min-height:\s*var\(--v8-layout-toolbar-height\)[^}]*gap:\s*var\(--v8-layout-toolbar-gap\)[^}]*padding:\s*var\(--v8-layout-toolbar-padding-block\) var\(--v8-layout-toolbar-padding-inline\)/);

  assert.match(workspaces, /\.v8-notes-workspace\s*\{[^}]*grid-template-columns:\s*var\(--v8-layout-panel-width\) minmax\(0, 1fr\)/);
  assert.match(workspaces, /\.v8-files-workspace\s*\{[^}]*grid-template-columns:\s*var\(--v8-layout-rail-width\) minmax\(0, 1fr\) var\(--v8-layout-panel-width\)/);
  assert.match(workspaces, /\.v8-calendar-workspace\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\) var\(--v8-layout-panel-width\)/);
  assert.doesNotMatch(workspaces, /\.v8-(?:note|work|files|calendar)-toolbar[^}]*min-height:\s*58px/);

  assert.match(activity, /\.v8-activity-workspace\s*\{[^}]*var\(--v8-layout-panel-width\)[^}]*gap:\s*var\(--v8-layout-column-gap\)/);
  assert.match(activity, /\.v8-connections-workspace\s*\{[^}]*var\(--v8-layout-inspector-width\)[^}]*gap:\s*var\(--v8-layout-column-gap\)/);
  assert.match(activity, /\.v8-now-card\s*\{[^}]*padding:\s*var\(--v8-layout-card-padding\)/);
  assert.match(activity, /\.v8-connection-card\s*\{[^}]*padding:\s*var\(--v8-layout-card-padding\)/);
  assert.match(activity, /\.v8-now-card--solo\s*\{[^}]*grid-column:\s*1 \/ -1[^}]*grid-template-columns:\s*auto minmax\(0,1fr\) auto/);
  assert.match(activityPage, /systemCard\.classList\.toggle\("v8-now-card--solo", liveGrid\.children\.length === 1\)/);
});
