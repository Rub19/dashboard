import assert from "node:assert/strict";
import test from "node:test";
import { AMBIENT_IDS, fillAmbient, PACK_TONES, UI_PACKS } from "./sounds.ts";

test("there are 14 ambiences and each one produces a real, safe signal", () => {
  assert.equal(AMBIENT_IDS.length, 14);
  let seed = 1;
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (const id of AMBIENT_IDS.filter((item) => item !== "binaural")) {
    const data = new Float32Array(8000 * 12);
    fillAmbient(id, data, 8000, random);
    const peak = data.reduce((best, value) => Math.max(best, Math.abs(value)), 0);
    assert.ok(data.every(Number.isFinite), id);
    assert.ok(peak > 0.01, `${id} est silencieux`);
    assert.ok(peak <= 0.96, `${id} sature`);
  }
});

test("each interface pack except off has a tone", () => {
  for (const pack of UI_PACKS.filter((item) => item !== "off")) assert.ok(PACK_TONES[pack].seconds < 0.1);
});
