import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

function read(relative) {
  return fs.readFileSync(new URL(`../${relative}`, import.meta.url), "utf8");
}

async function loadGroupTasks() {
  const module = await import("../v8/pages/tasks-model.mjs");
  return module;
}

test("groupTasks buckets tasks into overdue, today, upcoming, no-due-date and done, preserving order", async () => {
  const { groupTasks, TASK_GROUPS } = await loadGroupTasks();
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  const tasks = [
    { id: "a", due: yesterday, done: false },
    { id: "b", due: today, done: false },
    { id: "c", due: tomorrow, done: false },
    { id: "d", due: "", done: false },
    { id: "e", due: yesterday, done: true },
    { id: "f", due: "", done: true }
  ];

  const grouped = groupTasks(tasks);
  assert.deepEqual(grouped.overdue.map((t) => t.id), ["a"]);
  assert.deepEqual(grouped.today.map((t) => t.id), ["b"]);
  assert.deepEqual(grouped.upcoming.map((t) => t.id), ["c"]);
  assert.deepEqual(grouped.noDue.map((t) => t.id), ["d"]);
  assert.deepEqual(grouped.done.map((t) => t.id), ["e", "f"]);
  assert.deepEqual(TASK_GROUPS.map((g) => g.id), ["overdue", "today", "upcoming", "noDue", "done"]);
});

test("the Tasks page renders grouped section headers instead of a flat list", () => {
  const tasksPage = read("v8/pages/tasks.mjs");
  assert.match(tasksPage, /import \{ filterTasks, groupTasks, sortTasks, taskStats, TASK_GROUPS \} from "\.\/tasks-model\.mjs";/);
  assert.match(tasksPage, /const grouped = groupTasks\(filtered\);/);
  assert.match(tasksPage, /TASK_GROUPS\.forEach\(\(\{ id, label \}\) => \{/);
  assert.match(tasksPage, /className: "v8-task-group-header"/);

  const styles = read("v8/styles/workspaces.css");
  assert.match(styles, /\.v8-task-group-header \{/);

  const catalog = read("v8/i18n/catalog.mjs");
  ["En retard", "Aujourd'hui", "À venir", "Sans échéance", "Terminées"].forEach((label) => {
    assert.ok(catalog.includes(`"${label}"`), `expected catalog entry for "${label}"`);
  });
});
