"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Pause, Play, Search, SkipBack, SkipForward, Square, Trash2 } from "@/components/icons/ph";
import ChannelPicker from "../../ChannelPicker";
import { SPRING_LAYOUT } from "@/lib/ease";
import { pageStagger } from "@/lib/motion-variants";
import { ConsolePage, EmptyLine, GhostButton, Panel, RoleChips, Row, Segmented, StatTile, Stepper, Switch, useGuildApi } from "../kit";

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
  const playing = state?.status === "PLAYING";
  const btn = "flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--panel-border)] text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-hover)] disabled:opacity-40";

  return (
    <ConsolePage title="Musique">
      <Panel title="Lecteur" subtitle={state?.voiceChannel ? `Connecté à ${state.voiceChannel.name}` : "Etho n'est dans aucun salon vocal."}>
        <div className="flex flex-wrap items-center gap-4 px-5 py-4">
          {t?.thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={t.thumbnail} alt="" width={64} height={64} className="h-16 w-16 shrink-0 rounded-lg object-cover" />
          ) : (
            <span className="h-16 w-16 shrink-0 rounded-lg bg-[var(--surface-hover)]" />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{t ? t.title : "Rien en cours"}</p>
            <p className="truncate text-xs text-[var(--text-muted)]">{t ? `${t.artist}${t.requestedBy?.tag ? ` · demandé par ${t.requestedBy.tag}` : ""}` : "Lance un titre ci-dessous ou sur Discord."}</p>
            {t && (
              <div className="mt-2 flex items-center gap-2 text-[11px] tabular-nums text-[var(--text-muted)]">
                {time(state?.position ?? 0)}
                <span className="h-1 flex-1 overflow-hidden rounded-full bg-[var(--panel-border)]">
                  <motion.span className="block h-full rounded-full bg-[var(--success)]" animate={{ width: state?.duration ? `${Math.min(100, ((state.position ?? 0) / state.duration) * 100)}%` : "0%" }} transition={{ duration: 0.4 }} />
                </span>
                {time(state?.duration ?? 0)}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <button type="button" className={btn} onClick={() => control("previous")} disabled={!t} aria-label="Titre précédent">
              <SkipBack className="h-4 w-4" />
            </button>
            <button type="button" className={btn} onClick={() => control(playing ? "pause" : "resume")} disabled={!t} aria-label={playing ? "Pause" : "Lecture"}>
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
            <button type="button" className={btn} onClick={() => control("skip")} disabled={!t} aria-label="Titre suivant">
              <SkipForward className="h-4 w-4" />
            </button>
            <button type="button" className={btn} onClick={() => control("stop")} disabled={!t && !state?.voiceChannel} aria-label="Arrêter et quitter le vocal">
              <Square className="h-4 w-4" />
            </button>
          </div>
        </div>
        {state && (
          <>
            <Row label="Volume">
              <Stepper value={state.volume} min={0} max={100} step={5} unit="%" onCommit={(n) => control("volume", { volume: n })} />
            </Row>
            <Row label="Répétition">
              <Segmented
                label="Répétition"
                value={state.repeatMode}
                options={[
                  ["OFF", "Aucune"],
                  ["SONG", "Le titre"],
                  ["QUEUE", "La file"],
                ]}
                onChange={(v) => control("repeat", { mode: v })}
              />
            </Row>
            <Row label="Aléatoire">
              <Switch checked={state.shuffle} onChange={() => control("shuffle")} label="Lecture aléatoire" />
            </Row>
          </>
        )}
      </Panel>

      <Panel title="Lancer un titre" subtitle="Recherche, ou lien YouTube, Spotify ou SoundCloud.">
        <div className="flex flex-wrap items-center gap-2 px-5 py-4">
          <label className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-lg border border-[var(--panel-border)] px-3 focus-within:border-[var(--accent-primary)]/70">
            <Search className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()} placeholder="Titre, artiste ou lien" aria-label="Titre à lancer" className="w-full bg-transparent text-sm text-[var(--text-primary)] outline-none" />
          </label>
          <GhostButton onClick={search} disabled={!query.trim() || searching}>
            {searching ? "Recherche…" : "Chercher"}
          </GhostButton>
        </div>
        {!state?.voiceChannel && (
          <Row label="Salon vocal" hint="Où Etho doit se connecter.">
            <ChannelPicker guildId={guildId} value={voiceId} filterTypes={[2, 13]} placeholder="Choisir un salon vocal" onChange={(id) => setVoiceId(id || null)} />
          </Row>
        )}
        <AnimatePresence initial={false}>
          {results && (
            <motion.ul initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={SPRING_LAYOUT} className="overflow-hidden border-t border-[var(--panel-border)]">
              {results.length === 0 ? (
                <EmptyLine>Aucun résultat.</EmptyLine>
              ) : (
                results.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 border-t border-[var(--panel-border)] px-5 py-2 first:border-t-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={r.thumbnail} alt="" width={36} height={36} className="h-9 w-9 shrink-0 rounded object-cover" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] text-[var(--text-primary)]">{r.title}</span>
                      <span className="block truncate text-[11px] text-[var(--text-muted)]">
                        {r.artist} · {time(r.duration)}
                      </span>
                    </span>
                    <GhostButton onClick={() => play(r.url)}>Lire</GhostButton>
                    <GhostButton onClick={() => play(r.url, true)}>À la suite</GhostButton>
                  </li>
                ))
              )}
            </motion.ul>
          )}
        </AnimatePresence>
      </Panel>

      <Panel title={`File d'attente${state?.queue.length ? ` · ${state.queue.length}` : ""}`} actions={state?.queue.length ? <GhostButton onClick={() => control("queue/clear")}>Vider</GhostButton> : undefined}>
        {!state ? (
          <EmptyLine>Chargement…</EmptyLine>
        ) : state.queue.length === 0 ? (
          <EmptyLine>La file est vide.</EmptyLine>
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
                    aria-label={`Retirer ${q.title}`}
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
        <Panel title="Réglages">
          <Row label="Volume par défaut">
            <Stepper value={settings.defaultVolume} min={0} max={100} step={5} unit="%" onCommit={(n) => saveSettings({ defaultVolume: n })} />
          </Row>
          <Row label="Taille max de la file">
            <Stepper value={settings.maxQueueSize} min={5} max={1000} step={5} unit="titres" onCommit={(n) => saveSettings({ maxQueueSize: n })} />
          </Row>
          <Row label="Doublons dans la file">
            <Switch checked={settings.allowDuplicates} onChange={(v) => saveSettings({ allowDuplicates: v })} label="Autoriser les doublons" />
          </Row>
          <Row label="Lecture automatique" hint="Enchaîne des titres proches quand la file est vide.">
            <Switch checked={settings.autoplay} onChange={(v) => saveSettings({ autoplay: v })} label="Lecture automatique" />
          </Row>
          <Row label="Quitter le vocal après" hint="Quand plus rien ne joue ; 0 = jamais.">
            <Stepper value={Math.round(settings.autoDisconnectSeconds / 60)} min={0} max={60} unit="min" onCommit={(n) => saveSettings({ autoDisconnectSeconds: n * 60 })} />
          </Row>
          <Row label="Salon 24 h/24" hint="Etho y reste connecté en permanence.">
            <ChannelPicker guildId={guildId} value={settings.stayChannelId} filterTypes={[2, 13]} placeholder="Aucun" emptyLabel="Aucun" onChange={(id) => saveSettings({ stayChannelId: id || null })} />
          </Row>
          <Row label="Mode DJ" hint="Seul le rôle DJ (et les admins) contrôle la musique.">
            <Switch checked={settings.djMode} onChange={(v) => saveSettings({ djMode: v })} label="Mode DJ" />
          </Row>
          {settings.djMode && (
            <Row label="Rôle DJ">
              <RoleChips guildId={guildId} ids={settings.djRoleId ? [settings.djRoleId] : []} max={1} onChange={(ids) => saveSettings({ djRoleId: ids[0] ?? null })} />
            </Row>
          )}
          <Row label="Les membres peuvent passer un titre">
            <Switch checked={settings.allowUserSkip} onChange={(v) => saveSettings({ allowUserSkip: v })} label="Passer un titre" />
          </Row>
          <Row label="Les membres peuvent changer le volume">
            <Switch checked={settings.allowUserChangeVolume} onChange={(v) => saveSettings({ allowUserChangeVolume: v })} label="Changer le volume" />
          </Row>
          <Row label="Les membres peuvent retirer leurs titres">
            <Switch checked={settings.allowUserRemoveOwn} onChange={(v) => saveSettings({ allowUserRemoveOwn: v })} label="Retirer ses titres" />
          </Row>
        </Panel>
      )}

      {stats && (
        <>
          <motion.div variants={pageStagger} className="grid grid-cols-2 gap-3">
            <StatTile label="Titres joués" value={stats.totalTracksPlayed.toLocaleString("fr-FR")} />
            <StatTile label="Temps d'écoute" value={`${Math.round(stats.totalListeningSeconds / 3600)} h`} />
          </motion.div>
          <div className="grid gap-5 lg:grid-cols-2">
            <Panel title="Titres les plus joués">
              {stats.topTracks.length === 0 ? (
                <EmptyLine>Rien encore.</EmptyLine>
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
            <Panel title="Qui en lance le plus">
              {stats.topRequesters.length === 0 ? (
                <EmptyLine>Rien encore.</EmptyLine>
              ) : (
                <ol>
                  {stats.topRequesters.slice(0, 5).map((x) => (
                    <li key={x.userId} className="flex items-center gap-3 border-t border-[var(--panel-border)] px-5 py-2 text-[13px] first:border-t-0">
                      <span className="min-w-0 flex-1 truncate text-[var(--text-primary)]">{x.userTag}</span>
                      <span className="shrink-0 font-mono text-xs text-[var(--text-muted)]">{x.count} titres</span>
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
