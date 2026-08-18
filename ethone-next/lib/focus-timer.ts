import { supabase } from "./supabase";
import { useSyncStore } from "./stores/sync";

const SESSION_KEY = "ethone-focus-session-v1";
const CLOUD_SYNC_INTERVAL = 1000; // 1s debounce for continuous ticks

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
  private cloudPersistTimeout: number | null = null;
  private sessionForCloud: FocusSession | null = null;
  private isRestoring = false;

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

  static async loadFromCloud(): Promise<FocusSession | null> {
    useSyncStore.getState().setStatus("pomodoro", "syncing");
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (!userId) return null;

      const { data, error } = await supabase
        .from("pomodoro_sessions")
        .select("data")
        .eq("user_id", userId)
        .single();

      if (error || !data?.data) {
        useSyncStore.getState().setStatus("pomodoro", "idle");
        return null;
      }
      useSyncStore.getState().setStatus("pomodoro", "idle");
      return data.data as FocusSession;
    } catch (err) {
      console.error("Focus timer cloud load failed:", err);
      useSyncStore.getState().setStatus("pomodoro", "error");
      return null;
    }
  }

  restore(session?: FocusSession, fromCloud = false): void {
    if (this.restored && !session) return;
    this.restored = true;
    this.isRestoring = true;
    if (typeof window === "undefined") {
      this.isRestoring = false;
      return;
    }

    try {
      let loaded = session;
      if (!loaded) {
        const raw = localStorage.getItem(SESSION_KEY);
        if (!raw) {
          this.isRestoring = false;
          this.persist(fromCloud);
          return;
        }
        loaded = JSON.parse(raw) as FocusSession;
      }

      if (!loaded || typeof loaded !== "object") {
        this.isRestoring = false;
        this.persist(fromCloud);
        return;
      }

      const preset = loaded.activePreset || "pomodoro";
      this.activeConfig = this.configForPreset(preset);

      const now = Date.now();
      const savedLastTick = typeof loaded.lastTick === "number" && loaded.lastTick > 0 ? loaded.lastTick : now;
      this.lastTick = now;

      let elapsed = 0;
      if (!loaded.paused && loaded.phase && loaded.phase !== "idle") {
        elapsed = Math.floor((now - savedLastTick) / 1000);
      }

      const remaining = Math.max(0, (loaded.remaining || 0) - elapsed);

      if (loaded.phase && loaded.phase !== "idle" && remaining <= 0) {
        this.advanceFrom(loaded.phase, loaded);
        this.isRestoring = false;
        this.persist(fromCloud);
        this.notify();
        return;
      }

      this.state = this.makeState({
        phase: loaded.phase || "idle",
        remaining,
        total: loaded.total ?? this.activeConfig.work * 60,
        paused: loaded.paused ?? false,
        activePreset: loaded.activePreset ?? "",
        cycle: loaded.cycle ?? 1,
        completedPomodoros: loaded.completedPomodoros ?? 0,
        completedBreaks: loaded.completedBreaks ?? 0,
        totalFocusSeconds: loaded.totalFocusSeconds ?? 0,
      });

      if (!this.state.paused && this.state.phase !== "idle") {
        this.startInterval();
      }

      this.isRestoring = false;
      this.persist(fromCloud);
      this.notify();
    } catch {
      this.isRestoring = false;
      this.persist(fromCloud);
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
      this.flushCloudPersist();
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
    this.flushCloudPersist();
    this.notify();
  }

  pause(): void {
    this.stopInterval();
    this.state = this.makeState({ ...this.state, paused: true });
    this.persist();
    this.flushCloudPersist();
    this.notify();
  }

  resume(): void {
    if (this.state.phase === "idle" || this.state.remaining <= 0 || !this.state.paused) return;
    this.state = this.makeState({ ...this.state, paused: false });
    this.lastTick = Date.now();
    this.startInterval();
    this.persist();
    this.flushCloudPersist();
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
    this.flushCloudPersist();
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
    this.flushCloudPersist();
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
      this.flushCloudPersist();
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
      this.flushCloudPersist();
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
      this.flushCloudPersist();
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

  private persist(skipCloud = false): void {
    if (typeof window === "undefined") return;
    try {
      const snapshot = { ...this.state, format: undefined };
      delete (snapshot as Record<string, unknown>).format;
      const session: FocusSession = { ...snapshot, lastTick: this.lastTick };
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));

      if (!skipCloud && !this.isRestoring) {
        this.sessionForCloud = session;
        this.queueCloudPersist();
      }
    } catch {
      // silent
    }
  }

  private queueCloudPersist(immediate = false): void {
    if (this.cloudPersistTimeout !== null) {
      if (!immediate) return;
      window.clearTimeout(this.cloudPersistTimeout);
    }
    this.cloudPersistTimeout = window.setTimeout(
      () => this.flushCloudPersist(),
      immediate ? 0 : CLOUD_SYNC_INTERVAL
    );
  }

  private flushCloudPersist(): void {
    if (this.cloudPersistTimeout) {
      window.clearTimeout(this.cloudPersistTimeout);
      this.cloudPersistTimeout = null;
    }
    if (this.sessionForCloud) {
      void this.saveToCloud(this.sessionForCloud);
      this.sessionForCloud = null;
    }
  }

  private async saveToCloud(session: FocusSession): Promise<void> {
    useSyncStore.getState().setStatus("pomodoro", "syncing");
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (!userId) return;

      const mode: "work" | "short_break" | "long_break" =
        session.phase === "shortBreak"
          ? "short_break"
          : session.phase === "longBreak"
          ? "long_break"
          : "work";

      const isRunning = !session.paused && session.phase !== "idle";
      const startedAt = isRunning ? new Date(session.lastTick).toISOString() : null;

      const { error } = await supabase.from("pomodoro_sessions").upsert(
        {
          user_id: userId,
          mode,
          time_remaining_seconds: session.remaining,
          is_running: isRunning,
          started_at: startedAt,
          updated_at: new Date().toISOString(),
          data: session,
        },
        { onConflict: "user_id" }
      );

      if (error) throw error;
      useSyncStore.getState().setStatus("pomodoro", "idle");
    } catch (err) {
      console.error("Focus timer cloud save failed:", err);
      useSyncStore.getState().setStatus("pomodoro", "error");
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
