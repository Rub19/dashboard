import assert from "node:assert/strict";
import test from "node:test";
import { invoke, payload } from "./helpers.mjs";

test("valorant-auth route rejects missing credentials", async () => {
  const response = await invoke("/api/stats/valorant-auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  assert.equal(response.status, 400);
});

test("valorant-auth route rejects empty exchange_token payload", async () => {
  const response = await invoke("/api/stats/valorant-auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "exchange_token" }),
  });
  assert.equal(response.status, 400);
});

test("valorant-player-store route rejects missing tokens", async () => {
  const response = await invoke("/api/stats/valorant-player-store", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  assert.equal(response.status, 400);
});

test("valorant-inventory route rejects missing tokens", async () => {
  const response = await invoke("/api/stats/valorant-inventory", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  assert.equal(response.status, 400);
});
