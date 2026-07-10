const assert = require("node:assert/strict");
const contrast = require("../utils/color-contrast.js");

for (const accent of ["#8b5cf6", "#cba6f7", "#88c0d0", "#f59e0b", "#ffffff"]) {
  const pair = contrast.actionPair(accent, "#ffffff", 4.5);
  assert.match(pair.base, /^#[0-9a-f]{6}$/i);
  assert.match(pair.hover, /^#[0-9a-f]{6}$/i);
  assert.ok(contrast.ratio(pair.base, "#ffffff") >= 4.5, `${accent} base does not meet WCAG AA`);
  assert.ok(contrast.ratio(pair.hover, "#ffffff") >= 4.5, `${accent} hover does not meet WCAG AA`);
}

const ethone = contrast.actionPair("#8b5cf6", "#ffffff", 4.5);
assert.notEqual(ethone.base, "#8b5cf6", "ETHONE violet needs a distinct accessible action surface");
assert.ok(contrast.ratio("#b7b7bf", "#09090b") >= 4.5, "Secondary text token must meet WCAG AA");

console.log("Color contrast tests: PASS");
