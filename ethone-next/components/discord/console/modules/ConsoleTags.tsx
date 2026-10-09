"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { confirmDialog } from "@/lib/confirmDialog";
import { SPRING_LAYOUT } from "@/lib/ease";
import { pageStagger } from "@/lib/motion-variants";
import { ConsolePage, EmptyLine, GhostButton, Panel, Row, StatTile, useGuildApi } from "../kit";

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
  const remove = async (t: Tag) => {
    if (!(await confirmDialog(`Supprimer le tag « ${t.name} » ?`, { title: "Supprimer", confirmLabel: "Supprimer" }))) return;
    if (await api(`/tags/${encodeURIComponent(t.name)}`, { method: "DELETE" })) setTags((l) => l?.filter((x) => x.name !== t.name) ?? null);
  };

  const list = tags ?? [];
  const query = q.trim().toLowerCase();
  const shown = list.filter((t) => !query || t.name.includes(query) || t.content.toLowerCase().includes(query)).sort((a, b) => b.uses - a.uses || a.name.localeCompare(b.name));
  const nameTaken = list.some((t) => t.name === newName);
  const canCreate = NAME_RE.test(newName) && !nameTaken && newContent.trim().length > 0 && list.length < MAX_TAGS && !busy;
  const top = [...list].sort((a, b) => b.uses - a.uses)[0];

  return (
    <ConsolePage title="Tags">
      <motion.div variants={pageStagger} className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatTile label="Tags" value={tags ? list.length : "—"} hint={`${MAX_TAGS} au maximum`} />
        <StatTile label="Affichages" value={tags ? list.reduce((n, t) => n + t.uses, 0) : "—"} />
        <StatTile label="Le plus utilisé" value={top && top.uses > 0 ? top.name : "—"} hint={top && top.uses > 0 ? `${top.uses} fois` : undefined} />
      </motion.div>

      <Panel title="Nouveau tag" subtitle="Les membres l'affichent avec /tag get <nom>.">
        <Row label="Nom" hint="Minuscules, chiffres, - et _ (32 caractères).">
          <input
            value={newName}
            maxLength={32}
            onChange={(e) => setNewName(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
            placeholder="regles"
            aria-label="Nom du tag"
            className={`${field} h-9 max-w-xs py-0 font-mono`}
          />
          {nameTaken && <p className="mt-1 text-[11px] text-[var(--warning)]">Ce nom existe déjà : modifie-le dans la liste.</p>}
        </Row>
        <Row label="Contenu" hint="2000 caractères au maximum.">
          <textarea value={newContent} maxLength={2000} rows={3} onChange={(e) => setNewContent(e.target.value)} aria-label="Contenu du tag" className={field} />
        </Row>
        <div className="flex justify-end border-t border-[var(--panel-border)] px-5 py-3">
          <button type="button" disabled={!canCreate} onClick={create} className="rounded-lg bg-[var(--accent-primary)] px-4 py-2 text-xs font-bold text-white hover:opacity-90 disabled:opacity-40">
            Créer le tag
          </button>
        </div>
      </Panel>

      <Panel
        title="Tags du serveur"
        actions={
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher"
            aria-label="Rechercher un tag"
            className="h-8 w-40 rounded-lg border border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))] px-2.5 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]/70"
          />
        }
      >
        {!tags ? (
          <EmptyLine>Chargement…</EmptyLine>
        ) : shown.length === 0 ? (
          <EmptyLine>{list.length === 0 ? "Aucun tag pour l'instant." : "Aucun tag ne correspond."}</EmptyLine>
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
                        <textarea value={draft} maxLength={2000} rows={4} onChange={(e) => setDraft(e.target.value)} aria-label={`Contenu de ${t.name}`} className={field} />
                        <div className="flex items-center gap-1.5">
                          <GhostButton disabled={busy || !draft.trim() || draft === t.content} onClick={() => upsert(t.name, draft.trim()).then((ok) => ok && setOpen(null))}>
                            Enregistrer
                          </GhostButton>
                          <span className="flex-1" />
                          <GhostButton onClick={() => remove(t)}>Supprimer</GhostButton>
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
