export const AMBIENT_IDS = ["brown", "pink", "rain", "storm", "ocean", "wind", "forest", "nature", "fireplace", "cafe", "night", "train", "space", "binaural"] as const;
export type SoundId = (typeof AMBIENT_IDS)[number];
export type BakedSound = Exclude<SoundId, "binaural">;
export const LOOP_SECONDS = 12;

const TAU = Math.PI * 2;

function burst(data: Float32Array, rate: number, at: number, seconds: number, shape: (time: number) => number) {
  const start = Math.floor(at * rate);
  const length = Math.floor(seconds * rate);
  for (let index = 0; index < length; index++) {
    data[(start + index) % data.length] += shape(index / rate);
  }
}

export function fillAmbient(id: BakedSound, data: Float32Array, rate: number, random: () => number = Math.random) {
  const seconds = data.length / rate;
  const noise = () => random() * 2 - 1;
  let brown = 0;
  let soft = 0;
  const pink = [0, 0, 0];
  let high = 0;
  for (let index = 0; index < data.length; index++) {
    const time = index / rate;
    const white = noise();
    brown = (brown + 0.02 * white) / 1.02;
    pink[0] = 0.997 * pink[0] + 0.029 * white;
    pink[1] = 0.985 * pink[1] + 0.033 * white;
    pink[2] = 0.95 * pink[2] + 0.07 * white;
    const rose = pink[0] + pink[1] + pink[2];
    soft = 0.97 * soft + 0.03 * white;
    high = white - soft;
    const wave = (cycles: number) => 0.5 + 0.5 * Math.sin((TAU * cycles * time) / seconds);
    const value = {
      brown: brown * 3.5,
      pink: rose * 1.6,
      rain: high * 0.45 + rose * 0.25,
      storm: high * 0.35 + brown * 2.6,
      ocean: (brown * 2.2 + rose * 0.9) * (0.25 + 0.75 * wave(2)),
      wind: soft * 2.4 * (0.35 + 0.65 * wave(3)) * (0.6 + 0.4 * wave(7)),
      forest: rose * 0.45 * (0.6 + 0.4 * wave(2)),
      nature: rose * 0.4 + high * 0.14 * (0.7 + 0.3 * wave(5)),
      fireplace: brown * 2.6,
      cafe: soft * 1.5 * (0.55 + 0.45 * wave(9)) * (0.7 + 0.3 * wave(23)),
      night: rose * 0.18,
      train: brown * 3 + soft * 0.5,
      space: (Math.sin(TAU * 55 * time) * 0.2 + Math.sin(TAU * 82.5 * time) * 0.14 + Math.sin(TAU * 110 * time) * 0.08) * (0.5 + 0.5 * wave(1)) + rose * 0.08,
    }[id];
    data[index] = value;
  }
  const chirp = (at: number) => {
    const base = 2200 + random() * 1800;
    burst(data, rate, at, 0.16, (time) => Math.sin(TAU * (base + 5000 * time) * time) * Math.sin((Math.PI * time) / 0.16) * 0.16);
  };
  if (id === "forest" || id === "nature") for (let count = 0; count < 14; count++) chirp(random() * seconds);
  if (id === "storm") {
    const at = 2 + random() * (seconds - 7);
    let rumble = 0;
    burst(data, rate, at, 4, (time) => {
      rumble = (rumble + 0.04 * noise()) / 1.04;
      return rumble * 7 * Math.exp(-time * 1.1);
    });
  }
  if (id === "fireplace") {
    for (let count = 0; count < 110; count++) {
      const power = 0.1 + random() * 0.5;
      burst(data, rate, random() * seconds, 0.012, (time) => noise() * power * Math.exp(-time * 420));
    }
  }
  if (id === "cafe") {
    for (let count = 0; count < 7; count++) {
      const tone = 2400 + random() * 1600;
      burst(data, rate, random() * seconds, 0.2, (time) => Math.sin(TAU * tone * time) * 0.07 * Math.exp(-time * 26));
    }
  }
  if (id === "night") {
    for (let at = 0; at < seconds; at += 0.75) {
      for (let pulse = 0; pulse < 3; pulse++) {
        burst(data, rate, at + pulse * 0.07, 0.05, (time) => Math.sin(TAU * 4400 * time) * Math.sin((Math.PI * time) / 0.05) * 0.055);
      }
    }
  }
  if (id === "train") {
    for (let at = 0; at < seconds; at += 1) {
      for (const offset of [0, 0.16]) {
        let thud = 0;
        burst(data, rate, at + offset, 0.09, (time) => {
          thud = 0.8 * thud + 0.2 * noise();
          return thud * 1.1 * Math.exp(-time * 45);
        });
      }
    }
  }
  let peak = 0;
  for (let index = 0; index < data.length; index++) peak = Math.max(peak, Math.abs(data[index]));
  if (peak > 0.95) for (let index = 0; index < data.length; index++) data[index] *= 0.95 / peak;
}

export const UI_PACKS = ["off", "soft", "crisp", "retro"] as const;
export type UiPack = (typeof UI_PACKS)[number];
export const PACK_TONES: Record<Exclude<UiPack, "off">, { type: OscillatorType; from: number; to: number; seconds: number; level: number }> = {
  soft: { type: "sine", from: 520, to: 380, seconds: 0.06, level: 0.05 },
  crisp: { type: "triangle", from: 1500, to: 1100, seconds: 0.025, level: 0.04 },
  retro: { type: "square", from: 880, to: 660, seconds: 0.04, level: 0.018 },
};
