import assert from "node:assert/strict";
import test from "node:test";
import { openRiotLoginInBrowser, riotReconnectRequired } from "./riot-session.ts";

test("expired and missing Riot sessions require a new login", () => {
  assert.equal(riotReconnectRequired("riotExpired"), true);
  assert.equal(riotReconnectRequired({ message: "riotRequired" }), true);
});

test("network and generic Riot errors keep the retry action", () => {
  assert.equal(riotReconnectRequired("riotUnreachable"), false);
  assert.equal(riotReconnectRequired(new Error("riotFailed")), false);
  assert.equal(riotReconnectRequired(null), false);
});

test("Riot login always opens through the system browser command", async () => {
  let calls = 0;
  await openRiotLoginInBrowser(async () => {
    calls += 1;
  });
  assert.equal(calls, 1);
});
