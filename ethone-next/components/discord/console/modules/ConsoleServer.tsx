"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Hash, Volume2 } from "@/components/icons/ph";
import ChannelPicker, { invalidateGuildChannels } from "../../ChannelPicker";
import { confirmDialog } from "@/lib/confirmDialog";
import { sinceLabel } from "@/lib/discord/security-scan";
import { pageStagger } from "@/lib/motion-variants";
import { cn } from "@/lib/utils";
import { ConsolePage, EmptyLine, GhostButton, Panel, Row, Segmented, StatTile, Stepper, Switch, TextField, roleColor, useGuildApi } from "../kit";

type Tab = "overview" | "channels" | "roles" | "emojis" | "webhooks" | "settings";
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
  ["channels", "Salons"],
  ["roles", "Rôles"],
  ["emojis", "Emojis"],
  ["webhooks", "Webhooks"],
  ["settings", "Paramètres"],
];
const VERIFICATION = ["Aucune", "Faible (e-mail vérifié)", "Moyenne (inscrit depuis 5 min)", "Élevée (membre depuis 10 min)", "Maximale (téléphone vérifié)"];
const FILTER = ["Désactivé", "Membres sans rôle", "Tous les membres"];
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
  const [tab, setTab] = useState<Tab>("overview");
  return (
    <ConsolePage title="Serveur" actions={<Segmented label="Section" value={tab} options={TABS} onChange={setTab} />}>
      {tab === "overview" && <OverviewTab guildId={guildId} />}
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
  if (!ov) return <Panel><EmptyLine>Chargement…</EmptyLine></Panel>;
  const k = ov.kpis;
  return (
    <>
      <motion.div variants={pageStagger} initial="initial" animate="animate" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Membres" value={fmt(k.totalMembers)} hint={`${fmt(k.humans)} humains · ${fmt(k.bots)} bots`} />
        <StatTile label="En ligne" value={k.onlineMembers ? fmt(k.onlineMembers) : "—"} hint={k.onlineMembers ? undefined : "Présences non visibles"} />
        <StatTile label="Salons" value={fmt(k.channelsCount)} hint={`${k.textChannelsCount} textuels · ${k.voiceChannelsCount} vocaux`} />
        <StatTile label="Rôles" value={fmt(k.rolesCount)} />
        <StatTile label="Boosts" value={fmt(k.boostCount)} hint={`Niveau ${k.serverBoostLevel}`} />
        <StatTile label="Emojis" value={fmt(k.emojisCount)} />
        <StatTile label="Invitations actives" value={fmt(k.activeInvitesCount)} />
        <StatTile label="Sanctions en cours" value={fmt(k.activeModerationCases)} />
      </motion.div>
      <Panel title={`Sécurité : ${ov.security.score}/100`} subtitle={`Créé ${sinceLabel(ov.guild.createdAt)} · propriétaire ${ov.guild.ownerTag}`}>
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
      <Panel title="Activité récente">
        {ov.recentActivity.length === 0 ? (
          <EmptyLine>Aucune activité enregistrée.</EmptyLine>
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
    if (!(await confirmDialog(`Supprimer « ${label} » sur Discord ? Les messages du salon seront perdus.`, { title: "Supprimer le salon", confirmLabel: "Supprimer" }))) return;
    if (await api(`/server/channels/${id}`, { method: "DELETE" })) changed();
  };

  const row = (c: Channel) => (
    <li key={c.id} className="border-t border-[var(--panel-border)] first:border-t-0">
      <button type="button" onClick={() => setOpen(open === c.id ? null : c.id)} aria-expanded={open === c.id} className="flex w-full items-center gap-2 px-5 py-2 text-left hover:bg-[var(--surface-hover)]">
        {isVoice(c.type) ? <Volume2 className="h-3.5 w-3.5 shrink-0 text-[var(--text-muted)]" /> : <Hash className="h-3.5 w-3.5 shrink-0 text-[var(--text-muted)]" />}
        <span className="min-w-0 flex-1 truncate text-[13px] text-[var(--text-primary)]">{c.name}</span>
        {c.nsfw && <span className="text-[10px] text-[var(--danger)]">NSFW</span>}
        {c.rateLimitPerUser > 0 && <span className="text-[10px] text-[var(--text-muted)]">lent {c.rateLimitPerUser}s</span>}
      </button>
      {open === c.id && (
        <div className="border-t border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))]/40">
          <Row label="Nom">
            <TextField value={c.name} maxLength={100} onCommit={(v) => update(c, { name: v })} />
          </Row>
          {!isVoice(c.type) ? (
            <>
              <Row label="Sujet">
                <TextField value={c.topic ?? ""} maxLength={1024} width="w-full" allowEmpty onCommit={(v) => update(c, { topic: v })} />
              </Row>
              <Row label="Mode lent" hint="Délai entre deux messages d'un membre.">
                <Stepper value={c.rateLimitPerUser} min={0} max={21600} step={5} unit="secondes" onCommit={(n) => update(c, { rateLimitPerUser: n })} />
              </Row>
              <Row label="NSFW">
                <Switch checked={c.nsfw} onChange={(v) => update(c, { nsfw: v })} label="NSFW" />
              </Row>
            </>
          ) : (
            <Row label="Places" hint="0 = sans limite.">
              <Stepper value={c.userLimit ?? 0} min={0} max={99} unit="membres" onCommit={(n) => update(c, { userLimit: n })} />
            </Row>
          )}
          <div className="flex justify-end border-t border-[var(--panel-border)] px-5 py-2.5">
            <GhostButton onClick={() => remove(c.id, c.name)}>Supprimer le salon</GhostButton>
          </div>
        </div>
      )}
    </li>
  );

  return (
    <>
      <Panel title="Créer">
        <div className="flex flex-wrap items-center gap-2 px-5 py-3">
          <Segmented
            label="Type"
            value={type}
            options={[
              [0, "Textuel"],
              [2, "Vocal"],
              [4, "Catégorie"],
            ]}
            onChange={setType}
          />
          <input value={name} maxLength={100} onChange={(e) => setName(e.target.value)} placeholder="Nom" aria-label="Nom du salon" className={`${SELECT} w-44`} />
          {type !== 4 && <ChannelPicker guildId={guildId} value={parentId} filterTypes={[4]} placeholder="Sans catégorie" onChange={(id) => setParentId(id)} />}
          <GhostButton disabled={!name.trim() || busy} onClick={create}>
            Créer
          </GhostButton>
        </div>
      </Panel>
      {!tree ? (
        <Panel>
          <EmptyLine>Chargement…</EmptyLine>
        </Panel>
      ) : (
        <>
          {tree.orphanChannels.length > 0 && (
            <Panel title="Sans catégorie">
              <ul>{tree.orphanChannels.map(row)}</ul>
            </Panel>
          )}
          {tree.categories.map((cat) => (
            <Panel key={cat.id} title={cat.name} actions={<GhostButton onClick={() => remove(cat.id, cat.name)}>Supprimer</GhostButton>}>
              {cat.channels.length === 0 ? <EmptyLine>Catégorie vide.</EmptyLine> : <ul>{cat.channels.map(row)}</ul>}
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
    if (!(await confirmDialog(`Supprimer le rôle « ${r.name} » (${r.memberCount} membre${r.memberCount > 1 ? "s" : ""}) sur Discord ?`, { title: "Supprimer le rôle", confirmLabel: "Supprimer" }))) return;
    if (await api(`/server/roles/${r.id}`, { method: "DELETE" })) void load();
  };

  const shown = (roles ?? []).filter((r) => !q.trim() || r.name.toLowerCase().includes(q.trim().toLowerCase())).sort((a, b) => b.position - a.position);
  return (
    <>
      <Panel title="Créer un rôle">
        <div className="flex flex-wrap items-center gap-2 px-5 py-3">
          <input value={name} maxLength={100} onChange={(e) => setName(e.target.value)} placeholder="Nom du rôle" aria-label="Nom du rôle" className={`${SELECT} w-52`} />
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} aria-label="Couleur" className="h-9 w-10 cursor-pointer rounded border border-[var(--panel-border)] bg-transparent" />
          <GhostButton disabled={!name.trim()} onClick={create}>
            Créer
          </GhostButton>
        </div>
      </Panel>
      <Panel
        title="Rôles"
        subtitle="Etho ne peut modifier que les rôles placés sous le sien."
        actions={<input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher" aria-label="Rechercher un rôle" className={`${SELECT} h-8 w-36 text-xs`} />}
      >
        {!roles ? (
          <EmptyLine>Chargement…</EmptyLine>
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
                    aria-label={`Couleur de ${r.name}`}
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
                      {r.memberCount} membre{r.memberCount > 1 ? "s" : ""}
                      {r.managed ? " · géré par une intégration" : !r.isEditableByBot ? " · au-dessus d'Etho" : ""}
                    </p>
                  </div>
                  <label className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
                    <Switch checked={r.hoist} disabled={locked} onChange={(v) => update(r, { hoist: v })} label={`Afficher ${r.name} séparément`} />
                    Séparé
                  </label>
                  <label className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
                    <Switch checked={r.mentionable} disabled={locked} onChange={(v) => update(r, { mentionable: v })} label={`${r.name} mentionnable`} />
                    Mentionnable
                  </label>
                  <GhostButton disabled={locked} onClick={() => remove(r)}>
                    Supprimer
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
    if (!(await confirmDialog(`Supprimer l'emoji :${e.name}: ?`, { title: "Supprimer", confirmLabel: "Supprimer" }))) return;
    if (await api(`/server/emojis/${e.id}`, { method: "DELETE" })) void load();
  };

  const validName = /^[a-zA-Z0-9_]{2,32}$/.test(name);
  return (
    <>
      <Panel title="Ajouter un emoji" subtitle="PNG, JPG ou GIF de 256 Ko au maximum.">
        <div className="flex flex-wrap items-center gap-2 px-5 py-3">
          <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/gif,image/webp" onChange={(e) => pick(e.target.files?.[0])} aria-label="Image de l'emoji" className="text-xs text-[var(--text-muted)]" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {file && <img src={file} alt="" className="h-8 w-8 object-contain" />}
          <input value={name} maxLength={32} onChange={(e) => setName(e.target.value.replace(/[^a-zA-Z0-9_]/g, "_"))} placeholder="nom_emoji" aria-label="Nom de l'emoji" className={`${SELECT} w-40 font-mono`} />
          <GhostButton disabled={!file || !validName || busy} onClick={upload}>
            {busy ? "Envoi…" : "Ajouter"}
          </GhostButton>
        </div>
      </Panel>
      <Panel title="Emojis" subtitle={data ? `${data.quota.usedStatic}/${data.quota.maxStatic} fixes · ${data.quota.usedAnimated}/${data.quota.maxAnimated} animés` : undefined}>
        {!data ? (
          <EmptyLine>Chargement…</EmptyLine>
        ) : data.emojis.length === 0 ? (
          <EmptyLine>Aucun emoji.</EmptyLine>
        ) : (
          <ul className="grid gap-px sm:grid-cols-2">
            {data.emojis.map((e) => (
              <li key={e.id} className="flex items-center gap-2.5 border-t border-[var(--panel-border)] px-5 py-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={e.url} alt="" className="h-7 w-7 shrink-0 object-contain" />
                <div className="min-w-0 flex-1">
                  <TextField value={e.name} maxLength={32} mono width="w-full" onCommit={(v) => rename(e, v)} />
                </div>
                <GhostButton onClick={() => remove(e)}>Supprimer</GhostButton>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      {data && data.stickers.length > 0 && (
        <Panel title="Stickers">
          <div className="flex flex-wrap gap-3 px-5 py-4">
            {data.stickers.map((s) => (
              <div key={s.id} className="w-20 text-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
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
    if (!(await confirmDialog(`Supprimer le webhook « ${w.name} » ? Ce qui l'utilise (bots, intégrations) cessera de publier dans #${w.channelName}.`, { title: "Supprimer", confirmLabel: "Supprimer" }))) return;
    if (await api(`/server/webhooks/${w.id}`, { method: "DELETE" })) void load();
  };
  return (
    <Panel title="Webhooks" subtitle="Un webhook inconnu peut publier au nom de n'importe qui : supprime ceux que tu ne reconnais pas.">
      {!hooks ? (
        <EmptyLine>Chargement…</EmptyLine>
      ) : hooks.length === 0 ? (
        <EmptyLine>Aucun webhook sur ce serveur.</EmptyLine>
      ) : (
        <ul>
          {hooks.map((w) => (
            <li key={w.id} className="flex items-center gap-3 border-t border-[var(--panel-border)] px-5 py-3 first:border-t-0">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-[var(--text-primary)]">{w.name}</p>
                <p className="truncate text-[11px] text-[var(--text-muted)]">
                  #{w.channelName} · créé par {w.creatorTag} · {sinceLabel(w.createdAt)}
                </p>
              </div>
              <GhostButton onClick={() => remove(w)}>Supprimer</GhostButton>
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
  if (!s) return <Panel><EmptyLine>Chargement…</EmptyLine></Panel>;
  return (
    <>
      <Panel title="Profil du serveur">
        <Row label="Nom">
          <TextField value={s.name} maxLength={100} width="w-72" onCommit={(v) => save({ name: v })} />
        </Row>
        <Row label="Description" hint={s.premiumTier < 1 ? "Visible dans la découverte (serveurs communautaires)." : undefined}>
          <textarea value={desc} maxLength={120} rows={2} onChange={(e) => setDesc(e.target.value)} onBlur={() => desc !== (s.description ?? "") && save({ description: desc })} aria-label="Description" className={`${INPUT} h-auto py-2`} />
        </Row>
        {s.vanityURLCode && (
          <Row label="Lien personnalisé">
            <code className="text-xs text-[var(--text-muted)]">discord.gg/{s.vanityURLCode}</code>
          </Row>
        )}
      </Panel>
      <Panel title="Modération Discord">
        <Row label="Niveau de vérification" hint="Conditions avant de pouvoir écrire.">
          <select value={s.verificationLevel} onChange={(e) => save({ verificationLevel: Number(e.target.value) })} aria-label="Niveau de vérification" className={SELECT}>
            {VERIFICATION.map((label, i) => (
              <option key={i} value={i}>
                {label}
              </option>
            ))}
          </select>
        </Row>
        <Row label="Filtre de contenu explicite" hint="Images analysées par Discord.">
          <select value={s.explicitContentFilter} onChange={(e) => save({ explicitContentFilter: Number(e.target.value) })} aria-label="Filtre de contenu explicite" className={SELECT}>
            {FILTER.map((label, i) => (
              <option key={i} value={i}>
                {label}
              </option>
            ))}
          </select>
        </Row>
        <Row label="Notifications par défaut">
          <Segmented
            label="Notifications par défaut"
            value={s.defaultMessageNotifications}
            options={[
              [0, "Tous les messages"],
              [1, "Mentions seulement"],
            ]}
            onChange={(v) => save({ defaultMessageNotifications: v })}
          />
        </Row>
      </Panel>
      <Panel title="Salons spéciaux">
        <Row label="Salon système Discord" hint="Messages de bienvenue et de boost de Discord.">
          <ChannelPicker guildId={guildId} value={s.systemChannelId ?? ""} filterTypes={[0]} placeholder="Aucun" onChange={(id) => save({ systemChannelId: id || null })} />
        </Row>
        <Row label="Salon AFK">
          <ChannelPicker guildId={guildId} value={s.afkChannelId ?? ""} filterTypes={[2]} placeholder="Aucun" onChange={(id) => save({ afkChannelId: id || null })} />
        </Row>
        <Row label="Délai d'inactivité AFK">
          <Segmented
            label="Délai AFK"
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
