"use strict";

const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const root = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

test("lazy resources are fetched in parallel while script order stays deterministic", () => {
  const source = read("core/lazy-modules.js");

  assert.match(source, /Promise\.all\(styles\.map\(appendStyle\)\)/);
  assert.match(source, /Promise\.all\(scripts\.map\(appendScript\)\)/);
  assert.match(source, /script\.async\s*=\s*false/);
  assert.doesNotMatch(source, /styles\.reduce\([\s\S]*?appendStyle/);
  assert.doesNotMatch(source, /scripts\.reduce\([\s\S]*?appendScript/);
});

test("accessibility mutation handling stays scoped to changed subtrees", () => {
  const source = read("ui/accessibility.js");

  assert.match(source, /function applyIncremental\(root\)/);
  assert.match(source, /batch\.roots/);
  assert.doesNotMatch(source, /qsa\("\[aria-hidden\]"\)/);
});

test("dynamic background does not force layout to detect music", () => {
  const source = read("services/theme/dynamic-background.js");
  const functionBody = source.match(/function musicActive\(\)\s*\{[\s\S]*?\n\s*\}/);

  assert.ok(functionBody, "musicActive must exist");
  assert.doesNotMatch(functionBody[0], /getComputedStyle/);
  assert.match(functionBody[0], /eq\.style\.display/);
});

test("hidden authentication UI skips layout measurement", () => {
  const source = read("services/auth/premium-experience.js");
  const syncBody = source.match(/function sync\(\)\s*\{[\s\S]*?\n\s*\}/);

  assert.ok(syncBody, "sync must exist");
  assert.match(syncBody[0], /if\s*\(!visible\)\s*\{[\s\S]*?return;/);
});

test("visibility checks on navigation paths do not force synchronous layout", () => {
  const accessibility = read("ui/accessibility.js");
  const keyboard = read("ui/keyboard-first.js");
  const onboarding = read("services/onboarding/gate.js");
  const auth = read("services/auth/premium-experience.js");

  const accessibilityVisibility = accessibility.match(/function isSurfaceVisible\(element\)\s*\{[\s\S]*?\n\s*\}/);
  const keyboardVisibility = keyboard.match(/function isVisible\(element\)\s*\{[\s\S]*?\n\s*\}/);
  const onboardingVisibility = onboarding.match(/function dashboardVisible\(\)\s*\{[\s\S]*?\n\s*\}/);
  const authVisibility = auth.match(/function isVisible\(el\)\s*\{[\s\S]*?\n\s*\}/);

  assert.ok(accessibilityVisibility && keyboardVisibility && onboardingVisibility && authVisibility);
  [accessibilityVisibility[0], keyboardVisibility[0], onboardingVisibility[0]].forEach((body) => {
    assert.doesNotMatch(body, /getComputedStyle|getBoundingClientRect|getClientRects|offsetWidth|offsetHeight/);
  });
  assert.doesNotMatch(authVisibility[0], /getComputedStyle|getBoundingClientRect|getClientRects|offsetWidth|offsetHeight/);
});

test("sidebar customizer delegates drag events instead of rebinding every row", () => {
  const source = read("pages/dashboard/sidebar-customizer.js");

  assert.match(source, /function bindSidebarCustomizerDrag\(container\)/);
  assert.match(source, /container\.dataset\.dragEventsBound/);
  assert.doesNotMatch(source, /row\.addEventListener\(['"]drag/);
});

test("dashboard clock updates text only when the displayed value changes", () => {
  const source = read("widgets/clock.js");

  assert.match(source, /function ethoneSetClockText\(id,value\)/);
  assert.match(source, /element\.textContent!==value/);
  assert.doesNotMatch(source, /if\(cl\)cl\.textContent/);
});
