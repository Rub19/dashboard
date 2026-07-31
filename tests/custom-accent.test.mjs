import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

function read(relative) {
  return fs.readFileSync(new URL(`../${relative}`, import.meta.url), "utf8");
}

test("the store accepts and persists an arbitrary hex custom accent color, syncing it locally and to the cloud", async () => {
  const { createPresentationStore } = await import("../v8/core/store.mjs");
  const calls = [];
  const storage = {
    getItem: () => null,
    setItem: (key, value) => calls.push([key, value])
  };
  const store = createPresentationStore({}, { storage });

  store.setState({ accent: "custom", customAccentColor: "#FF00AA" });
  assert.equal(store.getState().accent, "custom");
  assert.equal(store.getState().customAccentColor, "#ff00aa");
  assert.equal(store.cloudSnapshot().customAccentColor, "#ff00aa");

  const persistedRaw = calls.at(-1)[1];
  assert.match(persistedRaw, /"customAccentColor":"#ff00aa"/);

  // Garbage input falls back to the default rather than corrupting state.
  store.setState({ accent: "custom", customAccentColor: "not-a-color" });
  assert.equal(store.getState().customAccentColor, "#7be5c3");
});

test("the store restores an unrecognized accent to the default instead of erroring", async () => {
  const { createPresentationStore } = await import("../v8/core/store.mjs");
  const store = createPresentationStore({ accent: "ultraviolet" }, { storage: null });
  assert.equal(store.getState().accent, "mint");
});

test("the custom accent action validates the hex value and applies it via setState", () => {
  const source = read("v8/core/actions.mjs");
  assert.match(source, /register\("v8\.accent\.custom", \(context = \{\}\) => \{/);
  assert.match(source, /if \(!\/\^#\[0-9a-f\]\{6\}\$\/i\.test\(value\)\) return unavailable\("Couleur invalide\."\);/);
  assert.match(source, /setState\(\{ accent: "custom", customAccentColor: value\.toLowerCase\(\) \}\);/);
});

test("app-runtime applies the custom accent CSS variable at boot and on every relevant state change", () => {
  const source = read("v8/app/app-runtime.mjs");
  assert.match(source, /function applyAccent\(nextState\) \{/);
  assert.match(source, /document\.documentElement\.style\.setProperty\("--v8-custom-accent-color", nextState\.customAccentColor\);/);
  assert.match(source, /applyAccent\(store\.getState\(\)\);/);
  assert.match(source, /if \(next\.accent !== previous\.accent \|\| next\.customAccentColor !== previous\.customAccentColor\) applyAccent\(next\);/);
});

test("tokens.css defines a custom accent variant driven entirely by color-mix off one custom property", () => {
  const tokens = read("v8/styles/tokens.css");
  assert.match(tokens, /:root\[data-accent="custom"\] \{/);
  assert.match(tokens, /--v8-accent: var\(--v8-custom-accent-color\);/);
  assert.match(tokens, /--v8-accent-hover: color-mix\(in srgb, var\(--v8-custom-accent-color\) 86%, white\);/);
  assert.match(tokens, /--v8-accent-pressed: color-mix\(in srgb, var\(--v8-custom-accent-color\) 80%, black\);/);
});

test("Settings renders a live color-picker swatch for the custom accent, wired to commit on change and preview on input, and keeps every accent swatch's active state in sync with the store (a pre-existing gap for the presets too)", () => {
  const source = read("v8/pages/settings.mjs");
  assert.match(source, /attributes: \{ type: "color", value: customAccentInitial, "aria-label": "Choisir une couleur d'accent personnalisee" \}/);
  assert.match(source, /customColorInput\.addEventListener\("change", \(event\) => \{\s*commitSetting\(event\.currentTarget, "v8\.accent\.custom"/);
  assert.match(source, /customColorInput\.addEventListener\("input", \(event\) => \{\s*customColorSwatch\.style\.setProperty\("--v8-accent-swatch-custom-color", event\.currentTarget\.value\);/);
  assert.match(source, /page\.querySelectorAll\("\[data-action\^='v8\.accent\.'\]"\)\.forEach\(\(button\) => \{/);
});
