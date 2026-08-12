function isoDate(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}

export function buildMonth(year, month, today = new Date()) {
  const first = new Date(year, month, 1, 12, 0, 0, 0);
  const mondayOffset = (first.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - mondayOffset, 12, 0, 0, 0);
  const todayId = isoDate(today);
  return Object.freeze(Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return Object.freeze({
      date: isoDate(date),
      day: date.getDate(),
      inMonth: date.getMonth() === month,
      today: isoDate(date) === todayId
    });
  }));
}

export function eventsForDate(events = [], date) {
  return events.filter((event) => event.date === date);
}

export function tasksForDate(tasks = [], date) {
  return tasks.filter((task) => task.due === date && !task.done);
}
