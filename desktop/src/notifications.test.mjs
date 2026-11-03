import assert from "node:assert/strict";
import test from "node:test";
import { dueEvents, unseenMail } from "./home.ts";

test("the first mail check only sets the baseline", () => {
  const mail = [{ id: "a" }, { id: "b" }];
  assert.deepEqual(unseenMail(null, mail), []);
  assert.deepEqual(unseenMail(new Set(["a"]), mail), [{ id: "b" }]);
});

test("an event is due once, inside the 10 minutes before it starts", () => {
  const now = Date.parse("2026-11-03T12:00:00Z");
  const event = (id, startAt) => ({ id, startAt });
  const events = [event("soon", "2026-11-03T12:05:00Z"), event("late", "2026-11-03T12:30:00Z"), event("past", "2026-11-03T11:59:00Z"), event("none", null), event("done", "2026-11-03T12:01:00Z")];
  assert.deepEqual(dueEvents(events, ["done"], now).map(({ id }) => id), ["soon"]);
});
