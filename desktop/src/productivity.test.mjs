import assert from "node:assert/strict";
import test from "node:test";
import { activityWeeks, itemToTaskRow, taskDue, taskLate, taskPriority, taskRowToItem, visibleTasks } from "./productivity.ts";

test("a task row of the website keeps its fields in both directions", () => {
  const row = { id: "1", title: "A", description: "B", is_completed: false, priority: "high", due_date: "2026-11-05", created_at: null, updated_at: null };
  const item = taskRowToItem(row);
  assert.equal(taskDue(item), "2026-11-05");
  assert.equal(taskPriority(item), "high");
  const back = itemToTaskRow(item);
  assert.deepEqual([back.title, back.description, back.is_completed, back.priority, back.due_date, back.completed_at], ["A", "B", false, "high", "2026-11-05", null]);
  assert.ok(itemToTaskRow({ ...item, done: true }).completed_at);
});

test("the activity map counts by local day and marks future days", () => {
  const today = new Date(2026, 10, 3, 12);
  const weeks = activityWeeks([new Date(2026, 10, 3, 9).toISOString(), new Date(2026, 10, 3, 10).toISOString(), "pas une date"], today, 2);
  assert.equal(weeks.length, 2);
  const cells = weeks.flat();
  assert.equal(cells.find((cell) => cell.key === "2026-11-03").count, 2);
  assert.equal(cells.at(-1).future, true);
  assert.equal(cells[0].future, false);
});

test("tasks filter by state and sort by due date then priority", () => {
  const task = (id, done, dueDate, priority) => ({ id, done, data: { ...(dueDate && { dueDate }), ...(priority && { priority }) } });
  const tasks = [task("none", false), task("later", false, "2026-11-10"), task("late", false, "2026-11-01"), task("over", true, "2026-10-01"), task("high", false, "2026-11-10", "urgent")];
  const ids = (filter) => visibleTasks(tasks, filter, "2026-11-03").map(({ id }) => id);
  assert.deepEqual(ids("open"), ["late", "high", "later", "none"]);
  assert.deepEqual(ids("late"), ["late"]);
  assert.deepEqual(ids("done"), ["over"]);
  assert.equal(ids("all").at(-1), "over");
  assert.equal(taskLate(tasks[3], "2026-11-03"), false);
  assert.equal(taskPriority(tasks[0]), "medium");
});
import { dateTimeInputToIso, eventsByStart, itemPreview, newestItemsFirst, toDateTimeInput } from "./productivity.ts";

test("l'aperçu transforme le contenu de note en texte sans exécutable", () => {
  const preview = itemPreview("<p>Bonjour <strong>Ethone</strong></p><script>alert(1)</script>");
  assert.equal(preview, "Bonjour Ethone");
});

test("les éléments les plus récents apparaissent en premier", () => {
  const items = [
    { id: "old", updatedAt: "2026-11-01T10:00:00Z" },
    { id: "new", updatedAt: "2026-11-02T10:00:00Z" },
    { id: "unknown", updatedAt: null },
  ];

  assert.deepEqual(newestItemsFirst(items).map(({ id }) => id), ["new", "old", "unknown"]);
  assert.deepEqual(items.map(({ id }) => id), ["old", "new", "unknown"]);
});

test("les événements sont ordonnés par prochaine date", () => {
  const items = [
    { id: "later", startAt: "2026-11-03T10:00:00Z" },
    { id: "first", startAt: "2026-11-02T10:00:00Z" },
    { id: "unknown", startAt: null },
  ];

  assert.deepEqual(eventsByStart(items).map(({ id }) => id), ["first", "later", "unknown"]);
});

test("une date serveur traverse le champ local sans changer d'instant", () => {
  const source = "2026-11-02T17:30:00.000Z";
  const local = toDateTimeInput(source);

  assert.match(local, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  assert.equal(new Date(dateTimeInputToIso(local)).getTime(), new Date(source).getTime());
});

test("the month grid starts on Monday and fills whole weeks", async () => {
  const { monthCells, dayKey } = await import("./productivity.ts");
  const november = monthCells(new Date(2026, 10, 15));
  assert.equal(november.length % 7, 0);
  assert.equal(november[0].date.getDay(), 1);
  assert.equal(november[0].key, "2026-10-26");
  assert.equal(november.filter((cell) => cell.inMonth).length, 30);
  assert.equal(dayKey(new Date(2026, 0, 5)), "2026-01-05");
});
