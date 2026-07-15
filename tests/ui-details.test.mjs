import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import { computeTooltipPosition } from "../v8/ui/tooltip.mjs";

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), "utf8");

test("tooltip positioning prefers the requested side when it fits", () => {
  const position = computeTooltipPosition({
    anchor: { left: 100, right: 140, top: 100, bottom: 140, width: 40, height: 40 },
    tooltip: { width: 80, height: 30 },
    viewport: { width: 500, height: 400 },
    preferred: "right"
  });

  assert.deepEqual(position, { placement: "right", x: 150, y: 105 });
});

test("tooltip positioning flips and clamps inside the viewport", () => {
  const flipped = computeTooltipPosition({
    anchor: { left: 450, right: 490, top: 100, bottom: 140, width: 40, height: 40 },
    tooltip: { width: 80, height: 30 },
    viewport: { width: 500, height: 400 },
    preferred: "right"
  });
  const clamped = computeTooltipPosition({
    anchor: { left: 5, right: 25, top: 5, bottom: 25, width: 20, height: 20 },
    tooltip: { width: 120, height: 60 },
    viewport: { width: 100, height: 80 },
    preferred: "top"
  });

  assert.deepEqual(flipped, { placement: "left", x: 360, y: 105 });
  assert.equal(clamped.x, 8);
  assert.equal(clamped.y, 8);
});

test("global detail primitives are bounded, accessible, and low cost", () => {
  const tooltip = read("../v8/ui/tooltip.mjs");
  const toast = read("../v8/ui/toast.mjs");
  const base = read("../v8/styles/base.css");
  const components = read("../v8/styles/components.css");
  const entry = read("../v8/styles/entry.css");
  const shell = read("../v8/styles/shell.css");
  const activity = read("../v8/styles/activity.css");
  const workspaces = read("../v8/styles/workspaces.css");
  const allCss = [base, components, entry, shell, activity, workspaces].join("\n");

  assert.doesNotMatch(tooltip, /requestAnimationFrame|setInterval|MutationObserver|ResizeObserver/);
  assert.match(tooltip, /role", "tooltip"/);
  assert.match(tooltip, /aria-describedby/);
  assert.match(tooltip, /removeEventListener/);
  assert.match(components, /\.v8-tooltip\s*\{/);
  assert.match(components, /\.v8-tooltip\.is-visible/);
  assert.match(components, /max-width:\s*min\(240px, calc\(100vw - 16px\)\)/);
  assert.match(components, /prefers-reduced-motion:\s*reduce[\s\S]*\.v8-tooltip/);

  assert.match(toast, /v8-toast--action/);
  assert.match(components, /\.v8-toast--action\s*\{[\s\S]*grid-template-columns:\s*auto minmax\(0, 1fr\) auto auto/);
  assert.match(components, /\.v8-toast--success\.is-timed::after/);
  assert.match(components, /\.v8-toast--warning\.is-timed::after/);
  assert.match(components, /\.v8-toast--error\.is-timed::after/);

  assert.match(base, /scrollbar-color:\s*var\(--v8-scrollbar\) transparent/);
  assert.match(base, /scrollbar-width:\s*thin/);
  assert.match(components, /\.v8-skeleton\s*\{[\s\S]*position:\s*relative/);
  assert.match(components, /\.v8-skeleton::after\s*\{[\s\S]*position:\s*absolute/);
  assert.doesNotMatch(allCss, /font-size:\s*(?:8|9|10|11)px/);

  assert.match(entry, /safe-area-inset-top/);
  assert.match(entry, /scrollbar-gutter:\s*stable both-edges/);
  assert.match(shell, /\.v8-command-results[^{]*\{[^}]*scrollbar-gutter:\s*stable/);
  assert.match(shell, /\.v8-mission-dialog[^{]*\{[^}]*100dvh/);
  assert.doesNotMatch(shell, /\.v8-mission-dialog[^{]*\{[^}]*100vh/);
  assert.match(components, /@media \(max-width: 900px\)[\s\S]*\.v8-state-skeleton__grid[\s\S]*repeat\(2/);
  assert.match(components, /@media \(max-width: 620px\)[\s\S]*\.v8-state-skeleton__grid[\s\S]*minmax\(0, 1fr\)/);
});
