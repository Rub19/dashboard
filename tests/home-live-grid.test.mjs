import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

function read(relative) {
  return fs.readFileSync(new URL(`../${relative}`, import.meta.url), "utf8");
}

test("Home wraps every live host in a single responsive grid instead of a long vertical stack", () => {
  const source = read("v8/pages/home.mjs");
  assert.match(source, /const liveGrid = element\("div", \{ className: "v8-home-live-grid" \}, \[/);
  assert.match(source, /liveGrid,\s*\n\s*briefingEnabled \? brainStrip : null/);
  ["spotifyHost", "discordHost", "weatherHost", "minecraftHost", "steamHost", "githubHost", "redditHost"].forEach((host) => {
    assert.match(source, new RegExp(host));
  });
});

test("Home collapses the live grid when every host is hidden, without polling or observers (perf discipline)", () => {
  const source = read("v8/pages/home.mjs");
  assert.match(source, /function syncLiveGridVisibility\(\) \{\s*liveGrid\.hidden = \[\.\.\.liveGrid\.children\]\.every\(\(host\) => host\.hidden\);\s*\}/);
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
});
