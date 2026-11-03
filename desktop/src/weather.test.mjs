import assert from "node:assert/strict";
import test from "node:test";
import { airLevel, cityTime, compass, hourOf, nextRain, rangeBar, toggleCity, uvLevel, weatherKind } from "./weather.ts";

test("weather codes map to a kind", () => {
  assert.equal(weatherKind(0), "clear");
  assert.equal(weatherKind(2), "partly");
  assert.equal(weatherKind(45), "fog");
  assert.equal(weatherKind(53), "drizzle");
  assert.equal(weatherKind(63), "rain");
  assert.equal(weatherKind(80), "rain");
  assert.equal(weatherKind(75), "snow");
  assert.equal(weatherKind(86), "snow");
  assert.equal(weatherKind(99), "storm");
  assert.equal(weatherKind(null), "clear");
});

test("times stay in the city's own time", () => {
  assert.equal(hourOf("2026-11-03T20:00"), "20:00");
  assert.equal(cityTime("2026-11-03T06:40:00.000Z", 3600), "07:40");
  assert.equal(cityTime("2026-11-03T23:30:00.000Z", 3600), "00:30");
  assert.equal(cityTime(null, 3600), "");
});

test("wind direction and levels", () => {
  assert.equal(compass(0), "N");
  assert.equal(compass(54), "NE");
  assert.equal(compass(350), "N");
  assert.equal(compass(270), "O");
  assert.equal(uvLevel(0), "low");
  assert.equal(uvLevel(8), "very");
  assert.equal(airLevel(48), "moderate");
  assert.equal(airLevel(120), "bad");
});

test("nextRain finds the first likely hour", () => {
  assert.equal(nextRain([{ time: "a", precipitationProbability: 10 }, { time: "b", precipitationProbability: 50 }]), "b");
  assert.equal(nextRain([{ time: "a", precipitationProbability: null }]), null);
});

test("rangeBar stays inside the week's scale", () => {
  assert.deepEqual(rangeBar(5, 10, 0, 10), { left: 50, width: 50 });
  assert.deepEqual(rangeBar(4, 4, 4, 4), { left: 0, width: 4 });
});

test("toggleCity adds then removes", () => {
  assert.deepEqual(toggleCity(["Paris"], "Lyon"), ["Paris", "Lyon"]);
  assert.deepEqual(toggleCity(["Paris", "Lyon"], "Paris"), ["Lyon"]);
});
