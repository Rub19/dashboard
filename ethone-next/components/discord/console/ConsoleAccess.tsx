"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Crown, Minus, Trash2 } from "@/components/icons/ph";
import { confirmDialog } from "@/lib/confirmDialog";
import { SPRING_LAYOUT } from "@/lib/ease";
import { ConsolePage, EmptyLine, MemberPicker, Panel, useGuildApi } from "./kit";

type Level = "owner" | "etho_owner" | "admin";
type Owner = { id: string; username: string; displayName: string; avatarUrl: string; role: "owner" | "etho_owner"; inServer?: boolean };
type Access = { me: Level; owners: Owner[]; matrix: Array<{ action: string; owner: boolean; ethoOwner: boolean; admin: boolean }> };

/** Accès (format Keeper) : owners Etho et tableau « Qui peut faire quoi », tel que le bot l'applique. */
export default function ConsoleAccess({ guildId }: { guildId: string }) {
  const api = useGuildApi(guildId);
  const [data, setData] = useState<Access | null>(null);

  const load = useCallback(async () => {
    const d = await api<Access>("/console/access");
    if (d) setData(d);
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  const canManage = data?.me === "owner";

  const add = async (userId: string) => {
    if (await api("/console/access/owners", { method: "POST", json: { userId } })) void load();
  };
  const remove = async (o: Owner) => {
    if (!(await confirmDialog(`Retirer ${o.displayName} des owners Etho ?`))) return;
    if (await api(`/console/access/owners/${o.id}`, { method: "DELETE" })) void load();
  };

  const mark = (ok: boolean) =>
    ok ? <Check className="mx-auto h-4 w-4 text-[var(--success)]" aria-label="Oui" /> : <Minus className="mx-auto h-4 w-4 text-[var(--text-muted)]" aria-label="Non" />;

  return (
    <ConsolePage title="Accès">
      <div className="grid items-start gap-5 lg:grid-cols-[1fr_20rem]">
        <Panel
          title="Owners Etho"
          actions={
            canManage ? (
              <MemberPicker guildId={guildId} label="Ajouter un owner" humansOnly excludeIds={data?.owners.map((o) => o.id) ?? []} onPick={(m) => add(m.id)} />
            ) : null
          }
        >
          {!data ? (
            <EmptyLine>Chargement…</EmptyLine>
          ) : (
            <ul>
              <AnimatePresence initial={false}>
                {data.owners.map((o) => (
                  <motion.li
                    key={o.id}
                    layout
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={SPRING_LAYOUT}
                    className="flex items-center gap-3 border-t border-[var(--panel-border)] px-5 py-3 first:border-t-0"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={o.avatarUrl} alt="" width={32} height={32} className="h-8 w-8 shrink-0 rounded-full" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-[13px] font-semibold text-[var(--text-primary)]">{o.displayName}</span>
                        {o.role === "owner" ? (
                          <span className="flex items-center gap-1 rounded-md bg-[var(--success)]/15 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--success)]">
                            <Crown className="h-3 w-3" /> Propriétaire
                          </span>
                        ) : (
                          <span className="rounded-md bg-[var(--surface-hover)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--text-muted)]">Owner Etho</span>
                        )}
                      </div>
                      <p className="truncate text-[11px] text-[var(--text-muted)]">
                        {o.role === "owner"
                          ? "Propriétaire du serveur Discord, toujours owner Etho"
                          : o.inServer === false
                            ? "N'est plus sur le serveur"
                            : `@${o.username}`}
                      </p>
                    </div>
                    {canManage && o.role === "etho_owner" && (
                      <button
                        type="button"
                        onClick={() => remove(o)}
                        aria-label={`Retirer ${o.displayName}`}
                        className="rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--danger)]/10 hover:text-[var(--danger)]"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
          {data && !canManage && (
            <p className="border-t border-[var(--panel-border)] px-5 py-3 text-[11px] text-[var(--text-muted)]">Seul le propriétaire du serveur ajoute ou retire des owners.</p>
          )}
        </Panel>

        <Panel title="Qui peut faire quoi">
          {data && (
            <>
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="text-[var(--text-muted)]">
                    <th className="px-4 py-2.5 text-left font-medium" />
                    <th className="px-1 py-2.5 font-medium">Propriétaire</th>
                    <th className="px-1 py-2.5 font-medium">Owner Etho</th>
                    <th className="px-1 py-2.5 font-medium">Admin</th>
                  </tr>
                </thead>
                <tbody>
                  {data.matrix.map((r) => (
                    <tr key={r.action} className="border-t border-[var(--panel-border)]">
                      <td className="px-4 py-2.5 leading-relaxed text-[var(--text-primary)]">{r.action}</td>
                      <td className="px-1 py-2.5">{mark(r.owner)}</td>
                      <td className="px-1 py-2.5">{mark(r.ethoOwner)}</td>
                      <td className="px-1 py-2.5">{mark(r.admin)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="border-t border-[var(--panel-border)] px-4 py-3 text-[11px] leading-relaxed text-[var(--text-muted)]">
                Admin : membre avec la permission Administrateur ou Gérer le serveur sur Discord, sans être owner Etho.
              </p>
            </>
          )}
        </Panel>
      </div>
    </ConsolePage>
  );
}
