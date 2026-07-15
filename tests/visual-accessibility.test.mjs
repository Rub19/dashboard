import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const tokens = fs.readFileSync(new URL("../v8/styles/tokens.css", import.meta.url), "utf8");
const base = fs.readFileSync(new URL("../v8/styles/base.css", import.meta.url), "utf8");
const components = fs.readFileSync(new URL("../v8/styles/components.css", import.meta.url), "utf8");
const activity = fs.readFileSync(new URL("../v8/styles/activity.css", import.meta.url), "utf8");
const shell = fs.readFileSync(new URL("../v8/styles/shell.css", import.meta.url), "utf8");
const shellRuntime = fs.readFileSync(new URL("../v8/ui/shell.mjs", import.meta.url), "utf8");
const forms = fs.readFileSync(new URL("../v8/ui/form-system.mjs", import.meta.url), "utf8");

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

test("default dark tokens keep body and secondary copy above WCAG AA", () => {
  assert.ok(contrast("#f4f7fa", "#171c22") >= 4.5);
  assert.ok(contrast("#c4ccd6", "#171c22") >= 4.5);
  assert.ok(contrast("#929daa", "#171c22") >= 4.5);
  assert.ok(contrast("#ff8f96", "#171c22") >= 4.5);
});

test("readability tokens never shrink essential copy below twelve pixels", () => {
  assert.match(tokens, /--v8-type-caption:\s*clamp\(0\.75rem/);
  assert.match(tokens, /--v8-type-label:\s*clamp\(0\.8125rem/);
  assert.match(tokens, /--v8-type-body-sm:\s*clamp\(0\.875rem/);
  assert.match(tokens, /--v8-type-body:\s*clamp\(0\.9375rem/);
  assert.match(base, /text-size-adjust:\s*100%/);
});

test("focus, placeholders and disabled controls remain visually explicit", () => {
  assert.match(components, /:focus-visible\s*\{[^}]*outline:\s*2px solid var\(--v8-accent\)[^}]*outline-offset:\s*2px/s);
  assert.match(components, /\.v8-input::placeholder\s*\{[^}]*opacity:\s*1/s);
  assert.match(components, /\.v8-button:disabled,[\s\S]*opacity:\s*0\.72/);
  assert.match(components, /\.v8-input:disabled\s*\{[^}]*opacity:\s*1/s);
  assert.match(shell, /\.v8-range:disabled\s*\{[^}]*opacity:\s*0\.72/s);
  assert.match(base, /@media \(forced-colors:\s*active\)/);
  assert.match(tokens, /@media \(prefers-contrast:\s*more\)/);
});

test("errors use semantic alerts and a non-color marker", () => {
  assert.match(components, /data-tone="error"\][^:]*:not\(:empty\)::before[\s\S]*content:\s*"!"/);
  assert.match(forms, /setAttribute\("role",\s*tone === "error" \? "alert" : "status"\)/);
  assert.match(forms, /setAttribute\("role",\s*normalized === "error" \? "alert" : "status"\)/);
  assert.match(
    components,
    /data-field-state="invalid"[^}]*box-shadow:[^}]*0 0 0 3px/,
    "Invalid fields need a non-color focus ring without changing their border geometry",
  );
  assert.match(
    components,
    /\.v8-input\[data-field-state="invalid"\][^}]*border-width:\s*1px[^}]*0 0 0 3px/,
    "Standalone invalid inputs must keep a stable one-pixel border and a visible ring",
  );
});

test("zoom reflow keeps dense navigation visible instead of clipping it", () => {
  assert.match(activity, /\.v8-connection-tabs\s*\{[^}]*repeat\(2,minmax\(0,1fr\)\)/s);
  assert.match(activity, /min-width:821px\) and \(max-width:1100px\)[^}]*v8-activity-filters[^{]*\{[^}]*flex-wrap:wrap/s);
  assert.match(shell, /max-width:\s*1500px\)[\s\S]*v8-home-brain__signals\s*\{[^}]*repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(shell, /min-width:\s*821px\) and \(max-width:\s*1100px\)[\s\S]*v8-brain-tabs\s*\{[^}]*flex-wrap:wrap/s);
  assert.match(shellRuntime, />Rechercher ou agir<\/span>/);
});
