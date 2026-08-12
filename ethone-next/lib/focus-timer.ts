const SESSION_KEY = "ethone-focus-session-v1";

export type FocusPhase = "idle" | "focus" | "shortBreak" | "longBreak";
export type FocusPreset = "pomodoro" | "deep-work" | "sprint" | "custom" | "quick";

export const FOCUS_PRESETS: FocusPreset[] = ["pomodoro", "deep-work", "sprint", "custom"];

type PresetConfig = {
  work: number;
  shortBreak: number;
  longBreak: number;
};

const PRESETS: Record<string, PresetConfig> = {
  pomodoro: { work: 25, shortBreak: 5, longBreak: 15 },
  "deep-work": { work: 50, shortBreak: 10, longBreak: 30 },
  deep: { work: 50, shortBreak: 10, longBreak: 30 },
  sprint: { work: 10, shortBreak: 2, longBreak: 5 },
  quick: { work: 15, shortBreak: 3, longBreak: 10 },
  custom: { work: 45, shortBreak: 5, longBreak: 15 },
};

type FocusSession = Omit<FocusTimerState, "format"> & {
  lastTick: number;
};

export type FocusTimerState = {
  phase: FocusPhase;
  remaining: number;
  total: number;
  paused: boolean;
  activePreset: string;
  cycle: number;
  completedPomodoros: number;
  completedBreaks: number;
  totalFocusSeconds: number;
  format: (seconds?: number) => string;
};

type FocusSubscriber = (state: FocusTimerState) => void;

export class FocusTimer {
  private state: FocusTimerState;
  private interval: number | null = null;
  private subscribers = new Set<FocusSubscriber>();
  private restored = false;
  private lastTick = 0;
  private activeConfig: PresetConfig = PRESETS.pomodoro;

  constructor() {
    this.state = this.makeState({
      phase: "idle",
      remaining: PRESETS.pomodoro.work * 60,
      total: PRESETS.pomodoro.work * 60,
      paused: false,
      activePreset: "",
      cycle: 1,
      completedPomodoros: 0,
      completedBreaks: 0,
      totalFocusSeconds: 0,
    });
    this.lastTick = Date.now();
  }

  private makeState(partial: Partial<FocusTimerState>): FocusTimerState {
    return {
      phase: partial.phase ?? this.state.phase,
      remaining: partial.remaining ?? this.state.remaining,
      total: partial.total ?? this.state.total,
      paused: partial.paused ?? this.state.paused,
      activePreset: partial.activePreset ?? this.state.activePreset,
      cycle: partial.cycle ?? this.state.cycle,
      completedPomodoros: partial.completedPomodoros ?? this.state.completedPomodoros,
      completedBreaks: partial.completedBreaks ?? this.state.completedBreaks,
      totalFocusSeconds: partial.totalFocusSeconds ?? this.state.totalFocusSeconds,
      format: this.formatRemaining.bind(this),
    };
  }

  getState(): FocusTimerState {
    return this.state;
  }

  subscribe(callback: FocusSubscriber): () => void {
    this.subscribers.add(callback);
    callback(this.state);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  restore(): void {
    if (this.restored) return;
    this.restored = true;
    if (typeof window === "undefined") return;

    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) {
        this.persist();
        return;
      }

      const parsed = JSON.parse(raw) as Partial<FocusSession>;
      if (!parsed || typeof parsed !== "object") {
        this.persist();
        return;
      }

      const session = parsed as FocusSession;
      const preset = session.activePreset || "pomodoro";
      this.activeConfig = this.configForPreset(preset);

      const now = Date.now();
      const savedLastTick = typeof session.lastTick === "number" && session.lastTick > 0 ? session.lastTick : now;
      this.lastTick = now;

      let elapsed = 0;
      if (!session.paused && session.phase && session.phase !== "idle") {
        elapsed = Math.floor((now - savedLastTick) / 1000);
      }

      const remaining = Math.max(0, (session.remaining || 0) - elapsed);

      if (session.phase && session.phase !== "idle" && remaining <= 0) {
        this.advanceFrom(session.phase, session);
        return;
      }

      this.state = this.makeState({
        phase: session.phase || "idle",
        remaining,
        total: session.total ?? this.activeConfig.work * 60,
        paused: session.paused ?? false,
        activePreset: session.activePreset ?? "",
        cycle: session.cycle ?? 1,
        completedPomodoros: session.completedPomodoros ?? 0,
        completedBreaks: session.completedBreaks ?? 0,
        totalFocusSeconds: session.totalFocusSeconds ?? 0,
      });

      if (!this.state.paused && this.state.phase !== "idle") {
        this.startInterval();
      }

      this.persist();
      this.notify();
    } catch {
      this.persist();
    }
  }

  start(presetOrPhase: string): void {
    if (presetOrPhase === "shortBreak" || presetOrPhase === "longBreak") {
      const config = this.activeConfig || PRESETS.pomodoro;
      const seconds =
        presetOrPhase === "shortBreak" ? config.shortBreak * 60 : config.longBreak * 60;
      this.state = this.makeState({
        ...this.state,
        phase: presetOrPhase,
        remaining: seconds,
        total: seconds,
        paused: false,
      });
      this.lastTick = Date.now();
      this.startInterval();
      this.persist();
      this.notify();
      return;
    }

    const preset = this.mapPreset(presetOrPhase);
    const config = this.configForPreset(preset);
    this.activeConfig = config;
    this.state = this.makeState({
      phase: "focus",
      remaining: config.work * 60,
      total: config.work * 60,
      paused: false,
      activePreset: preset,
      cycle: 1,
    });
    this.lastTick = Date.now();
    this.startInterval();
    this.persist();
    this.notify();
  }

  pause(): void {
    this.stopInterval();
    this.state = this.makeState({ ...this.state, paused: true });
    this.persist();
    this.notify();
  }

  resume(): void {
    if (this.state.phase === "idle" || this.state.remaining <= 0 || !this.state.paused) return;
    this.state = this.makeState({ ...this.state, paused: false });
    this.lastTick = Date.now();
    this.startInterval();
    this.persist();
    this.notify();
  }

  stop(): void {
    this.stopInterval();
    const config = this.activeConfig || PRESETS.pomodoro;
    this.state = this.makeState({
      phase: "idle",
      remaining: config.work * 60,
      total: config.work * 60,
      paused: false,
      activePreset: "",
      cycle: 1,
    });
    this.persist();
    this.notify();
  }

  skipBreak(): void {
    if (this.state.phase !== "shortBreak" && this.state.phase !== "longBreak") return;
    const config = this.activeConfig || PRESETS.pomodoro;
    const nextCycle = this.state.phase === "shortBreak" ? this.state.cycle + 1 : 1;
    this.state = this.makeState({
      ...this.state,
      phase: "focus",
      remaining: config.work * 60,
      total: config.work * 60,
      paused: false,
      cycle: nextCycle,
    });
    this.lastTick = Date.now();
    this.startInterval();
    this.persist();
    this.notify();
  }

  formatRemaining(seconds: number = this.state.remaining): string {
    const s = Math.max(0, Math.floor(seconds));
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  }

  private startInterval(): void {
    this.stopInterval();
    this.interval = window.setInterval(() => this.tick(), 1000);
  }

  private stopInterval(): void {
    if (this.interval !== null) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  private tick(): void {
    const remaining = this.state.remaining - 1;
    this.lastTick = Date.now();

    if (remaining <= 0) {
      this.state = this.makeState({ ...this.state, remaining: 0 });
      this.persist();
      this.notify();
      this.stopInterval();
      this.advance();
    } else {
      this.state = this.makeState({ ...this.state, remaining });
      this.persist();
      this.notify();
    }
  }

  private advance(): void {
    const { phase, cycle } = this.state;
    const config = this.activeConfig || PRESETS.pomodoro;

    if (phase === "focus") {
      const completedPomodoros = this.state.completedPomodoros + 1;
      const totalFocusSeconds = this.state.totalFocusSeconds + this.state.total;
      const isLongBreak = cycle % 4 === 0;

      this.state = this.makeState({
        ...this.state,
        phase: isLongBreak ? "longBreak" : "shortBreak",
        remaining: isLongBreak ? config.longBreak * 60 : config.shortBreak * 60,
        total: isLongBreak ? config.longBreak * 60 : config.shortBreak * 60,
        paused: false,
        completedPomodoros,
        totalFocusSeconds,
      });
      this.lastTick = Date.now();
      this.startInterval();
      this.persist();
      this.notify();
      return;
    }

    if (phase === "shortBreak") {
      this.state = this.makeState({
        ...this.state,
        phase: "focus",
        remaining: config.work * 60,
        total: config.work * 60,
        paused: false,
        cycle: cycle + 1,
        completedBreaks: this.state.completedBreaks + 1,
      });
      this.lastTick = Date.now();
      this.startInterval();
      this.persist();
      this.notify();
      return;
    }

    if (phase === "longBreak") {
      this.state = this.makeState({
        ...this.state,
        phase: "focus",
        remaining: config.work * 60,
        total: config.work * 60,
        paused: false,
        cycle: 1,
        completedBreaks: this.state.completedBreaks + 1,
      });
      this.lastTick = Date.now();
      this.startInterval();
      this.persist();
      this.notify();
      return;
    }
  }

  private advanceFrom(phase: FocusPhase, session: FocusSession): void {
    const { lastTick, ...rest } = session;
    void lastTick;

    const config = this.configForPreset(session.activePreset || "pomodoro");
    this.activeConfig = config;

    if (phase === "focus") {
      const isLongBreak = (session.cycle || 1) % 4 === 0;
      this.state = this.makeState({
        ...this.makeState({ ...rest, remaining: 0 }),
        phase: isLongBreak ? "longBreak" : "shortBreak",
        remaining: isLongBreak ? config.longBreak * 60 : config.shortBreak * 60,
        total: isLongBreak ? config.longBreak * 60 : config.shortBreak * 60,
        paused: false,
        completedPomodoros: (session.completedPomodoros || 0) + 1,
        totalFocusSeconds: (session.totalFocusSeconds || 0) + (session.total || 0),
      });
    } else {
      this.state = this.makeState({
        ...this.makeState({ ...rest, remaining: 0 }),
        phase: "focus",
        remaining: config.work * 60,
        total: config.work * 60,
        paused: false,
        cycle: phase === "longBreak" ? 1 : (session.cycle || 1) + 1,
        completedBreaks: (session.completedBreaks || 0) + 1,
      });
    }

    this.lastTick = Date.now();
    this.startInterval();
    this.persist();
    this.notify();
  }

  private persist(): void {
    if (typeof window === "undefined") return;
    try {
      const snapshot = { ...this.state, format: undefined };
      delete (snapshot as Record<string, unknown>).format;
      const session: FocusSession = { ...snapshot, lastTick: this.lastTick };
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch {
      // silent
    }
  }

  private notify(): void {
    this.subscribers.forEach((cb) => cb(this.state));
  }

  private mapPreset(id: string): string {
    if (id === "deep") return "deep-work";
    if (PRESETS[id]) return id;
    return "pomodoro";
  }

  private configForPreset(id: string): PresetConfig {
    return PRESETS[id] || PRESETS["deep-work"] || PRESETS.pomodoro;
  }
}
