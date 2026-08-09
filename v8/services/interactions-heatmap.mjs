const DAY_MS = 24 * 60 * 60 * 1000;

const ACTION_KIND_MAP = {
  "v8.notes.new": "note_create",
  "v8.notes.save": "note_save",
  "v8.tasks.create": "task_create",
  "v8.tasks.toggle": "task_complete",
  "v8.tasks.delete": "task_delete",
  "v8.calendar.create": "event_create",
  "v8.files.create": "file_create",
  "v8.space.personal": "space_switch",
  "v8.space.focus": "space_switch",
  "v8.space.studio": "space_switch",
  "v8.sync.refresh": "sync",
  "v8.theme.toggle": "ui_customize",
  "v8.appearance.cycle": "ui_customize"
};

export function kindFromAction(actionId) {
  return ACTION_KIND_MAP[actionId] || "interaction";
}

function floorDate(iso) {
  const d = new Date(iso);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

function dateFromIso(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgo(count) {
  const d = new Date();
  d.setTime(d.getTime() - count * DAY_MS);
  return d.toISOString().slice(0, 10);
}

export function createInteractionsHeatmap(options = {}) {
  const storage = options.storage || globalThis.localStorage;
  const ownerId = options.ownerId || "";
  const storageKey = `ethone:v8:interactions:${ownerId || "local"}`;

  function load() {
    try {
      const raw = storage?.getItem?.(storageKey);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return typeof parsed === "object" && parsed !== null ? parsed : {};
    } catch { return {}; }
  }

  function save(record) {
    try { storage?.setItem?.(storageKey, JSON.stringify(record)); } catch {}
  }

  let record = load();

  function track(kind = "app_open") {
    const day = todayIso();
    if (!record[day]) record[day] = { count: 0, kinds: {} };
    record[day].count += 1;
    record[day].kinds[kind] = (record[day].kinds[kind] || 0) + 1;
    save(record);
  }

  function days(daysBack = 30) {
    const result = [];
    for (let i = daysBack - 1; i >= 0; i--) {
      const day = daysAgo(i);
      const entry = record[day] || { count: 0, kinds: {} };
      result.push({ date: day, count: entry.count, kinds: entry.kinds });
    }
    return result;
  }

  function intensity(count) {
    if (count === 0) return 0;
    if (count < 3) return 1;
    if (count < 6) return 2;
    if (count < 10) return 3;
    return 4;
  }

  function stats(daysBack = 30) {
    const rows = days(daysBack);
    const total = rows.reduce((sum, d) => sum + d.count, 0);
    const today = rows[rows.length - 1]?.count || 0;

    let streak = 0;
    for (let i = rows.length - 1; i >= 0; i--) {
      if (rows[i].count > 0) streak++;
      else break;
    }

    const thisWeek = rows.slice(-7);
    const thisWeekCount = thisWeek.reduce((s, d) => s + d.count, 0);
    const thisWeekMax = thisWeek.length * 10;
    const thisWeekPercent = thisWeekMax ? Math.round((thisWeekCount / thisWeekMax) * 100) : 0;

    const activeDays = rows.filter((d) => d.count > 0).length;
    const consistency = rows.length ? Math.round((activeDays / rows.length) * 100) : 0;

    return { today, streak, thisWeekPercent, consistency, total };
  }

  function trackFromAction(actionId) {
    const kind = kindFromAction(actionId);
    if (kind) track(kind);
  }

  function seed(seedDays = 35) {
    if (Object.keys(record).length) return;
    const base = new Date();
    for (let i = seedDays - 1; i >= 0; i--) {
      const d = new Date(base);
      d.setTime(d.getTime() - i * DAY_MS);
      const iso = d.toISOString().slice(0, 10);
      if (Math.random() > 0.55) {
        const count = Math.floor(Math.random() * 12) + 1;
        record[iso] = { count, kinds: { app_open: count } };
      }
    }
    save(record);
  }

  return Object.freeze({
    track,
    trackFromAction,
    days,
    intensity,
    stats,
    seed,
    kindFromAction
  });
}
