/**
 * Moteur de synthèse d'ondes binaurales & fréquences sacrées (Solfeggio) — ETHONE OS.
 *
 * Utilise la Web Audio API avec séparation stéréo stricte :
 *  - Oreille gauche : fréquence porteuse - (delta / 2)
 *  - Oreille droite : fréquence porteuse + (delta / 2)
 * Le cerveau synchronise les hémisphères et perçoit la pulsation à la fréquence delta (effet binaural).
 */

export type BrainwaveBand = "delta" | "theta" | "alpha" | "beta" | "gamma";

export interface BrainwaveInfo {
  band: BrainwaveBand;
  name: string;
  range: [number, number];
  defaultFreq: number;
  description: string;
  benefit: string;
  color: string;
}

export const BRAINWAVE_BANDS: Record<BrainwaveBand, BrainwaveInfo> = {
  delta: {
    band: "delta",
    name: "Ondes Delta",
    range: [0.5, 4],
    defaultFreq: 2.5,
    description: "Sommeil profond réparateur & régénération",
    benefit: "Lâcher-prise total, récupération physique et sommeil profond sans rêve.",
    color: "#6366f1", // Indigo
  },
  theta: {
    band: "theta",
    name: "Ondes Theta",
    range: [4, 8],
    defaultFreq: 6.0,
    description: "État de Flow créatif & méditation profonde",
    benefit: "Accès à l'inconscient, inspiration artistique et mémoire émotionnelle.",
    color: "#8b5cf6", // Violet
  },
  alpha: {
    band: "alpha",
    name: "Ondes Alpha",
    range: [8, 13],
    defaultFreq: 10.0,
    description: "Relaxation alerte & présence sereine",
    benefit: "Réduction de l'anxiété, concentration détendue et clarté d'esprit.",
    color: "#10b981", // Emerald
  },
  beta: {
    band: "beta",
    name: "Ondes Beta",
    range: [13, 30],
    defaultFreq: 18.0,
    description: "Focus actif, vivacité & résolution de problèmes",
    benefit: "Prise de décision rapide, vigilance intellectuelle et productivité rythmée.",
    color: "#f59e0b", // Amber
  },
  gamma: {
    band: "gamma",
    name: "Ondes Gamma",
    range: [30, 50],
    defaultFreq: 40.0,
    description: "Hyper-cognition & synchronicité mentale",
    benefit: "Performances cognitives de pointe, perception globale et rétention d'informations.",
    color: "#ec4899", // Rose / Pink
  },
};

export interface SolfeggioFrequency {
  freq: number;
  title: string;
  purpose: string;
  harmonic: string;
}

export const SOLFEGGIO_FREQUENCIES: SolfeggioFrequency[] = [
  { freq: 432, title: "432 Hz", purpose: "Harmonie naturelle universelle", harmonic: "Clarté & Paix" },
  { freq: 528, title: "528 Hz", purpose: "Fréquence Miracle & Réparation", harmonic: "Transformation & Flow" },
  { freq: 639, title: "639 Hz", purpose: "Connexion & Relations harmonieuses", harmonic: "Équilibre & Empathie" },
  { freq: 852, title: "852 Hz", purpose: "Intuition & Éveil spirituel", harmonic: "Conscience & Sérénité" },
  { freq: 216, title: "216 Hz", purpose: "Basse fondamentale pure", harmonic: "Ancrage terrestre" },
  { freq: 108, title: "108 Hz", purpose: "Sous-harmonique sacrée", harmonic: "Méditation profonde" },
];

export class BinauralSynth {
  private ctx: AudioContext | null = null;
  private oscLeft: OscillatorNode | null = null;
  private oscRight: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;
  private merger: ChannelMergerNode | null = null;
  private isPlaying = false;
  private currentCarrier = 432;
  private currentBeat = 10;
  private currentVolume = 0.5;

  constructor(sharedContext?: AudioContext | null) {
    if (sharedContext) {
      this.ctx = sharedContext;
    }
  }

  private initContext(): AudioContext | null {
    if (this.ctx && this.ctx.state !== "closed") return this.ctx;
    if (typeof window === "undefined") return null;

    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return null;

    try {
      this.ctx = new AudioContextClass({ latencyHint: "interactive" });
    } catch {
      try {
        this.ctx = new AudioContextClass();
      } catch {
        return null;
      }
    }
    return this.ctx;
  }

  /** Démarre ou met à jour la synthèse binaurale avec fondu d'attaque progressif. */
  public start(carrier = this.currentCarrier, beat = this.currentBeat, volume = this.currentVolume): boolean {
    const ctx = this.initContext();
    if (!ctx) return false;

    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    this.currentCarrier = carrier;
    this.currentBeat = beat;
    this.currentVolume = Math.max(0, Math.min(1, volume));

    const fLeft = Math.max(20, carrier - beat / 2);
    const fRight = Math.max(20, carrier + beat / 2);

    if (this.isPlaying && this.oscLeft && this.oscRight && this.gainNode) {
      // Déjà actif : modulation de fréquence douce sans clic
      const now = ctx.currentTime;
      this.oscLeft.frequency.setTargetAtTime(fLeft, now, 0.1);
      this.oscRight.frequency.setTargetAtTime(fRight, now, 0.1);
      this.gainNode.gain.setTargetAtTime(this.currentVolume, now, 0.08);
      return true;
    }

    try {
      this.stop(false);

      // Création des oscillateurs sinusoïdaux purs
      this.oscLeft = ctx.createOscillator();
      this.oscRight = ctx.createOscillator();
      this.oscLeft.type = "sine";
      this.oscRight.type = "sine";
      this.oscLeft.frequency.setValueAtTime(fLeft, ctx.currentTime);
      this.oscRight.frequency.setValueAtTime(fRight, ctx.currentTime);

      // Séparation stéréo stricte via ChannelMerger
      this.merger = ctx.createChannelMerger(2);
      this.oscLeft.connect(this.merger, 0, 0); // Canal gauche (0)
      this.oscRight.connect(this.merger, 0, 1); // Canal droit (1)

      // Gain master pour l'onde binaurale avec rampe d'attaque
      this.gainNode = ctx.createGain();
      this.gainNode.gain.setValueAtTime(0, ctx.currentTime);
      this.gainNode.gain.linearRampToValueAtTime(this.currentVolume, ctx.currentTime + 0.35);

      this.merger.connect(this.gainNode);
      this.gainNode.connect(ctx.destination);

      this.oscLeft.start();
      this.oscRight.start();
      this.isPlaying = true;
      return true;
    } catch {
      return false;
    }
  }

  /** Modifie la fréquence porteuse (ex. 432 Hz ou 528 Hz). */
  public setCarrier(carrier: number): void {
    this.currentCarrier = carrier;
    if (this.isPlaying && this.ctx && this.oscLeft && this.oscRight) {
      const fLeft = Math.max(20, this.currentCarrier - this.currentBeat / 2);
      const fRight = Math.max(20, this.currentCarrier + this.currentBeat / 2);
      this.oscLeft.frequency.setTargetAtTime(fLeft, this.ctx.currentTime, 0.1);
      this.oscRight.frequency.setTargetAtTime(fRight, this.ctx.currentTime, 0.1);
    }
  }

  /** Modifie la fréquence du battement binaural (ex. 10 Hz pour Alpha). */
  public setBeat(beat: number): void {
    this.currentBeat = Math.max(0.2, Math.min(60, beat));
    if (this.isPlaying && this.ctx && this.oscLeft && this.oscRight) {
      const fLeft = Math.max(20, this.currentCarrier - this.currentBeat / 2);
      const fRight = Math.max(20, this.currentCarrier + this.currentBeat / 2);
      this.oscLeft.frequency.setTargetAtTime(fLeft, this.ctx.currentTime, 0.1);
      this.oscRight.frequency.setTargetAtTime(fRight, this.ctx.currentTime, 0.1);
    }
  }

  /** Règle le volume de l'onde (0 à 1). */
  public setVolume(volume: number): void {
    this.currentVolume = Math.max(0, Math.min(1, volume));
    if (this.isPlaying && this.ctx && this.gainNode) {
      this.gainNode.gain.setTargetAtTime(this.currentVolume, this.ctx.currentTime, 0.05);
    }
  }

  /** Arrête la synthèse avec fondu de sortie naturel. */
  public stop(fade = true): void {
    if (!this.isPlaying) return;
    this.isPlaying = false;

    if (!fade || !this.ctx || !this.gainNode) {
      this.cleanup();
      return;
    }

    try {
      const now = this.ctx.currentTime;
      this.gainNode.gain.linearRampToValueAtTime(0.001, now + 0.2);
      setTimeout(() => {
        this.cleanup();
      }, 220);
    } catch {
      this.cleanup();
    }
  }

  private cleanup(): void {
    try {
      this.oscLeft?.stop();
      this.oscRight?.stop();
    } catch {
      // Ignorer si déjà arrêté
    }
    this.oscLeft?.disconnect();
    this.oscRight?.disconnect();
    this.merger?.disconnect();
    this.gainNode?.disconnect();

    this.oscLeft = null;
    this.oscRight = null;
    this.merger = null;
    this.gainNode = null;
  }

  public getStatus(): { isPlaying: boolean; carrier: number; beat: number; volume: number } {
    return {
      isPlaying: this.isPlaying,
      carrier: this.currentCarrier,
      beat: this.currentBeat,
      volume: this.currentVolume,
    };
  }
}
