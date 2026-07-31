import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

function read(relative) {
  return fs.readFileSync(new URL(`../${relative}`, import.meta.url), "utf8");
}

async function loadModel() {
  return import("../v8/pages/files-model.mjs");
}

test("folderPath walks parentId up to the root, guarding against cycles", async () => {
  const { folderPath } = await loadModel();
  const files = [
    { id: "a", type: "folder", name: "A", parentId: null },
    { id: "b", type: "folder", name: "B", parentId: "a" },
    { id: "c", type: "folder", name: "C", parentId: "b" }
  ];
  assert.deepEqual(folderPath(files, "c").map((f) => f.id), ["a", "b", "c"]);
  assert.deepEqual(folderPath(files, null), []);

  const cyclic = [
    { id: "x", type: "folder", name: "X", parentId: "y" },
    { id: "y", type: "folder", name: "Y", parentId: "x" }
  ];
  const path = folderPath(cyclic, "x");
  assert.ok(path.length <= cyclic.length, "cyclic parentId chains must not loop forever");
});

test("descendantFolderIds collects nested subfolders only, not the folder itself", async () => {
  const { descendantFolderIds } = await loadModel();
  const files = [
    { id: "root", type: "folder", parentId: null },
    { id: "child", type: "folder", parentId: "root" },
    { id: "grandchild", type: "folder", parentId: "child" },
    { id: "link-in-root", type: "link", parentId: "root" }
  ];
  const ids = descendantFolderIds(files, "root");
  assert.deepEqual([...ids].sort(), ["child", "grandchild"]);
  assert.ok(!ids.has("root"));
});

test("filterFiles scopes to a parentId when provided, root files have parentId null", async () => {
  const { filterFiles } = await loadModel();
  const files = [
    { id: "1", name: "Root file", parentId: null },
    { id: "2", name: "Nested file", parentId: "folder-1" }
  ];
  assert.deepEqual(filterFiles(files, { parentId: null }).map((f) => f.id), ["1"]);
  assert.deepEqual(filterFiles(files, { parentId: "folder-1" }).map((f) => f.id), ["2"]);
});

test("the files repository supports parentId on create/update with cycle and existence guards, and cascade-deletes folder contents", () => {
  const repo = read("v8/data/profile-repository.mjs");
  assert.match(repo, /parentId: item\?\.parentId \? text\(item\.parentId, "", 80\) : null/);
  assert.match(repo, /function collectDescendantFileIds\(list, rootId\) \{/);
  assert.match(repo, /if \(nextParentId === String\(id\)\) throw new Error\("Un dossier ne peut pas se contenir lui-même"\);/);
  assert.match(repo, /if \(collectDescendantFileIds\(list, id\)\.has\(nextParentId\)\) throw new Error\("Impossible de déplacer un dossier dans lui-même"\);/);
  assert.match(repo, /if \(target\?\.type === "folder"\) collectDescendantFileIds\(list, id\)\.forEach\(\(descendantId\) => requested\.add\(descendantId\)\);/);
});

test("the Files page wires breadcrumb navigation, folder-click drill-down and a Déplacer vers... move menu", () => {
  const page = read("v8/pages/files.mjs");
  assert.match(page, /import \{ descendantFolderIds, filterFiles, folderPath, sortFiles \} from "\.\/files-model\.mjs";/);
  assert.match(page, /let currentFolderId = null;/);
  assert.match(page, /function navigateToFolder\(folderId\) \{/);
  assert.match(page, /if \(file\?\.type === "folder"\) \{\s*navigateToFolder\(file\.id\);/);
  assert.match(page, /function openMoveMenu\(id, anchor\) \{/);
  assert.match(page, /\{ label: "Déplacer vers\.\.\.", icon: "folder-input", onSelect: \(\) => openMoveMenu\(id, anchor\) \}/);
  assert.match(page, /parentId: currentFolderId/);
  assert.match(page, /data-files-breadcrumb/);

  const styles = read("v8/styles/workspaces.css");
  assert.match(styles, /\.v8-files-breadcrumb \{/);
});
