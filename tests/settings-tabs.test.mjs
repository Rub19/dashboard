import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

function read(relative) {
  return fs.readFileSync(new URL(`../${relative}`, import.meta.url), "utf8");
}

test("Settings' 7 sections are real tabs (only the active one rendered visible) instead of a flat always-visible stack the sidebar just scrolls to", () => {
  const source = read("v8/pages/settings.mjs");
  assert.match(source, /role: "tablist", "aria-orientation": "vertical", "aria-label": "Sections des réglages"/);
  const sectionIds = ["v8-settings-profile", "v8-settings-appearance", "v8-settings-brain", "v8-settings-sounds", "v8-settings-workspace", "v8-settings-system", "v8-settings-developer"];
  sectionIds.forEach((id) => {
    assert.match(source, new RegExp(`id: "${id}", className: "v8-settings-section v8-surface", attributes: \\{ role: "tabpanel", tabindex: "0"(, hidden: true)?\\s*\\}`));
  });
  // Only the first section (Profil) should start visible; the other 6 must start hidden.
  const hiddenCount = (source.match(/className: "v8-settings-section v8-surface", attributes: \{ role: "tabpanel", tabindex: "0", hidden: true \}/g) || []).length;
  assert.equal(hiddenCount, 6, "expected exactly 6 of the 7 settings sections to start hidden");
});

test("clicking or arrow-keying a Settings nav tab shows only its panel and updates aria-selected/tabindex, instead of smooth-scrolling to an already-visible section", () => {
  const source = read("v8/pages/settings.mjs");
  assert.doesNotMatch(source, /scrollIntoView/);
  assert.match(source, /function activateSection\(button, focus = false\) \{/);
  assert.match(source, /page\.querySelectorAll\("\.v8-settings-section"\)\.forEach\(\(panel\) => \{ panel\.hidden = panel\.id !== button\.dataset\.settingsSection; \}\);/);
  assert.match(source, /entry\.setAttribute\("aria-selected", String\(active\)\);/);
  assert.match(source, /entry\.tabIndex = active \? 0 : -1;/);
});

test("Settings nav supports ArrowUp/ArrowDown/Home/End keyboard navigation, matching its vertical layout (not Left/Right, which is for Brain's horizontal tab row)", () => {
  const source = read("v8/pages/settings.mjs");
  const keydownFn = source.slice(source.indexOf("function handleSectionKeydown"), source.indexOf("function handleSectionKeydown") + 400);
  assert.match(keydownFn, /if \(!\["ArrowUp", "ArrowDown", "Home", "End"\]\.includes\(event\.key\)\) return;/);
  assert.doesNotMatch(keydownFn, /ArrowLeft|ArrowRight/);
  assert.match(source, /page\.querySelector\("\.v8-settings-nav"\)\?\.addEventListener\("keydown", handleSectionKeydown/);
});

test("changing appearance settings while in Settings does not re-mount settings or kick user back to Profile tab", () => {
  const runtimeSource = read("v8/app/app-runtime.mjs");
  assert.doesNotMatch(runtimeSource, /const settingsChanged = next\.route === "settings"/);
  assert.doesNotMatch(runtimeSource, /if \(settingsChanged\) mountRoute\("settings", false\)/);
  assert.match(runtimeSource, /if \(next\.space !== previous\.space && \["home", "brain", "spaces", "flows", "settings"\]\.includes\(next\.route\)\)/);
});
