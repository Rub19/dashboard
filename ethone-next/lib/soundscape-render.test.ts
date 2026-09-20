import { mulberry32, renderRain, renderStorm } from "./soundscape-render";

const SR = 22050; // taux réduit : mêmes propriétés, test plus rapide

function rms(a: Float32Array, from = 0, to = a.length): number {
  let s = 0;
  for (let i = from; i < to; i++) s += a[i] * a[i];
  return Math.sqrt(s / Math.max(1, to - from));
}

function correlation(a: Float32Array, b: Float32Array): number {
  let sab = 0, saa = 0, sbb = 0;
  for (let i = 0; i < a.length; i++) {
    sab += a[i] * b[i];
    saa += a[i] * a[i];
    sbb += b[i] * b[i];
  }
  return sab / Math.sqrt(saa * sbb);
}

/** Énergie basse fréquence (< ~150 Hz) via moyenne glissante sur ~1/150 s. */
function lowEnergy(a: Float32Array): number {
  const win = Math.floor(SR / 150);
  let acc = 0;
  let out = 0;
  for (let i = 0; i < a.length; i++) {
    acc += a[i];
    if (i >= win) acc -= a[i - win];
    const m = acc / win;
    out += m * m;
  }
  return out / a.length;
}

describe("soundscape-render", () => {
  const rain = renderRain(SR, 12, mulberry32(1));
  const storm = renderStorm(SR, 24, mulberry32(7));

  it("produces finite, non-clipping stereo buffers", () => {
    for (const [l, r] of [rain, storm]) {
      let peak = 0;
      let finite = true;
      for (let i = 0; i < l.length; i++) {
        if (!Number.isFinite(l[i]) || !Number.isFinite(r[i])) finite = false;
        peak = Math.max(peak, Math.abs(l[i]), Math.abs(r[i]));
      }
      expect(finite).toBe(true);
      expect(peak).toBeLessThanOrEqual(0.99);
      expect(peak).toBeGreaterThan(0.3);
    }
  });

  it("is genuinely stereo: left and right are decorrelated", () => {
    expect(Math.abs(correlation(rain[0], rain[1]))).toBeLessThan(0.35);
    expect(Math.abs(correlation(storm[0], storm[1]))).toBeLessThan(0.6);
  });

  it("loops without a seam: the end continues into the start", () => {
    for (const [l] of [rain, storm]) {
      const step = Math.abs(l[0] - l[l.length - 1]);
      // le saut à la jonction reste du même ordre qu'un pas de bruit ordinaire
      let typical = 0;
      for (let i = 1000; i < 3000; i++) typical += Math.abs(l[i] - l[i - 1]);
      typical /= 2000;
      expect(step).toBeLessThan(typical * 8 + 0.05);
      // et le niveau sonore au raccord est cohérent (pas de trou ni de bosse)
      const start = rms(l, 0, SR);
      const end = rms(l, l.length - SR, l.length);
      expect(end / start).toBeGreaterThan(0.4);
      expect(end / start).toBeLessThan(2.5);
    }
  });

  it("the storm carries real low-frequency thunder that plain rain lacks", () => {
    const stormLow = lowEnergy(storm[0]) / rms(storm[0]) ** 2;
    const rainLow = lowEnergy(rain[0]) / rms(rain[0]) ** 2;
    expect(stormLow).toBeGreaterThan(rainLow * 1.5);
  });

  it("thunder makes the storm's loudness vary over time (rolls and fades)", () => {
    const seg = Math.floor(SR * 1);
    const levels: number[] = [];
    for (let i = 0; i + seg <= storm[0].length; i += seg) levels.push(rms(storm[0], i, i + seg));
    const max = Math.max(...levels);
    const min = Math.min(...levels);
    expect(max / min).toBeGreaterThan(1.25);
  });

  it("renders the in-app workload (24 kHz, 24 s, stereo) within a generous budget", () => {
    // Budget large : ce test ne sert qu'à détecter une régression catastrophique. Les machines
    // de CI sont 2 à 3 fois plus lentes qu'un poste (mesure réelle en navigateur : ~110 / 260 ms).
    const t0 = Date.now();
    renderRain(24000, 24, mulberry32(3));
    renderStorm(24000, 24, mulberry32(4));
    expect(Date.now() - t0).toBeLessThan(25000);
  });
});

import { renderOcean, renderFireplace, renderWind, renderForest, renderNight } from "./soundscape-render";

function crest(a: Float32Array): number {
  let peak = 0;
  for (let i = 0; i < a.length; i++) peak = Math.max(peak, Math.abs(a[i]));
  return peak / (rms(a) || 1);
}

/** Part d'énergie « haute fréquence » (différence première = passe-haut grossier). */
function highShare(a: Float32Array): number {
  let hi = 0;
  let all = 0;
  for (let i = 1; i < a.length; i++) {
    const d = a[i] - a[i - 1];
    hi += d * d;
    all += a[i] * a[i];
  }
  return hi / (all || 1);
}

describe("other natural soundscapes", () => {
  const kinds: Array<[string, () => [Float32Array, Float32Array]]> = [
    ["ocean", () => renderOcean(SR, 16, mulberry32(11))],
    ["fireplace", () => renderFireplace(SR, 16, mulberry32(12))],
    ["wind", () => renderWind(SR, 16, mulberry32(13))],
    ["forest", () => renderForest(SR, 16, mulberry32(14))],
    ["night", () => renderNight(SR, 16, mulberry32(15))],
  ];
  const out = Object.fromEntries(kinds.map(([k, f]) => [k, f()]));

  it.each(kinds.map(([k]) => k))("%s: finite, in range, stereo, seamless", (k) => {
    const [l, r] = out[k];
    let peak = 0;
    let finite = true;
    for (let i = 0; i < l.length; i++) {
      if (!Number.isFinite(l[i]) || !Number.isFinite(r[i])) finite = false;
      peak = Math.max(peak, Math.abs(l[i]), Math.abs(r[i]));
    }
    expect(finite).toBe(true);
    expect(peak).toBeLessThanOrEqual(0.99);
    expect(peak).toBeGreaterThan(0.2);
    expect(Math.abs(correlation(l, r))).toBeLessThan(0.9);
    const start = rms(l, 0, SR);
    const end = rms(l, l.length - SR, l.length);
    expect(end / start).toBeGreaterThan(0.35);
    expect(end / start).toBeLessThan(2.8);
  });

  it("the fireplace is crackly: impulsive and brighter than the ocean", () => {
    expect(crest(out.fireplace[0])).toBeGreaterThan(crest(out.ocean[0]) * 1.3);
    expect(highShare(out.fireplace[0])).toBeGreaterThan(highShare(out.ocean[0]));
  });

  it("the ocean breathes: loudness swells and recedes", () => {
    const seg = Math.floor(SR * 0.5);
    const lv: number[] = [];
    for (let i = 0; i + seg <= out.ocean[0].length; i += seg) lv.push(rms(out.ocean[0], i, i + seg));
    expect(Math.max(...lv) / Math.min(...lv)).toBeGreaterThan(1.6);
  });

  it("crickets add high-frequency content that wind lacks", () => {
    expect(highShare(out.night[0])).toBeGreaterThan(highShare(out.wind[0]));
  });
});
