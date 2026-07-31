import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

function read(relative) {
  return fs.readFileSync(new URL(`../${relative}`, import.meta.url), "utf8");
}

test("files can be renamed: repository patch, UI prompt flow and context-menu entry are all wired", () => {
  const repo = read("v8/data/profile-repository.mjs");
  assert.match(repo, /update\(id, patch = \{\}\) \{\s*return mutate\("files"/);
  assert.match(repo, /if \(Object\.hasOwn\(patch, "name"\)\) item\.name = text\(patch\.name/);

  const files = read("v8/pages/files.mjs");
  assert.match(files, /function renameFile\(id\) \{/);
  assert.match(files, /const value = prompt\("Renommer", file\.name \|\| ""\);/);
  assert.match(files, /repository\.files\.update\(id, \{ name: value \}\)/);
  assert.match(files, /\{ label: "Renommer", icon: "pencil", onSelect: \(\) => renameFile\(id\) \}/);
});
