"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import ChannelPicker from "../../ChannelPicker";
import { confirmDialog } from "@/lib/confirmDialog";
import { SPRING_LAYOUT } from "@/lib/ease";
import { pageStagger } from "@/lib/motion-variants";
import { useToast } from "@/components/ToastProvider";
import { ConsolePage, EmptyLine, GhostButton, Panel, Row, StatTile, useGuildApi } from "../kit";
import { tx } from "@/lib/tx";

type Tag = { name: string; content: string; uses: number; updatedAt: string };

const NAME_RE = /^[a-z0-9_-]{1,32}$/;
const MAX_TAGS = 200;
const field =
  "w-full rounded-lg border border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]/70";

/** Tags (format Keeper) : réponses réutilisables affichées avec /tag. */
export default function ConsoleTags({ guildId }: { guildId: string }) {
  const api = useGuildApi(guildId);
  const [tags, setTags] = useState<Tag[] | null>(null);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [newName, setNewName] = useState("");
  const [newContent, setNewContent] = useState("");
  const [busy, setBusy] = useState(false);
  const { success: toastSuccess } = useToast();
  const [testChannel, setTestChannel] = useState("");
  const [testingTag, setTestingTag] = useState(false);

  const load = useCallback(async () => {
    const r = await api<{ tags: Tag[] }>("/tags/list");
    setTags(r?.tags ?? []);
  }, [api]);
  useEffect(() => {
    void load();
  }, [load]);

  const upsert = async (name: string, content: string) => {
    setBusy(true);
    const r = await api<{ tag: Tag }>(`/tags/${encodeURIComponent(name)}`, { method: "PUT", json: { content } });
    setBusy(false);
    if (!r) return false;
    setTags((l) => {
      const rest = (l ?? []).filter((t) => t.name !== r.tag.name);
      return [...rest, r.tag];
    });
    return true;
  };
  const create = async () => {
    if (await upsert(newName, newContent.trim())) {
      setNewName("");
      setNewContent("");
    }
  };
  const sendTestTag = async (tagName: string) => {
    if (!testChannel) return;
    setTestingTag(true);
    const r = await api<{ success: boolean; channelName: string }>(`/tags/${encodeURIComponent(tagName)}/test`, {
      method: "POST",
      json: { channelId: testChannel },
    });
    setTestingTag(false);
    if (r?.success) {
      toastSuccess("Tags", `Tag "${tagName}" envoyé dans #${r.channelName} !`);
    }
  };
  const remove = async (t: Tag) => {
    if (!(await confirmDialog(tx("Supprimer le tag « {name} » ?", { name: t.name }), { title: tx("Supprimer"), confirmLabel: tx("Supprimer") }))) return;
    if (await api(`/tags/${encodeURIComponent(t.name)}`, { method: "DELETE" })) setTags((l) => l?.filter((x) => x.name !== t.name) ?? null);
  };

  const list = tags ?? [];
  const query = q.trim().toLowerCase();
  const shown = list.filter((t) => !query || t.name.includes(query) || t.content.toLowerCase().includes(query)).sort((a, b) => b.uses - a.uses || a.name.localeCompare(b.name));
  const nameTaken = list.some((t) => t.name === newName);
  const canCreate = NAME_RE.test(newName) && !nameTaken && newContent.trim().length > 0 && list.length < MAX_TAGS && !busy;
  const top = [...list].sort((a, b) => b.uses - a.uses)[0];

  return (
    <ConsolePage title={tx("Tags")}>
      <motion.div variants={pageStagger} className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatTile label={tx("Tags")} value={tags ? list.length : "—"} hint={tx("{MAX_TAGS} au maximum", { MAX_TAGS })} />
        <StatTile label={tx("Affichages")} value={tags ? list.reduce((n, t) => n + t.uses, 0) : "—"} />
        <StatTile label={tx("Le plus utilisé")} value={top && top.uses > 0 ? top.name : "—"} hint={top && top.uses > 0 ? tx("{uses} fois", { uses: top.uses }) : undefined} />
      </motion.div>

      <Panel title={tx("Nouveau tag")} subtitle={tx("Les membres l'affichent avec /tag get <nom>.")}>
        <Row label={tx("Nom")} hint={tx("Minuscules, chiffres, - et _ (32 caractères).")}>
          <input
            value={newName}
            maxLength={32}
            onChange={(e) => setNewName(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
            placeholder="regles"
            aria-label={tx("Nom du tag")}
            className={`${field} h-9 max-w-xs py-0 font-mono`}
          />
          {nameTaken && <p className="mt-1 text-[11px] text-[var(--warning)]">{tx("Ce nom existe déjà : modifie-le dans la liste.")}</p>}
        </Row>
        <Row label={tx("Contenu")} hint={tx("2000 caractères au maximum.")}>
          <textarea value={newContent} maxLength={2000} rows={3} onChange={(e) => setNewContent(e.target.value)} aria-label={tx("Contenu du tag")} className={field} />
        </Row>
        {newContent.trim() && (
          <div className="mx-5 mb-3 rounded-lg border border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))] p-3">
            <div className="mb-1.5 flex items-center gap-1.5">
              <span className="text-xs font-semibold text-[var(--text-primary)]">{tx("Etho")}</span>
              <span className="rounded bg-[var(--accent-primary)]/20 px-1 py-0.5 text-[9px] font-bold text-[var(--accent-primary)]">{tx("BOT")}</span>
              <span className="font-mono text-[11px] text-[var(--text-muted)]">{tx("/tag get")}{" "} {newName || "exemple"}</span>
            </div>
            <p className="whitespace-pre-wrap text-xs text-[var(--text-primary)]">{newContent}</p>
          </div>
        )}
        <div className="flex justify-end border-t border-[var(--panel-border)] px-5 py-3">
          <button type="button" disabled={!canCreate} onClick={create} className="rounded-lg bg-[var(--accent-primary)] px-4 py-2 text-xs font-bold text-white hover:opacity-90 disabled:opacity-40">
            {tx("Créer le tag")}
          </button>
        </div>
      </Panel>

      <Panel
        title={tx("Tags du serveur")}
        actions={
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={tx("Rechercher")}
            aria-label={tx("Rechercher un tag")}
            className="h-8 w-40 rounded-lg border border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))] px-2.5 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]/70"
          />
        }
      >
        {!tags ? (
          <EmptyLine>{tx("Chargement…")}</EmptyLine>
        ) : shown.length === 0 ? (
          <EmptyLine>{list.length === 0 ? tx("Aucun tag pour l'instant.") : tx("Aucun tag ne correspond.")}</EmptyLine>
        ) : (
          <ul>
            {shown.map((t) => (
              <li key={t.name} className="border-t border-[var(--panel-border)] first:border-t-0">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(open === t.name ? null : t.name);
                    setDraft(t.content);
                  }}
                  aria-expanded={open === t.name}
                  className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-[var(--surface-hover)]"
                >
                  <span className="w-12 shrink-0 text-center text-xs font-semibold tabular-nums text-[var(--text-muted)]">{t.uses}×</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-[13px] font-semibold text-[var(--text-primary)]">{t.name}</p>
                    <p className="truncate text-[11px] text-[var(--text-muted)]">{t.content}</p>
                  </div>
                </button>
                <AnimatePresence initial={false}>
                  {open === t.name && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={SPRING_LAYOUT} className="overflow-hidden">
                      <div className="space-y-3 border-t border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))]/40 px-5 py-4">
                        <textarea value={draft} maxLength={2000} rows={4} onChange={(e) => setDraft(e.target.value)} aria-label={tx("Contenu de {name}", { name: t.name })} className={field} />
                        <div className="rounded-lg border border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))] p-3">
                          <div className="mb-1.5 flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-[var(--text-primary)]">{tx("Etho")}</span>
                            <span className="rounded bg-[var(--accent-primary)]/20 px-1 py-0.5 text-[9px] font-bold text-[var(--accent-primary)]">{tx("BOT")}</span>
                            <span className="font-mono text-[11px] text-[var(--text-muted)]">{tx("/tag get")}{" "} {t.name}</span>
                          </div>
                          <p className="whitespace-pre-wrap text-xs text-[var(--text-primary)]">{draft || tx("Contenu du tag…")}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <div className="w-56">
                            <ChannelPicker guildId={guildId} value={testChannel} filterTypes={[0, 5]} placeholder={tx("Salon de test")} onChange={(id) => setTestChannel(id)} />
                          </div>
                          <GhostButton disabled={testingTag || !testChannel} onClick={() => sendTestTag(t.name)}>
                            {testingTag ? tx("Envoi…") : tx("Tester l'envoi")}
                          </GhostButton>
                          <span className="flex-1" />
                          <GhostButton disabled={busy || !draft.trim() || draft === t.content} onClick={() => upsert(t.name, draft.trim()).then((ok) => ok && setOpen(null))}>
                            {tx("Enregistrer")}
                          </GhostButton>
                          <GhostButton onClick={() => remove(t)}>{tx("Supprimer")}</GhostButton>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </ConsolePage>
  );
}
