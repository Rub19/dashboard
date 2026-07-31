import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

function read(relative) {
  return fs.readFileSync(new URL(`../${relative}`, import.meta.url), "utf8");
}

async function loadModel() {
  return import("../v8/pages/calendar-model.mjs");
}

test("tasksForDate returns only open tasks due on the given date", async () => {
  const { tasksForDate } = await loadModel();
  const tasks = [
    { id: "a", due: "2026-08-01", done: false },
    { id: "b", due: "2026-08-01", done: true },
    { id: "c", due: "2026-08-02", done: false },
    { id: "d", due: "", done: false }
  ];
  assert.deepEqual(tasksForDate(tasks, "2026-08-01").map((t) => t.id), ["a"]);
  assert.deepEqual(tasksForDate(tasks, "2026-08-02").map((t) => t.id), ["c"]);
});

test("the Calendar page shows task due-date markers on the grid and a task list in the agenda", () => {
  const page = read("v8/pages/calendar.mjs");
  assert.match(page, /import \{ buildMonth, eventsForDate, tasksForDate \} from "\.\/calendar-model\.mjs";/);
  assert.match(page, /let tasks = repository\.snapshot\(\)\.tasks\.map/);
  assert.match(page, /const cellTasks = tasksForDate\(tasks, cell\.date\);/);
  assert.match(page, /className: "v8-calendar-day__tasks"/);
  assert.match(page, /const dayTasks = tasksForDate\(tasks, selectedDate\);/);
  assert.match(page, /className: "v8-calendar-task"/);
  assert.match(page, /dataset: \{ calendarTaskToggle: task\.id \}/);
  assert.match(page, /dataset: \{ action: "v8\.tasks\.open" \}/);
  assert.match(page, /repository\.tasks\.toggle\(taskToggle\.dataset\.calendarTaskToggle\)/);

  const styles = read("v8/styles/workspaces.css");
  assert.match(styles, /\.v8-calendar-day__tasks \{/);
  assert.match(styles, /\.v8-calendar-task \{/);
});
