import assert from "node:assert/strict";
import test from "node:test";
import { clock, liveProgress, pollDelay } from "./spotify.ts";

test("the progress runs while playing and stops at the end of the track", () => {
  const track = { title: "A", progressMs: 1000, durationMs: 5000 };
  assert.equal(liveProgress({ playing: true, track, at: 0 }, 2000), 3000);
  assert.equal(liveProgress({ playing: false, track, at: 0 }, 2000), 1000);
  assert.equal(liveProgress({ playing: true, track, at: 0 }, 99000), 5000);
  assert.equal(liveProgress({ playing: true, track: null, at: 0 }, 2000), 2000);
});

test("times and polling follow the state", () => {
  assert.equal(clock(244989), "4:04");
  assert.equal(clock(-5), "0:00");
  assert.ok(pollDelay({ linked: true, playing: true }) < pollDelay({ linked: true, playing: false }));
  assert.ok(pollDelay({ linked: false, playing: false }) > 60000);
});
