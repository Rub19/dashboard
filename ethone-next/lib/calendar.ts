export type CalendarDay = {
  date: number;
  day: number;
  isToday: boolean;
};

export function buildMonth(year: number, month: number): CalendarDay[] {
  const firstDay = new Date(year, month, 1).getDay();
  const offset = (firstDay + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const isToday = (d: number) => today.getDate() === d && today.getMonth() === month && today.getFullYear() === year;

  const days: CalendarDay[] = [];
  for (let i = 0; i < offset; i++) {
    days.push({ date: 0, day: 0, isToday: false });
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({ date: i, day: i, isToday: isToday(i) });
  }
  const remaining = (7 - (days.length % 7)) % 7;
  for (let i = 0; i < remaining; i++) {
    days.push({ date: 0, day: 0, isToday: false });
  }
  return days;
}

export function eventsForDate<T extends { startAt?: string | null }>(events: T[], date: Date): T[] {
  return events.filter((e) => {
    const start = e.startAt ? new Date(e.startAt) : null;
    return (
      start &&
      start.getDate() === date.getDate() &&
      start.getMonth() === date.getMonth() &&
      start.getFullYear() === date.getFullYear()
    );
  });
}
