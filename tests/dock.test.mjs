import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { NAVIGATION_ITEMS } from "../v8/data/navigation.mjs";
import { DEFAULT_DOCK_IDS, moveDockItem, moveDockItemBefore, normalizeDockOrder } from "../v8/ui/dock.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFileSync(path.join(ROOT, file), "utf8");

test("Dock preferences keep only unique registered applications", () => {
  const available = new Set(NAVIGATION_ITEMS.map(({ id }) => id));
  assert.ok(DEFAULT_DOCK_IDS.length >= 6);
  assert.equal(new Set(DEFAULT_DOCK_IDS).size, DEFAULT_DOCK_IDS.length);
  DEFAULT_DOCK_IDS.forEach((id) => assert.ok(available.has(id)));
  assert.deepEqual(normalizeDockOrder(["brain", "missing", "brain", "home"]), ["brain", "home"]);
  assert.deepEqual(normalizeDockOrder(null), [...DEFAULT_DOCK_IDS]);
  assert.deepEqual(normalizeDockOrder([]), []);
});

test("Dock reordering is deterministic for drag and keyboard controls", () => {
  assert.deepEqual(moveDockItem(["home", "notes", "brain"], "brain", -1), ["home", "brain", "notes"]);
  assert.deepEqual(moveDockItem(["home", "notes", "brain"], "home", -1), ["home", "notes", "brain"]);
  assert.deepEqual(moveDockItemBefore(["home", "notes", "brain"], "brain", "home"), ["brain", "home", "notes"]);
});

test("Dock exposes persistent mouse and keyboard personalization", () => {
  const source = read("v8/ui/dock.mjs");
  const shell = read("v8/ui/shell.mjs");
  const runtime = read("v8/app/app-runtime.mjs");
  const i18n = read("v8/i18n/runtime.mjs");
  assert.match(source, /ethone:v8-dock:/);
  assert.match(source, /draggable:\s*touchMode\s*\?\s*null\s*:\s*"true"/);
  assert.match(source, /editorControl\("toggle"/);
  assert.match(source, /editorControl\("left"/);
  assert.match(source, /getLayerManager/);
  assert.match(source, /closeOnEscape:\s*true/);
  assert.match(source, /closeOnOutside:\s*true/);
  assert.match(source, /\["Enter", " "\]\.includes\(event\.key\)[\s\S]*current\.click\(\)/);
  assert.match(source, /compactPinnedItems/);
  assert.match(source, /Appui long sur une app du Dock/);
  assert.match(source, /data-dock-command="toggle"/);
  assert.match(shell, /id="v8-dock-host"/);
  assert.doesNotMatch(shell, /v8-route-tabs/);
  assert.match(runtime, /profileId:\s*options\.profile\?\.id/);
  assert.match(i18n, /dockRemove:[\s\S]*Remove \{value\} from Dock/);
  assert.match(i18n, /dockMoveRight:[\s\S]*Move \{value\} right/);
});

test("Dock visual system floats, magnifies and respects reduced motion", () => {
  const styles = read("v8/styles/shell.css");
  const host = styles.match(/\.v8-dock-host\s*\{[^}]*\}/s)?.[0] || "";
  const entrance = styles.match(/@keyframes v8-dock-enter\s*\{[\s\S]*?\n\}/)?.[0] || "";
  assert.match(host, /position:\s*fixed/);
  assert.match(host, /bottom:\s*(?!0(?:px)?\b)/);
  assert.match(styles, /\.v8-floating-dock\s*\{[^}]*backdrop-filter:/s);
  assert.match(styles, /\.v8-dock-app:hover[^\{]*\{[^}]*transform:[^}]*scale\((?:1\.[1-9]|[2-9])/s);
  assert.match(styles, /\.v8-dock-app\.is-active::after/);
  assert.match(entrance, /opacity:/);
  assert.match(entrance, /transform:/);
  assert.doesNotMatch(entrance, /(?:width|height|top|left|margin|padding|filter)\s*:/);
  assert.match(styles, /prefers-reduced-motion[\s\S]*\.v8-dock-app/);
  assert.match(styles, /padding:[^;]*v8-mobile-dock-clearance[^;]*safe-area-inset-bottom/);
  assert.match(styles, /\.v8-dock-launcher\s*\{/);
  assert.match(styles, /\.v8-dock-apps\s*\{[^}]*overflow:\s*visible/s);
});
