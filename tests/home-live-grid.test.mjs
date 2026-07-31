import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

function read(relative) {
  return fs.readFileSync(new URL(`../${relative}`, import.meta.url), "utf8");
}

test("Home wraps every live host in a single responsive grid instead of a long vertical stack", () => {
  const source = read("v8/pages/home.mjs");
  assert.match(source, /const liveGrid = element\("div", \{ className: "v8-home-live-grid" \}, \[/);
  assert.match(source, /liveSection,\s*\n\s*briefingEnabled \? brainStrip : null/);
  assert.match(source, /const liveSection = element\("section", \{ className: "v8-home-live-section" \}, \[/);
  ["spotifyHost", "discordHost", "weatherHost", "minecraftHost", "steamHost", "githubHost", "redditHost"].forEach((host) => {
    assert.match(source, new RegExp(host));
  });
});

test("Home collapses the live grid when every host is hidden, without polling or observers (perf discipline)", () => {
  const source = read("v8/pages/home.mjs");
  assert.match(source, /function syncLiveGridVisibility\(\) \{\s*const allHidden = \[\.\.\.liveGrid\.children\]\.every\(\(host\) => host\.hidden\);\s*liveGrid\.hidden = allHidden;\s*liveSection\.hidden = allHidden;\s*\}/);
  assert.match(source, /syncLiveGridVisibility\(\);/);
  assert.doesNotMatch(source, /MutationObserver|ResizeObserver|setInterval|requestAnimationFrame/);
  const calls = source.match(/syncLiveGridVisibility\(\);/g) || [];
  assert.ok(calls.length >= 18, "expected syncLiveGridVisibility() called once initially plus once per render* function");
});

test("shell.css lays the live grid out responsively and collapses it entirely when hidden", () => {
  const shell = read("v8/styles/shell.css");
  assert.match(shell, /\.v8-home-live-grid\s*\{[^}]*display:\s*grid[^}]*grid-template-columns:\s*repeat\(auto-fill,\s*minmax\(300px,\s*1fr\)\)/s);
  assert.match(shell, /\.v8-home-live-grid\[hidden\]\s*\{\s*display:\s*none;\s*\}/);
});

test("Home disconnects nothing extra on unmount beyond the 17 live subscriptions (no observer to leak)", () => {
  const source = read("v8/pages/home.mjs");
  const cleanup = source.match(/return \(\) => \{[\s\S]*?\};\s*\n\}/);
  assert.ok(cleanup, "expected a cleanup function returned from mountHome");
  assert.doesNotMatch(cleanup[0], /Observer/);
  assert.match(cleanup[0], /releaseLiveLayout\(\);/);
});

test("Home lets the user reorder and hide individual Live Now widgets, persisted via a dedicated homeLiveLayout store field (mirrors the proven Activity Hub pattern)", () => {
  const store = read("v8/core/store.mjs");
  assert.match(store, /homeLiveLayout: sanitizeActivityLiveLayout\(null\)/);
  assert.match(store, /homeLiveLayout: sanitizeActivityLiveLayout\(input\.homeLiveLayout\)/);
  assert.match(store, /homeLiveLayout: state\.homeLiveLayout,/);

  const actions = read("v8/core/actions.mjs");
  assert.match(actions, /register\("v8\.home\.live\.toggle", \(context = \{\}\) => \{/);
  assert.match(actions, /register\("v8\.home\.live\.move", \(context = \{\}\) => \{/);

  const sync = read("v8/services/supabase-state-sync.mjs");
  assert.match(sync, /"homeLiveLayout"/);

  const runtime = read("v8/app/app-runtime.mjs");
  assert.match(runtime, /mountHome\(shell\.stage, createHomeModel\(\{ snapshot: repository\.snapshot\(\) \}\), \{[\s\S]*?subscribeState: store\.subscribe \}\);/);

  const home = read("v8/pages/home.mjs");
  assert.match(home, /const HOME_LIVE_CARD_IDS = Object\.freeze\(LIVE_CARD_IDS\.filter\(\(id\) => id !== "system"\)\);/);
  assert.match(home, /function applyHostVisibility\(id, host, hasContent\) \{/);
  assert.match(home, /function applyLiveOrder\(\) \{/);
  assert.match(home, /function reapplyHiddenPreference\(\) \{/);
  assert.match(home, /function renderCustomizePanel\(\) \{/);
  assert.match(home, /customizeToggle\.addEventListener\("click", \(\) => \{\s*customizeOpen = !customizeOpen;\s*renderCustomizePanel\(\);\s*\}\);/);
  assert.match(home, /options\.subscribeState\?\.\(\(next\) => \{\s*if \(next\.homeLiveLayout === liveLayout\) return;/);
  // Every render* function must route its visibility through applyHostVisibility so user hide/show
  // preferences are respected consistently, not bypassed by a direct .hidden assignment.
  assert.doesNotMatch(home, /Host\.hidden = !card;/);
  const applyCalls = home.match(/applyHostVisibility\("[a-z-]+", \w+Host, Boolean\(card\)\);/g) || [];
  assert.equal(applyCalls.length, 16, "expected all 16 non-Spotify render* functions to call applyHostVisibility");
});
