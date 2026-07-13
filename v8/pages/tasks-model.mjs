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
