"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Hash, Volume2 } from "@/components/icons/ph";
import ChannelPicker, { invalidateGuildChannels } from "../../ChannelPicker";
import { confirmDialog } from "@/lib/confirmDialog";
import { sinceLabel } from "@/lib/discord/security-scan";
import { pageStagger, staggerItem } from "@/lib/motion-variants";
import { cn } from "@/lib/utils";
import { ConsolePage, EmptyLine, GhostButton, Panel, Row, Segmented, Select, StatTile, Stepper, Switch, TextField, roleColor, useGuildApi } from "../kit";
import { tx } from "@/lib/tx";

type Tab = "overview" | "badges" | "channels" | "roles" | "emojis" | "webhooks" | "settings";
type BadgeCount = { key: string; label: string; iconUrl: string; count: number };
type BadgeScan = { scannedAt: string; humans: number; bots: number; withBadge: number; boosters: number; badges: BadgeCount[]; boosts: BadgeCount[] };
type Overview = {
  guild: { name: string; ownerTag: string; createdAt: string };
  kpis: {
    totalMembers: number;
    humans: number;
    bots: number;
    onlineMembers: number;
    channelsCount: number;
    textChannelsCount: number;
    voiceChannelsCount: number;
    rolesCount: number;
    serverBoostLevel: number;
    boostCount: number;
    emojisCount: number;
    activeInvitesCount: number;
    activeModerationCases: number;
  };
  security: { score: number; status: string; factors: { title: string; impact: number; positive: boolean; description: string }[] };
  health?: {
    score: number;
    status: string;
    components: {
      discordGateway?: { status: string; pingMs: number };
      database?: { status: string; latencyMs: number };
      realtime?: { status: string; connected: boolean };
      memory?: { status: string; heapUsedMb: number; heapTotalMb: number };
    };
  };
  recentActivity: { id: string; timestamp: string; type: string; actor: { tag: string }; details?: string }[];
};
type Channel = { id: string; name: string; type: number; topic: string | null; nsfw: boolean; rateLimitPerUser: number; userLimit?: number };
type Tree = { categories: { id: string; name: string; channels: Channel[] }[]; orphanChannels: Channel[] };
type Role = { id: string; name: string; color: string; position: number; hoist: boolean; mentionable: boolean; managed: boolean; memberCount: number; isEditableByBot: boolean };
type Emoji = { id: string; name: string; animated: boolean; url: string };
type Emojis = { emojis: Emoji[]; stickers: { id: string; name: string; url: string }[]; quota: { usedStatic: number; usedAnimated: number; maxStatic: number; maxAnimated: number } };
type Webhook = { id: string; name: string; channelName: string; creatorTag: string; createdAt: string };
type Settings = {
  name: string;
  description: string | null;
  verificationLevel: number;
  defaultMessageNotifications: number;
  explicitContentFilter: number;
  afkChannelId: string | null;
  afkTimeout: number;
  systemChannelId: string | null;
  premiumTier: number;
  vanityURLCode: string | null;
};

const TABS: [Tab, string][] = [
  ["overview", "Aperçu"],
  ["badges", "Badges"],
  ["channels", "Salons"],
  ["roles", "Rôles"],
  ["emojis", "Emojis"],
  ["webhooks", "Webhooks"],
  ["settings", "Paramètres"],
];
const VERIFICATION = ["Aucune", "Faible (e-mail vérifié)", "Moyenne (inscrit depuis 5 min)", "Élevée (membre depuis 10 min)", "Maximale (téléphone vérifié)"];
const FILTER = ["Désactivé", "Membres sans rôle", "Tous les membres"];
const VERIFICATION_OPTIONS = VERIFICATION.map((label, i) => [i, label] as const);
const FILTER_OPTIONS = FILTER.map((label, i) => [i, label] as const);
const SELECT =
  "h-9 rounded-lg border border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]/70";
const INPUT = `${SELECT} w-full`;
const fmt = (n: number) => n.toLocaleString("fr-FR");
const isVoice = (t: number) => t === 2 || t === 13;

/**
 * Serveur (format Keeper) : aperçu, salons, rôles, emojis, webhooks et paramètres Discord du serveur, modifiés par Etho.
 * Les membres, permissions et journal sont dans « Rôles et membres » et « Logs ».
 */
export default function ConsoleServer({ guildId }: { guildId: string }) {
  const [tab, setTab] = useState<Tab>(() => {
    const wanted = typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("tab");
    return TABS.find(([id]) => id === wanted)?.[0] ?? "overview";
  });
  return (
    <ConsolePage title={tx("Serveur")} actions={<Segmented label={tx("Section")} value={tab} options={TABS} onChange={setTab} />}>
      {tab === "overview" && <OverviewTab guildId={guildId} />}
      {tab === "badges" && <BadgesTab guildId={guildId} />}
      {tab === "channels" && <ChannelsTab guildId={guildId} />}
      {tab === "roles" && <RolesTab guildId={guildId} />}
      {tab === "emojis" && <EmojisTab guildId={guildId} />}
      {tab === "webhooks" && <WebhooksTab guildId={guildId} />}
      {tab === "settings" && <SettingsTab guildId={guildId} />}
    </ConsolePage>
  );
}

function OverviewTab({ guildId }: { guildId: string }) {
  const api = useGuildApi(guildId);
  const [ov, setOv] = useState<Overview | null>(null);
  useEffect(() => {
    api<Overview>("/server/overview").then((r) => r && setOv(r));
  }, [api]);
  if (!ov) return <Panel><EmptyLine>{tx("Chargement…")}</EmptyLine></Panel>;
  const k = ov.kpis;
  return (
    <>
      <motion.div variants={pageStagger} initial="initial" animate="animate" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label={tx("Membres")} value={fmt(k.totalMembers)} hint={tx("{v0} humains · {v1} bots", { v0: fmt(k.humans), v1: fmt(k.bots) })} />
        <StatTile label={tx("En ligne")} value={k.onlineMembers ? fmt(k.onlineMembers) : "—"} hint={k.onlineMembers ? undefined : tx("Présences non visibles")} />
        <StatTile label={tx("Salons")} value={fmt(k.channelsCount)} hint={tx("{textChannelsCount} textuels · {voiceChannelsCount} vocaux", { textChannelsCount: k.textChannelsCount, voiceChannelsCount: k.voiceChannelsCount })} />
        <StatTile label={tx("Rôles")} value={fmt(k.rolesCount)} />
        <StatTile label={tx("Boosts")} value={fmt(k.boostCount)} hint={tx("Niveau {serverBoostLevel}", { serverBoostLevel: k.serverBoostLevel })} />
        <StatTile label={tx("Emojis")} value={fmt(k.emojisCount)} />
        <StatTile label={tx("Invitations actives")} value={fmt(k.activeInvitesCount)} />
        <StatTile label={tx("Sanctions en cours")} value={fmt(k.activeModerationCases)} />
      </motion.div>
      <Panel title={tx("Sécurité : {score}/100", { score: ov.security.score })} subtitle={tx("Créé {v0} · propriétaire {ownerTag}", { v0: sinceLabel(ov.guild.createdAt), ownerTag: ov.guild.ownerTag })}>
        <ul>
          {ov.security.factors.map((f) => (
            <li key={f.title} className="flex items-start gap-3 border-t border-[var(--panel-border)] px-5 py-2.5 first:border-t-0">
              <span className={cn("w-10 shrink-0 text-right text-xs font-bold tabular-nums", f.positive ? "text-[var(--success)]" : "text-[var(--danger)]")}>
                {f.positive ? "+" : "−"}
                {Math.abs(f.impact)}
              </span>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-[var(--text-primary)]">{f.title}</p>
                <p className="text-[11px] text-[var(--text-muted)]">{f.description}</p>
              </div>
            </li>
          ))}
        </ul>
      </Panel>
      {ov.health && (
        <Panel
          title={tx("Santé & Télémétrie d'Etho : {score}/100", { score: ov.health.score })}
          subtitle={tx("Statut {v0} · Données système en direct", { v0: ov.health.status === "HEALTHY" ? "optimal" : ov.health.status === "DEGRADED" ? "dégradé" : "critique" })}
        >
          <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-4">
            <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--surface-hover)] p-3">
              <span className="block text-xs text-[var(--text-muted)]">{tx("Passerelle Discord")}</span>
              <span className="mt-1 flex items-baseline gap-1 font-mono text-base font-bold text-[var(--text-primary)]">
                {ov.health.components.discordGateway?.pingMs ?? "—"} <span className="text-xs font-normal text-[var(--text-muted)]">{tx("ms")}</span>
              </span>
              <span className={cn("mt-1 block text-[10px] font-semibold", (ov.health.components.discordGateway?.pingMs ?? 0) < 150 ? "text-[var(--success)]" : "text-[var(--warning)]")}>
                {ov.health.components.discordGateway?.status === "HEALTHY" ? tx("Excellente") : tx("Latence élevée")}
              </span>
            </div>
            <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--surface-hover)] p-3">
              <span className="block text-xs text-[var(--text-muted)]">{tx("Mémoire Node.js")}</span>
              <span className="mt-1 flex items-baseline gap-1 font-mono text-base font-bold text-[var(--text-primary)]">
                {ov.health.components.memory?.heapUsedMb ?? "—"} <span className="text-xs font-normal text-[var(--text-muted)]">/ {ov.health.components.memory?.heapTotalMb ?? "—"} {" "}{tx("Mo")}</span>
              </span>
              <span className="mt-1 block text-[10px] font-semibold text-[var(--success)]">
                {tx("Tas V8 alloué")}
              </span>
            </div>
            <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--surface-hover)] p-3">
              <span className="block text-xs text-[var(--text-muted)]">{tx("Base de données")}</span>
              <span className="mt-1 flex items-baseline gap-1 font-mono text-base font-bold text-[var(--text-primary)]">
                {ov.health.components.database?.latencyMs ?? "—"} <span className="text-xs font-normal text-[var(--text-muted)]">{tx("ms")}</span>
              </span>
              <span className="mt-1 block text-[10px] font-semibold text-[var(--success)]">
                {tx("SQLite synchrone")}
              </span>
            </div>
            <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--surface-hover)] p-3">
              <span className="block text-xs text-[var(--text-muted)]">{tx("Flux temps réel")}</span>
              <span className="mt-1 flex items-baseline gap-1 font-mono text-base font-bold text-[var(--text-primary)]">
                {ov.health.components.realtime?.connected ? tx("Actif") : tx("En attente")}
              </span>
              <span className="mt-1 block text-[10px] font-semibold text-[var(--success)]">
                {tx("SSE / Synchronisé")}
              </span>
            </div>
          </div>
        </Panel>
      )}
      <Panel title={tx("Activité récente")}>
        {ov.recentActivity.length === 0 ? (
          <EmptyLine>{tx("Aucune activité enregistrée.")}</EmptyLine>
        ) : (
          <ul>
            {ov.recentActivity.map((a) => (
              <li key={a.id} className="flex items-start gap-3 border-t border-[var(--panel-border)] px-5 py-2.5 first:border-t-0">
                <span className="w-24 shrink-0 text-[11px] text-[var(--text-muted)]">{sinceLabel(a.timestamp)}</span>
                <p className="min-w-0 flex-1 truncate text-xs text-[var(--text-primary)]">
                  <span className="font-semibold">{a.actor.tag}</span> · {a.details ?? a.type}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}

function BadgesTab({ guildId }: { guildId: string }) {
  const api = useGuildApi(guildId);
  const [scan, setScan] = useState<BadgeScan | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const load = useCallback(
    async (refresh = false) => {
      setBusy(true);
      const r = await api<BadgeScan>(refresh ? "/badges?refresh=1" : "/badges");
      setBusy(false);
      if (r) setScan(r);
      else setFailed(true);
    },
    [api]
  );
  useEffect(() => {
    void load();
  }, [load]);
  if (!scan) return <Panel><EmptyLine>{failed ? tx("Analyse indisponible pour le moment.") : tx("Analyse des membres…")}</EmptyLine></Panel>;
  const grid = (list: BadgeCount[]) => (
    <motion.ul variants={pageStagger} initial="initial" animate="animate" className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-3 lg:grid-cols-4">
      {list.map((b) => (
        <motion.li
          key={b.key}
          variants={staggerItem}
          className="flex items-center gap-3 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-hover)] px-3 py-2.5"
        >
          { }
          <img src={b.iconUrl} alt="" className={cn("h-7 w-7 shrink-0 object-contain", b.count === 0 && "opacity-30 grayscale")} />
          <div className={cn("min-w-0", b.count === 0 && "opacity-40")}>
            <p className="truncate text-[12px] font-semibold text-[var(--text-primary)]">{b.label}</p>
            <p className="font-mono text-sm font-bold tabular-nums text-[var(--text-primary)]">×{fmt(b.count)}</p>
          </div>
        </motion.li>
      ))}
    </motion.ul>
  );
  return (
    <>
      <motion.div variants={pageStagger} initial="initial" animate="animate" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label={tx("Humains analysés")} value={fmt(scan.humans)} hint={tx("{v0} bots ignorés", { v0: fmt(scan.bots) })} />
        <StatTile label={tx("Avec un badge")} value={fmt(scan.withBadge)} hint={scan.humans ? tx("{v0} % des membres", { v0: Math.round((scan.withBadge / scan.humans) * 100) }) : undefined} />
        <StatTile label={tx("Boosters")} value={fmt(scan.boosters)} />
        <StatTile label={tx("Badges au total")} value={fmt([...scan.badges, ...scan.boosts].reduce((n, b) => n + b.count, 0))} />
      </motion.div>
      <Panel
        title={tx("Badges de profil")}
        subtitle={tx("Analyse {v0} · Nitro repéré par ses avantages visibles ; palier Nitro et badge Quête invisibles pour les bots", { v0: sinceLabel(scan.scannedAt) })}
        actions={<GhostButton disabled={busy} onClick={() => load(true)}>{busy ? tx("Analyse…") : tx("Relancer l'analyse")}</GhostButton>}
      >
        {grid(scan.badges)}
      </Panel>
      <Panel title={tx("Boosts du serveur")} subtitle={tx("Le badge de boost évolue avec l'ancienneté du boost.")}>
        {grid(scan.boosts)}
      </Panel>
    </>
  );
}

function ChannelsTab({ guildId }: { guildId: string }) {
  const api = useGuildApi(guildId);
  const [tree, setTree] = useState<Tree | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState<0 | 2 | 4>(0);
  const [parentId, setParentId] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await api<Tree>("/server/channels");
    setTree(r ?? { categories: [], orphanChannels: [] });
  }, [api]);
  useEffect(() => {
    void load();
  }, [load]);
  const changed = () => {
    invalidateGuildChannels(guildId);
    void load();
  };

  const create = async () => {
    setBusy(true);
    const r = await api("/server/channels", { method: "POST", json: { name: name.trim(), type, parentId: type === 4 ? null : parentId || null } });
    setBusy(false);
    if (r) {
      setName("");
      changed();
    }
  };
  const update = async (c: Channel, patch: Partial<Channel>) => {
    if (await api(`/server/channels/${c.id}`, { method: "PUT", json: patch })) changed();
  };
  const remove = async (id: string, label: string) => {
    if (!(await confirmDialog(tx("Supprimer « {label} » sur Discord ? Les messages du salon seront perdus.", { label }), { title: tx("Supprimer le salon"), confirmLabel: tx("Supprimer") }))) return;
    if (await api(`/server/channels/${id}`, { method: "DELETE" })) changed();
  };

  const row = (c: Channel) => (
    <li key={c.id} className="border-t border-[var(--panel-border)] first:border-t-0">
      <button type="button" onClick={() => setOpen(open === c.id ? null : c.id)} aria-expanded={open === c.id} className="flex w-full items-center gap-2 px-5 py-2 text-left hover:bg-[var(--surface-hover)]">
        {isVoice(c.type) ? <Volume2 className="h-3.5 w-3.5 shrink-0 text-[var(--text-muted)]" /> : <Hash className="h-3.5 w-3.5 shrink-0 text-[var(--text-muted)]" />}
        <span className="min-w-0 flex-1 truncate text-[13px] text-[var(--text-primary)]">{c.name}</span>
        {c.nsfw && <span className="text-[10px] text-[var(--danger)]">{tx("NSFW")}</span>}
        {c.rateLimitPerUser > 0 && <span className="text-[10px] text-[var(--text-muted)]">{tx("lent")}{" "} {c.rateLimitPerUser}s</span>}
      </button>
      {open === c.id && (
        <div className="border-t border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))]/40">
          <Row label={tx("Nom")}>
            <TextField value={c.name} maxLength={100} onCommit={(v) => update(c, { name: v })} />
          </Row>
          {!isVoice(c.type) ? (
            <>
              <Row label={tx("Sujet")}>
                <TextField value={c.topic ?? ""} maxLength={1024} width="w-full" allowEmpty onCommit={(v) => update(c, { topic: v })} />
              </Row>
              <Row label={tx("Mode lent")} hint={tx("Délai entre deux messages d'un membre.")}>
                <Stepper value={c.rateLimitPerUser} min={0} max={21600} step={5} unit="secondes" onCommit={(n) => update(c, { rateLimitPerUser: n })} />
              </Row>
              <Row label="NSFW">
                <Switch checked={c.nsfw} onChange={(v) => update(c, { nsfw: v })} label="NSFW" />
              </Row>
            </>
          ) : (
            <Row label={tx("Places")} hint={tx("0 = sans limite.")}>
              <Stepper value={c.userLimit ?? 0} min={0} max={99} unit="membres" onCommit={(n) => update(c, { userLimit: n })} />
            </Row>
          )}
          <div className="flex justify-end border-t border-[var(--panel-border)] px-5 py-2.5">
            <GhostButton onClick={() => remove(c.id, c.name)}>{tx("Supprimer le salon")}</GhostButton>
          </div>
        </div>
      )}
    </li>
  );

  return (
    <>
      <Panel title={tx("Créer")}>
        <div className="flex flex-wrap items-center gap-2 px-5 py-3">
          <Segmented
            label={tx("Type")}
            value={type}
            options={[
              [0, "Textuel"],
              [2, "Vocal"],
              [4, "Catégorie"],
            ]}
            onChange={setType}
          />
          <input value={name} maxLength={100} onChange={(e) => setName(e.target.value)} placeholder={tx("Nom")} aria-label={tx("Nom du salon")} className={`${SELECT} w-44`} />
          {type !== 4 && <ChannelPicker guildId={guildId} value={parentId} filterTypes={[4]} placeholder={tx("Sans catégorie")} onChange={(id) => setParentId(id)} />}
          <GhostButton disabled={!name.trim() || busy} onClick={create}>
            {tx("Créer")}
          </GhostButton>
        </div>
      </Panel>
      {!tree ? (
        <Panel>
          <EmptyLine>{tx("Chargement…")}</EmptyLine>
        </Panel>
      ) : (
        <>
          {tree.orphanChannels.length > 0 && (
            <Panel title={tx("Sans catégorie")}>
              <ul>{tree.orphanChannels.map(row)}</ul>
            </Panel>
          )}
          {tree.categories.map((cat) => (
            <Panel key={cat.id} title={cat.name} actions={<GhostButton onClick={() => remove(cat.id, cat.name)}>{tx("Supprimer")}</GhostButton>}>
              {cat.channels.length === 0 ? <EmptyLine>{tx("Catégorie vide.")}</EmptyLine> : <ul>{cat.channels.map(row)}</ul>}
            </Panel>
          ))}
        </>
      )}
    </>
  );
}

function RolesTab({ guildId }: { guildId: string }) {
  const api = useGuildApi(guildId);
  const [roles, setRoles] = useState<Role[] | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#99aab5");
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    const r = await api<Role[] | { roles: Role[] }>("/server/roles");
    setRoles(Array.isArray(r) ? r : (r?.roles ?? []));
  }, [api]);
  useEffect(() => {
    void load();
  }, [load]);

  const create = async () => {
    if (await api("/server/roles", { method: "POST", json: { name: name.trim(), color } })) {
      setName("");
      void load();
    }
  };
  const update = async (r: Role, patch: Partial<Role>) => {
    setRoles((l) => l?.map((x) => (x.id === r.id ? { ...x, ...patch } : x)) ?? null);
    if (!(await api(`/server/roles/${r.id}`, { method: "PUT", json: patch }))) void load();
  };
  const remove = async (r: Role) => {
    if (!(await confirmDialog(tx("Supprimer le rôle « {name} » ({memberCount} membre{v2}) sur Discord ?", { name: r.name, memberCount: r.memberCount, v2: r.memberCount > 1 ? "s" : "" }), { title: tx("Supprimer le rôle"), confirmLabel: tx("Supprimer") }))) return;
    if (await api(`/server/roles/${r.id}`, { method: "DELETE" })) void load();
  };

  const shown = (roles ?? []).filter((r) => !q.trim() || r.name.toLowerCase().includes(q.trim().toLowerCase())).sort((a, b) => b.position - a.position);
  return (
    <>
      <Panel title={tx("Créer un rôle")}>
        <div className="flex flex-wrap items-center gap-2 px-5 py-3">
          <input value={name} maxLength={100} onChange={(e) => setName(e.target.value)} placeholder={tx("Nom du rôle")} aria-label={tx("Nom du rôle")} className={`${SELECT} w-52`} />
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} aria-label={tx("Couleur")} className="h-9 w-10 cursor-pointer rounded border border-[var(--panel-border)] bg-transparent" />
          <GhostButton disabled={!name.trim()} onClick={create}>
            {tx("Créer")}
          </GhostButton>
        </div>
      </Panel>
      <Panel
        title={tx("Rôles")}
        subtitle={tx("Etho ne peut modifier que les rôles placés sous le sien.")}
        actions={<input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tx("Rechercher")} aria-label={tx("Rechercher un rôle")} className={`${SELECT} h-8 w-36 text-xs`} />}
      >
        {!roles ? (
          <EmptyLine>{tx("Chargement…")}</EmptyLine>
        ) : (
          <ul>
            {shown.map((r) => {
              const locked = r.managed || !r.isEditableByBot;
              return (
                <li key={r.id} className="flex flex-wrap items-center gap-3 border-t border-[var(--panel-border)] px-5 py-2.5 first:border-t-0">
                  <input
                    type="color"
                    value={/^#[0-9a-f]{6}$/i.test(r.color) && r.color !== "#000000" ? r.color : "#99aab5"}
                    disabled={locked}
                    onChange={(e) => update(r, { color: e.target.value })}
                    aria-label={tx("Couleur de {name}", { name: r.name })}
                    className="h-6 w-7 shrink-0 cursor-pointer rounded border border-[var(--panel-border)] bg-transparent disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <div className="min-w-0 flex-1">
                    {locked ? (
                      <p className="truncate text-[13px] font-semibold" style={{ color: roleColor(r.color) }}>
                        {r.name}
                      </p>
                    ) : (
                      <TextField value={r.name} maxLength={100} width="w-full max-w-xs" onCommit={(v) => update(r, { name: v })} />
                    )}
                    <p className="text-[11px] text-[var(--text-muted)]">
                      {r.memberCount} {" "}{tx("membre")}{r.memberCount > 1 ? "s" : ""}
                      {r.managed ? tx(" · géré par une intégration") : !r.isEditableByBot ? tx(" · au-dessus d'Etho") : ""}
                    </p>
                  </div>
                  <label className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
                    <Switch checked={r.hoist} disabled={locked} onChange={(v) => update(r, { hoist: v })} label={tx("Afficher {name} séparément", { name: r.name })} />
                    {tx("Séparé")}
                  </label>
                  <label className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
                    <Switch checked={r.mentionable} disabled={locked} onChange={(v) => update(r, { mentionable: v })} label={tx("{name} mentionnable", { name: r.name })} />
                    {tx("Mentionnable")}
                  </label>
                  <GhostButton disabled={locked} onClick={() => remove(r)}>
                    {tx("Supprimer")}
                  </GhostButton>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </>
  );
}

function EmojisTab({ guildId }: { guildId: string }) {
  const api = useGuildApi(guildId);
  const [data, setData] = useState<Emojis | null>(null);
  const [name, setName] = useState("");
  const [file, setFile] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const r = await api<Emojis>("/server/emojis");
    setData(r ?? { emojis: [], stickers: [], quota: { usedStatic: 0, usedAnimated: 0, maxStatic: 50, maxAnimated: 50 } });
  }, [api]);
  useEffect(() => {
    void load();
  }, [load]);

  const pick = (f: File | undefined) => {
    if (!f) return;
    if (f.size > 256 * 1024) {
      setFile(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setFile(String(reader.result));
    reader.readAsDataURL(f);
    if (!name) setName(f.name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 32));
  };
  const upload = async () => {
    setBusy(true);
    const r = await api("/server/emojis", { method: "POST", json: { name, imageBase64OrUrl: file } });
    setBusy(false);
    if (r) {
      setName("");
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      void load();
    }
  };
  const rename = async (e: Emoji, v: string) => {
    if (await api(`/server/emojis/${e.id}`, { method: "PATCH", json: { name: v } })) void load();
  };
  const remove = async (e: Emoji) => {
    if (!(await confirmDialog(tx("Supprimer l'emoji :{name}: ?", { name: e.name }), { title: tx("Supprimer"), confirmLabel: tx("Supprimer") }))) return;
    if (await api(`/server/emojis/${e.id}`, { method: "DELETE" })) void load();
  };

  const validName = /^[a-zA-Z0-9_]{2,32}$/.test(name);
  return (
    <>
      <Panel title={tx("Ajouter un emoji")} subtitle={tx("PNG, JPG ou GIF de 256 Ko au maximum.")}>
        <div className="flex flex-wrap items-center gap-2 px-5 py-3">
          <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/gif,image/webp" onChange={(e) => pick(e.target.files?.[0])} aria-label={tx("Image de l'emoji")} className="text-xs text-[var(--text-muted)]" />
          { }
          {file && <img src={file} alt="" className="h-8 w-8 object-contain" />}
          <input value={name} maxLength={32} onChange={(e) => setName(e.target.value.replace(/[^a-zA-Z0-9_]/g, "_"))} placeholder="nom_emoji" aria-label={tx("Nom de l'emoji")} className={`${SELECT} w-40 font-mono`} />
          <GhostButton disabled={!file || !validName || busy} onClick={upload}>
            {busy ? tx("Envoi…") : tx("Ajouter")}
          </GhostButton>
        </div>
      </Panel>
      <Panel title={tx("Emojis")} subtitle={data ? tx("{usedStatic}/{maxStatic} fixes · {usedAnimated}/{maxAnimated} animés", { usedStatic: data.quota.usedStatic, maxStatic: data.quota.maxStatic, usedAnimated: data.quota.usedAnimated, maxAnimated: data.quota.maxAnimated }) : undefined}>
        {!data ? (
          <EmptyLine>{tx("Chargement…")}</EmptyLine>
        ) : data.emojis.length === 0 ? (
          <EmptyLine>{tx("Aucun emoji.")}</EmptyLine>
        ) : (
          <ul className="grid gap-px sm:grid-cols-2">
            {data.emojis.map((e) => (
              <li key={e.id} className="flex items-center gap-2.5 border-t border-[var(--panel-border)] px-5 py-2">
                { }
                <img src={e.url} alt="" className="h-7 w-7 shrink-0 object-contain" />
                <div className="min-w-0 flex-1">
                  <TextField value={e.name} maxLength={32} mono width="w-full" onCommit={(v) => rename(e, v)} />
                </div>
                <GhostButton onClick={() => remove(e)}>{tx("Supprimer")}</GhostButton>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      {data && data.stickers.length > 0 && (
        <Panel title={tx("Stickers")}>
          <div className="flex flex-wrap gap-3 px-5 py-4">
            {data.stickers.map((s) => (
              <div key={s.id} className="w-20 text-center">
                { }
                <img src={s.url} alt="" className="mx-auto h-14 w-14 object-contain" />
                <p className="mt-1 truncate text-[10px] text-[var(--text-muted)]">{s.name}</p>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </>
  );
}

function WebhooksTab({ guildId }: { guildId: string }) {
  const api = useGuildApi(guildId);
  const [hooks, setHooks] = useState<Webhook[] | null>(null);
  const load = useCallback(async () => {
    const r = await api<{ webhooks: Webhook[] }>("/server/webhooks");
    setHooks(r?.webhooks ?? []);
  }, [api]);
  useEffect(() => {
    void load();
  }, [load]);
  const remove = async (w: Webhook) => {
    if (!(await confirmDialog(tx("Supprimer le webhook « {name} » ? Ce qui l'utilise (bots, intégrations) cessera de publier dans #{channelName}.", { name: w.name, channelName: w.channelName }), { title: tx("Supprimer"), confirmLabel: tx("Supprimer") }))) return;
    if (await api(`/server/webhooks/${w.id}`, { method: "DELETE" })) void load();
  };
  return (
    <Panel title={tx("Webhooks")} subtitle={tx("Un webhook inconnu peut publier au nom de n'importe qui : supprime ceux que tu ne reconnais pas.")}>
      {!hooks ? (
        <EmptyLine>{tx("Chargement…")}</EmptyLine>
      ) : hooks.length === 0 ? (
        <EmptyLine>{tx("Aucun webhook sur ce serveur.")}</EmptyLine>
      ) : (
        <ul>
          {hooks.map((w) => (
            <li key={w.id} className="flex items-center gap-3 border-t border-[var(--panel-border)] px-5 py-3 first:border-t-0">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-[var(--text-primary)]">{w.name}</p>
                <p className="truncate text-[11px] text-[var(--text-muted)]">
                  #{w.channelName} {" "}{tx("· créé par")}{" "} {w.creatorTag} · {sinceLabel(w.createdAt)}
                </p>
              </div>
              <GhostButton onClick={() => remove(w)}>{tx("Supprimer")}</GhostButton>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function SettingsTab({ guildId }: { guildId: string }) {
  const api = useGuildApi(guildId);
  const [s, setS] = useState<Settings | null>(null);
  const [desc, setDesc] = useState("");
  useEffect(() => {
    api<{ settings: Settings }>("/server/settings").then((r) => {
      if (r) {
        setS(r.settings);
        setDesc(r.settings.description ?? "");
      }
    });
  }, [api]);
  const save = async (patch: Partial<Settings>) => {
    const previous = s;
    setS((x) => (x ? { ...x, ...patch } : x));
    const r = await api<{ settings: Settings }>("/server/settings", { method: "PUT", json: patch });
    if (r) setS(r.settings);
    else setS(previous);
  };
  if (!s) return <Panel><EmptyLine>{tx("Chargement…")}</EmptyLine></Panel>;
  return (
    <>
      <Panel title={tx("Profil du serveur")}>
        <Row label={tx("Nom")}>
          <TextField value={s.name} maxLength={100} width="w-72" onCommit={(v) => save({ name: v })} />
        </Row>
        <Row label={tx("Description")} hint={s.premiumTier < 1 ? tx("Visible dans la découverte (serveurs communautaires).") : undefined}>
          <textarea value={desc} maxLength={120} rows={2} onChange={(e) => setDesc(e.target.value)} onBlur={() => desc !== (s.description ?? "") && save({ description: desc })} aria-label={tx("Description")} className={`${INPUT} h-auto py-2`} />
        </Row>
        {s.vanityURLCode && (
          <Row label={tx("Lien personnalisé")}>
            <code className="text-xs text-[var(--text-muted)]">{tx("discord.gg/")}{s.vanityURLCode}</code>
          </Row>
        )}
      </Panel>
      <Panel title={tx("Modération Discord")}>
        <Row label={tx("Niveau de vérification")} hint={tx("Conditions avant de pouvoir écrire.")}>
          <Select value={s.verificationLevel} options={VERIFICATION_OPTIONS} onChange={(v) => save({ verificationLevel: v })} aria-label={tx("Niveau de vérification")} />
        </Row>
        <Row label={tx("Filtre de contenu explicite")} hint={tx("Images analysées par Discord.")}>
          <Select value={s.explicitContentFilter} options={FILTER_OPTIONS} onChange={(v) => save({ explicitContentFilter: v })} aria-label={tx("Filtre de contenu explicite")} />
        </Row>
        <Row label={tx("Notifications par défaut")}>
          <Segmented
            label={tx("Notifications par défaut")}
            value={s.defaultMessageNotifications}
            options={[
              [0, "Tous les messages"],
              [1, "Mentions seulement"],
            ]}
            onChange={(v) => save({ defaultMessageNotifications: v })}
          />
        </Row>
      </Panel>
      <Panel title={tx("Salons spéciaux")}>
        <Row label={tx("Salon système Discord")} hint={tx("Messages de bienvenue et de boost de Discord.")}>
          <ChannelPicker guildId={guildId} value={s.systemChannelId ?? ""} filterTypes={[0]} placeholder={tx("Aucun")} onChange={(id) => save({ systemChannelId: id || null })} />
        </Row>
        <Row label={tx("Salon AFK")}>
          <ChannelPicker guildId={guildId} value={s.afkChannelId ?? ""} filterTypes={[2]} placeholder={tx("Aucun")} onChange={(id) => save({ afkChannelId: id || null })} />
        </Row>
        <Row label={tx("Délai d'inactivité AFK")}>
          <Segmented
            label={tx("Délai AFK")}
            value={s.afkTimeout}
            options={[
              [60, "1 min"],
              [300, "5 min"],
              [900, "15 min"],
              [1800, "30 min"],
              [3600, "1 h"],
            ]}
            onChange={(v) => save({ afkTimeout: v })}
          />
        </Row>
      </Panel>
    </>
  );
}
