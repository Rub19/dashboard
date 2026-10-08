"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Trash2 } from "@/components/icons/ph";
import { useToast } from "@/components/ToastProvider";
import { confirmDialog } from "@/lib/confirmDialog";
import { sinceLabel } from "@/lib/discord/security-scan";
import { SPRING_LAYOUT } from "@/lib/ease";
import { ConsolePage, EmptyLine, MemberPicker, Panel, useGuildApi } from "./kit";

type Entry = { userId: string; reason: string; addedAt: string; name: string; username: string | null; avatarUrl: string | null };

/** Blacklist (format Keeper) : banni tout de suite s'il est sur le serveur, puis à chaque retour. */
export default function ConsoleBlacklist({ guildId }: { guildId: string }) {
  const api = useGuildApi(guildId);
  const { success, info } = useToast();
  const [entries, setEntries] = useState<Entry[] | null>(null);

  const load = useCallback(async () => {
    const d = await api<{ entries: Entry[] }>("/console/blacklist");
    if (d) setEntries(d.entries);
  }, [api]);
  useEffect(() => {
    void load();
  }, [load]);

  const add = async (userId: string, name: string) => {
    if (!(await confirmDialog(`Blacklister ${name} ? Il sera banni tout de suite, puis à chaque retour.`))) return;
    const r = await api<{ banned: boolean }>("/console/blacklist", { method: "POST", json: { userId } });
    if (!r) return;
    if (r.banned) success("Blacklist", `${name} est banni.`);
    else info("Blacklist", `${name} est blacklisté, mais Etho n'a pas pu le bannir (permission « Bannir » ou rôle trop bas).`);
    void load();
  };
  const remove = async (e: Entry) => {
    if (!(await confirmDialog(`Retirer ${e.name} de la blacklist ? Un ban déjà posé reste en place sur Discord.`))) return;
    if (await api(`/console/blacklist/${e.userId}`, { method: "DELETE" })) void load();
  };

  return (
    <ConsolePage title="Blacklist">
      <Panel
        title="Comptes blacklistés"
        subtitle="Banni tout de suite s'il est sur le serveur, puis à chaque retour."
        actions={<MemberPicker guildId={guildId} excludeIds={entries?.map((e) => e.userId) ?? []} onPick={(m) => add(m.id, m.displayName)} />}
      >
        {!entries ? (
          <EmptyLine>Chargement…</EmptyLine>
        ) : entries.length === 0 ? (
          <EmptyLine>Personne n&apos;est blacklisté sur ce serveur.</EmptyLine>
        ) : (
          <ul>
            <AnimatePresence initial={false}>
              {entries.map((e) => (
                <motion.li
                  key={e.userId}
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
                    <span className="h-7 w-7 shrink-0 rounded-full bg-[var(--surface-hover)]" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-[var(--text-primary)]">{e.name}</p>
                    <p className="truncate text-[11px] text-[var(--text-muted)]">
                      {e.username ? `@${e.username} · ` : ""}ID {e.userId} · ajouté {sinceLabel(e.addedAt)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(e)}
                    aria-label={`Retirer ${e.name}`}
                    className="rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--danger)]/10 hover:text-[var(--danger)]"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </Panel>
    </ConsolePage>
  );
}
