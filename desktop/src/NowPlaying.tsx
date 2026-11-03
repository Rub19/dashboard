import { useEffect, useState, useSyncExternalStore } from "react";
import { Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { apiData, openExternal } from "./api";
import { tr } from "./i18n";
import { toast } from "./qol";
import { clock, liveProgress, pollDelay, SpotifyState, SpotifyTrack } from "./spotify";

const CLIENT = "6619fbf6315e4e68948dc08532251912";

let snapshot: SpotifyState = { linked: true, playing: false, track: null, at: 0 };
let timer = 0;
const listeners = new Set<() => void>();
const publish = (next: SpotifyState) => {
  snapshot = next;
  listeners.forEach((listener) => listener());
};

async function refresh() {
  clearTimeout(timer);
  try {
    const data = await apiData<{ playing?: boolean; track?: SpotifyTrack | null }>(`api/spotify/now-playing?clientId=${CLIENT}`);
    publish({ linked: true, playing: Boolean(data.playing), track: data.track ?? null, at: Date.now() });
  } catch (reason) {
    publish(reason === "sessionExpired" ? { linked: false, playing: false, track: null, at: Date.now() } : snapshot);
  }
  if (listeners.size > 0) timer = window.setTimeout(() => void refresh(), pollDelay(snapshot));
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) void refresh();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) clearTimeout(timer);
  };
}

export const useSpotify = () => useSyncExternalStore(subscribe, () => snapshot);

async function control(action: string, extra: Record<string, unknown> = {}) {
  try {
    await apiData("api/spotify/control", "POST", { action, clientId: CLIENT, ...extra });
    if (action === "play" || action === "pause") publish({ ...snapshot, playing: action === "play", track: snapshot.track && { ...snapshot.track, progressMs: liveProgress(snapshot, Date.now()) }, at: Date.now() });
  } catch {
    toast(tr("Spotify refuse : il faut Premium et un appareil actif", "Spotify refused: Premium and an active device are required"), { tone: "bad" });
  }
  window.setTimeout(() => void refresh(), 500);
}

function useClock(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, [active]);
  return now;
}

const Bars = ({ on }: { on: boolean }) => <span className={on ? "music-bars on" : "music-bars"} aria-hidden="true"><i /><i /><i /></span>;

export function NowPlayingCard() {
  const state = useSpotify();
  const now = useClock(state.playing);
  const track = state.track;
  if (!track) return null;
  const position = liveProgress(state, now);
  const total = track.durationMs ?? 0;
  const cover = track.covers?.[0] ?? track.artworkUrl;
  return (
    <section className="music-card" aria-label={tr("En écoute sur Spotify", "Playing on Spotify")}>
      {cover && <img className="music-glow" src={cover} alt="" aria-hidden="true" />}
      {cover && <img className="music-cover" src={cover} alt="" />}
      <div className="music-body">
        <small><Bars on={state.playing} />{state.playing ? tr("En écoute sur Spotify", "Playing on Spotify") : tr("En pause sur Spotify", "Paused on Spotify")}</small>
        <button type="button" className="music-title" title={tr("Ouvrir dans Spotify", "Open in Spotify")} onClick={() => track.id && void openExternal(`https://open.spotify.com/track/${track.id}`)}>{track.title}</button>
        <span className="music-artist">{[track.artist, track.album].filter(Boolean).join(", ")}</span>
        <div className="music-time">
          <span>{clock(position)}</span>
          <input type="range" min={0} max={total || 1} value={position} aria-label={tr("Position dans le titre", "Track position")} style={{ "--fill": `${total ? (position / total) * 100 : 0}%` } as React.CSSProperties} onChange={(event) => void control("seek", { positionMs: Number(event.target.value) })} />
          <span>{clock(total)}</span>
        </div>
      </div>
      <div className="music-controls">
        <button type="button" aria-label={tr("Titre précédent", "Previous track")} onClick={() => void control("previous")}><SkipBack size={18} /></button>
        <button type="button" className="main" aria-label={state.playing ? tr("Pause", "Pause") : tr("Lecture", "Play")} onClick={() => void control(state.playing ? "pause" : "play")}>{state.playing ? <Pause size={20} /> : <Play size={20} />}</button>
        <button type="button" aria-label={tr("Titre suivant", "Next track")} onClick={() => void control("next")}><SkipForward size={18} /></button>
      </div>
    </section>
  );
}

export function MiniPlayer() {
  const state = useSpotify();
  const now = useClock(state.playing);
  const track = state.track;
  if (!track) return null;
  const cover = track.covers?.[2] ?? track.artworkUrl ?? track.covers?.[0];
  const total = track.durationMs ?? 0;
  const position = liveProgress(state, now);
  return (
    <div className="mini-player" title={`${track.title}, ${track.artist ?? ""}`}>
      {cover && <img src={cover} alt="" />}
      <span className="mini-text"><b>{track.title}</b><small>{track.artist}</small></span>
      <button type="button" aria-label={state.playing ? tr("Pause", "Pause") : tr("Lecture", "Play")} onClick={() => void control(state.playing ? "pause" : "play")}>{state.playing ? <Pause size={14} /> : <Play size={14} />}</button>
      <i className="mini-progress" style={{ transform: `scaleX(${total ? position / total : 0})` }} />
    </div>
  );
}
