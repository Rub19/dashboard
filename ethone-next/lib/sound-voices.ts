/**
 * Voix des sons d'interface « naturels » : gouttes d'eau, bois, cloches de verre, souffles d'air —
 * au lieu de bips d'oscillateurs bruts (carré / dent de scie). Tout est synthétisé avec Web Audio,
 * sans fichier audio : cloches à partiels inharmoniques, attaque douce, bruit filtré pour les
 * transitoires, et une petite réverbération de pièce partagée pour l'espace.
 */

type Ctx = BaseAudioContext;

export type VoiceType =
  | "click"
  | "hover"
  | "success"
  | "error"
  | "toggle"
  | "notification"
  | "warning"
  | "brain"
  | "pulse"
  | "launch"
  | "open"
  | "close"
  | "notice"
  | "confirm";

// Gamme pentatonique majeure de La : jamais dissonant, quel que soit l'enchaînement des sons.
const N = {
  A4: 440, B4: 494, Cs5: 554, E5: 659, Fs5: 740, A5: 880, B5: 988, Cs6: 1109, E6: 1319, A6: 1760,
};

interface Room {
  input: GainNode;
}
const rooms = new WeakMap<BaseAudioContext, Room>();

/** Petite pièce : réponse impulsionnelle bruitée qui décroît (~0,9 s), adoucie dans les aigus. */
function getRoom(ctx: Ctx, dest: AudioNode): Room {
  const existing = rooms.get(ctx);
  if (existing) return existing;
  const seconds = 0.9;
  const length = Math.floor(ctx.sampleRate * seconds);
  const ir = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = ir.getChannelData(c);
    let lp = 0;
    for (let i = 0; i < length; i++) {
      const t = i / length;
      lp += 0.3 * ((Math.random() * 2 - 1) - lp);
      d[i] = lp * Math.pow(1 - t, 3.2) * (i < 40 ? i / 40 : 1);
    }
  }
  const convolver = ctx.createConvolver();
  convolver.buffer = ir;
  const wet = ctx.createGain();
  wet.gain.value = 0.55;
  const input = ctx.createGain();
  input.connect(convolver);
  convolver.connect(wet);
  wet.connect(dest);
  const room = { input };
  rooms.set(ctx, room);
  return room;
}

const noiseCache = new WeakMap<BaseAudioContext, AudioBuffer>();
function noise(ctx: Ctx): AudioBuffer {
  let b = noiseCache.get(ctx);
  if (!b) {
    b = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 1), ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    noiseCache.set(ctx, b);
  }
  return b;
}

interface Bus {
  ctx: Ctx;
  out: AudioNode;
  send: GainNode;
}

function envelope(g: GainNode, t: number, attack: number, peak: number, decay: number): number {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(Math.max(0.0002, peak), t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  return t + attack + decay;
}

/** Cloche de verre : partiels inharmoniques, les aigus s'éteignent plus vite. */
function bell(b: Bus, t: number, freq: number, peak: number, decay: number, sendAmt = 0.4): number {
  const partials: Array<[number, number, number]> = [
    [1, 1, 1],
    [2.01, 0.3, 0.55],
    [2.76, 0.16, 0.35],
    [4.07, 0.07, 0.2],
  ];
  const sum = b.ctx.createGain();
  sum.connect(b.out);
  const send = b.ctx.createGain();
  send.gain.value = sendAmt;
  sum.connect(send);
  send.connect(b.send);
  let end = t;
  for (const [ratio, amp, dec] of partials) {
    const osc = b.ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq * ratio;
    osc.detune.value = (Math.random() - 0.5) * 6;
    const g = b.ctx.createGain();
    end = Math.max(end, envelope(g, t, 0.004, peak * amp, decay * dec));
    osc.connect(g);
    g.connect(sum);
    osc.start(t);
    osc.stop(t + decay + 0.05);
  }
  return end;
}

/** Goutte d'eau : sinusoïde qui glisse vers le grave, très courte. */
function droplet(b: Bus, t: number, f0: number, f1: number, peak: number, dur: number, sendAmt = 0.25): number {
  const osc = b.ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(f0, t);
  osc.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + dur);
  const g = b.ctx.createGain();
  const end = envelope(g, t, 0.002, peak, dur);
  osc.connect(g);
  g.connect(b.out);
  const send = b.ctx.createGain();
  send.gain.value = sendAmt;
  g.connect(send);
  send.connect(b.send);
  osc.start(t);
  osc.stop(end + 0.02);
  return end;
}

/** Transitoire : petit souffle de bruit filtré (le « toc » d'un doigt sur du bois). */
function tap(b: Bus, t: number, freq: number, q: number, peak: number, dur: number): number {
  const src = b.ctx.createBufferSource();
  src.buffer = noise(b.ctx);
  const bp = b.ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = freq;
  bp.Q.value = q;
  const g = b.ctx.createGain();
  const end = envelope(g, t, 0.001, peak, dur);
  src.connect(bp);
  bp.connect(g);
  g.connect(b.out);
  src.start(t, Math.random() * 0.5);
  src.stop(end + 0.02);
  return end;
}

/** Souffle d'air : bruit dont la bande passante glisse (ouverture / fermeture / lancement). */
function whoosh(b: Bus, t: number, from: number, to: number, peak: number, dur: number): number {
  const src = b.ctx.createBufferSource();
  src.buffer = noise(b.ctx);
  const bp = b.ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.Q.value = 0.9;
  bp.frequency.setValueAtTime(from, t);
  bp.frequency.exponentialRampToValueAtTime(to, t + dur);
  const g = b.ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + dur * 0.45);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(bp);
  bp.connect(g);
  g.connect(b.out);
  const send = b.ctx.createGain();
  send.gain.value = 0.3;
  g.connect(send);
  send.connect(b.send);
  src.start(t, Math.random() * 0.5);
  src.stop(t + dur + 0.05);
  return t + dur;
}

/** Coup mat de bois / battement doux (erreur, pulsation) : jamais agressif. */
function thud(b: Bus, t: number, f: number, peak: number, dur: number): number {
  const end = droplet(b, t, f, f * 0.62, peak, dur, 0.15);
  tap(b, t, f * 4, 1.2, peak * 0.25, 0.03);
  return end;
}

/**
 * Programme le son `type`. `peak` est le niveau maître (master × catégorie × volume de la
 * recette). Renvoie l'instant de fin, comme scheduleSound.
 */
export function scheduleVoice(
  ctx: Ctx,
  dest: AudioNode,
  type: VoiceType,
  startTime: number,
  peak: number,
  panValue: number | null
): number | null {
  if (peak <= 0.0001) return null;

  // Chaîne commune : passe-bas doux (retire toute dureté) → pan léger → sortie.
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 7000;
  lp.Q.value = 0.5;
  const out: AudioNode = lp;
  if (panValue != null && typeof ctx.createStereoPanner === "function") {
    const panner = ctx.createStereoPanner();
    panner.pan.value = Math.max(-0.5, Math.min(0.5, panValue * 4));
    lp.connect(panner);
    panner.connect(dest);
  } else {
    lp.connect(dest);
  }
  const room = getRoom(ctx, dest);
  const send = ctx.createGain();
  send.gain.value = 1;
  send.connect(room.input);
  const b: Bus = { ctx, out, send };
  const t = startTime;
  const p = peak;
  let end = t;
  const up = (e: number) => {
    end = Math.max(end, e);
  };

  switch (type) {
    case "click":
      up(droplet(b, t, 1150, 680, p * 0.95, 0.06));
      up(tap(b, t, 2600, 2, p * 0.22, 0.02));
      break;
    case "hover":
      up(droplet(b, t, 1900, 1500, p * 0.55, 0.022, 0.05));
      break;
    case "toggle":
      up(bell(b, t, N.E5, p * 0.85, 0.16, 0.2));
      up(tap(b, t, 1800, 2, p * 0.15, 0.015));
      break;
    case "open":
      up(whoosh(b, t, 500, 2200, p * 0.5, 0.15));
      up(bell(b, t + 0.05, N.A5, p * 0.4, 0.22, 0.35));
      break;
    case "close":
      up(whoosh(b, t, 2000, 450, p * 0.5, 0.14));
      up(bell(b, t + 0.03, N.E5, p * 0.4, 0.18, 0.3));
      break;
    case "confirm":
      up(bell(b, t, N.A5, p * 0.7, 0.2, 0.3));
      up(bell(b, t + 0.06, N.Cs6, p * 0.7, 0.26, 0.35));
      break;
    case "success":
      up(bell(b, t, N.A5, p * 0.8, 0.45, 0.45));
      up(bell(b, t + 0.09, N.E6, p * 0.7, 0.5, 0.5));
      up(bell(b, t + 0.18, N.A6, p * 0.5, 0.65, 0.55));
      break;
    case "error":
      up(thud(b, t, 230, p * 0.9, 0.14));
      up(thud(b, t + 0.11, 190, p * 0.8, 0.18));
      break;
    case "warning":
      up(bell(b, t, N.B4, p * 0.8, 0.34, 0.3));
      up(bell(b, t + 0.15, N.B4, p * 0.65, 0.4, 0.3));
      break;
    case "notification":
      up(bell(b, t, N.E6, p * 0.75, 0.55, 0.5));
      up(bell(b, t + 0.11, N.B5, p * 0.7, 0.65, 0.5));
      break;
    case "notice":
      up(bell(b, t, N.Cs6, p * 0.65, 0.45, 0.45));
      break;
    case "brain":
      up(bell(b, t, N.Fs5, p * 0.6, 0.6, 0.55));
      up(bell(b, t + 0.07, N.B5, p * 0.55, 0.65, 0.55));
      up(bell(b, t + 0.14, N.E6, p * 0.5, 0.75, 0.6));
      break;
    case "pulse":
      up(thud(b, t, 95, p * 1.0, 0.13));
      up(thud(b, t + 0.16, 78, p * 0.8, 0.16));
      break;
    case "launch":
      up(whoosh(b, t, 300, 3500, p * 0.6, 0.36));
      up(bell(b, t + 0.2, N.A5, p * 0.6, 0.5, 0.45));
      up(bell(b, t + 0.28, N.E6, p * 0.55, 0.6, 0.5));
      break;
  }
  return end + 0.05;
}

/** Utilisé par les tests / l'aperçu : la liste des types couverts. */
export const VOICE_TYPES: VoiceType[] = [
  "click", "hover", "success", "error", "toggle", "notification", "warning",
  "brain", "pulse", "launch", "open", "close", "notice", "confirm",
];
