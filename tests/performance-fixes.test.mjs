import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

function read(relative) {
  return fs.readFileSync(new URL(`../${relative}`, import.meta.url), "utf8");
}

test("the Command HUD search input is debounced, unlike every other keystroke-driven full-list rebuild in the app before this fix - each keystroke was rescoring the entire command catalog (translateSource() called per command per locale) synchronously", () => {
  const source = read("v8/command/command-center.mjs");
  assert.match(source, /import \{ debounce, element, icon \} from "\.\.\/ui\/dom\.mjs";/);
  assert.match(source, /const debouncedRenderResults = debounce\(\(\) => renderResults\(\), 120\);/);
  assert.match(source, /function handleInput\(\) \{\s*selectedIndex = 0;\s*debouncedRenderResults\(\);\s*\}/);
});

test("Brain's history search no longer rebuilds the entire (unfiltered) Chat tab on every keystroke - renderHistory() was doing two full rebuilds (the filtered history list AND the full chat log) even though search only affects the history list", () => {
  const source = read("v8/pages/brain.mjs");
  assert.match(source, /import \{ actionButton, debounce, element, icon \} from "\.\.\/ui\/dom\.mjs";/);
  assert.match(source, /function renderHistoryList\(\) \{/);
  assert.match(source, /function renderHistory\(\) \{\s*const entries = brain\.controller\.history\(\);\s*renderHistoryList\(\);\s*chatLog\.replaceChildren/);
  assert.match(source, /const debouncedRenderHistoryList = debounce\(renderHistoryList, 120\);/);
  assert.match(source, /historySearch\.addEventListener\("input", \(\) => \{ historyQuery = historySearch\.value; debouncedRenderHistoryList\(\); \}/);
});

test("renaming a note no longer scans every rendered row in the notes list on every keystroke - updateVisibleListTitle() now reuses the existing noteRow() lookup (which stops at the first match) instead of its own separate querySelectorAll+forEach over the full list", () => {
  const source = read("v8/pages/notes.mjs");
  assert.match(source, /function updateVisibleListTitle\(\) \{\s*const note = selectedNote\(\);\s*if \(!note\) return;\s*const title = noteRow\(note\.id\)\?\.querySelector\("strong"\);/);
  assert.doesNotMatch(source, /\[\.\.\.list\.querySelectorAll\("\[data-note-id\]"\)\]\.forEach\(\(control\) => \{\s*if \(control\.dataset\.noteId/);
});

test("the notification panel search is debounced, matching every other search box in the app (Tasks, Notes, Files, Connections, Activity)", () => {
  const source = read("v8/ui/panel.mjs");
  assert.match(source, /import \{ actionButton, debounce, element, icon \} from "\.\/dom\.mjs";/);
  assert.match(source, /const debouncedRender = debounce\(render, 120\);/);
  assert.match(source, /search\.addEventListener\("input", \(\) => \{ notificationQuery = search\.value; debouncedRender\(\); \}\);/);
});
