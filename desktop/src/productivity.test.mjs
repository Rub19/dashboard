import assert from "node:assert/strict";
import test from "node:test";
import { itemPreview, newestItemsFirst } from "./productivity.ts";

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
