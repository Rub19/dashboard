import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";
import { clearCache } from "../src/utils/cache.js";
import { createItem, listItems, updateItem } from "../src/services/items-client.js";
import { testEnv } from "./helpers.mjs";

beforeEach(() => clearCache());

// Regression coverage for safeText(value, maximum) being miscalled as if it
// had a (value, fallback) signature — that silently stored/returned "" for
// every item's title and body regardless of what was actually submitted or
// stored, because Number("Sans titre") / Number("") both coerce to a 0-length
// slice.
function createItemsStore(initialRows = []) {
  const rows = new Map(initialRows.map((r) => [r.id, { ...r }]));
  let nextId = 1;
  const fetchImpl = async (input, init) => {
    const url = new URL(String(input));
    if (url.hostname !== "project-ref.supabase.co") return new Response("not found", { status: 404 });
    if (!url.pathname.startsWith("/rest/v1/ethone_items")) return new Response(JSON.stringify([]), { status: 200, headers: { "content-type": "application/json" } });
    const method = init?.method || "GET";
    const idFilter = url.searchParams.get("id")?.replace(/^eq\./, "");

    if (method === "POST") {
      const body = JSON.parse(String(init.body || "{}"));
      const id = String(nextId++);
      const row = { id, ...body };
      rows.set(id, row);
      const prefersRepresentation = String(init.headers?.Prefer || "").includes("return=representation");
      return new Response(JSON.stringify(prefersRepresentation ? [row] : []), { status: 201, headers: { "content-type": "application/json" } });
    }

    if (method === "PATCH") {
      const body = JSON.parse(String(init.body || "{}"));
      const target = idFilter ? rows.get(idFilter) : null;
      if (target) Object.assign(target, body);
      return new Response(JSON.stringify(target ? [target] : []), { status: 200, headers: { "content-type": "application/json" } });
    }

    // GET (list)
    return new Response(JSON.stringify([...rows.values()]), { status: 200, headers: { "content-type": "application/json" } });
  };
  return { rows, fetchImpl };
}

test("createItem stores the actual submitted title and body, not blank strings", async () => {
  const { rows, fetchImpl } = createItemsStore();
  const env = testEnv({ __TEST_FETCH__: fetchImpl });
  const result = await createItem(env, "user-1", "note", { title: "Buy milk", body: "2% please" });
  assert.ok(result.id, "expected the new row's id to come back");
  const stored = rows.get(result.id);
  assert.equal(stored.title, "Buy milk");
  assert.equal(stored.body, "2% please");
});

test("createItem falls back to a default title only when none was given", async () => {
  const { rows, fetchImpl } = createItemsStore();
  const env = testEnv({ __TEST_FETCH__: fetchImpl });
  const result = await createItem(env, "user-1", "task", {});
  const stored = rows.get(result.id);
  assert.equal(stored.title, "Sans titre");
  assert.equal(stored.body, "");
});

test("updateItem writes the real title/body instead of overwriting them with empty strings", async () => {
  const { rows, fetchImpl } = createItemsStore([{ id: "item-1", user_id: "user-1", title: "Old", body: "Old body" }]);
  const env = testEnv({ __TEST_FETCH__: fetchImpl });
  await updateItem(env, "user-1", "item-1", { title: "New title", body: "New body" });
  assert.equal(rows.get("item-1").title, "New title");
  assert.equal(rows.get("item-1").body, "New body");
});

test("listItems returns the actual stored title and body instead of blanking them", async () => {
  const { fetchImpl } = createItemsStore([{ id: "item-1", user_id: "user-1", title: "Real title", body: "Real body" }]);
  const env = testEnv({ __TEST_FETCH__: fetchImpl });
  const items = await listItems(env, "user-1", "note");
  assert.equal(items[0].title, "Real title");
  assert.equal(items[0].body, "Real body");
});
