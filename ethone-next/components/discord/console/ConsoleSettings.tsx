"use client";

import { useEffect, useMemo, useState } from "react";
import { Radio } from "@/components/icons/ph";
import ChannelPicker from "../ChannelPicker";
import { useRaidMode } from "@/lib/hooks/useRaidMode";
import { Chip, ConsolePage, EmptyLine, GhostButton, MemberPicker, Panel, RoleChips, Row, Segmented, Switch, useGuildApi, useMemberNames } from "./kit";

type Settings = { prefix: string; systemChannelId: string | null; ownerDmAlerts: boolean; antiRaidEnabled?: boolean };
type Mode = "admins" | "owner" | "custom";
type BotConfig = {
  language: "fr" | "en" | "es" | "de";
  timezone: string;
  emergencyContacts: { mode: Mode; userIds: string[]; roleIds: string[] };
  prefixCommandsEnabled: boolean;
  slashCommandsEnabled: boolean;
};
type Issue = { id: string; title: string; detail: string };

const LANGUAGES: [BotConfig["language"], string][] = [
  ["fr", "🇫🇷 Français"],
  ["en", "🇬🇧 English"],
  ["es", "🇪🇸 Español"],
  ["de", "🇩🇪 Deutsch"],
];
const MODES: [Mode, string][] = [
  ["admins", "Administrateurs"],
  ["owner", "Propriétaire"],
  ["custom", "Membres et rôles choisis"],
];
const PREVIEW_CATEGORIES: [string, string][] = [
  ["", "Tous les messages"],
  ["statuts", "Statuts (succès, erreur…)"],
  ["general", "Général"],
  ["moderation", "Modération"],
  ["niveaux", "Niveaux"],
  ["automod", "AutoMod"],
  ["securite", "Sécurité et urgences"],
];
const SELECT =
  "h-9 rounded-lg border border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]/70";

/** Décalage UTC actuel d'un fuseau, ex. « UTC+02:00 ». */
function offsetLabel(tz: string): string {
  try {
    const part = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "longOffset" }).formatToParts(new Date()).find((x) => x.type === "timeZoneName")?.value ?? "GMT";
    return part === "GMT" ? "UTC+00:00" : part.replace("GMT", "UTC");
  } catch {
    return "";
  }
}

/** Réglages (format Keeper) : préfixe, salon système, MP au propriétaire, langue, fuseau, contacts d'urgence, aperçu des messages, mode raid. Tout est lu et écrit sur le bot. */
type ConfigActions = { onExport?: () => void; onImport?: () => void; onCopyId?: () => void; copiedId?: boolean; onOpenTour?: () => void };

export default function ConsoleSettings({ guildId, onExport, onImport, onCopyId, copiedId, onOpenTour }: { guildId: string } & ConfigActions) {
  const api = useGuildApi(guildId);
  const raid = useRaidMode(guildId);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [prefixDraft, setPrefixDraft] = useState("");
  const [cfg, setCfg] = useState<BotConfig | null>(null);
  const [issues, setIssues] = useState<Issue[] | null>(null);
  const [previewCategory, setPreviewCategory] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api<Settings>("/console/settings").then((s) => {
      if (!cancelled && s) {
        setSettings(s);
        setPrefixDraft(s.prefix);
      }
    });
    api<{ config: BotConfig }>("/settings", { silent: true }).then((r) => {
      if (!cancelled && r) setCfg({ ...r.config, emergencyContacts: r.config.emergencyContacts ?? { mode: "admins", userIds: [], roleIds: [] } });
    });
    api<{ issues: Issue[] }>("/settings/health", { silent: true }).then((r) => !cancelled && setIssues(r?.issues ?? []));
    return () => {
      cancelled = true;
    };
  }, [api]);

  const zones = useMemo(() => {
    let list: string[] = [];
    try {
      list = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.("timeZone") ?? [];
    } catch {
      list = [];
    }
    if (!list.includes("UTC")) list = ["UTC", ...list];
    if (cfg?.timezone && !list.includes(cfg.timezone)) list = [cfg.timezone, ...list];
    return list;
  }, [cfg?.timezone]);
  const contactNames = useMemberNames(guildId, cfg?.emergencyContacts.userIds ?? []);

  const saveCfg = async (patch: Partial<BotConfig>) => {
    const previous = cfg;
    setCfg((c) => (c ? { ...c, ...patch } : c));
    const r = await api<{ config: BotConfig }>("/settings", { method: "PATCH", json: patch });
    if (r) setCfg((c) => (c ? { ...c, ...r.config } : c));
    else setCfg(previous);
  };
  const setContacts = (patch: Partial<BotConfig["emergencyContacts"]>) => cfg && saveCfg({ emergencyContacts: { ...cfg.emergencyContacts, ...patch } });
  const sendTest = async () => {
    setBusy("test");
    const r = await api<{ success: boolean; channel: boolean; dms: number; contacts: number }>("/settings/emergency-test", { method: "POST" });
    setBusy(null);
    if (r)
      setNote(
        r.success
          ? `${r.channel ? "Message posté dans le salon d'alerte. " : "Aucun salon d'alerte utilisable. "}${r.dms} message(s) privé(s) livré(s) sur ${r.contacts} contact(s).`
          : "Personne n'a pu être prévenu : vérifie les permissions d'Etho et les messages privés des contacts."
      );
  };
  const sendPreview = async () => {
    setBusy("preview");
    const r = await api<{ sent: number; total: number; failed?: number; dmClosed?: boolean }>("/settings/preview-messages", { method: "POST", json: { category: previewCategory || undefined } });
    setBusy(null);
    if (r) setNote(r.dmClosed ? "Etho ne peut pas t'écrire : autorise les messages privés des membres de ce serveur." : `${r.sent}/${r.total} message(s) reçu(s) en message privé${r.failed ? ` (${r.failed} en échec)` : ""}.`);
  };

  const save = async (patch: Partial<Settings>) => {
    const previous = settings;
    setSettings((s) => (s ? { ...s, ...patch } : s));
    const next = await api<Settings>("/console/settings", { method: "PATCH", json: patch });
    if (next) setSettings((s) => (s ? { ...s, ...next } : next));
    else {
      setSettings(previous);
      if (previous) setPrefixDraft(previous.prefix);
    }
  };

  const prefix = settings?.prefix ?? "";

  return (
    <ConsolePage title="Réglages">
      <Panel title="Général">
        {!settings ? (
          <p className="px-5 py-6 text-xs text-[var(--text-muted)]">Chargement…</p>
        ) : (
          <>
            <Row label="Préfixe" hint="Pour les commandes texte, en plus des commandes / de Discord.">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  value={prefixDraft}
                  maxLength={5}
                  onChange={(e) => setPrefixDraft(e.target.value.replace(/\s/g, ""))}
                  onBlur={() => prefixDraft && prefixDraft !== prefix && save({ prefix: prefixDraft })}
                  onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                  aria-label="Préfixe"
                  className="h-9 w-24 rounded-lg border border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))] px-3 font-mono text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]/70"
                />
                {["help", "setup", "language"].map((c) => (
                  <code key={c} className="rounded-md bg-[var(--surface-hover)] px-1.5 py-0.5 text-[11px] text-[var(--text-muted)]">
                    {prefix}
                    {c}
                  </code>
                ))}
              </div>
            </Row>
            <Row label="Salon système" hint="Où Etho prévient en cas de souci de permissions ou d'alerte importante.">
              <ChannelPicker
                guildId={guildId}
                value={settings.systemChannelId}
                onChange={(id) => save({ systemChannelId: id || null })}
                filterTypes={[0, 5]}
                allowClear
                emptyLabel="Aucun salon système"
                placeholder="Choisir un salon"
              />
            </Row>
            <Row label="Prévenir le propriétaire en MP" hint="Lors d'un raid ou d'un nuke, au plus un message toutes les 10 minutes.">
              <Switch checked={settings.ownerDmAlerts} onChange={(v) => save({ ownerDmAlerts: v })} label="Prévenir le propriétaire en MP" />
            </Row>
          </>
        )}
      </Panel>

      {issues && issues.length > 0 && (
        <Panel title="Problèmes détectés" subtitle="Etho prévient tes contacts d'urgence tant qu'ils ne sont pas réglés.">
          <ul>
            {issues.map((i) => (
              <li key={i.id} className="border-t border-[var(--panel-border)] px-5 py-3 first:border-t-0">
                <p className="text-[13px] font-semibold text-[var(--danger)]">{i.title}</p>
                <p className="text-[11px] text-[var(--text-muted)]">{i.detail}</p>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <Panel title="Langue et commandes">
        {!cfg ? (
          <EmptyLine>Chargement…</EmptyLine>
        ) : (
          <>
            <Row label="Langue du bot">
              <Segmented label="Langue du bot" value={cfg.language} options={LANGUAGES} onChange={(v) => saveCfg({ language: v })} />
            </Row>
            <Row label="Fuseau horaire" hint="Utilisé pour les rappels, événements et anniversaires.">
              <select value={cfg.timezone} onChange={(e) => saveCfg({ timezone: e.target.value })} aria-label="Fuseau horaire" className={`${SELECT} w-full max-w-sm`}>
                {zones.map((z) => (
                  <option key={z} value={z}>
                    ({offsetLabel(z)}) {z.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </Row>
            <Row label="Commandes /">
              <Switch checked={cfg.slashCommandsEnabled} onChange={(v) => saveCfg({ slashCommandsEnabled: v })} label="Commandes /" />
            </Row>
            <Row label="Commandes à préfixe" hint={`Commandes écrites avec « ${prefix} ».`}>
              <Switch checked={cfg.prefixCommandsEnabled} onChange={(v) => saveCfg({ prefixCommandsEnabled: v })} label="Commandes à préfixe" />
            </Row>
          </>
        )}
      </Panel>

      <Panel title="Contacts d'urgence" subtitle="Mentionnés quand un problème sérieux est détecté (permission manquante, salon supprimé, rôle disparu…).">
        {!cfg ? (
          <EmptyLine>Chargement…</EmptyLine>
        ) : (
          <>
            <Row label="Qui prévenir">
              <Segmented label="Qui prévenir" value={cfg.emergencyContacts.mode} options={MODES} onChange={(v) => setContacts({ mode: v })} />
            </Row>
            {cfg.emergencyContacts.mode === "custom" && (
              <>
                <Row label="Membres" hint="10 au maximum.">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {cfg.emergencyContacts.userIds.map((id) => (
                      <Chip key={id} label={contactNames[id]?.displayName ?? id} onRemove={() => setContacts({ userIds: cfg.emergencyContacts.userIds.filter((x) => x !== id) })} />
                    ))}
                    {cfg.emergencyContacts.userIds.length < 10 && (
                      <MemberPicker guildId={guildId} humansOnly excludeIds={cfg.emergencyContacts.userIds} onPick={(m) => setContacts({ userIds: [...cfg.emergencyContacts.userIds, m.id] })} />
                    )}
                  </div>
                </Row>
                <Row label="Rôles" hint="10 au maximum.">
                  <RoleChips guildId={guildId} ids={cfg.emergencyContacts.roleIds} max={10} onChange={(ids) => setContacts({ roleIds: ids })} />
                </Row>
              </>
            )}
            <Row label="Tester" hint="Montre ce qui est réellement livré : salon d'alerte et messages privés.">
              <GhostButton disabled={busy === "test"} onClick={sendTest}>
                {busy === "test" ? "Envoi…" : "Envoyer un message de test"}
              </GhostButton>
            </Row>
          </>
        )}
      </Panel>

      <Panel title="Aperçu des messages" subtitle="Reçois en message privé un exemplaire des messages d'Etho, avec des données d'exemple. Rien ne change sur le serveur.">
        <Row label="Messages">
          <div className="flex flex-wrap items-center gap-2">
            <select value={previewCategory} onChange={(e) => setPreviewCategory(e.target.value)} aria-label="Messages à recevoir" className={SELECT}>
              {PREVIEW_CATEGORIES.map(([v, label]) => (
                <option key={v} value={v}>
                  {label}
                </option>
              ))}
            </select>
            <GhostButton disabled={busy === "preview"} onClick={sendPreview}>
              {busy === "preview" ? "Envoi…" : "M'envoyer"}
            </GhostButton>
          </div>
        </Row>
      </Panel>

      {note && (
        <Panel>
          <div className="flex items-center justify-between gap-3 px-5 py-3">
            <p className="text-xs text-[var(--text-primary)]">{note}</p>
            <GhostButton onClick={() => setNote(null)}>OK</GhostButton>
          </div>
        </Panel>
      )}

      <Panel title="Urgence">
        <div className="flex items-center gap-4 px-5 py-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-hover)] text-[var(--text-muted)]">
            <Radio className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-[var(--text-primary)]">Mode raid</p>
            <p className="text-xs text-[var(--text-muted)]">
              {raid.active === null
                ? "État inconnu : bot injoignable."
                : raid.active
                  ? "Actif. Le serveur bloque temporairement les arrivées suspectes."
                  : settings?.antiRaidEnabled === false
                    ? "Inactif. Le module Anti-raid est désactivé : Etho ne l'active pas tout seul."
                    : "Inactif. Etho l'active tout seul s'il détecte une attaque."}
            </p>
          </div>
          <Switch checked={raid.active === true} onChange={() => raid.toggle()} disabled={raid.busy || raid.active === null} label="Mode raid" />
        </div>
      </Panel>

      {(onExport || onImport || onCopyId || onOpenTour) && (
        <Panel title="Configuration">
          {(onExport || onImport) && (
            <Row label="Sauvegarde des réglages" hint="Un fichier .json avec la configuration d'Etho sur ce serveur, à réimporter ici ou sur un autre serveur.">
              <div className="flex flex-wrap justify-end gap-2">
                {onExport && <GhostButton onClick={onExport}>Exporter</GhostButton>}
                {onImport && <GhostButton onClick={onImport}>Importer</GhostButton>}
              </div>
            </Row>
          )}
          {onCopyId && (
            <Row label="Identifiant du serveur">
              <div className="flex items-center justify-end gap-2">
                <code className="font-mono text-xs text-[var(--text-muted)]">{guildId}</code>
                <GhostButton onClick={onCopyId}>{copiedId ? "Copié" : "Copier"}</GhostButton>
              </div>
            </Row>
          )}
          {onOpenTour && (
            <Row label="Visite guidée" hint="Revoir la présentation d'Etho et de la console.">
              <div className="flex justify-end">
                <GhostButton onClick={onOpenTour}>Lancer</GhostButton>
              </div>
            </Row>
          )}
        </Panel>
      )}
    </ConsolePage>
  );
}
