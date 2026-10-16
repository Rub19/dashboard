"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import ChannelPicker from "../../ChannelPicker";
import { confirmDialog } from "@/lib/confirmDialog";
import { sinceLabel } from "@/lib/discord/security-scan";
import { SPRING_LAYOUT } from "@/lib/ease";
import { pageStagger } from "@/lib/motion-variants";
import { ConsolePage, EmptyLine, GhostButton, Panel, RoleChips, Row, Segmented, Select, StatTile, Stepper, Switch, TextField, useGuildApi } from "../kit";
import { tx } from "@/lib/tx";

type Platform = "twitch" | "youtube" | "kick";
type PingMode = "default" | "none" | "here" | "everyone" | "role";
type Streamer = {
  id: string;
  platform: Platform;
  username: string;
  displayName?: string;
  channelId: string | null;
  pingMode: PingMode;
  pingRoleId: string | null;
  gameFilter: string | null;
  minViewers: number;
  paused: boolean;
  customMessage: string | null;
  isLive: boolean;
  lastLiveAt: string | null;
  title: string | null;
  game: string | null;
  viewers: number | null;
  avatarUrl: string | null;
};
type Config = {
  enabled: boolean;
  defaultChannelId: string | null;
  twitchChannelId: string | null;
  youtubeChannelId: string | null;
  kickChannelId: string | null;
  defaultPing: "none" | "here" | "everyone" | "role";
  defaultRoleId: string | null;
  liveRoleId: string | null;
  autoLiveRoleEnabled: boolean;
  showViewers: boolean;
  showGame: boolean;
  showThumbnail: boolean;
  offlineAction: "keep" | "delete" | "update_offline";
  cooldownMinutes: number;
  defaultMessage: string;
  checkIntervalMinutes: number;
};

const PLATFORM: Record<Platform, string> = { twitch: "Twitch", youtube: "YouTube", kick: "Kick" };
const PING: [Config["defaultPing"], string][] = [
  ["none", "Personne"],
  ["here", "@here"],
  ["everyone", "@everyone"],
  ["role", "Un rôle"],
];
const OFFLINE: [Config["offlineAction"], string][] = [
  ["update_offline", "Indiquer « terminé » sur l'alerte"],
  ["keep", "Laisser l'alerte telle quelle"],
  ["delete", "Supprimer l'alerte"],
];
const field =
  "w-full rounded-lg border border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]/70";

/** Alertes streamers (format Keeper) : où et comment annoncer les lives Twitch, YouTube et Kick. */
export default function ConsoleStreamers({ guildId }: { guildId: string }) {
  const api = useGuildApi(guildId);
  const [cfg, setCfg] = useState<Config | null>(null);
  const [list, setList] = useState<Streamer[] | null>(null);
  const [message, setMessage] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [platform, setPlatform] = useState<Platform>("twitch");
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [simData, setSimData] = useState({
    platform: "twitch" as Platform,
    username: "Gotaga",
    title: tx("[TEST] Live test alerte ETHONE"),
    game: "Just Chatting",
    viewers: 4500,
    assignLiveRole: false,
  });

  const runSimulation = async () => {
    setBusy("simulate");
    const r = await api<{ success: boolean; channelId?: string; messageId?: string; roleAssigned?: boolean }>("/streamers/simulate", {
      method: "POST",
      json: simData,
    });
    setBusy(null);
    setSimulating(false);
    if (r?.success) {
      setNote(`Alerte simulée envoyée avec succès sur Discord${r.roleAssigned ? " (rôle @En Live attribué)" : ""}.`);
    } else {
      setNote("Échec de la simulation : vérifie que le salon par défaut est configuré et qu'Etho a les permissions d'écrire.");
    }
  };

  const load = useCallback(async () => {
    const [c, l] = await Promise.all([api<Config>("/streamers/config"), api<{ streamers: Streamer[] }>("/streamers/list", { silent: true })]);
    if (c) {
      setCfg(c);
      setMessage(c.defaultMessage);
    }
    setList(l?.streamers ?? []);
  }, [api]);
  useEffect(() => {
    void load();
  }, [load]);

  const save = async (patch: Partial<Config>) => {
    setCfg((c) => (c ? { ...c, ...patch } : c));
    const r = await api<{ config: Config }>("/streamers/config", { method: "PUT", json: patch });
    if (r) setCfg(r.config);
    else void load();
  };
  const patchStreamer = async (s: Streamer, patch: Partial<Streamer>) => {
    setList((l) => l?.map((x) => (x.id === s.id ? { ...x, ...patch } : x)) ?? null);
    const r = await api<{ streamer: Streamer }>(`/streamers/${s.id}`, { method: "PATCH", json: patch });
    if (r) setList((l) => l?.map((x) => (x.id === s.id ? r.streamer : x)) ?? null);
    else void load();
  };
  const add = async () => {
    setBusy("add");
    const r = await api<{ streamer: Streamer }>("/streamers", { method: "POST", json: { platform, username: username.trim() } });
    setBusy(null);
    if (r?.streamer) {
      setList((l) => [...(l ?? []), r.streamer]);
      setUsername("");
    }
  };
  const remove = async (s: Streamer) => {
    if (!(await confirmDialog(tx("Ne plus suivre {v0} ({v1}) ?", { v0: s.displayName || s.username, v1: PLATFORM[s.platform] }), { title: tx("Retirer"), confirmLabel: tx("Retirer") }))) return;
    if (await api(`/streamers/${s.id}`, { method: "DELETE" })) setList((l) => l?.filter((x) => x.id !== s.id) ?? null);
  };
  const test = async (s: Streamer) => {
    setBusy(`test:${s.id}`);
    const r = await api<{ alertDispatched: boolean; liveStatus?: { isLive?: boolean } }>(`/streamers/${s.id}/test`, { method: "POST" });
    setBusy(null);
    if (r) setNote(r.alertDispatched ? `Alerte de test envoyée pour ${s.displayName || s.username}${r.liveStatus?.isLive ? " (en direct en ce moment)" : ""}.` : "L'alerte n'a pas pu être envoyée : vérifie le salon et les permissions d'Etho.");
  };

  if (!cfg) {
    return (
      <ConsolePage title={tx("Alertes streamers")}>
        <Panel>
          <EmptyLine>{tx("Chargement…")}</EmptyLine>
        </Panel>
      </ConsolePage>
    );
  }
  const streamers = list ?? [];
  const noChannel = !cfg.defaultChannelId && !cfg.twitchChannelId && !cfg.youtubeChannelId && !cfg.kickChannelId;

  return (
    <ConsolePage title={tx("Alertes streamers")}>
      {!cfg.enabled ? (
        <Panel>
          <p className="px-5 py-3 text-xs text-[var(--warning)]">{tx("Module désactivé : aucun live n'est annoncé. Active-le avec l'interrupteur en haut de la page.")}</p>
        </Panel>
      ) : (
        noChannel && (
          <Panel>
            <p className="px-5 py-3 text-xs text-[var(--warning)]">{tx("Choisis un salon d'alerte : sans salon, les lives ne sont pas annoncés.")}</p>
          </Panel>
        )
      )}

      <motion.div variants={pageStagger} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label={tx("Streamers suivis")} value={list ? streamers.length : "—"} />
        <StatTile label={tx("En direct")} value={list ? streamers.filter((s) => s.isLive).length : "—"} accent={streamers.some((s) => s.isLive) ? "var(--danger)" : undefined} />
        <StatTile label={tx("En pause")} value={list ? streamers.filter((s) => s.paused).length : "—"} />
        <StatTile label={tx("Vérification")} value={`${cfg.checkIntervalMinutes} min`} />
      </motion.div>

      <Panel title={tx("Streamers")} actions={<GhostButton onClick={() => setSimulating(true)}>{tx("Simuler un live")}</GhostButton>}>
        <div className="flex flex-wrap items-center gap-2 px-5 py-3">
          <Segmented label={tx("Plateforme")} value={platform} options={Object.entries(PLATFORM) as [Platform, string][]} onChange={setPlatform} />
          <input
            value={username}
            maxLength={100}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && username.trim() && add()}
            placeholder={platform === "youtube" ? tx("@chaîne ou identifiant") : tx("Pseudo de la chaîne")}
            aria-label={tx("Pseudo de la chaîne")}
            className="h-8 w-52 rounded-lg border border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))] px-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]/70"
          />
          <GhostButton disabled={!username.trim() || busy === "add"} onClick={add}>
            {busy === "add" ? tx("Vérification…") : tx("Suivre")}
          </GhostButton>
        </div>
        {!list ? (
          <EmptyLine>{tx("Chargement…")}</EmptyLine>
        ) : streamers.length === 0 ? (
          <EmptyLine>{tx("Aucun streamer suivi.")}</EmptyLine>
        ) : (
          <ul>
            {streamers.map((s) => (
              <li key={s.id} className="border-t border-[var(--panel-border)]">
                <div className="flex items-center gap-3 px-5 py-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {s.avatarUrl ? <img src={s.avatarUrl} alt="" className="h-8 w-8 rounded-full" /> : <span className="h-8 w-8 rounded-full bg-[var(--panel-border)]" />}
                  <button type="button" onClick={() => setOpen(open === s.id ? null : s.id)} aria-expanded={open === s.id} className="min-w-0 flex-1 text-left">
                    <p className="truncate text-[13px] font-semibold text-[var(--text-primary)]">
                      {s.isLive && <span className="mr-1.5 rounded bg-[var(--danger)] px-1 py-px text-[10px] font-bold text-white">{tx("LIVE")}</span>}
                      {s.displayName || s.username} <span className="font-normal text-[var(--text-muted)]">· {PLATFORM[s.platform]}</span>
                    </p>
                    <p className="truncate text-[11px] text-[var(--text-muted)]">
                      {s.isLive ? `${s.title ?? ""}${s.game ? ` · ${s.game}` : ""}${s.viewers != null ? ` · ${s.viewers} spectateurs` : ""}` : s.lastLiveAt ? tx("Dernier live {v0}", { v0: sinceLabel(s.lastLiveAt) }) : tx("Pas encore vu en direct")}
                    </p>
                  </button>
                  <Switch checked={!s.paused} onChange={(v) => patchStreamer(s, { paused: !v })} label={tx("Alertes pour {username}", { username: s.username })} />
                </div>
                <AnimatePresence initial={false}>
                  {open === s.id && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={SPRING_LAYOUT} className="overflow-hidden">
                      <div className="border-t border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))]/40">
                        <Row label={tx("Salon")} hint={tx("Vide : salon de la plateforme ou salon par défaut.")}>
                          <ChannelPicker guildId={guildId} value={s.channelId ?? ""} filterTypes={[0, 5]} placeholder={tx("Salon par défaut")} onChange={(id) => patchStreamer(s, { channelId: id || null })} />
                        </Row>
                        <Row label={tx("Mention")}>
                          <Segmented label={tx("Mention")} value={s.pingMode} options={[["default", "Par défaut"], ...PING] as [PingMode, string][]} onChange={(v) => patchStreamer(s, { pingMode: v })} />
                        </Row>
                        {s.pingMode === "role" && (
                          <Row label={tx("Rôle mentionné")}>
                            <RoleChips guildId={guildId} ids={s.pingRoleId ? [s.pingRoleId] : []} max={1} onChange={(ids) => patchStreamer(s, { pingRoleId: ids[0] ?? null })} />
                          </Row>
                        )}
                        <Row label={tx("Spectateurs minimum")} hint={tx("0 = toujours annoncer.")}>
                          <Stepper value={s.minViewers} min={0} max={100000} step={5} unit="spectateurs" onCommit={(n) => patchStreamer(s, { minViewers: n })} />
                        </Row>
                        <Row label={tx("Jeu")} hint={tx("N'annoncer que ce jeu (vide : tous).")}>
                          <TextField value={s.gameFilter ?? ""} maxLength={80} placeholder={tx("Tous les jeux")} allowEmpty onCommit={(v) => patchStreamer(s, { gameFilter: v })} />
                        </Row>
                        <Row label={tx("Message personnalisé")} hint={tx("Vide : message par défaut.")}>
                          <TextField value={s.customMessage ?? ""} maxLength={1000} width="w-full" placeholder={tx("Message par défaut")} allowEmpty onCommit={(v) => patchStreamer(s, { customMessage: v })} />
                        </Row>
                        <div className="flex items-center gap-1.5 border-t border-[var(--panel-border)] px-5 py-3">
                          <GhostButton disabled={busy === `test:${s.id}`} onClick={() => test(s)}>
                            {busy === `test:${s.id}` ? tx("Envoi…") : tx("Envoyer une alerte de test")}
                          </GhostButton>
                          <span className="flex-1" />
                          <GhostButton onClick={() => remove(s)}>{tx("Retirer")}</GhostButton>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {note && (
        <Panel>
          <div className="flex items-center justify-between gap-3 px-5 py-3">
            <p className="text-xs text-[var(--text-primary)]">{note}</p>
            <GhostButton onClick={() => setNote(null)}>{tx("OK")}</GhostButton>
          </div>
        </Panel>
      )}

      <Panel title={tx("Où annoncer")}>
        <Row label={tx("Salon par défaut")}>
          <ChannelPicker guildId={guildId} value={cfg.defaultChannelId ?? ""} filterTypes={[0, 5]} placeholder={tx("Choisir un salon")} onChange={(id) => save({ defaultChannelId: id || null })} />
        </Row>
        {(["twitch", "youtube", "kick"] as const).map((p) => (
          <Row key={p} label={tx("Salon {v0}", { v0: PLATFORM[p] })} hint={tx("Vide : salon par défaut.")}>
            <ChannelPicker guildId={guildId} value={cfg[`${p}ChannelId`] ?? ""} filterTypes={[0, 5]} placeholder={tx("Salon par défaut")} onChange={(id) => save({ [`${p}ChannelId`]: id || null } as Partial<Config>)} />
          </Row>
        ))}
        <Row label={tx("Mention par défaut")}>
          <Segmented label={tx("Mention par défaut")} value={cfg.defaultPing} options={PING} onChange={(v) => save({ defaultPing: v })} />
        </Row>
        {cfg.defaultPing === "role" && (
          <Row label={tx("Rôle mentionné")}>
            <RoleChips guildId={guildId} ids={cfg.defaultRoleId ? [cfg.defaultRoleId] : []} max={1} onChange={(ids) => save({ defaultRoleId: ids[0] ?? null })} />
          </Row>
        )}
      </Panel>

      <Panel title={tx("Alerte")}>
        <Row label={tx("Message")} hint={tx("{streamer}, {platform}, {title}, {game}, {url}")}>
          <textarea value={message} maxLength={1000} rows={3} onChange={(e) => setMessage(e.target.value)} onBlur={() => message.trim() && message !== cfg.defaultMessage && save({ defaultMessage: message })} aria-label={tx("Message d'alerte")} className={field} />
        </Row>
        <Row label={tx("Afficher les spectateurs")}>
          <Switch checked={cfg.showViewers} onChange={(v) => save({ showViewers: v })} label={tx("Afficher les spectateurs")} />
        </Row>
        <Row label={tx("Afficher le jeu")}>
          <Switch checked={cfg.showGame} onChange={(v) => save({ showGame: v })} label={tx("Afficher le jeu")} />
        </Row>
        <Row label={tx("Miniature du live")}>
          <Switch checked={cfg.showThumbnail} onChange={(v) => save({ showThumbnail: v })} label={tx("Miniature du live")} />
        </Row>
        <Row label={tx("À la fin du live")}>
          <Select value={cfg.offlineAction} options={OFFLINE} onChange={(v) => save({ offlineAction: v })} aria-label={tx("À la fin du live")} />
        </Row>
        <Row label={tx("Délai entre deux alertes")} hint={tx("Pour un même streamer (coupure puis reprise du live).")}>
          <Stepper value={cfg.cooldownMinutes} min={0} max={180} step={5} unit="minutes" onCommit={(n) => save({ cooldownMinutes: n })} />
        </Row>
        <Row label={tx("Rôle « En live »")} hint={tx("Donné au membre Discord lié pendant son live.")}>
          <div className="flex flex-wrap items-center gap-3">
            <Switch checked={cfg.autoLiveRoleEnabled} onChange={(v) => save({ autoLiveRoleEnabled: v })} label={tx("Rôle En live")} />
            {cfg.autoLiveRoleEnabled && <RoleChips guildId={guildId} ids={cfg.liveRoleId ? [cfg.liveRoleId] : []} max={1} onChange={(ids) => save({ liveRoleId: ids[0] ?? null })} />}
          </div>
        </Row>
      </Panel>

      <AnimatePresence>
        {simulating && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={SPRING_LAYOUT}
              className="relative flex w-full max-w-lg flex-col rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))] p-5 shadow-2xl"
            >
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">{tx("Simulateur d'alerte en direct")}</h3>
                  <p className="text-xs text-[var(--text-muted)]">{tx("Envoie une alerte de test dans le salon configuré pour valider le rendu Discord.")}</p>
                </div>
                <GhostButton onClick={() => setSimulating(false)}>{tx("Fermer")}</GhostButton>
              </div>
              <div className="space-y-3">
                <Row label={tx("Plateforme")}>
                  <Segmented
                    label={tx("Plateforme")}
                    value={simData.platform}
                    options={Object.entries(PLATFORM) as [Platform, string][]}
                    onChange={(p) => setSimData((s) => ({ ...s, platform: p }))}
                  />
                </Row>
                <Row label={tx("Nom du streamer")}>
                  <input
                    value={simData.username}
                    onChange={(e) => setSimData((s) => ({ ...s, username: e.target.value }))}
                    className="h-9 w-full rounded-lg border border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))] px-3 text-sm text-[var(--text-primary)] outline-none"
                  />
                </Row>
                <Row label={tx("Titre du live")}>
                  <input
                    value={simData.title}
                    onChange={(e) => setSimData((s) => ({ ...s, title: e.target.value }))}
                    className="h-9 w-full rounded-lg border border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))] px-3 text-sm text-[var(--text-primary)] outline-none"
                  />
                </Row>
                <Row label={tx("Jeu / Catégorie")}>
                  <input
                    value={simData.game}
                    onChange={(e) => setSimData((s) => ({ ...s, game: e.target.value }))}
                    className="h-9 w-full rounded-lg border border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))] px-3 text-sm text-[var(--text-primary)] outline-none"
                  />
                </Row>
                <Row label={tx("Spectateurs")}>
                  <Stepper
                    value={simData.viewers}
                    min={1}
                    max={500000}
                    step={100}
                    unit="viewers"
                    onCommit={(n) => setSimData((s) => ({ ...s, viewers: n }))}
                  />
                </Row>
                <Row label={tx("Tester le rôle @En Live")} hint={tx("Vérifie si Etho peut attribuer le rôle configuré.")}>
                  <Switch
                    checked={simData.assignLiveRole}
                    onChange={(v) => setSimData((s) => ({ ...s, assignLiveRole: v }))}
                    label={tx("Attribuer le rôle")}
                  />
                </Row>
              </div>
              <div className="mt-5 flex justify-end gap-2 border-t border-[var(--panel-border)] pt-4">
                <GhostButton onClick={() => setSimulating(false)}>{tx("Annuler")}</GhostButton>
                <button
                  type="button"
                  disabled={busy === "simulate" || !simData.username.trim()}
                  onClick={runSimulation}
                  className="rounded-lg bg-[var(--accent-primary)] px-4 py-2 text-xs font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                >
                  {busy === "simulate" ? tx("Envoi…") : tx("Déclencher l'alerte")}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ConsolePage>
  );
}
