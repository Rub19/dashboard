import assert from "node:assert/strict";
import test from "node:test";
import { connectionStatus, firstNote, groupMail, summarizeModules } from "./home.ts";

test("the same mail repeated becomes one row with a count", () => {
  const mail = (id, from_address, subject) => ({ id, from_address, subject });
  const groups = groupMail([mail("1", "a@x", "Code"), mail("2", "b@x", "Salut"), mail("3", "a@x", "Code"), mail("4", "a@x", "Autre")]);
  assert.deepEqual(groups.map(({ id, count }) => [id, count]), [["1", 2], ["2", 1], ["4", 1]]);
  const dated = groupMail([mail("1", "a@x", "Votre lien | 2026-11-02 17:14:06"), mail("2", "a@x", "Votre lien | 2026-10-31 01:18:26")]);
  assert.deepEqual(dated.map(({ subject, count }) => [subject, count]), [["Votre lien", 2]]);
  assert.equal(groupMail([mail("1", "a", "1"), mail("2", "b", "2"), mail("3", "c", "3")], 2).length, 2);
});

function moduleStatus(values) {
  return {
    module: {
      id: "app",
      name: "App",
      summary: { fr: "", en: "" },
      repo: "Rub19/app",
      updatePolicy: "delegated",
      platforms: { windows: "full" },
    },
    installed: null,
    latest: null,
    feedError: null,
    running: false,
    action: "unavailable",
    ...values,
  };
}

test("la synthèse compte uniquement les installations réelles", () => {
  const result = summarizeModules([
    moduleStatus({ installed: "1.0.0", action: "open" }),
    moduleStatus({ installed: null, action: "install" }),
  ]);

  assert.deepEqual(result, { total: 2, installed: 1, updates: 0, running: 0 });
});

test("la synthèse reconnaît les mises à jour et applications ouvertes", () => {
  const result = summarizeModules([
    moduleStatus({ installed: "1.0.0", action: "update", running: false }),
    moduleStatus({ installed: "2.0.0", action: "closeToUpdate", running: true }),
    moduleStatus({ installed: "3.0.0", action: "releasePage", running: false }),
  ]);

  assert.deepEqual(result, { total: 3, installed: 3, updates: 3, running: 1 });
});

test("une erreur distante empêche d'annoncer un service opérationnel", () => {
  assert.equal(connectionStatus(false, "indisponible"), "degraded");
  assert.equal(connectionStatus(true, null), "offline");
  assert.equal(connectionStatus(false, null), "online");
});

test("firstNote keeps the first real line of the release notes", () => {
  assert.equal(firstNote("## Nouveautés\n\n- Bandeau"), "Bandeau");
  assert.equal(firstNote("## Titre"), "");
  assert.equal(firstNote("\n\n- Bandeau"), "Bandeau");
  assert.equal(firstNote(null), "");
  assert.equal(firstNote("  \n"), "");
});
