"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const report = require("./performance-inventory.js");

const budgets = Object.freeze({
  indexBytes: 225 * 1024,
  eagerJsBytes: 1050 * 1024,
  eagerCssBytes: 1250 * 1024,
  eagerJsRequests: 100,
  eagerCssRequests: 45,
  largestEagerJsBytes: 130 * 1024,
  largestEagerCssBytes: 420 * 1024,
});

test("startup resources stay within the ETHONE release budget", () => {
  assert.ok(report.index.bytes <= budgets.indexBytes, `index.html is ${report.index.kb} KB`);
  assert.ok(report.totals.eagerJs.bytes <= budgets.eagerJsBytes, `eager JS is ${report.totals.eagerJs.kb} KB`);
  assert.ok(report.totals.eagerCss.bytes <= budgets.eagerCssBytes, `eager CSS is ${report.totals.eagerCss.kb} KB`);
  assert.ok(report.totals.eagerJs.count <= budgets.eagerJsRequests, `${report.totals.eagerJs.count} eager JS requests`);
  assert.ok(report.totals.eagerCss.count <= budgets.eagerCssRequests, `${report.totals.eagerCss.count} eager CSS requests`);
});

test("a single startup asset cannot silently dominate the bundle", () => {
  const eagerJs = report.topEager.filter((item) => item.kind === "js");
  const eagerCss = report.topEager.filter((item) => item.kind === "css");
  const largestJs = eagerJs[0];
  const largestCss = eagerCss[0];

  assert.ok(largestJs && largestJs.bytes <= budgets.largestEagerJsBytes, `${largestJs?.url} is ${largestJs?.kb} KB`);
  assert.ok(largestCss && largestCss.bytes <= budgets.largestEagerCssBytes, `${largestCss?.url} is ${largestCss?.kb} KB`);
});

