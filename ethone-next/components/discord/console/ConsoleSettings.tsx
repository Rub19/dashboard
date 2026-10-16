"use client";

import { useEffect, useMemo, useState } from "react";
import { Radio } from "@/components/icons/ph";
import ChannelPicker from "../ChannelPicker";
import { useRaidMode } from "@/lib/hooks/useRaidMode";
import { Chip, ConsolePage, EmptyLine, GhostButton, MemberPicker, Panel, RoleChips, Row, Segmented, Select, Switch, useGuildApi, useMemberNames } from "./kit";
import { tx } from "@/lib/tx";

type Settings = { prefix: string; systemChannelId: string | null; ownerDmAlerts: boolean; weeklyReport?: boolean; antiRaidEnabled?: boolean };
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
    <ConsolePage title={tx("Réglages")}>
      <Panel title={tx("Général")}>
        {!settings ? (
          <p className="px-5 py-6 text-xs text-[var(--text-muted)]">{tx("Chargement…")}</p>
        ) : (
          <>
            <Row label={tx("Préfixe")} hint={tx("Pour les commandes texte, en plus des commandes / de Discord.")}>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  value={prefixDraft}
                  maxLength={5}
                  onChange={(e) => setPrefixDraft(e.target.value.replace(/\s/g, ""))}
                  onBlur={() => prefixDraft && prefixDraft !== prefix && save({ prefix: prefixDraft })}
                  onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                  aria-label={tx("Préfixe")}
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
            <Row label={tx("Salon système")} hint={tx("Où Etho prévient en cas de souci de permissions ou d'alerte importante.")}>
              <ChannelPicker
                guildId={guildId}
                value={settings.systemChannelId}
                onChange={(id) => save({ systemChannelId: id || null })}
                filterTypes={[0, 5]}
                allowClear
                emptyLabel={tx("Aucun salon système")}
                placeholder={tx("Choisir un salon")}
              />
            </Row>
            <Row label={tx("Prévenir le propriétaire en MP")} hint={tx("Lors d'un raid ou d'un nuke, au plus un message toutes les 10 minutes.")}>
              <Switch checked={settings.ownerDmAlerts} onChange={(v) => save({ ownerDmAlerts: v })} label={tx("Prévenir le propriétaire en MP")} />
            </Row>
            <Row label={tx("Rapport de sécurité hebdomadaire")} hint={tx("Chaque lundi, le propriétaire reçoit en MP : incidents de la semaine, protections actives, rôles au-dessus d'Etho et permissions manquantes.")}>
              <Switch checked={Boolean(settings.weeklyReport)} onChange={(v) => save({ weeklyReport: v })} label={tx("Rapport de sécurité hebdomadaire")} />
            </Row>
          </>
        )}
      </Panel>

      {issues && issues.length > 0 && (
        <Panel title={tx("Problèmes détectés")} subtitle={tx("Etho prévient tes contacts d'urgence tant qu'ils ne sont pas réglés.")}>
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

      <Panel title={tx("Langue et commandes")}>
        {!cfg ? (
          <EmptyLine>{tx("Chargement…")}</EmptyLine>
        ) : (
          <>
            <Row label={tx("Langue du bot")}>
              <Segmented label={tx("Langue du bot")} value={cfg.language} options={LANGUAGES} onChange={(v) => saveCfg({ language: v })} />
            </Row>
            <Row label={tx("Fuseau horaire")} hint={tx("Utilisé pour les rappels, événements et anniversaires.")}>
              <Select
                value={cfg.timezone}
                options={zones.map((z) => [z, `(${offsetLabel(z)}) ${z.replace(/_/g, " ")}`] as const)}
                onChange={(v) => saveCfg({ timezone: v })}
                aria-label={tx("Fuseau horaire")}
                width="w-full max-w-sm"
              />
            </Row>
            <Row label={tx("Commandes /")}>
              <Switch checked={cfg.slashCommandsEnabled} onChange={(v) => saveCfg({ slashCommandsEnabled: v })} label={tx("Commandes /")} />
            </Row>
            <Row label={tx("Commandes à préfixe")} hint={tx("Commandes écrites avec « {prefix} ».", { prefix })}>
              <Switch checked={cfg.prefixCommandsEnabled} onChange={(v) => saveCfg({ prefixCommandsEnabled: v })} label={tx("Commandes à préfixe")} />
            </Row>
          </>
        )}
      </Panel>

      <Panel title={tx("Contacts d'urgence")} subtitle={tx("Mentionnés quand un problème sérieux est détecté (permission manquante, salon supprimé, rôle disparu…).")}>
        {!cfg ? (
          <EmptyLine>{tx("Chargement…")}</EmptyLine>
        ) : (
          <>
            <Row label={tx("Qui prévenir")}>
              <Segmented label={tx("Qui prévenir")} value={cfg.emergencyContacts.mode} options={MODES} onChange={(v) => setContacts({ mode: v })} />
            </Row>
            {cfg.emergencyContacts.mode === "custom" && (
              <>
                <Row label={tx("Membres")} hint={tx("10 au maximum.")}>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {cfg.emergencyContacts.userIds.map((id) => (
                      <Chip key={id} label={contactNames[id]?.displayName ?? id} onRemove={() => setContacts({ userIds: cfg.emergencyContacts.userIds.filter((x) => x !== id) })} />
                    ))}
                    {cfg.emergencyContacts.userIds.length < 10 && (
                      <MemberPicker guildId={guildId} humansOnly excludeIds={cfg.emergencyContacts.userIds} onPick={(m) => setContacts({ userIds: [...cfg.emergencyContacts.userIds, m.id] })} />
                    )}
                  </div>
                </Row>
                <Row label={tx("Rôles")} hint={tx("10 au maximum.")}>
                  <RoleChips guildId={guildId} ids={cfg.emergencyContacts.roleIds} max={10} onChange={(ids) => setContacts({ roleIds: ids })} />
                </Row>
              </>
            )}
            <Row label={tx("Tester")} hint={tx("Montre ce qui est réellement livré : salon d'alerte et messages privés.")}>
              <GhostButton disabled={busy === "test"} onClick={sendTest}>
                {busy === "test" ? tx("Envoi…") : tx("Envoyer un message de test")}
              </GhostButton>
            </Row>
          </>
        )}
      </Panel>

      <Panel title={tx("Aperçu des messages")} subtitle={tx("Reçois en message privé un exemplaire des messages d'Etho, avec des données d'exemple. Rien ne change sur le serveur.")}>
        <Row label={tx("Messages")}>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={previewCategory} options={PREVIEW_CATEGORIES} onChange={(v) => setPreviewCategory(v)} aria-label={tx("Messages à recevoir")} />
            <GhostButton disabled={busy === "preview"} onClick={sendPreview}>
              {busy === "preview" ? tx("Envoi…") : tx("M'envoyer")}
            </GhostButton>
          </div>
        </Row>
      </Panel>

      {note && (
        <Panel>
          <div className="flex items-center justify-between gap-3 px-5 py-3">
            <p className="text-xs text-[var(--text-primary)]">{note}</p>
            <GhostButton onClick={() => setNote(null)}>{tx("OK")}</GhostButton>
          </div>
        </Panel>
      )}

      <Panel title={tx("Urgence")}>
        <div className="flex items-center gap-4 px-5 py-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-hover)] text-[var(--text-muted)]">
            <Radio className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-[var(--text-primary)]">{tx("Mode raid")}</p>
            <p className="text-xs text-[var(--text-muted)]">
              {raid.active === null
                ? tx("État inconnu : bot injoignable.")
                : raid.active
                  ? tx("Actif. Le serveur bloque temporairement les arrivées suspectes.")
                  : settings?.antiRaidEnabled === false
                    ? tx("Inactif. Le module Anti-raid est désactivé : Etho ne l'active pas tout seul.")
                    : tx("Inactif. Etho l'active tout seul s'il détecte une attaque.")}
            </p>
          </div>
          <Switch checked={raid.active === true} onChange={() => raid.toggle()} disabled={raid.busy || raid.active === null} label={tx("Mode raid")} />
        </div>
      </Panel>

      {(onExport || onImport || onCopyId || onOpenTour) && (
        <Panel title={tx("Configuration")}>
          {(onExport || onImport) && (
            <Row label={tx("Sauvegarde des réglages")} hint={tx("Un fichier .json avec la configuration d'Etho sur ce serveur, à réimporter ici ou sur un autre serveur.")}>
              <div className="flex flex-wrap justify-end gap-2">
                {onExport && <GhostButton onClick={onExport}>{tx("Exporter")}</GhostButton>}
                {onImport && <GhostButton onClick={onImport}>{tx("Importer")}</GhostButton>}
              </div>
            </Row>
          )}
          {onCopyId && (
            <Row label={tx("Identifiant du serveur")}>
              <div className="flex items-center justify-end gap-2">
                <code className="font-mono text-xs text-[var(--text-muted)]">{guildId}</code>
                <GhostButton onClick={onCopyId}>{copiedId ? tx("Copié") : tx("Copier")}</GhostButton>
              </div>
            </Row>
          )}
          {onOpenTour && (
            <Row label={tx("Visite guidée")} hint={tx("Revoir la présentation d'Etho et de la console.")}>
              <div className="flex justify-end">
                <GhostButton onClick={onOpenTour}>{tx("Lancer")}</GhostButton>
              </div>
            </Row>
          )}
        </Panel>
      )}
    </ConsolePage>
  );
}
