import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import { claimDailyBriefing, createDailyBriefing } from "../v8/data/daily-briefing.mjs";
import { sourceEntry, SUPPORTED_LOCALES } from "../v8/i18n/catalog.mjs";

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    read: (key) => values.get(key) ?? null
  };
}

function localIso(year, month, day, hour = 12) {
  return new Date(year, month - 1, day, hour, 0, 0).toISOString();
}

test("daily briefing composes six concise signals from real local data", () => {
  const snapshot = {
    profile: { id: "profile-a", name: "Alice" },
    events: [{ id: "event-1", title: "Revue produit", date: "2026-07-14" }],
    tasks: [
      { id: "task-high", title: "Preparer la release", done: false, priority: "high", due: "2026-07-14" },
      { id: "task-normal", title: "Classer les notes", done: false, priority: "normal", due: "" },
      { id: "task-done", title: "Valider le build", done: true, priority: "high", doneAt: localIso(2026, 7, 13, 17) }
    ],
    notes: [{ id: "note-1", title: "Release", updatedAt: localIso(2026, 7, 13, 16) }],
    activities: [
      { id: "weather-1", source: "weather", title: "18 C, ciel clair", timestamp: localIso(2026, 7, 14, 8) },
      { id: "music-1", source: "spotify", title: "Teardrop - Massive Attack", timestamp: localIso(2026, 7, 14, 7) },
      { id: "github-1", source: "github", title: "3 commits sur ETHONE", timestamp: localIso(2026, 7, 13, 15) },
      { id: "activity-1", source: "ethone", title: "Dashboard ouvert", timestamp: localIso(2026, 7, 13, 10) }
    ],
    connections: [
      { id: "weather", status: "connected" },
      { id: "spotify", status: "connected" },
      { id: "github", status: "connected" }
    ]
  };

  const briefing = createDailyBriefing({ snapshot, date: new Date(2026, 6, 14, 9, 0, 0) });

  assert.equal(briefing.dayKey, "2026-07-14");
  assert.equal(briefing.profileId, "profile-a");
  assert.deepEqual(briefing.items.map((item) => item.id), ["weather", "events", "tasks", "music", "github", "yesterday"]);
  assert.equal(briefing.items.length, 6);
  assert.equal(briefing.items.find((item) => item.id === "weather").value, "18 C, ciel clair");
  assert.equal(briefing.items.find((item) => item.id === "music").value, "Teardrop - Massive Attack");
  assert.equal(briefing.items.find((item) => item.id === "github").value, "3 commits sur ETHONE");
  assert.equal(briefing.items.find((item) => item.id === "events").value, "Revue produit");
  assert.equal(briefing.items.find((item) => item.id === "tasks").value, "Preparer la release");
  assert.equal(briefing.items.find((item) => item.id === "yesterday").value, "4");
  assert.equal(briefing.suggestion.actionId, "v8.tasks.open");
  assert.equal(briefing.suggestion.detail, "Preparer la release");
  assert.ok(Object.isFrozen(briefing));
});

test("daily briefing reports unavailable providers instead of inventing data", () => {
  const briefing = createDailyBriefing({
    snapshot: { profile: { id: "local" }, notes: [], tasks: [], events: [], activities: [], connections: [] },
    date: new Date(2026, 6, 14, 9, 0, 0)
  });

  for (const id of ["weather", "music", "github"]) {
    const item = briefing.items.find((entry) => entry.id === id);
    assert.equal(item.value, "Non connectée");
    assert.equal(item.detail, "Configurer");
    assert.equal(item.userContent, false);
  }
  assert.equal(briefing.items.find((item) => item.id === "events").value, "Aucun événement aujourd'hui");
  assert.equal(briefing.items.find((item) => item.id === "tasks").value, "Aucune tâche prioritaire");
  assert.equal(briefing.items.find((item) => item.id === "yesterday").value, "0");
});

test("daily briefing announcement is claimed once per profile and day", () => {
  const storage = memoryStorage();
  const first = createDailyBriefing({ snapshot: { profile: { id: "profile-a" } }, date: new Date(2026, 6, 14, 9) });
  const nextDay = createDailyBriefing({ snapshot: { profile: { id: "profile-a" } }, date: new Date(2026, 6, 15, 9) });
  const otherProfile = createDailyBriefing({ snapshot: { profile: { id: "profile-b" } }, date: new Date(2026, 6, 14, 9) });

  assert.equal(claimDailyBriefing(storage, first), true);
  assert.equal(claimDailyBriefing(storage, first), false);
  assert.equal(claimDailyBriefing(storage, nextDay), true);
  assert.equal(claimDailyBriefing(storage, otherProfile), true);
});

test("daily briefing is mounted on Home and announced once at startup", () => {
  const home = fs.readFileSync(new URL("../v8/pages/home.mjs", import.meta.url), "utf8");
  const runtime = fs.readFileSync(new URL("../v8/app/app-runtime.mjs", import.meta.url), "utf8");
  const module = fs.readFileSync(new URL("../v8/data/daily-briefing.mjs", import.meta.url), "utf8");

  assert.match(home, /model\.briefing\.items\.map\(briefingSignal\)/);
  assert.match(home, /v8-home-brain__signals/);
  assert.match(runtime, /claimDailyBriefing\(globalThis\.localStorage, initialModel\.briefing\)/);
  assert.match(runtime, /id:\s*"daily-brain-briefing"/);
  assert.doesNotMatch(module, /fetch\(|XMLHttpRequest|setInterval|requestAnimationFrame/);
});

test("daily briefing fixed copy is translated in every supported locale", () => {
  const sources = [
    "Briefing quotidien",
    "Votre journee en un regard.",
    "Briefing Brain pret",
    "Meteo",
    "Priorites",
    "Musique",
    "Hier",
    "Non connectee",
    "Aucune activite",
    "Aucun evenement aujourd'hui",
    "Aucune tache prioritaire",
    "Aucune ecoute",
    "Configurer",
    "Synchronise",
    "Commencer par la priorite principale",
    "Preparer le prochain evenement",
    "Creer un bloc Focus",
    "Preserver un bloc calme",
    "Voir le briefing"
  ];
  sources.forEach((source) => {
    const entry = sourceEntry(source);
    assert.ok(entry, `missing catalog entry for ${source}`);
    SUPPORTED_LOCALES.forEach((locale) => assert.ok(entry[locale], `missing ${locale} translation for ${source}`));
  });
});
