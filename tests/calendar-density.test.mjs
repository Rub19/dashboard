import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

function read(relative) {
  return fs.readFileSync(new URL(`../${relative}`, import.meta.url), "utf8");
}

test("Calendar exposes a density control, matching every other collection page (Tasks, Notes, Files, Activity, Connections) - a gap the earlier UI audit flagged since the page already keys its rows off the shared --density-* tokens without offering a way to change them", () => {
  const page = read("v8/pages/calendar.mjs");
  assert.match(page, /import \{ collectionDensityControl, updateCollectionDensityControl \} from "\.\.\/ui\/dense-content\.mjs";/);
  assert.match(page, /const densityControl = collectionDensityControl\(options\.state\?\.density \|\| document\.documentElement\.dataset\.density \|\| "automatic"\);/);
  assert.match(page, /element\("div", \{ className: "v8-page-heading__actions" \}, \[\s*densityControl,/);
  assert.match(page, /const releaseDensity = options\.subscribeState\?\.\(\(next\) => updateCollectionDensityControl\(densityControl, next\)\) \|\| \(\(\) => \{\}\);/);
  assert.match(page, /releaseDensity\(\);/);
});

test("app-runtime passes state and subscribeState into mountCalendar so the density control can render its initial state and stay in sync with later changes", () => {
  const runtime = read("v8/app/app-runtime.mjs");
  assert.match(runtime, /mountCalendar\(shell\.stage, \{ repository, actions, presence, notify: \(notice\) => toasts\.show\(notice\), state: store\.getState\(\), subscribeState: store\.subscribe \}\);/);
});
