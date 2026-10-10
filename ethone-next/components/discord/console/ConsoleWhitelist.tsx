"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Trash2 } from "@/components/icons/ph";

import { SPRING_LAYOUT } from "@/lib/ease";
import { ConsolePage, EmptyLine, MemberPicker, Panel, RoleAdder, useGuildApi } from "./kit";


type Entry = { id: string; kind: "user" | "role"; name: string; color: string | null; avatarUrl: string | null; bot: boolean };
type Scope = "global" | "anti-raid" | "anti-nuke";
type Data = { global: Entry[]; perProtection: Array<{ protection: Scope; label: string; entries: Entry[] }> };

/**
 * Whitelist (format Keeper). « Globale » = ignoré par les protections et par l'anti-raid ; « Par protection » =
 * exempté d'un seul des deux (la liste « anti-nuke » du bot est celle que lisent les protections). Les entrées sont lues et écrites dans les listes de confiance du bot.
 */
export default function ConsoleWhitelist({ guildId }: { guildId: string }) {
  const api = useGuildApi(guildId);
  const [data, setData] = useState<Data | null>(null);

  const load = useCallback(async () => {
    const d = await api<Data>("/console/whitelist");
    if (d) setData(d);
  }, [api]);
  useEffect(() => {
    void load();
  }, [load]);

  const add = async (id: string, kind: Entry["kind"], scope: Scope) => {
    if (await api("/console/whitelist", { method: "POST", json: { id, kind, scope } })) void load();
  };
  const remove = async (e: Entry, scope: Scope) => {
    if (await api(`/console/whitelist/${e.id}?kind=${e.kind}&scope=${scope}`, { method: "DELETE" })) void load();
  };

  const allIds = [...(data?.global ?? []), ...(data?.perProtection.flatMap((p) => p.entries) ?? [])].map((e) => e.id);

  const list = (entries: Entry[], scope: Scope, empty: string) =>
    entries.length === 0 ? (
      <EmptyLine>{empty}</EmptyLine>
    ) : (
      <ul>
        <AnimatePresence initial={false}>
          {entries.map((e) => (
            <motion.li
              key={`${scope}-${e.id}`}
              layout
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              transition={SPRING_LAYOUT}
              className="flex items-center gap-3 border-t border-[var(--panel-border)] px-5 py-2.5 first:border-t-0"
            >
              {e.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={e.avatarUrl} alt="" width={28} height={28} className="h-7 w-7 shrink-0 rounded-full" />
              ) : (
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--surface-hover)] text-[11px] font-bold" style={{ color: e.color ?? "var(--text-muted)" }}>
                  @
                </span>
              )}
              <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-[var(--text-primary)]">{e.name}</span>
              <span className="shrink-0 rounded-md bg-[var(--surface-hover)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--text-muted)]">
                {e.kind === "role" ? "Rôle" : e.bot ? "Bot" : "Membre"}
              </span>
              <button
                type="button"
                onClick={() => remove(e, scope)}
                aria-label={`Retirer ${e.name}`}
                className="rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--danger)]/10 hover:text-[var(--danger)]"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    );

  const adders = (scope: Scope) => (
    <div className="flex items-center gap-2">
      <RoleAdder guildId={guildId} excludeIds={allIds} onPick={(r) => add(r.id, "role", scope)} />
      <MemberPicker guildId={guildId} label="Membre" excludeIds={allIds} onPick={(m) => add(m.id, "user", scope)} />
    </div>
  );

  return (
    <ConsolePage title="Whitelist">
      <Panel title="Whitelist globale" subtitle="Ignorés par les protections et par l'anti-raid (arrivées en masse)." actions={adders("global")}>
        {!data ? <EmptyLine>Chargement…</EmptyLine> : list(data.global, "global", "Personne pour l'instant. Ajoute tes bots de confiance pour qu'ils ne soient jamais sanctionnés.")}
      </Panel>
      <Panel title="Par protection" subtitle="Exemptés d'une seule des deux listes. Une protection peut aussi avoir sa propre whitelist (page Protections).">
        {!data ? (
          <EmptyLine>Chargement…</EmptyLine>
        ) : (
          data.perProtection.map((p) => (
            <div key={p.protection} className="border-t border-[var(--panel-border)] first:border-t-0">
              <div className="flex items-center justify-between gap-3 px-5 py-3">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">{p.label}</span>
                {adders(p.protection)}
              </div>
              {list(p.entries, p.protection, `Aucune exemption propre à : ${p.label}.`)}
            </div>
          ))
        )}
      </Panel>
    </ConsolePage>
  );
}
