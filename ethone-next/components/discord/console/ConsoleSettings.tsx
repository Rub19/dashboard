"use client";

import { useEffect, useState } from "react";
import { Radio } from "@/components/icons/ph";
import ChannelPicker from "../ChannelPicker";
import { useRaidMode } from "@/lib/hooks/useRaidMode";
import { ConsolePage, Panel, Row, Switch, useGuildApi } from "./kit";

type Settings = { prefix: string; systemChannelId: string | null; ownerDmAlerts: boolean; antiRaidEnabled?: boolean };

/** Réglages (format Keeper) : préfixe, salon système, MP au propriétaire, mode raid. Tout est lu et écrit sur le bot. */
export default function ConsoleSettings({ guildId }: { guildId: string }) {
  const api = useGuildApi(guildId);
  const raid = useRaidMode(guildId);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [prefixDraft, setPrefixDraft] = useState("");

  useEffect(() => {
    let cancelled = false;
    api<Settings>("/console/settings").then((s) => {
      if (!cancelled && s) {
        setSettings(s);
        setPrefixDraft(s.prefix);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [api]);

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
    </ConsolePage>
  );
}
