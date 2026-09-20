/**
 * Synthèse « ASMR » de la pluie et de l'orage — pur calcul sur des Float32Array, sans API Web Audio,
 * donc testable en Node. Contrairement à l'ancien rendu (mono, gouttes = sinusoïdes, boucle qui
 * « saute » à la jonction), on produit :
 *  - du STÉRÉO décorrélé (chaque oreille reçoit un bruit différent : sensation d'espace / binaural) ;
 *  - des gouttes = impacts bruités qui résonnent (pas des « bips ») répartis dans l'espace ;
 *  - un vrai tonnerre : craquement sec + grondement grave qui roule et s'éteint lentement ;
 *  - une boucle SANS COUTURE (fondu enchaîné équi-puissance entre la fin et le début).
 */

export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type StereoBuffer = [Float32Array, Float32Array];

const TWO_PI = Math.PI * 2;

/** Bruit rose (Paul Kellet) — spectre en 1/f, naturel pour de l'eau et du vent. */
function makePink(rng: Rng): () => number {
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  return () => {
    const white = rng() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.969 * b2 + white * 0.153852;
    b3 = 0.8665 * b3 + white * 0.3104856;
    b4 = 0.55 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.016898;
    const out = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
    b6 = white * 0.115926;
    return out;
  };
}

function onePoleLp(cutoff: number, sr: number): (x: number) => number {
  const a = Math.exp(-TWO_PI * cutoff / sr);
  let y = 0;
  return (x) => (y = (1 - a) * x + a * y);
}

function onePoleHp(cutoff: number, sr: number): (x: number) => number {
  const lp = onePoleLp(cutoff, sr);
  return (x) => x - lp(x);
}

/**
 * Rend la boucle sans couture : on génère `n + fade` échantillons, puis on fond la QUEUE
 * excédentaire dans la TÊTE (équi-puissance). Le dernier échantillon enchaîne alors
 * naturellement sur le premier.
 */
function makeSeamless(ch: Float32Array, n: number, fade: number): Float32Array {
  const out = new Float32Array(n);
  out.set(ch.subarray(0, n));
  for (let i = 0; i < fade; i++) {
    const t = i / fade;
    const wIn = Math.sin((t * Math.PI) / 2);
    const wOut = Math.cos((t * Math.PI) / 2);
    out[i] = ch[i] * wIn + ch[n + i] * wOut;
  }
  return out;
}

function peakNormalize(l: Float32Array, r: Float32Array, target: number): void {
  let peak = 0;
  for (let i = 0; i < l.length; i++) peak = Math.max(peak, Math.abs(l[i]), Math.abs(r[i]));
  if (peak <= 0) return;
  const g = target / peak;
  for (let i = 0; i < l.length; i++) {
    l[i] = Math.tanh(l[i] * g * 0.98) * 0.98;
    r[i] = Math.tanh(r[i] * g * 0.98) * 0.98;
  }
}

/** Résonateur 2 pôles : une petite excitation bruitée « sonne » comme un impact sur une surface. */
function addImpact(
  l: Float32Array,
  r: Float32Array,
  start: number,
  freq: number,
  decaySec: number,
  amp: number,
  pan: number,
  sr: number,
  rng: Rng
): void {
  const len = Math.min(l.length - start, Math.floor(sr * decaySec * 6));
  if (len <= 0) return;
  const w = (TWO_PI * freq) / sr;
  const rad = Math.exp(-1 / (sr * decaySec));
  const c1 = 2 * rad * Math.cos(w);
  const c2 = -rad * rad;
  // équi-puissance : pan ∈ [-1, 1]
  const gl = Math.cos(((pan + 1) * Math.PI) / 4);
  const gr = Math.sin(((pan + 1) * Math.PI) / 4);
  let y1 = 0, y2 = 0;
  const excite = Math.max(2, Math.floor(sr * 0.0007));
  for (let i = 0; i < len; i++) {
    const x = i < excite ? (rng() * 2 - 1) : 0;
    const y = c1 * y1 + c2 * y2 + x;
    y2 = y1;
    y1 = y;
    const v = y * amp;
    l[start + i] += v * gl;
    r[start + i] += v * gr;
  }
}

interface RainOptions {
  /** Gouttes par seconde. */
  density: number;
  /** Cutoff du passe-bas du lit de pluie (Hz). */
  bedCutoff: number;
  /** Gain relatif du lit / des gouttes. */
  bedGain: number;
  dropGain: number;
}

function renderRainInto(
  l: Float32Array,
  r: Float32Array,
  sr: number,
  seconds: number,
  rng: Rng,
  o: RainOptions
): void {
  const n = l.length;
  const pinkL = makePink(rng);
  const pinkR = makePink(rng);
  const lpL = onePoleLp(o.bedCutoff, sr);
  const lpR = onePoleLp(o.bedCutoff, sr);
  const hpL = onePoleHp(140, sr);
  const hpR = onePoleHp(140, sr);
  // Respiration lente : cycles entiers sur la durée → la boucle se referme d'elle-même.
  const cyc1 = Math.max(1, Math.round(seconds / 13));
  const cyc2 = Math.max(1, Math.round(seconds / 23));

  for (let i = 0; i < n; i++) {
    const t = i / n;
    const swell = 0.9 + 0.07 * Math.sin(TWO_PI * cyc1 * t) + 0.04 * Math.sin(TWO_PI * cyc2 * t + 1.3);
    l[i] += hpL(lpL(pinkL())) * o.bedGain * swell;
    r[i] += hpR(lpR(pinkR())) * o.bedGain * swell;
  }

  // Gouttes : processus de Poisson, beaucoup de petites, quelques grosses (loi de puissance).
  const count = Math.floor(seconds * o.density);
  for (let d = 0; d < count; d++) {
    const start = Math.floor(rng() * (n - sr * 0.05));
    const loud = Math.pow(rng(), 3); // majorité très douces
    const amp = (0.02 + loud * 0.28) * o.dropGain;
    const big = rng() < 0.06; // « plop » plus grave et plus long
    const freq = big ? 500 + rng() * 700 : 1800 + rng() * 4200;
    const decay = big ? 0.012 + rng() * 0.012 : 0.0025 + rng() * 0.006;
    // Panoramique franc (jamais au centre) : c'est ce qui décorrèle les deux oreilles.
    const pan = (rng() < 0.5 ? -1 : 1) * (0.35 + rng() * 0.65);
    addImpact(l, r, start, freq, decay, amp * (big ? 1.4 : 1), pan, sr, rng);
  }
}

export function renderRain(sr: number, seconds = 30, rng: Rng = Math.random): StereoBuffer {
  const n = Math.floor(sr * seconds);
  const fade = Math.floor(sr * 2);
  const l = new Float32Array(n + fade);
  const r = new Float32Array(n + fade);
  renderRainInto(l, r, sr, seconds + fade / sr, rng, { density: 95, bedCutoff: 6500, bedGain: 1.0, dropGain: 1.0 });
  const outL = makeSeamless(l, n, fade);
  const outR = makeSeamless(r, n, fade);
  peakNormalize(outL, outR, 0.85);
  return [outL, outR];
}

/** Grondement de tonnerre : craquement sec, puis basses qui roulent et s'éteignent. */
function addThunder(l: Float32Array, r: Float32Array, start: number, sr: number, rng: Rng, strength: number): void {
  const n = l.length;
  const dur = 7 + rng() * 3; // secondes
  const len = Math.min(n - start, Math.floor(sr * dur));
  if (len <= 0) return;
  const lpA = onePoleLp(110 + rng() * 40, sr);
  const lpB = onePoleLp(110 + rng() * 40, sr);
  const lpA2 = onePoleLp(260, sr);
  const lpB2 = onePoleLp(260, sr);
  let brownA = 0, brownB = 0;
  // 3-4 « roulements » successifs superposés (le tonnerre se répercute sur les nuages).
  const rolls = 3 + Math.floor(rng() * 2);
  const rollAt: number[] = [];
  const rollAmp: number[] = [];
  for (let k = 0; k < rolls; k++) {
    rollAt.push(k === 0 ? 0 : (0.4 + rng() * 2.6) * sr * (k / rolls + 0.3));
    rollAmp.push(k === 0 ? 1 : 0.35 + rng() * 0.45);
  }
  for (let i = 0; i < len; i++) {
    let env = 0;
    for (let k = 0; k < rolls; k++) {
      const dt = (i - rollAt[k]) / sr;
      if (dt < 0) continue;
      // attaque ~0.35 s, extinction lente
      env += rollAmp[k] * (1 - Math.exp(-dt / 0.35)) * Math.exp(-dt / (2.4 + k * 0.4));
    }
    const wa = rng() * 2 - 1;
    const wb = rng() * 2 - 1;
    brownA = (brownA + 0.02 * wa) / 1.02;
    brownB = (brownB + 0.02 * wb) / 1.02;
    const lowA = lpA(brownA) * 9 + lpA2(wa) * 0.5;
    const lowB = lpB(brownB) * 9 + lpB2(wb) * 0.5;
    l[start + i] += lowA * env * strength;
    r[start + i] += lowB * env * strength;
  }
  // Craquement initial : impact bref et brillant, très localisé.
  const pan = rng() * 1.2 - 0.6;
  addImpact(l, r, start, 900 + rng() * 500, 0.03, 0.55 * strength, pan, sr, rng);
  addImpact(l, r, start + Math.floor(sr * 0.012), 2500, 0.012, 0.3 * strength, pan, sr, rng);
}

export function renderStorm(sr: number, seconds = 30, rng: Rng = Math.random): StereoBuffer {
  const n = Math.floor(sr * seconds);
  const fade = Math.floor(sr * 2);
  const l = new Float32Array(n + fade);
  const r = new Float32Array(n + fade);
  // Pluie battante : lit plus dense/plus grave, gouttes nombreuses.
  renderRainInto(l, r, sr, seconds + fade / sr, rng, { density: 170, bedCutoff: 4200, bedGain: 1.35, dropGain: 0.9 });

  // Rafales de vent : bruit filtré modulé lentement (cycles entiers → boucle fermée).
  const pinkW = makePink(rng);
  const lpW = onePoleLp(650, sr);
  const gustCycles = Math.max(1, Math.round(seconds / 9));
  for (let i = 0; i < n + fade; i++) {
    const t = i / (n + fade);
    const g = 0.5 + 0.5 * Math.sin(TWO_PI * gustCycles * t + 0.7);
    const v = lpW(pinkW()) * 0.9 * g * g;
    l[i] += v;
    r[i] += v * 0.85 + lpW(pinkW()) * 0.05;
  }

  // 2 à 3 coups de tonnerre, jamais collés à la couture de la boucle.
  const bolts = 2 + (rng() < 0.5 ? 1 : 0);
  for (let b = 0; b < bolts; b++) {
    const slot = (n * (b + 0.15 + rng() * 0.45)) / bolts;
    addThunder(l, r, Math.floor(slot + sr * 1.5), sr, rng, 0.9 + rng() * 0.5);
  }

  const outL = makeSeamless(l, n, fade);
  const outR = makeSeamless(r, n, fade);
  peakNormalize(outL, outR, 0.88);
  return [outL, outR];
}
