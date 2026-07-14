import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import { commandHudIntent } from "../v8/command/command-center.mjs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("Command HUD keyboard navigation wraps and never leaves the search flow", () => {
  assert.deepEqual(commandHudIntent({ key: "ArrowDown" }, 2, 3), { type: "select", index: 0 });
  assert.deepEqual(commandHudIntent({ key: "ArrowUp" }, 0, 3), { type: "select", index: 2 });
  assert.deepEqual(commandHudIntent({ key: "Tab" }, 0, 3), { type: "select", index: 1 });
  assert.deepEqual(commandHudIntent({ key: "Tab", shiftKey: true }, 0, 3), { type: "select", index: 2 });
  assert.deepEqual(commandHudIntent({ key: "Home" }, 2, 5), { type: "select", index: 0 });
  assert.deepEqual(commandHudIntent({ key: "End" }, 0, 5), { type: "select", index: 4 });
  assert.deepEqual(commandHudIntent({ key: "PageDown" }, 0, 8), { type: "select", index: 5 });
  assert.deepEqual(commandHudIntent({ key: "PageUp" }, 1, 8), { type: "select", index: 4 });
  assert.deepEqual(commandHudIntent({ key: "Enter" }, 1, 3), { type: "execute" });
  assert.deepEqual(commandHudIntent({ key: "p", ctrlKey: true }, 1, 3), { type: "pin" });
  assert.deepEqual(commandHudIntent({ key: "k", metaKey: true }, 1, 3), { type: "close" });
  assert.equal(commandHudIntent({ key: "a" }, 1, 3), null);
});

test("Command HUD exposes active result semantics and a complete keyboard legend", () => {
  const source = read("v8/command/command-center.mjs");
  assert.match(source, /aria-activedescendant/);
  assert.match(source, /aria-keyshortcuts/);
  assert.match(source, /v8-command-result-\$\{index\}/);
  assert.match(source, /is-command-hud-open/);
  assert.match(source, /text:\s*"Ctrl P"/);
  assert.match(source, /history\?\.togglePin\(selected\.id\)/);
  assert.match(source, /renderResults\(selected\?\.id\)/);
});

test("Ctrl K toggles one HUD and its visual treatment stays GPU-oriented", () => {
  const runtime = read("v8/app/app-runtime.mjs");
  const styles = read("v8/styles/shell.css");
  assert.match(runtime, /commandOpen\s*\?\s*"v8\.command\.close"\s*:\s*"v8\.command\.open"/);
  assert.match(styles, /\.v8-shell\.is-command-hud-open \.v8-stage-wrap\s*\{[^}]*transform:\s*scale\(/s);
  assert.match(styles, /\.v8-command-layer\s*\{[^}]*backdrop-filter:\s*blur\(/s);
  assert.match(styles, /\.v8-command-dialog\s*\{[^}]*opacity:\s*0[^}]*transform:/s);
  assert.doesNotMatch(styles.match(/\.v8-shell\.is-command-hud-open \.v8-stage-wrap\s*\{[^}]*\}/s)?.[0] || "", /(?:width|height|top|left|margin|padding)\s*:/);
});
