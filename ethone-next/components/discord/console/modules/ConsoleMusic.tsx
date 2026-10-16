"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Music, Pause, Play, Search, SkipBack, SkipForward, Square, Trash2 } from "@/components/icons/ph";
import ChannelPicker from "../../ChannelPicker";
import { SPRING_LAYOUT } from "@/lib/ease";
import { pageStagger } from "@/lib/motion-variants";
import { ConsolePage, EmptyLine, GhostButton, Panel, RoleChips, Row, Segmented, StatTile, Stepper, Switch, useGuildApi } from "../kit";
import { cn } from "@/lib/utils";
import { tx } from "@/lib/tx";

type Track = { id: string; title: string; artist: string; duration: number; thumbnail: string; url: string; requestedBy?: { tag: string } };
type State = {
  voiceChannel: { id: string; name: string } | null;
  status: "PLAYING" | "PAUSED" | "IDLE" | "BUFFERING";
  currentTrack: Track | null;
  position: number;
  duration: number;
  volume: number;
  repeatMode: "OFF" | "SONG" | "QUEUE";
  shuffle: boolean;
  queue: Track[];
};
type Settings = {
  maxQueueSize: number;
  allowDuplicates: boolean;
  allowUserRemoveOwn: boolean;
  allowUserSkip: boolean;
  allowUserChangeVolume: boolean;
  djMode: boolean;
  djRoleId: string | null;
  autoDisconnectSeconds: number;
  stayChannelId: string | null;
  autoplay: boolean;
  defaultVolume: number;
};
type Stats = { totalTracksPlayed: number; totalListeningSeconds: number; topTracks: Array<{ title: string; artist: string; count: number }>; topRequesters: Array<{ userId: string; userTag: string; count: number }> };

const time = (s: number) => (s > 0 ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}` : "--:--");

/** Musique (format Keeper) : lecteur en direct, lancement d'un titre, file d'attente, réglages et statistiques. */
export default function ConsoleMusic({ guildId }: { guildId: string }) {
  const api = useGuildApi(guildId);
  const [state, setState] = useState<State | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [query, setQuery] = useState("");
  const [voiceId, setVoiceId] = useState<string | null>(null);
  const [results, setResults] = useState<Track[] | null>(null);
  const [searching, setSearching] = useState(false);

  const refresh = useCallback(async () => {
    const s = await api<{ state: State }>("/music/state", { silent: true });
    if (s) setState(s.state);
  }, [api]);
  useEffect(() => {
    void refresh();
    api<{ settings: Settings }>("/music/settings", { silent: true }).then((r) => r && setSettings(r.settings));
    api<{ stats: Stats }>("/music/stats", { silent: true }).then((r) => r && setStats(r.stats));
    // Lecteur en direct : rafraîchi toutes les 3 s, seulement quand la page est visible.
    const t = window.setInterval(() => document.visibilityState === "visible" && void refresh(), 3000);
    return () => window.clearInterval(t);
  }, [api, refresh]);

  const control = async (path: string, json: object = {}) => {
    await api(`/music/${path}`, { method: "POST", json });
    void refresh();
  };
  const saveSettings = async (patch: Partial<Settings>) => {
    setSettings((s) => (s ? { ...s, ...patch } : s));
    const r = await api<{ settings: Settings }>("/music/settings", { method: "PUT", json: patch });
    if (r) setSettings(r.settings);
  };
  const play = async (q: string, playNext = false) => {
    if (!q.trim()) return;
    const r = await api("/music/play", { method: "POST", json: { query: q.trim(), playNext, channelId: voiceId ?? state?.voiceChannel?.id ?? undefined } });
    if (r) {
      setQuery("");
      setResults(null);
      void refresh();
    }
  };
  const search = async () => {
    if (!query.trim() || /^https?:\/\//i.test(query.trim())) return play(query);
    setSearching(true);
    const r = await api<{ results: Track[] }>(`/music/search?q=${encodeURIComponent(query.trim())}&limit=6`);
    setSearching(false);
    setResults(r?.results ?? []);
  };

  const t = state?.currentTrack;
  const [thumbError, setThumbError] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setThumbError(false);
  }, [t?.id, t?.thumbnail]);

  const playing = state?.status === "PLAYING";
  const btn = "flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--panel-border)] text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-hover)] disabled:opacity-40";

  return (
    <ConsolePage title={tx("Musique")}>
      <Panel title={tx("Lecteur")} subtitle={state?.voiceChannel ? tx("Connecté à {name}", { name: state.voiceChannel.name }) : tx("Etho n'est dans aucun salon vocal.")}>
        <div className="flex flex-wrap items-center gap-4 px-5 py-4">
          {t?.thumbnail && !thumbError ? (
            <img
              src={t.thumbnail}
              alt={t.title || tx("Pochette")}
              width={64}
              height={64}
              onError={() => setThumbError(true)}
              className="h-16 w-16 shrink-0 rounded-xl object-cover border border-[var(--panel-border)] shadow-sm"
            />
          ) : (
            <div
              role={t ? undefined : "button"}
              tabIndex={t ? undefined : 0}
              onClick={t ? undefined : () => searchInputRef.current?.focus()}
              onKeyDown={t ? undefined : (e) => e.key === "Enter" && searchInputRef.current?.focus()}
              title={t ? undefined : tx("Cliquer pour chercher un titre")}
              className={cn(
                "relative flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)] shadow-inner overflow-hidden transition-all",
                !t && "cursor-pointer hover:border-[var(--accent-primary)]/40 hover:bg-[var(--surface-hover)] active:scale-95"
              )}
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--surface-hover)_0%,transparent_70%)] pointer-events-none" />
              <div
                className={cn(
                  "relative flex h-11 w-11 items-center justify-center rounded-full border border-[var(--panel-border)]/80 bg-[var(--bg-main)]/70 shadow-sm",
                  playing && "animate-[spin_6s_linear_infinite]"
                )}
              >
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--surface-hover)]/90 border border-[var(--panel-border)]/40">
                  <Music className={cn("h-2.5 w-2.5", playing ? "text-[var(--accent-primary)]" : "text-[var(--text-muted)]")} />
                </div>
              </div>
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{t ? t.title : tx("Rien en cours")}</p>
            <p className="truncate text-xs text-[var(--text-muted)]">{t ? `${t.artist}${t.requestedBy?.tag ? ` · demandé par ${t.requestedBy.tag}` : ""}` : tx("Lance un titre ci-dessous ou sur Discord.")}</p>
            {t && (
              <div className="mt-2 flex items-center gap-2 text-[11px] tabular-nums text-[var(--text-muted)]">
                <span>{time(state?.position ?? 0)}</span>
                <div
                  role="slider"
                  tabIndex={0}
                  aria-label={tx("Position de lecture")}
                  aria-valuemin={0}
                  aria-valuemax={state?.duration ?? 0}
                  aria-valuenow={state?.position ?? 0}
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                    if (state?.duration) {
                      void control("seek", { position: Math.round(ratio * state.duration) });
                    }
                  }}
                  onKeyDown={(e) => {
                    if (!state?.duration) return;
                    if (e.key === "ArrowLeft") {
                      void control("seek", { position: Math.max(0, (state.position ?? 0) - 5) });
                    } else if (e.key === "ArrowRight") {
                      void control("seek", { position: Math.min(state.duration, (state.position ?? 0) + 5) });
                    }
                  }}
                  className="group relative flex h-4 flex-1 cursor-pointer items-center"
                >
                  <span className="relative h-1.5 w-full overflow-hidden rounded-full bg-[var(--panel-border)] transition-all group-hover:h-2">
                    <motion.span
                      className="block h-full rounded-full bg-[var(--accent-primary)] group-hover:bg-[var(--accent-primary)]/90"
                      animate={{ width: state?.duration ? `${Math.min(100, ((state.position ?? 0) / state.duration) * 100)}%` : "0%" }}
                      transition={{ duration: 0.3 }}
                    />
                  </span>
                </div>
                <span>{time(state?.duration ?? 0)}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <button type="button" className={btn} onClick={() => control("previous")} disabled={!t} aria-label={tx("Titre précédent")}>
              <SkipBack className="h-4 w-4" />
            </button>
            <button type="button" className={btn} onClick={() => control(playing ? "pause" : "resume")} disabled={!t} aria-label={playing ? tx("Pause") : tx("Lecture")}>
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
            <button type="button" className={btn} onClick={() => control("skip")} disabled={!t} aria-label={tx("Titre suivant")}>
              <SkipForward className="h-4 w-4" />
            </button>
            <button type="button" className={btn} onClick={() => control("stop")} disabled={!t && !state?.voiceChannel} aria-label={tx("Arrêter et quitter le vocal")}>
              <Square className="h-4 w-4" />
            </button>
          </div>
        </div>
        {state && (
          <>
            <Row label={tx("Volume")}>
              <Stepper value={state.volume} min={0} max={100} step={5} unit="%" onCommit={(n) => control("volume", { volume: n })} />
            </Row>
            <Row label={tx("Répétition")}>
              <Segmented
                label={tx("Répétition")}
                value={state.repeatMode}
                options={[
                  ["OFF", "Aucune"],
                  ["SONG", "Le titre"],
                  ["QUEUE", "La file"],
                ]}
                onChange={(v) => control("repeat", { mode: v })}
              />
            </Row>
            <Row label={tx("Aléatoire")}>
              <Switch checked={state.shuffle} onChange={() => control("shuffle")} label={tx("Lecture aléatoire")} />
            </Row>
          </>
        )}
      </Panel>

      <Panel title={tx("Lancer un titre")} subtitle={tx("Recherche, ou lien YouTube, Spotify ou SoundCloud.")}>
        <div className="flex flex-wrap items-center gap-2 px-5 py-4">
          <label className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-lg border border-[var(--panel-border)] px-3 focus-within:border-[var(--accent-primary)]/70">
            <Search className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
            <input ref={searchInputRef} value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()} placeholder={tx("Titre, artiste ou lien")} aria-label={tx("Titre à lancer")} className="w-full bg-transparent text-sm text-[var(--text-primary)] outline-none" />
          </label>
          <GhostButton onClick={search} disabled={!query.trim() || searching}>
            {searching ? tx("Recherche…") : tx("Chercher")}
          </GhostButton>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-[var(--panel-border)] px-5 py-3">
          <span className="text-xs font-semibold text-[var(--text-muted)]">{tx("Flux d'ambiance :")}</span>
          <button
            type="button"
            onClick={() => play("Lofi Girl lofi hip hop radio")}
            className="rounded-lg border border-[var(--panel-border)] px-2.5 py-1 text-xs font-medium text-[var(--text-primary)] transition-colors hover:border-[var(--accent-primary)]/50 hover:bg-[var(--surface-hover)]"
          >
            {tx("☕ Lofi Girl")}
          </button>
          <button
            type="button"
            onClick={() => play("synthwave radio chill beats")}
            className="rounded-lg border border-[var(--panel-border)] px-2.5 py-1 text-xs font-medium text-[var(--text-primary)] transition-colors hover:border-[var(--accent-primary)]/50 hover:bg-[var(--surface-hover)]"
          >
            {tx("🌆 Synthwave")}
          </button>
          <button
            type="button"
            onClick={() => play("deep focus study music binaural")}
            className="rounded-lg border border-[var(--panel-border)] px-2.5 py-1 text-xs font-medium text-[var(--text-primary)] transition-colors hover:border-[var(--accent-primary)]/50 hover:bg-[var(--surface-hover)]"
          >
            {tx("🧠 Deep Focus")}
          </button>
        </div>
        {!state?.voiceChannel && (
          <Row label={tx("Salon vocal")} hint={tx("Où Etho doit se connecter.")}>
            <ChannelPicker guildId={guildId} value={voiceId} filterTypes={[2, 13]} placeholder={tx("Choisir un salon vocal")} onChange={(id) => setVoiceId(id || null)} />
          </Row>
        )}
        <AnimatePresence initial={false}>
          {results && (
            <motion.ul initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={SPRING_LAYOUT} className="overflow-hidden border-t border-[var(--panel-border)]">
              {results.length === 0 ? (
                <EmptyLine>{tx("Aucun résultat.")}</EmptyLine>
              ) : (
                results.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 border-t border-[var(--panel-border)] px-5 py-2 first:border-t-0">
                    {r.thumbnail ? (
                      <img src={r.thumbnail} alt="" width={36} height={36} className="h-9 w-9 shrink-0 rounded-lg object-cover border border-[var(--panel-border)]" />
                    ) : (
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--panel-border)] bg-[var(--surface-hover)] text-[var(--text-muted)]">
                        <Music className="h-4 w-4" />
                      </div>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] text-[var(--text-primary)]">{r.title}</span>
                      <span className="block truncate text-[11px] text-[var(--text-muted)]">
                        {r.artist} · {time(r.duration)}
                      </span>
                    </span>
                    <GhostButton onClick={() => play(r.url)}>{tx("Lire")}</GhostButton>
                    <GhostButton onClick={() => play(r.url, true)}>{tx("À la suite")}</GhostButton>
                  </li>
                ))
              )}
            </motion.ul>
          )}
        </AnimatePresence>
      </Panel>

      <Panel title={tx("File d'attente{v0}", { v0: state?.queue.length ? ` · ${state.queue.length}` : "" })} actions={state?.queue.length ? <GhostButton onClick={() => control("queue/clear")}>{tx("Vider")}</GhostButton> : undefined}>
        {!state ? (
          <EmptyLine>{tx("Chargement…")}</EmptyLine>
        ) : state.queue.length === 0 ? (
          <EmptyLine>{tx("La file est vide.")}</EmptyLine>
        ) : (
          <ol>
            <AnimatePresence initial={false}>
              {state.queue.slice(0, 50).map((q, i) => (
                <motion.li key={`${q.id}-${i}`} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, height: 0 }} transition={SPRING_LAYOUT} className="flex items-center gap-3 border-t border-[var(--panel-border)] px-5 py-2 text-[13px] first:border-t-0">
                  <span className="w-5 shrink-0 text-right font-mono text-xs text-[var(--text-muted)]">{i + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[var(--text-primary)]">{q.title}</span>
                    <span className="block truncate text-[11px] text-[var(--text-muted)]">
                      {q.artist} · {time(q.duration)}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={async () => {
                      await api(`/music/queue/${i}`, { method: "DELETE" });
                      void refresh();
                    }}
                    aria-label={tx("Retirer {title}", { title: q.title })}
                    className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--danger)]/10 hover:text-[var(--danger)]"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
          </ol>
        )}
      </Panel>

      {settings && (
        <Panel title={tx("Réglages")}>
          <Row label={tx("Volume par défaut")}>
            <Stepper value={settings.defaultVolume} min={0} max={100} step={5} unit="%" onCommit={(n) => saveSettings({ defaultVolume: n })} />
          </Row>
          <Row label={tx("Taille max de la file")}>
            <Stepper value={settings.maxQueueSize} min={5} max={1000} step={5} unit="titres" onCommit={(n) => saveSettings({ maxQueueSize: n })} />
          </Row>
          <Row label={tx("Doublons dans la file")}>
            <Switch checked={settings.allowDuplicates} onChange={(v) => saveSettings({ allowDuplicates: v })} label={tx("Autoriser les doublons")} />
          </Row>
          <Row label={tx("Lecture automatique")} hint={tx("Enchaîne des titres proches quand la file est vide.")}>
            <Switch checked={settings.autoplay} onChange={(v) => saveSettings({ autoplay: v })} label={tx("Lecture automatique")} />
          </Row>
          <Row label={tx("Quitter le vocal après")} hint={tx("Quand plus rien ne joue ; 0 = jamais.")}>
            <Stepper value={Math.round(settings.autoDisconnectSeconds / 60)} min={0} max={60} unit="min" onCommit={(n) => saveSettings({ autoDisconnectSeconds: n * 60 })} />
          </Row>
          <Row label={tx("Salon 24 h/24")} hint={tx("Etho y reste connecté en permanence.")}>
            <ChannelPicker guildId={guildId} value={settings.stayChannelId} filterTypes={[2, 13]} placeholder={tx("Aucun")} emptyLabel={tx("Aucun")} onChange={(id) => saveSettings({ stayChannelId: id || null })} />
          </Row>
          <Row label={tx("Mode DJ")} hint={tx("Seul le rôle DJ (et les admins) contrôle la musique.")}>
            <Switch checked={settings.djMode} onChange={(v) => saveSettings({ djMode: v })} label={tx("Mode DJ")} />
          </Row>
          {settings.djMode && (
            <Row label={tx("Rôle DJ")}>
              <RoleChips guildId={guildId} ids={settings.djRoleId ? [settings.djRoleId] : []} max={1} onChange={(ids) => saveSettings({ djRoleId: ids[0] ?? null })} />
            </Row>
          )}
          <Row label={tx("Les membres peuvent passer un titre")}>
            <Switch checked={settings.allowUserSkip} onChange={(v) => saveSettings({ allowUserSkip: v })} label={tx("Passer un titre")} />
          </Row>
          <Row label={tx("Les membres peuvent changer le volume")}>
            <Switch checked={settings.allowUserChangeVolume} onChange={(v) => saveSettings({ allowUserChangeVolume: v })} label={tx("Changer le volume")} />
          </Row>
          <Row label={tx("Les membres peuvent retirer leurs titres")}>
            <Switch checked={settings.allowUserRemoveOwn} onChange={(v) => saveSettings({ allowUserRemoveOwn: v })} label={tx("Retirer ses titres")} />
          </Row>
        </Panel>
      )}

      {stats && (
        <>
          <motion.div variants={pageStagger} className="grid grid-cols-2 gap-3">
            <StatTile label={tx("Titres joués")} value={stats.totalTracksPlayed.toLocaleString("fr-FR")} />
            <StatTile label={tx("Temps d'écoute")} value={`${Math.round(stats.totalListeningSeconds / 3600)} h`} />
          </motion.div>
          <div className="grid gap-5 lg:grid-cols-2">
            <Panel title={tx("Titres les plus joués")}>
              {stats.topTracks.length === 0 ? (
                <EmptyLine>{tx("Rien encore.")}</EmptyLine>
              ) : (
                <ol>
                  {stats.topTracks.slice(0, 5).map((x, i) => (
                    <li key={`${x.title}-${i}`} className="flex items-center gap-3 border-t border-[var(--panel-border)] px-5 py-2 text-[13px] first:border-t-0">
                      <span className="min-w-0 flex-1 truncate text-[var(--text-primary)]">
                        {x.title} <span className="text-[var(--text-muted)]">· {x.artist}</span>
                      </span>
                      <span className="shrink-0 font-mono text-xs text-[var(--text-muted)]">{x.count}×</span>
                    </li>
                  ))}
                </ol>
              )}
            </Panel>
            <Panel title={tx("Qui en lance le plus")}>
              {stats.topRequesters.length === 0 ? (
                <EmptyLine>{tx("Rien encore.")}</EmptyLine>
              ) : (
                <ol>
                  {stats.topRequesters.slice(0, 5).map((x) => (
                    <li key={x.userId} className="flex items-center gap-3 border-t border-[var(--panel-border)] px-5 py-2 text-[13px] first:border-t-0">
                      <span className="min-w-0 flex-1 truncate text-[var(--text-primary)]">{x.userTag}</span>
                      <span className="shrink-0 font-mono text-xs text-[var(--text-muted)]">{x.count} {" "}{tx("titres")}</span>
                    </li>
                  ))}
                </ol>
              )}
            </Panel>
          </div>
        </>
      )}
    </ConsolePage>
  );
}
