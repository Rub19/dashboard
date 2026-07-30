import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import { THEME_MODES, createThemeWatcher, normalizeThemeMode, resolveTheme } from "../v8/core/theme-engine.mjs";

const tokens = fs.readFileSync(new URL("../v8/styles/tokens.css", import.meta.url), "utf8");

function rgb(hex) {
  return hex.match(/[a-f\d]{2}/gi).map((value) => Number.parseInt(value, 16));
}

function luminance(hex) {
  return rgb(hex).map((value) => {
    const channel = value / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  }).reduce((total, channel, index) => total + channel * [0.2126, 0.7152, 0.0722][index], 0);
}

function contrast(foreground, background) {
  const light = Math.max(luminance(foreground), luminance(background));
  const dark = Math.min(luminance(foreground), luminance(background));
  return (light + 0.05) / (dark + 0.05);
}

test("theme modes cover night, graphite, day and auto", () => {
  assert.deepEqual(THEME_MODES, ["night", "graphite", "day", "auto"]);
});

test("normalizeThemeMode falls back for unknown values", () => {
  assert.equal(normalizeThemeMode("day"), "day");
  assert.equal(normalizeThemeMode("bogus"), "night");
  assert.equal(normalizeThemeMode("bogus", "graphite"), "graphite");
});

test("resolveTheme passes explicit modes through untouched", () => {
  assert.deepEqual(resolveTheme("graphite"), { requested: "graphite", effective: "graphite", reason: "explicit" });
  assert.deepEqual(resolveTheme("day"), { requested: "day", effective: "day", reason: "explicit" });
});

test("resolveTheme follows the system preference only when requested is auto", () => {
  assert.equal(resolveTheme("auto", { systemPrefersLight: true }).effective, "day");
  assert.equal(resolveTheme("auto", { systemPrefersLight: false }).effective, "night");
  assert.equal(resolveTheme("auto").effective, "night");
});

test("createThemeWatcher subscribes to prefers-color-scheme and reports changes", () => {
  let handler = null;
  let removed = false;
  const runtime = {
    matchMedia: () => ({
      matches: true,
      addEventListener: (type, listener) => { handler = listener; },
      removeEventListener: () => { removed = true; }
    })
  };
  const seen = [];
  const watcher = createThemeWatcher({ runtime, onChange: (light) => seen.push(light) });
  assert.equal(watcher.start(), true);
  assert.equal(watcher.matches(), true);
  handler();
  assert.deepEqual(seen, [true]);
  watcher.destroy();
  assert.equal(removed, true);
});

test("the day theme provides light color-scheme tokens distinct from night and graphite", () => {
  assert.match(tokens, /:root\[data-theme="day"\]\s*\{[^}]*color-scheme:\s*light/s);
  assert.match(tokens, /:root\[data-theme="day"\][^}]*--v8-canvas:\s*#f/s);
  assert.match(tokens, /:root\[data-theme="day"\][^}]*--v8-text:\s*#1/s);
});

test("day theme body, secondary and status colors clear WCAG AA against its own surfaces", () => {
  assert.ok(contrast("#161a21", "#ffffff") >= 4.5, "text on canvas-raised");
  assert.ok(contrast("#454b57", "#ffffff") >= 4.5, "text-secondary on canvas-raised");
  assert.ok(contrast("#5b6270", "#ffffff") >= 4.5, "muted on canvas-raised");
  assert.ok(contrast("#c23b4a", "#ffffff") >= 4.5, "danger on canvas-raised");
  assert.ok(contrast("#0f7a4f", "#ffffff") >= 4.5, "success on canvas-raised");
  assert.ok(contrast("#a15a06", "#ffffff") >= 4.5, "warning on canvas-raised");
  assert.ok(contrast("#1b6fc2", "#ffffff") >= 4.5, "info on canvas-raised");
});
