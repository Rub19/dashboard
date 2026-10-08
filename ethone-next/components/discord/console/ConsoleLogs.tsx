"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Bell, Zap } from "@/components/icons/ph";
import ChannelPicker from "../ChannelPicker";
import { cleanLogText, sinceLabel } from "@/lib/discord/security-scan";
import { SPRING_PILL } from "@/lib/ease";
import { cn } from "@/lib/utils";
import { ConsolePage, EmptyLine, Panel, useGuildApi } from "./kit";

type AuditEvent = {
  id: string;
  module: string;
  type: string;
  severity: string;
  actor?: { id: string; tag?: string };
  target?: { id: string; name?: string; tag?: string };
  reason?: string;
  timestamp: string;
};
type LogConfig = { categoryChannels?: Record<string, string | null>; routing?: Record<string, string | null> };

/** Catégories de journal du bot : celles où les protections écrivent, puis le journal du serveur. */
const PROTECTION_CATEGORIES = [
  { key: "MODERATION", label: "Modération et protections", hint: "Anti-raid, anti-nuke, AutoMod et sanctions" },
  { key: "SECURITY", label: "Sécurité" },
  { key: "RAID", label: "Détection de raid" },
  { key: "AUTOMOD", label: "AutoMod" },
];
const SERVER_CATEGORIES = [
  { key: "MEMBERS", label: "Membres" },
  { key: "MESSAGES", label: "Messages" },
  { key: "ROLES", label: "Rôles" },
  { key: "CHANNELS", label: "Salons" },
  { key: "SERVER", label: "Serveur" },
  { key: "VOICE", label: "Vocal" },
  { key: "WEBHOOKS", label: "Webhooks" },
  { key: "BOTS", label: "Bots" },
  { key: "EMOJIS", label: "Emojis" },
  { key: "THREADS", label: "Fils" },
  { key: "INVITES", label: "Invitations" },
  { key: "SYSTEM", label: "Système" },
];
const INCIDENT_MODULES = ["SECURITY", "AUTOMOD", "MODERATION"];
const SEVERITY_COLOR: Record<string, string> = { CRITICAL: "var(--danger)", HIGH: "var(--danger)", MEDIUM: "var(--warning)", LOW: "var(--text-muted)", INFO: "var(--text-muted)" };

/** Logs (format Keeper) : incidents des protections et salons de log par catégorie, lus et écrits sur le bot. */
export default function ConsoleLogs({ guildId, initialTab = "incidents" }: { guildId: string; initialTab?: "incidents" | "channels" }) {
  const api = useGuildApi(guildId);
  const [tab, setTab] = useState<"incidents" | "channels">(initialTab);
  const [events, setEvents] = useState<AuditEvent[] | null>(null);
  const [config, setConfig] = useState<LogConfig | null>(null);
  const [gap, setGap] = useState<string[]>([]);
  const [bulkChannel, setBulkChannel] = useState("");

  const loadConfig = useCallback(async () => {
    const [c, cov] = await Promise.all([
      api<{ config: LogConfig }>("/logs/config", { silent: true }),
      api<{ withoutChannel: string[] }>("/server/log-coverage", { silent: true }),
    ]);
    if (c?.config) setConfig(c.config);
    setGap(cov?.withoutChannel ?? []);
  }, [api]);

  useEffect(() => {
    void loadConfig();
    let cancelled = false;
    Promise.all(INCIDENT_MODULES.map((m) => api<{ events: AuditEvent[] }>(`/logs/events?module=${m}&limit=40`, { silent: true }))).then((lists) => {
      if (cancelled) return;
      const all = lists.flatMap((l) => l?.events ?? []).filter((e) => e.module !== "MODERATION" || /SANCTION|RAID|NUKE|AUTOMOD/.test(e.type));
      all.sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
      setEvents(all.slice(0, 60));
    });
    return () => {
      cancelled = true;
    };
  }, [api, loadConfig]);

  const channels = useMemo(() => config?.categoryChannels ?? {}, [config]);
  const effective = (key: string) => channels[key] || (key === "MODERATION" ? config?.routing?.moderationChannelId : null) || null;

  const setCategory = async (key: string, id: string | null) => {
    const next = { ...channels, [key]: id };
    setConfig((c) => (c ? { ...c, categoryChannels: next } : c));
    if (await api("/logs/config", { method: "PATCH", json: { categoryChannels: next } })) void loadConfig();
  };

  const applyBulk = async () => {
    if (!bulkChannel) return;
    if (await api("/logs/config", { method: "PATCH", json: { enabled: true, routing: { ...(config?.routing ?? {}), moderationChannelId: bulkChannel } } })) {
      setBulkChannel("");
      void loadConfig();
    }
  };

  const tabs = [
    { id: "incidents" as const, label: "Incidents" },
    { id: "channels" as const, label: "Salons de log", count: gap.length || undefined },
  ];

  return (
    <ConsolePage
      title="Logs"
      actions={
        <div role="tablist" className="flex rounded-lg border border-[var(--panel-border)] p-0.5">
          {tabs.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={cn("relative rounded-md px-3 py-1.5 text-xs font-semibold transition-colors", tab === t.id ? "text-[var(--text-primary)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]")}
            >
              {tab === t.id && <motion.span layoutId="logs-tab" transition={SPRING_PILL} className="absolute inset-0 rounded-md bg-[var(--surface-hover)]" />}
              <span className="relative">
                {t.label}
                {t.count ? <span className="ml-1.5 font-mono text-[10px] text-[var(--warning)]">{t.count}</span> : null}
              </span>
            </button>
          ))}
        </div>
      }
    >
      {tab === "incidents" ? (
        <Panel>
          {events === null ? (
            <EmptyLine>Chargement…</EmptyLine>
          ) : events.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-5 py-12 text-center">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--surface-hover)] text-[var(--text-muted)]">
                <Bell className="h-4 w-4" />
              </span>
              <p className="text-sm font-semibold text-[var(--text-primary)]">Aucun incident</p>
              <p className="max-w-sm text-xs text-[var(--text-muted)]">Chaque fois qu&apos;une protection se déclenche, elle apparaît ici avec l&apos;auteur, la cible et la raison.</p>
            </div>
          ) : (
            <ul>
              {events.map((e) => (
                <li key={e.id} className="flex items-start gap-3 border-t border-[var(--panel-border)] px-5 py-3 first:border-t-0">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: SEVERITY_COLOR[e.severity] ?? "var(--text-muted)" }} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-[var(--text-primary)]">{cleanLogText(e.reason || e.type.replace(/_/g, " ").toLowerCase())}</p>
                    <p className="truncate text-[11px] text-[var(--text-muted)]">
                      {e.actor?.tag ? `Par ${e.actor.tag}` : "Par Etho"}
                      {e.target?.tag || e.target?.name ? ` · Cible : ${e.target.tag || e.target.name}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 text-[11px] text-[var(--text-muted)]">{sinceLabel(e.timestamp)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      ) : (
        <div className="space-y-5">
          {gap.length > 0 && (
            <div className="flex flex-col gap-3 rounded-xl border border-[var(--warning)]/30 bg-[var(--warning)]/[0.06] p-4 sm:flex-row sm:items-center">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--warning)]/15 text-[var(--warning)]">
                <AlertTriangle className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-[var(--text-primary)]">
                  {gap.length} protection{gap.length > 1 ? "s" : ""} sans salon de log
                </p>
                <p className="text-xs text-[var(--text-muted)]">Choisis un salon pour toutes les équiper d&apos;un coup ({gap.join(", ")}).</p>
              </div>
              <div className="flex items-center gap-2 sm:w-80">
                <div className="flex-1">
                  <ChannelPicker guildId={guildId} value={bulkChannel} onChange={(id) => setBulkChannel(id)} filterTypes={[0, 5]} placeholder="Choisir un salon" size="sm" />
                </div>
                <button
                  type="button"
                  onClick={applyBulk}
                  disabled={!bulkChannel}
                  className="flex shrink-0 items-center gap-1 rounded-lg bg-[var(--success)] px-3 py-1.5 text-xs font-semibold text-black transition-[filter,transform] hover:brightness-110 active:scale-[0.97] disabled:opacity-40"
                >
                  <Zap className="h-3.5 w-3.5" /> Appliquer
                </button>
              </div>
            </div>
          )}

          {[
            { title: "Protections", list: PROTECTION_CATEGORIES },
            { title: "Journal du serveur", list: SERVER_CATEGORIES },
          ].map((group) => (
            <Panel key={group.title} title={group.title}>
              {!config ? (
                <EmptyLine>Chargement…</EmptyLine>
              ) : (
                group.list.map((c) => {
                  const current = effective(c.key);
                  return (
                    <div key={c.key} className="flex items-center gap-3 border-t border-[var(--panel-border)] px-5 py-2.5 first:border-t-0">
                      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", current ? "bg-[var(--success)]" : "bg-[var(--warning)]")} />
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium text-[var(--text-primary)]">{c.label}</p>
                        {(c as { hint?: string }).hint && <p className="text-[11px] text-[var(--text-muted)]">{(c as { hint?: string }).hint}</p>}
                      </div>
                      <div className="w-56 shrink-0">
                        <ChannelPicker
                          guildId={guildId}
                          value={channels[c.key] ?? ""}
                          onChange={(id) => setCategory(c.key, id || null)}
                          filterTypes={[0, 5]}
                          allowClear
                          emptyLabel="Aucun salon"
                          placeholder={current && !channels[c.key] ? "Salon de modération" : "Aucun salon"}
                          size="sm"
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </Panel>
          ))}
        </div>
      )}
    </ConsolePage>
  );
}
