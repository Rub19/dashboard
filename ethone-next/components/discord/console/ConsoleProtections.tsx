"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Minus, Plus, Search, Trash2 } from "@/components/icons/ph";
import { WandSparkles } from "lucide-react";
import ChannelPicker from "../ChannelPicker";
import { SPRING_LAYOUT, SPRING_PILL } from "@/lib/ease";
import { cn } from "@/lib/utils";
import { ConsolePage, EmptyLine, GhostButton, Panel, RoleChips, Row, Segmented, Switch, useGuildApi } from "./kit";
import type { ConsoleView } from "../HubSidebar";

type RaidAction = "WARN" | "DELETE" | "TIMEOUT" | "KICK" | "BAN" | "QUARANTINE" | "VERIFY" | "LOCKDOWN" | "ALERT_STAFF" | "ENABLE_RAID_MODE";
type Tier = { ageThresholdHours: number; actions: RaidAction[]; tagRole: string | null };
type RaidCfg = {
  enabled: boolean;
  joinRaid: { enabled: boolean; threshold: number; timeWindowSeconds: number; actions: RaidAction[] };
  messageRaid: { enabled: boolean; maxMessagesPerUser: number; timeWindowSeconds: number; duplicateMessageThreshold: number; actions: RaidAction[]; timeoutDurationSeconds: number };
  mentionRaid: { enabled: boolean; maxMentionsPerMessage: number; maxMentionsPerUserInWindow: number; timeWindowSeconds: number; blockEveryoneHere: boolean; actions: RaidAction[] };
  botRaid: { enabled: boolean; blockUnwhitelistedBots: boolean; allowedInviterRoleIds: string[] };
  serverNuke: { enabled: boolean; maxChannelDeletes: number; maxChannelCreates: number; maxRoleDeletes: number; maxRoleCreates: number; timeWindowSeconds: number };
  massMod: { enabled: boolean; maxBans: number; maxKicks: number; timeWindowSeconds: number };
  accountAge: { enabled: boolean; tiers: Tier[] };
  alerts: { channelId: string | null; mentionRoleId: string | null };
};
type NukeKey = "bans" | "channelDeletes" | "roleDeletes";
type NukeCfg = {
  enabled: boolean;
  maxBans: number;
  maxChannelDeletes: number;
  maxRoleDeletes: number;
  timeWindowSeconds: number;
  action: "alert" | "strip_roles" | "ban";
  protections?: Partial<Record<NukeKey, boolean>>;
};
type RaidSub = "joinRaid" | "messageRaid" | "mentionRaid" | "botRaid" | "serverNuke" | "massMod" | "accountAge";

type Def =
  | { id: string; group: string; label: string; desc: string; engine: "nuke"; key: NukeKey }
  | { id: string; group: string; label: string; desc: string; engine: "raid"; sub: RaidSub };

/** Uniquement des protections que le bot applique réellement (moteurs anti-nuke et anti-raid d'Etho). */
const DEFS: Def[] = [
  { id: "antiBan", group: "Sanctions en série", label: "Anti-ban", desc: "Détecte les bans en cascade par un même membre.", engine: "nuke", key: "bans" },
  { id: "massMod", group: "Sanctions en série", label: "Sanctions en masse", desc: "Repère une vague de bans ou d'expulsions, tous auteurs confondus.", engine: "raid", sub: "massMod" },
  { id: "antiChannelDelete", group: "Salons et rôles", label: "Anti-suppression de salon", desc: "Détecte un même membre qui supprime des salons à la chaîne.", engine: "nuke", key: "channelDeletes" },
  { id: "antiRoleDelete", group: "Salons et rôles", label: "Anti-suppression de rôle", desc: "Détecte un même membre qui supprime des rôles à la chaîne.", engine: "nuke", key: "roleDeletes" },
  { id: "serverNuke", group: "Salons et rôles", label: "Destruction en rafale", desc: "Salons ou rôles créés et supprimés en masse sur tout le serveur.", engine: "raid", sub: "serverNuke" },
  { id: "joinRaid", group: "Arrivées", label: "Arrivées en masse", desc: "Une vague d'arrivées en quelques secondes.", engine: "raid", sub: "joinRaid" },
  { id: "accountAge", group: "Arrivées", label: "Comptes récents", desc: "Comptes Discord créés il y a peu.", engine: "raid", sub: "accountAge" },
  { id: "botRaid", group: "Arrivées", label: "Anti-bot", desc: "Bots ajoutés sans être dans la whitelist.", engine: "raid", sub: "botRaid" },
  { id: "messageRaid", group: "Messages", label: "Anti-spam", desc: "Messages envoyés trop vite ou répétés.", engine: "raid", sub: "messageRaid" },
  { id: "mentionRaid", group: "Messages", label: "Anti-mention", desc: "Mentions en masse et @everyone.", engine: "raid", sub: "mentionRaid" },
];

const NUKE_THRESHOLD = { bans: ["maxBans", 2, 20, "membres bannis"], channelDeletes: ["maxChannelDeletes", 2, 10, "salons supprimés"], roleDeletes: ["maxRoleDeletes", 2, 10, "rôles supprimés"] } as const;
const NUKE_ACTIONS = [
  { id: "alert", label: "Aucune", hint: "Alerte seulement" },
  { id: "strip_roles", label: "Retirer les rôles", hint: "Perd tout pouvoir" },
  { id: "ban", label: "Bannir", hint: "Définitif" },
] as const;
const MEMBER_PUNISH = [
  { id: "none", label: "Aucune", hint: "Alerte seulement" },
  { id: "TIMEOUT", label: "Timeout", hint: "Réduit au silence" },
  { id: "KICK", label: "Expulser", hint: "Peut revenir" },
  { id: "BAN", label: "Bannir", hint: "Définitif" },
] as const;
const AGE_ACTIONS: Array<[RaidAction, string]> = [
  ["ALERT_STAFF", "Alerte seulement"],
  ["VERIFY", "Vérification"],
  ["QUARANTINE", "Quarantaine"],
  ["TIMEOUT", "Timeout"],
  ["KICK", "Expulser"],
  ["BAN", "Bannir"],
];
const PUNISHERS: RaidAction[] = ["TIMEOUT", "KICK", "BAN", "QUARANTINE"];
const strongest = (actions: RaidAction[]) => (["BAN", "KICK", "QUARANTINE", "TIMEOUT"] as RaidAction[]).find((a) => actions.includes(a)) ?? "none";
const withPunish = (actions: RaidAction[], p: string) => [...actions.filter((a) => !PUNISHERS.includes(a)), ...(p === "none" ? [] : [p as RaidAction])];
const fmtDuration = (s: number) => (s >= 3600 ? `${Math.round(s / 3600)} h` : s >= 60 ? `${Math.round(s / 60)} min` : `${s} s`);

/** Protection réellement en marche : module allumé, moteur allumé, protection allumée. */
function defIsOn(d: Def, raid: RaidCfg | null, nuke: NukeCfg | null, modules: Record<string, boolean>): boolean {
  if (modules[d.engine === "nuke" ? "anti-nuke" : "security"] === false) return false;
  if (d.engine === "nuke") return Boolean(nuke?.enabled && nuke.protections?.[d.key] !== false);
  return Boolean(raid?.enabled && raid[d.sub].enabled);
}

/** Compteur « Protections actives » de la vue d'ensemble, calculé exactement comme cette page. */
export function protectionCount(raid: unknown, nuke: unknown, modules: Record<string, boolean>): { active: number; total: number } {
  return { active: DEFS.filter((d) => defIsOn(d, raid as RaidCfg | null, nuke as NukeCfg | null, modules)).length, total: DEFS.length };
}

export default function ConsoleProtections({ guildId, onOpenView, onOpenSetup }: { guildId: string; onOpenView?: (v: ConsoleView) => void; onOpenSetup?: () => void }) {
  const api = useGuildApi(guildId);
  const [raid, setRaid] = useState<RaidCfg | null>(null);
  const [nuke, setNuke] = useState<NukeCfg | null>(null);
  const [modules, setModules] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState(DEFS[0].id);
  const [filter, setFilter] = useState<"all" | "on" | "off">("all");
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    const [r, n, m] = await Promise.all([
      api<{ config: RaidCfg }>("/anti-raid/config"),
      api<{ config: NukeCfg }>("/anti-nuke/config"),
      api<{ modules: Array<{ id: string; enabled: boolean }> }>("/modules", { silent: true }),
    ]);
    if (r) setRaid(r.config);
    if (n) setNuke(n.config);
    if (m) setModules(Object.fromEntries(m.modules.map((x) => [x.id, x.enabled])));
  }, [api]);
  useEffect(() => {
    void load();
  }, [load]);

  const putRaid = async (patch: Partial<RaidCfg>) => {
    setRaid((c) => (c ? { ...c, ...patch } : c));
    const r = await api<{ config: RaidCfg }>("/anti-raid/config", { method: "PUT", json: patch });
    if (r) setRaid(r.config);
    else void load();
  };
  const putNuke = async (patch: Partial<NukeCfg>) => {
    setNuke((c) => (c ? { ...c, ...patch } : c));
    const r = await api<{ config: NukeCfg }>("/anti-nuke/config", { method: "PUT", json: patch });
    if (r) setNuke(r.config);
    else void load();
  };
  const setSub = <K extends RaidSub>(sub: K, patch: Partial<RaidCfg[K]>) => raid && putRaid({ [sub]: { ...raid[sub], ...patch } } as Partial<RaidCfg>);
  const enableModule = async (id: string) => {
    if (await api(`/modules/${id}`, { method: "PATCH", json: { enabled: true } })) setModules((m) => ({ ...m, [id]: true }));
  };

  const moduleOf = (d: Def) => (d.engine === "nuke" ? "anti-nuke" : "security");
  const isOn = useCallback((d: Def) => defIsOn(d, raid, nuke, modules), [modules, nuke, raid]);
  const toggle = async (d: Def, v: boolean) => {
    if (v && modules[moduleOf(d)] === false) await enableModule(moduleOf(d));
    if (d.engine === "nuke" && nuke) await putNuke({ protections: { ...nuke.protections, [d.key]: v }, ...(v ? { enabled: true } : {}) });
    if (d.engine === "raid" && raid) await putRaid({ [d.sub]: { ...raid[d.sub], enabled: v }, ...(v ? { enabled: true } : {}) } as Partial<RaidCfg>);
  };

  const ready = raid && nuke;
  const counts = { all: DEFS.length, on: ready ? DEFS.filter(isOn).length : 0, off: ready ? DEFS.length - DEFS.filter(isOn).length : 0 };
  const groups = useMemo(() => {
    const query = q.trim().toLowerCase();
    const map = new Map<string, Def[]>();
    for (const d of DEFS) {
      if (filter === "on" && !isOn(d)) continue;
      if (filter === "off" && isOn(d)) continue;
      if (query && !`${d.label} ${d.desc}`.toLowerCase().includes(query)) continue;
      map.set(d.group, [...(map.get(d.group) ?? []), d]);
    }
    return [...map.entries()];
  }, [filter, isOn, q]);
  const def = DEFS.find((d) => d.id === selected)!;

  return (
    <ConsolePage
      title="Protections"
      actions={
        onOpenSetup && (
          <GhostButton onClick={onOpenSetup}>
            <WandSparkles className="h-3.5 w-3.5" strokeWidth={2} />
            Configuration assistée
          </GhostButton>
        )
      }
    >
      {!ready ? (
        <Panel>
          <EmptyLine>Chargement…</EmptyLine>
        </Panel>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Segmented
              label="Filtrer"
              value={filter}
              options={[
                ["all", <>Toutes <span className="ml-1 font-mono text-[10px] text-[var(--text-muted)]">{counts.all}</span></>],
                ["on", <>Actives <span className="ml-1 font-mono text-[10px] text-[var(--text-muted)]">{counts.on}</span></>],
                ["off", <>Inactives <span className="ml-1 font-mono text-[10px] text-[var(--text-muted)]">{counts.off}</span></>],
              ]}
              onChange={setFilter}
            />
            <label className="flex h-9 items-center gap-2 rounded-lg border border-[var(--panel-border)] px-3">
              <Search className="h-3.5 w-3.5 text-[var(--text-muted)]" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filtrer par nom" aria-label="Filtrer par nom" className="w-40 bg-transparent text-xs text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" />
            </label>
          </div>

          <div className="grid items-start gap-4 md:grid-cols-[16rem_1fr]">
            <nav aria-label="Protections" className="rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)] p-1.5 md:sticky md:top-4">
              {groups.length === 0 && <p className="px-2 py-4 text-center text-xs text-[var(--text-muted)]">Aucune protection.</p>}
              {groups.map(([group, list]) => (
                <div key={group} className="mb-1">
                  <p className="flex justify-between px-2 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    {group}
                    <span className="font-mono">
                      {DEFS.filter((d) => d.group === group && isOn(d)).length}/{DEFS.filter((d) => d.group === group).length}
                    </span>
                  </p>
                  {list.map((d) => (
                    <div key={d.id} className="relative flex items-center gap-2 rounded-lg pr-2">
                      {d.id === selected && <motion.span layoutId="prot-active" transition={SPRING_PILL} className="absolute inset-0 rounded-lg bg-[var(--surface-hover)]" />}
                      <button
                        type="button"
                        onClick={() => setSelected(d.id)}
                        aria-current={d.id === selected ? "true" : undefined}
                        className={cn(
                          "relative min-w-0 flex-1 truncate px-2.5 py-1.5 text-left text-[13px] transition-colors",
                          d.id === selected ? "font-semibold text-[var(--text-primary)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                        )}
                      >
                        {d.label}
                      </button>
                      <span className="relative">
                        <Switch checked={isOn(d)} onChange={(v) => toggle(d, v)} label={`${isOn(d) ? "Désactiver" : "Activer"} ${d.label}`} />
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </nav>

            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={def.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={SPRING_LAYOUT} className="min-w-0 space-y-4">
                <Panel>
                  <div className="flex items-start justify-between gap-4 px-5 py-4">
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">{def.group}</p>
                      <h2 className="mt-0.5 text-lg font-bold text-[var(--text-primary)]">{def.label}</h2>
                      <p className="mt-0.5 text-xs text-[var(--text-muted)]">{def.desc}</p>
                    </div>
                    <label className="flex shrink-0 items-center gap-2 text-xs font-semibold text-[var(--text-muted)]">
                      {isOn(def) ? "Activée" : "Désactivée"}
                      <Switch checked={isOn(def)} onChange={(v) => toggle(def, v)} label={`${isOn(def) ? "Désactiver" : "Activer"} ${def.label}`} />
                    </label>
                  </div>
                  {modules[moduleOf(def)] === false && (
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--panel-border)] px-5 py-3 text-xs text-[var(--warning)]">
                      Le module {def.engine === "nuke" ? "Anti-nuke" : "Sécurité (anti-raid)"} est coupé : cette protection ne tourne pas.
                      <GhostButton onClick={() => enableModule(moduleOf(def))}>Activer le module</GhostButton>
                    </div>
                  )}
                  <div className="mx-5 mb-4 rounded-lg border border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))] px-4 py-3">
                    <p className="text-[11px] font-semibold text-[var(--text-muted)]">Ce que fait Etho</p>
                    <p className="mt-1 text-[13px] text-[var(--text-primary)]">{summary(def, raid, nuke)}</p>
                  </div>
                </Panel>

                <Detail def={def} raid={raid} nuke={nuke} guildId={guildId} putNuke={putNuke} putRaid={putRaid} setSub={setSub} />

                <Panel title={<Step n={def.id === "accountAge" || def.id === "botRaid" ? 3 : 4}>Whitelist</Step>}>
                  <Row label="Exemptés" hint={`Les membres, bots et rôles de la whitelist ${def.engine === "nuke" ? "anti-nuke" : "anti-raid"} (ou globale) ne déclenchent pas cette protection.`}>
                    <GhostButton onClick={() => onOpenView?.("whitelist")}>Gérer la whitelist</GhostButton>
                  </Row>
                  <p className="border-t border-[var(--panel-border)] px-5 py-3 text-[11px] text-[var(--text-muted)]">Le propriétaire du serveur et Etho ne sont jamais sanctionnés.</p>
                </Panel>
              </motion.div>
            </AnimatePresence>
          </div>
        </>
      )}
    </ConsolePage>
  );
}

function summary(d: Def, raid: RaidCfg, nuke: NukeCfg): ReactNode {
  if (d.engine === "nuke") {
    const [field, , , unit] = NUKE_THRESHOLD[d.key];
    const act = { alert: "alerte le staff", strip_roles: "retire tous les rôles de l'auteur", ban: "bannit l'auteur" }[nuke.action];
    return (
      <>
        Si un même membre fait <b>{nuke[field]} {unit}</b> en moins de <b>{nuke.timeWindowSeconds} s</b>, Etho <b>{act}</b>.
      </>
    );
  }
  const r = raid;
  switch (d.sub) {
    case "massMod":
      return <>Si le serveur compte <b>{r.massMod.maxBans} bans</b> ou <b>{r.massMod.maxKicks} expulsions</b> en <b>{r.massMod.timeWindowSeconds} s</b>, Etho <b>alerte le staff</b> et passe en vigilance.</>;
    case "serverNuke":
      return <>Si en <b>{r.serverNuke.timeWindowSeconds} s</b> le serveur dépasse ces seuils de salons ou de rôles créés ou supprimés, Etho <b>verrouille le serveur</b> et alerte le staff.</>;
    case "joinRaid": {
      const p = strongest(r.joinRaid.actions);
      return (
        <>
          Si <b>{r.joinRaid.threshold} membres</b> arrivent en <b>{r.joinRaid.timeWindowSeconds} s</b>, Etho alerte le staff
          {r.joinRaid.actions.includes("ENABLE_RAID_MODE") && <>, <b>active le mode raid</b></>}
          {r.joinRaid.actions.includes("LOCKDOWN") && <>, <b>verrouille le serveur</b></>}
          {p !== "none" && <> et sanctionne les arrivants (<b>{MEMBER_PUNISH.find((x) => x.id === p)?.label ?? "quarantaine"}</b>)</>}.
        </>
      );
    }
    case "accountAge":
      return r.accountAge.tiers.length ? <>Chaque arrivée est comparée aux paliers ci-dessous : la sanction du plus petit palier atteint s&apos;applique.</> : <>Aucun palier : rien n&apos;est fait.</>;
    case "botRaid":
      return r.botRaid.blockUnwhitelistedBots ? <>Un bot ajouté hors whitelist est <b>expulsé</b>, sauf s&apos;il a été invité par un rôle autorisé.</> : <>Les bots ajoutés sont seulement surveillés.</>;
    case "messageRaid": {
      const p = strongest(r.messageRaid.actions);
      return <>À partir de <b>{r.messageRaid.maxMessagesPerUser} messages</b> en <b>{r.messageRaid.timeWindowSeconds} s</b> ou <b>{r.messageRaid.duplicateMessageThreshold} répétitions</b>, Etho {r.messageRaid.actions.includes("DELETE") ? "supprime le message, " : ""}<b>{p === "none" ? "alerte le staff" : MEMBER_PUNISH.find((x) => x.id === p)?.label.toLowerCase()}</b>{p === "TIMEOUT" && <> ({fmtDuration(r.messageRaid.timeoutDurationSeconds)})</>}.</>;
    }
    case "mentionRaid": {
      const p = strongest(r.mentionRaid.actions);
      return <>À partir de <b>{r.mentionRaid.maxMentionsPerMessage} mentions</b> dans un message{r.mentionRaid.blockEveryoneHere && <> ou d&apos;un <b>@everyone</b></>}, Etho {r.mentionRaid.actions.includes("DELETE") ? "supprime le message, " : ""}<b>{p === "none" ? "alerte le staff" : MEMBER_PUNISH.find((x) => x.id === p)?.label.toLowerCase()}</b>{p === "TIMEOUT" && " (10 min)"}.</>;
    }
  }
}

function Step({ n, children }: { n: number; children: ReactNode }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="flex h-5 w-5 items-center justify-center rounded-full border border-[var(--panel-border)] font-mono text-[10px] text-[var(--text-muted)]">{n}</span>
      {children}
    </span>
  );
}

/** Compteur « − 5 + » (format Keeper) ; l'enregistrement part 500 ms après le dernier clic. */
function Stepper({ value, min, max, unit, onCommit }: { value: number; min: number; max: number; unit?: string; onCommit: (n: number) => void }) {
  const [v, setV] = useState(value);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => setV(value), [value]);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const set = (n: number) => {
    const c = Math.min(max, Math.max(min, Math.round(n) || min));
    setV(c);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => c !== value && onCommit(c), 500);
  };
  const btn = "flex h-8 w-8 items-center justify-center text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] disabled:opacity-40";
  return (
    <span className="inline-flex items-center gap-2 text-xs text-[var(--text-muted)]">
      <span className="inline-flex items-center rounded-lg border border-[var(--panel-border)]">
        <button type="button" className={btn} onClick={() => set(v - 1)} disabled={v <= min} aria-label="Moins">
          <Minus className="h-3.5 w-3.5" />
        </button>
        <input
          type="number"
          value={v}
          min={min}
          max={max}
          onChange={(e) => set(Number(e.target.value))}
          aria-label={unit ?? "Valeur"}
          className="h-8 w-12 border-x border-[var(--panel-border)] bg-transparent text-center font-mono text-sm text-[var(--text-primary)] outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
        />
        <button type="button" className={btn} onClick={() => set(v + 1)} disabled={v >= max} aria-label="Plus">
          <Plus className="h-3.5 w-3.5" />
        </button>
      </span>
      {unit}
    </span>
  );
}

function Cards<T extends string>({ value, options, onChange, label }: { value: T; options: ReadonlyArray<{ id: T; label: string; hint: string }>; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("grid gap-2", options.length > 3 ? "sm:grid-cols-4" : "sm:grid-cols-3")}>
      {options.map((a) => (
        <button
          key={a.id}
          type="button"
          role="radio"
          aria-checked={value === a.id}
          onClick={() => value !== a.id && onChange(a.id)}
          className={cn("rounded-lg border px-3 py-2 text-left transition-colors", value === a.id ? "border-[var(--success)]/60 bg-[var(--success)]/10" : "border-[var(--panel-border)] hover:bg-[var(--surface-hover)]")}
        >
          <span className={cn("block text-xs font-semibold", value === a.id ? "text-[var(--success)]" : "text-[var(--text-primary)]")}>{a.label}</span>
          <span className="block text-[11px] text-[var(--text-muted)]">{a.hint}</span>
        </button>
      ))}
    </div>
  );
}

function Detail({
  def,
  raid,
  nuke,
  guildId,
  putNuke,
  putRaid,
  setSub,
}: {
  def: Def;
  raid: RaidCfg;
  nuke: NukeCfg;
  guildId: string;
  putNuke: (p: Partial<NukeCfg>) => void;
  putRaid: (p: Partial<RaidCfg>) => void;
  setSub: <K extends RaidSub>(sub: K, patch: Partial<RaidCfg[K]>) => void;
}) {
  const raidAlert = (n = 3) => (
    <Panel title={<Step n={n}>Alerte</Step>} subtitle="Commun à toutes les protections anti-raid.">
      <Row label="Salon d'alerte">
        <ChannelPicker guildId={guildId} value={raid.alerts.channelId} filterTypes={[0, 5]} placeholder="Choisir un salon" emptyLabel="Pas de salon" onChange={(id) => putRaid({ alerts: { ...raid.alerts, channelId: id || null } })} />
      </Row>
      <Row label="Mentionner à chaque alerte">
        <RoleChips guildId={guildId} ids={raid.alerts.mentionRoleId ? [raid.alerts.mentionRoleId] : []} max={1} onChange={(ids) => putRaid({ alerts: { ...raid.alerts, mentionRoleId: ids[0] ?? null } })} />
      </Row>
    </Panel>
  );

  if (def.engine === "nuke") {
    const [field, min, max, unit] = NUKE_THRESHOLD[def.key];
    return (
      <>
        <Panel title={<Step n={1}>Détection</Step>}>
          <Row label="Seuil" hint="Par auteur, lu dans le journal d'audit.">
            <div className="flex flex-wrap items-center gap-3">
              <Stepper value={nuke[field]} min={min} max={max} unit={unit} onCommit={(n) => putNuke({ [field]: n })} />
              <span className="text-xs text-[var(--text-muted)]">en moins de</span>
              <Stepper value={nuke.timeWindowSeconds} min={5} max={60} unit="s" onCommit={(n) => putNuke({ timeWindowSeconds: n })} />
            </div>
          </Row>
          <p className="border-t border-[var(--panel-border)] px-5 py-2.5 text-[11px] text-[var(--text-muted)]">Délai et punition communs aux trois protections anti-nuke.</p>
        </Panel>
        <Panel title={<Step n={2}>Punition</Step>}>
          <div className="px-5 py-4">
            <Cards label="Punition" value={nuke.action} options={NUKE_ACTIONS} onChange={(v) => putNuke({ action: v })} />
          </div>
        </Panel>
        <Panel title={<Step n={3}>Alerte</Step>}>
          <Row label="Journal" hint="Chaque sanction anti-nuke est notée dans le journal Modération (Logs › Salons de log).">
            <span className="text-xs text-[var(--text-muted)]">Salon du journal Modération</span>
          </Row>
        </Panel>
      </>
    );
  }

  switch (def.sub) {
    case "massMod":
      return (
        <>
          <Panel title={<Step n={1}>Détection</Step>} subtitle="Tous auteurs confondus.">
            <Row label="Bans">
              <Stepper value={raid.massMod.maxBans} min={2} max={30} unit="bans" onCommit={(n) => setSub("massMod", { maxBans: n })} />
            </Row>
            <Row label="Expulsions">
              <Stepper value={raid.massMod.maxKicks} min={2} max={30} unit="expulsions" onCommit={(n) => setSub("massMod", { maxKicks: n })} />
            </Row>
            <Row label="En moins de">
              <Stepper value={raid.massMod.timeWindowSeconds} min={5} max={120} unit="s" onCommit={(n) => setSub("massMod", { timeWindowSeconds: n })} />
            </Row>
          </Panel>
          <Panel title={<Step n={2}>Punition</Step>}>
            <EmptyLine>Alerte seulement : pour sanctionner l&apos;auteur, active l&apos;Anti-ban.</EmptyLine>
          </Panel>
          {raidAlert()}
        </>
      );
    case "serverNuke":
      return (
        <>
          <Panel title={<Step n={1}>Détection</Step>} subtitle="Tous auteurs confondus.">
            <Row label="Salons supprimés">
              <Stepper value={raid.serverNuke.maxChannelDeletes} min={1} max={20} onCommit={(n) => setSub("serverNuke", { maxChannelDeletes: n })} />
            </Row>
            <Row label="Salons créés">
              <Stepper value={raid.serverNuke.maxChannelCreates} min={2} max={30} onCommit={(n) => setSub("serverNuke", { maxChannelCreates: n })} />
            </Row>
            <Row label="Rôles supprimés">
              <Stepper value={raid.serverNuke.maxRoleDeletes} min={1} max={20} onCommit={(n) => setSub("serverNuke", { maxRoleDeletes: n })} />
            </Row>
            <Row label="Rôles créés">
              <Stepper value={raid.serverNuke.maxRoleCreates} min={2} max={30} onCommit={(n) => setSub("serverNuke", { maxRoleCreates: n })} />
            </Row>
            <Row label="En moins de">
              <Stepper value={raid.serverNuke.timeWindowSeconds} min={5} max={120} unit="s" onCommit={(n) => setSub("serverNuke", { timeWindowSeconds: n })} />
            </Row>
          </Panel>
          <Panel title={<Step n={2}>Punition</Step>}>
            <EmptyLine>Verrouillage du serveur, toujours.</EmptyLine>
          </Panel>
          {raidAlert()}
        </>
      );
    case "joinRaid": {
      const a = raid.joinRaid.actions;
      const flag = (x: RaidAction, on: boolean) => setSub("joinRaid", { actions: on ? [...a.filter((y) => y !== x), x] : a.filter((y) => y !== x) });
      return (
        <>
          <Panel title={<Step n={1}>Détection</Step>}>
            <Row label="Seuil">
              <div className="flex flex-wrap items-center gap-3">
                <Stepper value={raid.joinRaid.threshold} min={3} max={100} unit="arrivées" onCommit={(n) => setSub("joinRaid", { threshold: n })} />
                <span className="text-xs text-[var(--text-muted)]">en moins de</span>
                <Stepper value={raid.joinRaid.timeWindowSeconds} min={3} max={120} unit="s" onCommit={(n) => setSub("joinRaid", { timeWindowSeconds: n })} />
              </div>
            </Row>
          </Panel>
          <Panel title={<Step n={2}>Punition</Step>}>
            <div className="px-5 py-4">
              <Cards
                label="Sanction des arrivants"
                value={strongest(a)}
                options={[...MEMBER_PUNISH.slice(0, 1), { id: "QUARANTINE", label: "Quarantaine", hint: "Isolé" }, ...MEMBER_PUNISH.slice(1)] as ReadonlyArray<{ id: string; label: string; hint: string }>}
                onChange={(v) => setSub("joinRaid", { actions: withPunish(a, v) })}
              />
            </div>
            <Row label="Activer le mode raid">
              <Switch checked={a.includes("ENABLE_RAID_MODE")} onChange={(v) => flag("ENABLE_RAID_MODE", v)} label="Activer le mode raid" />
            </Row>
            <Row label="Verrouiller le serveur">
              <Switch checked={a.includes("LOCKDOWN")} onChange={(v) => flag("LOCKDOWN", v)} label="Verrouiller le serveur" />
            </Row>
          </Panel>
          {raidAlert()}
        </>
      );
    }
    case "accountAge": {
      const tiers = raid.accountAge.tiers;
      const setTiers = (t: Tier[]) => setSub("accountAge", { tiers: t });
      return (
        <>
          <Panel
            title={<Step n={1}>Paliers</Step>}
            actions={
              tiers.length < 4 && (
                <GhostButton onClick={() => setTiers([...tiers, { ageThresholdHours: Math.min(2160, (tiers.at(-1)?.ageThresholdHours ?? 12) * 2), actions: ["ALERT_STAFF"], tagRole: null }])}>
                  <Plus className="h-3.5 w-3.5" />
                  Palier
                </GhostButton>
              )
            }
          >
            {tiers.length === 0 && <EmptyLine>Aucun palier.</EmptyLine>}
            {tiers.map((t, i) => (
              <Row key={i} label={`Compte de moins de`}>
                <div className="flex flex-wrap items-center gap-3">
                  <Stepper value={t.ageThresholdHours} min={1} max={2160} unit="h" onCommit={(n) => setTiers(tiers.map((x, j) => (j === i ? { ...x, ageThresholdHours: n } : x)))} />
                  <select
                    value={t.actions[0] ?? "ALERT_STAFF"}
                    onChange={(e) => setTiers(tiers.map((x, j) => (j === i ? { ...x, actions: [e.target.value as RaidAction, ...(e.target.value === "ALERT_STAFF" ? [] : ["ALERT_STAFF" as RaidAction])] } : x)))}
                    aria-label="Action"
                    className="h-8 rounded-lg border border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))] px-2.5 text-xs text-[var(--text-primary)] outline-none"
                  >
                    {AGE_ACTIONS.map(([id, label]) => (
                      <option key={id} value={id}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <button type="button" onClick={() => setTiers(tiers.filter((_, j) => j !== i))} aria-label="Retirer le palier" className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--danger)]/10 hover:text-[var(--danger)]">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </Row>
            ))}
          </Panel>
          {raidAlert(2)}
        </>
      );
    }
    case "botRaid":
      return (
        <>
          <Panel title={<Step n={1}>Détection</Step>}>
            <Row label="Expulser les bots hors whitelist">
              <Switch checked={raid.botRaid.blockUnwhitelistedBots} onChange={(v) => setSub("botRaid", { blockUnwhitelistedBots: v })} label="Expulser les bots hors whitelist" />
            </Row>
            <Row label="Rôles autorisés à inviter" hint="Un bot invité par un membre de ces rôles (ou un admin) est toléré.">
              <RoleChips guildId={guildId} ids={raid.botRaid.allowedInviterRoleIds} onChange={(ids) => setSub("botRaid", { allowedInviterRoleIds: ids })} />
            </Row>
          </Panel>
          {raidAlert(2)}
        </>
      );
    case "messageRaid":
    case "mentionRaid": {
      const sub = def.sub;
      const a = raid[sub].actions;
      return (
        <>
          <Panel title={<Step n={1}>Détection</Step>}>
            {sub === "messageRaid" ? (
              <>
                <Row label="Messages">
                  <div className="flex flex-wrap items-center gap-3">
                    <Stepper value={raid.messageRaid.maxMessagesPerUser} min={3} max={30} unit="messages" onCommit={(n) => setSub("messageRaid", { maxMessagesPerUser: n })} />
                    <span className="text-xs text-[var(--text-muted)]">en moins de</span>
                    <Stepper value={raid.messageRaid.timeWindowSeconds} min={2} max={60} unit="s" onCommit={(n) => setSub("messageRaid", { timeWindowSeconds: n })} />
                  </div>
                </Row>
                <Row label="Messages identiques">
                  <Stepper value={raid.messageRaid.duplicateMessageThreshold} min={2} max={10} unit="répétitions" onCommit={(n) => setSub("messageRaid", { duplicateMessageThreshold: n })} />
                </Row>
              </>
            ) : (
              <>
                <Row label="Par message">
                  <Stepper value={raid.mentionRaid.maxMentionsPerMessage} min={1} max={50} unit="mentions" onCommit={(n) => setSub("mentionRaid", { maxMentionsPerMessage: n })} />
                </Row>
                <Row label="Par membre">
                  <div className="flex flex-wrap items-center gap-3">
                    <Stepper value={raid.mentionRaid.maxMentionsPerUserInWindow} min={1} max={100} unit="mentions" onCommit={(n) => setSub("mentionRaid", { maxMentionsPerUserInWindow: n })} />
                    <span className="text-xs text-[var(--text-muted)]">en moins de</span>
                    <Stepper value={raid.mentionRaid.timeWindowSeconds} min={1} max={60} unit="s" onCommit={(n) => setSub("mentionRaid", { timeWindowSeconds: n })} />
                  </div>
                </Row>
                <Row label="Bloquer @everyone et @here">
                  <Switch checked={raid.mentionRaid.blockEveryoneHere} onChange={(v) => setSub("mentionRaid", { blockEveryoneHere: v })} label="Bloquer @everyone et @here" />
                </Row>
              </>
            )}
          </Panel>
          <Panel title={<Step n={2}>Punition</Step>}>
            <div className="px-5 py-4">
              <Cards label="Punition" value={strongest(a)} options={MEMBER_PUNISH} onChange={(v) => setSub(sub, { actions: withPunish(a, v) })} />
            </div>
            <Row label="Supprimer le message">
              <Switch checked={a.includes("DELETE")} onChange={(v) => setSub(sub, { actions: v ? [...a, "DELETE"] : a.filter((x) => x !== "DELETE") })} label="Supprimer le message" />
            </Row>
            {sub === "messageRaid" && strongest(a) === "TIMEOUT" && (
              <Row label="Durée du timeout">
                <Segmented
                  label="Durée du timeout"
                  value={raid.messageRaid.timeoutDurationSeconds}
                  options={[60, 300, 600, 3600, 86400].map((s) => [s, fmtDuration(s)] as const)}
                  onChange={(s) => setSub("messageRaid", { timeoutDurationSeconds: s })}
                />
              </Row>
            )}
          </Panel>
          {raidAlert()}
        </>
      );
    }
  }
}
