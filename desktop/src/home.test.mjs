import assert from "node:assert/strict";
import test from "node:test";
import { connectionStatus, summarizeModules } from "./home.ts";

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
