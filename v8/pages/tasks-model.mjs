function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function filterTasks(tasks = [], filters = {}) {
  const query = normalize(filters.query).trim();
  return tasks.filter((task) => {
    if (filters.status === "open" && task.done) return false;
    if (filters.status === "completed" && !task.done) return false;
    if (filters.priority && filters.priority !== "all" && task.priority !== filters.priority) return false;
    if (!query) return true;
    return normalize([task.title, task.tag, task.due, task.priority].join(" ")).includes(query);
  });
}

export function sortTasks(tasks = [], order = "priority") {
  const priority = Object.freeze({ high: 0, normal: 1, low: 2 });
  return tasks.slice().sort((left, right) => {
    if (order === "title") return String(left.title || "").localeCompare(String(right.title || ""), "fr", { sensitivity: "base" });
    if (order === "due") {
      const leftDue = left.due || "9999-12-31";
      const rightDue = right.due || "9999-12-31";
      return String(leftDue).localeCompare(String(rightDue)) || String(left.title || "").localeCompare(String(right.title || ""));
    }
    if (order === "recent") return String(right.createdAt || "").localeCompare(String(left.createdAt || ""));
    return (priority[left.priority] ?? 1) - (priority[right.priority] ?? 1)
      || Number(left.done === true) - Number(right.done === true)
      || String(left.due || "9999-12-31").localeCompare(String(right.due || "9999-12-31"));
  });
}

export function taskStats(tasks = []) {
  const total = tasks.length;
  const completed = tasks.filter((task) => task.done).length;
  const open = total - completed;
  return Object.freeze({
    total,
    open,
    completed,
    completion: total ? Math.round((completed / total) * 100) : 0
  });
}
