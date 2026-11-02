import assert from "node:assert/strict";
import test from "node:test";
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
