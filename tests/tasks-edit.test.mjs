import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

function read(relative) {
  return fs.readFileSync(new URL(`../${relative}`, import.meta.url), "utf8");
}

test("existing tasks can be edited (title, priority, due date, tag) via the row menu and shared composer", () => {
  const repo = read("v8/data/profile-repository.mjs");
  assert.match(repo, /update\(id, patch = \{\}\) \{\s*return mutate\("tasks"/);
  assert.match(repo, /if \(Object\.hasOwn\(patch, "title"\)\) task\.text = text\(patch\.title/);
  assert.match(repo, /if \(Object\.hasOwn\(patch, "priority"\)\) task\.priority =/);
  assert.match(repo, /if \(Object\.hasOwn\(patch, "due"\)\) task\.due = text\(patch\.due/);
  assert.match(repo, /if \(Object\.hasOwn\(patch, "tag"\)\) task\.tag = text\(patch\.tag/);

  const page = read("v8/pages/tasks.mjs");
  assert.match(page, /let editingId = null;/);
  assert.match(page, /function openEditor\(id\) \{/);
  assert.match(page, /const editingTask = editingId \? tasks\.find/);
  assert.match(page, /if \(editingId\) \{/);
  assert.match(page, /repository\.tasks\.update\(editedId, patch\)/);
  assert.match(page, /\{ label: "Modifier", icon: "pencil", onSelect: \(\) => openEditor\(id\) \}/);
});
