import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import { createSelectionState } from "../v8/ui/dense-content.mjs";
import { createProfileRepository } from "../v8/data/profile-repository.mjs";
import { sortNotes } from "../v8/pages/notes-model.mjs";
import { sortTasks } from "../v8/pages/tasks-model.mjs";
import { sortConnectionCatalog } from "../v8/pages/connections-model.mjs";
import { sourceEntry, SUPPORTED_LOCALES } from "../v8/i18n/catalog.mjs";

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key)
  };
}

test("dense selection toggles, replaces and prunes stable string ids", () => {
  const selection = createSelectionState([1, "two"]);
  assert.deepEqual(selection.values(), ["1", "two"]);
  assert.equal(selection.toggle(1), false);
  assert.equal(selection.toggle("three"), true);
  assert.deepEqual(selection.prune(["two", "three"]), ["two", "three"]);
  assert.deepEqual(selection.replace(["four", "four"]), ["four"]);
  assert.equal(selection.size(), 1);
});

test("dense sorts remain deterministic for notes, tasks and connections", () => {
  const notes = [
    { id: "b", title: "Zulu", updatedAt: "2026-07-10", pinned: false },
    { id: "a", title: "Alpha", updatedAt: "2026-07-12", pinned: false }
  ];
  assert.deepEqual(sortNotes(notes, "title").map((note) => note.id), ["a", "b"]);
  assert.deepEqual(sortNotes(notes, "oldest").map((note) => note.id), ["b", "a"]);

  const tasks = [
    { id: "low", title: "B", priority: "low", due: "", createdAt: "2026-07-12", done: false },
    { id: "high", title: "A", priority: "high", due: "2026-07-15", createdAt: "2026-07-10", done: false }
  ];
  assert.deepEqual(sortTasks(tasks, "priority").map((task) => task.id), ["high", "low"]);
  assert.deepEqual(sortTasks(tasks, "recent").map((task) => task.id), ["low", "high"]);

  const integrations = [
    { id: "z", name: "Zulu", category: "social", methods: [] },
    { id: "a", name: "Alpha", category: "development", methods: [] }
  ];
  assert.deepEqual(sortConnectionCatalog(integrations, "name").map((entry) => entry.id), ["a", "z"]);
});

test("repository batches task and file changes into stable mutations", () => {
  let id = 0;
  const repository = createProfileRepository({ storage: memoryStorage(), requireOwner: true, ownerId: "dense-user", idFactory: () => `dense-${++id}` });
  repository.createProfile({ name: "Dense" });
  const firstTask = repository.tasks.create({ title: "First" }).data;
  const secondTask = repository.tasks.create({ title: "Second" }).data;
  assert.equal(repository.tasks.setDone([firstTask.id, secondTask.id], true).data.length, 2);
  assert.equal(repository.snapshot().tasks.every((task) => task.done), true);
  assert.equal(repository.tasks.removeMany([firstTask.id]).data.length, 1);
  assert.deepEqual(repository.snapshot().tasks.map((task) => task.id), [secondTask.id]);

  const firstFile = repository.files.create({ name: "One", type: "folder" }).data;
  const secondFile = repository.files.create({ name: "Two", type: "folder" }).data;
  assert.equal(repository.files.setFavorite([firstFile.id, secondFile.id], true).data.length, 2);
  assert.equal(repository.snapshot().files.every((file) => file.favorite), true);
  assert.equal(repository.files.removeMany([firstFile.id, secondFile.id]).data.length, 2);
  assert.equal(repository.snapshot().files.length, 0);
});

test("dense surfaces use the shared toolbar, selection and contextual menu contracts", () => {
  const dense = fs.readFileSync(new URL("../v8/ui/dense-content.mjs", import.meta.url), "utf8");
  const tasks = fs.readFileSync(new URL("../v8/pages/tasks.mjs", import.meta.url), "utf8");
  const files = fs.readFileSync(new URL("../v8/pages/files.mjs", import.meta.url), "utf8");
  const activity = fs.readFileSync(new URL("../v8/pages/activity.mjs", import.meta.url), "utf8");
  const connections = fs.readFileSync(new URL("../v8/pages/connections.mjs", import.meta.url), "utf8");
  const panel = fs.readFileSync(new URL("../v8/ui/panel.mjs", import.meta.url), "utf8");
  const brain = fs.readFileSync(new URL("../v8/pages/brain.mjs", import.meta.url), "utf8");
  const runtime = fs.readFileSync(new URL("../v8/app/app-runtime.mjs", import.meta.url), "utf8");
  assert.match(dense, /createRowMenuController/);
  assert.match(dense, /getLayerManager/);
  assert.match(dense, /computeFloatingPosition/);
  assert.match(dense, /closeOnOutside:\s*true/);
  assert.match(dense, /rovingSelector:\s*"button:not\(\[disabled\]\)"/);
  assert.doesNotMatch(dense, /documentRef\.addEventListener/);
  for (const source of [tasks, files, panel]) {
    assert.match(source, /createSelectionState/);
    assert.match(source, /bulkActionBar/);
  }
  for (const source of [tasks, files, activity, connections]) assert.match(source, /collectionDensityControl/);
  assert.match(activity, /v8-activity-tools-bar/);
  assert.match(connections, /sortConnectionCatalog/);
  assert.match(connections, /CONNECTION_PAGE_SIZE\s*=\s*18/);
  assert.match(connections, /visible\.slice\(0, visibleLimit\)/);
  assert.match(runtime, /mountedRoute\s*!==\s*route[\s\S]*shell\.stage\.scrollTo\(\{\s*top:\s*0/);
  assert.match(brain, /historyQuery/);
  assert.match(brain, /Rechercher dans l'historique/);
});

test("dense controls expose complete translations in every supported locale", () => {
  const labels = [
    "Densite automatique", "Densite confortable", "Densite compacte", "Densite d'affichage",
    "Actions groupees", "Selectionner les elements visibles", "Deselectionner les elements visibles",
    "Effacer la selection", "Actions de l'element", "Trier les tâches", "Trier les fichiers",
    "Trier les notes", "Trier l'activité", "Trier les intégrations", "Rechercher dans les notifications",
    "Filtrer les notifications", "Tout marquer comme lu", "Ajouter à la sélection", "Retirer de la sélection",
    "Afficher plus", "Rechercher dans l'historique", "Historique Brain"
  ];
  labels.forEach((label) => {
    const entry = sourceEntry(label);
    assert.ok(entry, `missing dense i18n entry for ${label}`);
    SUPPORTED_LOCALES.forEach((locale) => assert.ok(entry[locale], `missing ${locale} translation for ${label}`));
  });
  const runtime = fs.readFileSync(new URL("../v8/i18n/runtime.mjs", import.meta.url), "utf8");
  assert.match(runtime, /actionsFor/);
  assert.match(runtime, /(?:Selectionner\|Sélectionner)/);
});
