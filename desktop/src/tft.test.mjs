import assert from "node:assert/strict";
import test from "node:test";
import { tftDuration, tftPlacementTone, tftRiotId, tftSummary } from "./tft.ts";

test("TFT summary uses only matches with a real placement", () => {
  const summary = tftSummary([
    { me: { placement: 1 } },
    { me: { placement: 4 } },
    { me: { placement: 7 } },
    { me: null },
  ]);
  assert.deepEqual(summary, { games: 3, average: 4, topFour: 2, wins: 1, topFourRate: 67 });
});

test("TFT placement tone distinguishes wins, top four and eliminations", () => {
  assert.equal(tftPlacementTone(1), "first");
  assert.equal(tftPlacementTone(3), "top");
  assert.equal(tftPlacementTone(8), "out");
  assert.equal(tftPlacementTone(undefined), "unknown");
});

test("TFT duration stays compact and readable", () => {
  assert.equal(tftDuration(1855), "30 min 55 s");
  assert.equal(tftDuration(0), "");
});

test("TFT reuses the connected Riot identity", () => {
  assert.equal(tftRiotId({ name: "Rub19", tag: "Boss" }), "Rub19#Boss");
  assert.equal(tftRiotId(null), "");
});
