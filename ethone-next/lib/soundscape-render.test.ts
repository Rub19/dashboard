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

  it("renders fast enough not to freeze the UI (full quality, 30 s stereo)", () => {
    const t0 = Date.now();
    renderRain(48000, 30, mulberry32(3));
    renderStorm(48000, 30, mulberry32(4));
    expect(Date.now() - t0).toBeLessThan(6000);
  });
});
