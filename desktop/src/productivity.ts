export function monthCells(month: Date): { key: string; date: Date; inMonth: boolean }[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(first);
  start.setDate(1 - ((first.getDay() + 6) % 7));
  const end = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const count = Math.ceil(((first.getDay() + 6) % 7 + end.getDate()) / 7) * 7;
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index);
    return { key: dayKey(date), date, inMonth: date.getMonth() === month.getMonth() };
  });
}

export const dayKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export type TaskFilter = "open" | "late" | "done" | "all";
export type TaskPriority = "low" | "medium" | "high";
interface TaskLike { done: boolean; data: Record<string, unknown> }

export const taskDue = (task: TaskLike) => (typeof task.data.dueDate === "string" ? task.data.dueDate.slice(0, 10) : "");
export const taskPriority = (task: TaskLike): TaskPriority => (task.data.priority === "high" || task.data.priority === "urgent" ? "high" : task.data.priority === "low" ? "low" : "medium");
export const taskLate = (task: TaskLike, today: string) => !task.done && Boolean(taskDue(task)) && taskDue(task) < today;

const PRIORITY_RANK: Record<TaskPriority, number> = { high: 0, medium: 1, low: 2 };

export function visibleTasks<T extends TaskLike>(tasks: T[], filter: TaskFilter, today: string): T[] {
  const kept = tasks.filter((task) => (filter === "all" ? true : filter === "done" ? task.done : filter === "late" ? taskLate(task, today) : !task.done));
  return [...kept].sort((left, right) => Number(left.done) - Number(right.done)
    || (taskDue(left) || "9999").localeCompare(taskDue(right) || "9999")
    || PRIORITY_RANK[taskPriority(left)] - PRIORITY_RANK[taskPriority(right)]);
}

export function itemPreview(body: string): string {
  return body
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
}

export function newestItemsFirst<T extends { updatedAt: string | null }>(items: T[]): T[] {
  return [...items].sort((left, right) => {
    const leftTime = left.updatedAt ? Date.parse(left.updatedAt) : 0;
    const rightTime = right.updatedAt ? Date.parse(right.updatedAt) : 0;
    return (Number.isNaN(rightTime) ? 0 : rightTime) - (Number.isNaN(leftTime) ? 0 : leftTime);
  });
}

export function eventsByStart<T extends { startAt: string | null }>(items: T[]): T[] {
  return [...items].sort((left, right) => {
    const leftTime = left.startAt ? Date.parse(left.startAt) : Number.POSITIVE_INFINITY;
    const rightTime = right.startAt ? Date.parse(right.startAt) : Number.POSITIVE_INFINITY;
    return (Number.isNaN(leftTime) ? Number.POSITIVE_INFINITY : leftTime) - (Number.isNaN(rightTime) ? Number.POSITIVE_INFINITY : rightTime);
  });
}

function twoDigits(value: number): string {
  return String(value).padStart(2, "0");
}

export function toDateTimeInput(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${twoDigits(date.getMonth() + 1)}-${twoDigits(date.getDate())}T${twoDigits(date.getHours())}:${twoDigits(date.getMinutes())}`;
}

export function dateTimeInputToIso(value: string): string {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}
