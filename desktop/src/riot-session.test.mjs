import assert from "node:assert/strict";
import test from "node:test";
import { riotReconnectRequired } from "./riot-session.ts";

test("expired and missing Riot sessions require a new login", () => {
  assert.equal(riotReconnectRequired("riotExpired"), true);
  assert.equal(riotReconnectRequired({ message: "riotRequired" }), true);
});

test("network and generic Riot errors keep the retry action", () => {
  assert.equal(riotReconnectRequired("riotUnreachable"), false);
  assert.equal(riotReconnectRequired(new Error("riotFailed")), false);
  assert.equal(riotReconnectRequired(null), false);
});

