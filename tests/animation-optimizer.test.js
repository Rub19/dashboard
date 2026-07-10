"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const cssPath = path.join(__dirname, "..", "ui", "animation-optimizer.css");
assert.ok(fs.existsSync(cssPath), "animation optimizer stylesheet should exist");

const css = fs.readFileSync(cssPath, "utf8");
const basePolicy = css.match(/html\.ethone-motion-optimized body :where\(\*, \*::before, \*::after\) \{([^}]*)\}/);
assert.ok(basePolicy, "optimizer should expose a global legacy-motion policy");
assert.doesNotMatch(basePolicy[1], /animation-name\s*:\s*none/, "finite legacy animations must keep their final fill state");

const keyframes = Array.from(css.matchAll(/@keyframes\s+([\w-]+)\s*\{([\s\S]*?)\n\}/g));
assert.ok(keyframes.length >= 6, "optimizer should provide the shared finite motion primitives");

for (const [, name, body] of keyframes) {
  const properties = Array.from(body.matchAll(/(?:^|[;{])\s*([a-z-]+)\s*:/gm), (match) => match[1]);
  const forbidden = properties.filter((property) => !["opacity", "transform"].includes(property));
  assert.deepEqual(forbidden, [], `${name} must animate transform and opacity only`);
}

const durationAliases = [
  "--motion-instant",
  "--motion-micro",
  "--motion-fast",
  "--motion-normal",
  "--motion-slow",
  "--motion-slower",
  "--motion-hover",
  "--motion-focus",
  "--motion-press",
  "--motion-page",
  "--motion-card",
  "--motion-sidebar",
  "--motion-modal",
  "--motion-tooltip",
  "--motion-dropdown",
  "--motion-widget",
  "--motion-notification"
];

for (const token of durationAliases) {
  assert.match(css, new RegExp(`${token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*:\\s*var\\(--motion-duration\\)`), `${token} should resolve to the canonical duration`);
}

const optimizedLegacyKeyframes = [
  "d4CounterWake",
  "d4EventWake",
  "versionSkeleton",
  "borderTrace",
  "cmdHighlightPulse",
  "ehPageIn",
  "glow",
  "glowPulse",
  "gradientShift",
  "morphBlob",
  "pomoRingPulse",
  "shimmer",
  "shimmerSlide",
  "swipeHintPulse",
  "ethoneGradientDrift",
  "ethoneComponentSkeleton",
  "ethoneDs6Skeleton",
  "ethoneDsSkeleton",
  "ethoneMotionBlurIn",
  "ethoneMotionElevation",
  "ethoneMotionExpand",
  "ethoneMotionCollapse",
  "universeJumpIn",
  "universeJumpOut",
  "ethoneNativePageIn",
  "pw-skeleton",
  "ethoneSkeleton",
  "ethoneSpaceShift",
  "ethoneUxPending",
  "ethoneUxSkeleton",
  "wb-pulse"
];

for (const name of optimizedLegacyKeyframes) {
  assert.match(css, new RegExp(`@keyframes\\s+${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{`), `${name} should be shadowed by a compositor-safe keyframe`);
}

assert.doesNotMatch(css, /@keyframes[\s\S]*?(?:filter|box-shadow|background-position|width|height|top|left|right|bottom)\s*:/, "optimizer keyframes must avoid paint and layout properties");
console.log("Animation optimizer: PASS");
