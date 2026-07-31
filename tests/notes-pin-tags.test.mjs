import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

function read(relative) {
  return fs.readFileSync(new URL(`../${relative}`, import.meta.url), "utf8");
}

test("notes can be pinned and tagged from the editor toolbar", () => {
  const repo = read("v8/data/profile-repository.mjs");
  assert.match(repo, /if \(Object\.hasOwn\(patch, "tags"\)\) note\.tags = \(Array\.isArray\(patch\.tags\) \? patch\.tags : \[\]\)/);
  assert.match(repo, /if \(Object\.hasOwn\(patch, "pinned"\)\) note\.pinned = patch\.pinned === true;/);

  const notes = read("v8/pages/notes.mjs");
  assert.match(notes, /function togglePin\(\) \{/);
  assert.match(notes, /actions\.scope\("v8\.notes\.pin\.toggle", togglePin\)/);
  assert.match(notes, /actionId: "v8\.notes\.pin\.toggle"/);
  assert.match(notes, /function addTag\(raw\) \{/);
  assert.match(notes, /function removeTag\(tag\) \{/);
  assert.match(notes, /repository\.notes\.update\(note\.id, \{ title: note\.title, content: note\.content, tags: note\.tags \}\)/);

  const styles = read("v8/styles/workspaces.css");
  assert.match(styles, /\.v8-note-pin\.is-active \{ color: var\(--v8-accent\); \}/);
  assert.match(styles, /\.v8-note-tags \{/);
  assert.match(styles, /\.v8-note-tag-remove \{/);
});
