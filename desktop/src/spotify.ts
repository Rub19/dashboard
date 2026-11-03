export interface SpotifyTrack { id?: string; title: string; artist?: string; album?: string; artworkUrl?: string; covers?: string[]; durationMs?: number; progressMs?: number }
export interface SpotifyState { linked: boolean; playing: boolean; track: SpotifyTrack | null; at: number }

export const clock = (ms: number) => {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
};

export function liveProgress(state: Pick<SpotifyState, "playing" | "track" | "at">, now: number): number {
  const base = state.track?.progressMs ?? 0;
  const moved = state.playing ? base + Math.max(0, now - state.at) : base;
  return Math.min(moved, state.track?.durationMs ?? moved);
}

export const pollDelay = (state: Pick<SpotifyState, "linked" | "playing">) => (!state.linked ? 300000 : state.playing ? 8000 : 20000);
