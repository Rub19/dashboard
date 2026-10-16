"use client";

import { useState, type KeyboardEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Trash2, X } from "lucide-react";
import { confirmDialog } from "@/lib/confirmDialog";
import { SPRING_LAYOUT, SPRING_PILL } from "@/lib/ease";
import { pageStagger, staggerItem } from "@/lib/motion-variants";
import { cn } from "@/lib/utils";
import { ConsolePage, EmptyLine, Panel, RoleChips, Row, Segmented, Select } from "../kit";
import { ACTION_LABEL, ACTION_TONE, DURATIONS, Drawer, EXPIRY_DAYS, INPUT, PageTitle, Pills, PrimaryButton, SEVERITIES, SavingBadge, Section, useSanctionConfig, type Action, type Severity } from "../sanctions/shared";

type Preset = { id: string; name: string; category: string | null; action: Action; severity: Severity; points: number | null; expiryDays: number | null; durationSeconds: number; memberReason: string; roleIds: string[] };
type Cfg = { presets: { categories: string[]; reasons: Preset[] }; [k: string]: unknown };

const PRESET_ACTIONS: ReadonlyArray<readonly [Action, string]> = (["WARN", "TIMEOUT", "KICK", "SOFTBAN", "TEMPBAN", "BAN", "NOTE"] as Action[]).map((a) => [a, ACTION_LABEL[a]] as const);
const blank = (): Preset => ({ id: Math.random().toString(36).slice(2, 10), name: "", category: null, action: "WARN", severity: "light", points: null, expiryDays: null, durationSeconds: 3600, memberReason: "", roleIds: [] });

/** Raisons prédéfinies (format Keeper) : proposées en autocomplétion dans les commandes et utilisées par /mod. */
export default function ConsolePresets({ guildId }: { guildId: string }) {
  const { cfg, set, status } = useSanctionConfig<Cfg>(guildId);
  const [tab, setTab] = useState<string>("*");
  const [draft, setDraft] = useState<Preset | null>(null);
  const [cat, setCat] = useState("");

  if (!cfg)
    return (
      <ConsolePage title="Raisons prédéfinies">
        <Panel>
          <EmptyLine>Chargement…</EmptyLine>
        </Panel>
      </ConsolePage>
    );

  const { categories, reasons } = cfg.presets;
  const setPresets = (p: Partial<Cfg["presets"]>) => set("presets", { ...cfg.presets, ...p });
  const addCat = () => {
    const v = cat.trim().slice(0, 30);
    if (v && categories.length < 12 && !categories.includes(v)) setPresets({ categories: [...categories, v] });
    setCat("");
  };
  const onCatKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addCat();
    } else if (e.key === "Backspace" && !cat && categories.length) setPresets({ categories: categories.slice(0, -1) });
  };
  const shown = reasons.filter((r) => tab === "*" || (tab === "" ? !r.category : r.category === tab));
  const save = () => {
    if (!draft || !draft.name.trim()) return;
    const clean = { ...draft, name: draft.name.trim() };
    setPresets({ reasons: reasons.some((r) => r.id === clean.id) ? reasons.map((r) => (r.id === clean.id ? clean : r)) : [...reasons, clean] });
    setDraft(null);
  };
  const remove = async () => {
    if (!draft || !(await confirmDialog(`Supprimer la raison « ${draft.name} » ?`, { title: "Supprimer", confirmLabel: "Supprimer" }))) return;
    setPresets({ reasons: reasons.filter((r) => r.id !== draft.id) });
    setDraft(null);
  };
  const isNew = draft ? !reasons.some((r) => r.id === draft.id) : false;

  return (
    <ConsolePage
      title={<PageTitle title="Raisons prédéfinies" text="Proposées en autocomplétion dans toutes les commandes. Ce sont aussi les sanctions de /mod." />}
      actions={
        <div className="flex items-center gap-3 self-start">
          <SavingBadge text={status} />
          <PrimaryButton onClick={() => setDraft(blank())} disabled={reasons.length >= 15}>
            <Plus className="h-4 w-4" />
            Nouvelle raison
          </PrimaryButton>
        </div>
      }
    >
      <Panel title="Catégories">
        <Row label="Catégories" hint="Jusqu'à 12 catégories pour ranger les raisons (pub, spam, insultes…).">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))] px-2 py-1.5">
              <AnimatePresence initial={false}>
                {categories.map((c) => (
                  <motion.span key={c} layout initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.85 }} transition={SPRING_PILL} className="flex items-center gap-1 rounded-md bg-[var(--surface-hover)] py-0.5 pl-2 pr-1 text-xs text-[var(--text-primary)]">
                    {c}
                    <button type="button" aria-label={`Retirer ${c}`} onClick={() => setPresets({ categories: categories.filter((x) => x !== c), reasons: reasons.map((r) => (r.category === c ? { ...r, category: null } : r)) })} className="rounded p-0.5 text-[var(--text-muted)] hover:text-[var(--danger)]">
                      <X className="h-3 w-3" />
                    </button>
                  </motion.span>
                ))}
              </AnimatePresence>
              {categories.length < 12 && <input value={cat} onChange={(e) => setCat(e.target.value)} onKeyDown={onCatKey} onBlur={addCat} placeholder="Ajouter…" aria-label="Nouvelle catégorie" className="min-w-24 flex-1 bg-transparent px-1 py-0.5 text-xs text-[var(--text-primary)] outline-none" />}
            </div>
            <p className="text-right font-mono text-[10px] text-[var(--text-muted)]">{categories.length}/12</p>
          </div>
        </Row>
      </Panel>

      <Panel title={`Raisons · ${reasons.length}/15`}>
        <div className="flex flex-wrap gap-1 border-b border-[var(--panel-border)] px-4 py-2.5">
          {[["*", "Toutes"], ...categories.map((c) => [c, c]), ["", "Sans catégorie"]].map(([v, label]) => (
            <button key={`tab-${v}`} type="button" onClick={() => setTab(v)} className={cn("relative rounded-md px-2.5 py-1 text-xs font-semibold transition-colors", tab === v ? "text-[var(--text-primary)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]")}>
              {tab === v && <motion.span layoutId="preset-tab" transition={SPRING_PILL} className="absolute inset-0 rounded-md border border-[var(--panel-border)] bg-[var(--surface-hover)]" />}
              <span className="relative">{label}</span>
            </button>
          ))}
        </div>
        {shown.length === 0 ? (
          <EmptyLine>{reasons.length ? "Aucune raison dans cette catégorie." : "Aucune raison. Crée par exemple « Pub », un avertissement moyen qui expire après 30 jours."}</EmptyLine>
        ) : (
          <motion.ul key={tab} variants={pageStagger} initial="initial" animate="animate">
            {shown.map((p) => (
              <motion.li key={p.id} variants={staggerItem}>
                <button type="button" onClick={() => setDraft({ ...p })} className="flex w-full items-center gap-3 border-t border-[var(--panel-border)] px-4 py-2.5 text-left transition-colors first:border-t-0 hover:bg-[var(--surface-hover)]">
                  <span className={cn("rounded-md px-2 py-0.5 text-[11px] font-semibold", ACTION_TONE[p.action])}>{ACTION_LABEL[p.action]}</span>
                  <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-[var(--text-primary)]">{p.name}</span>
                  {p.category && <span className="text-[11px] text-[var(--text-muted)]">{p.category}</span>}
                </button>
              </motion.li>
            ))}
          </motion.ul>
        )}
      </Panel>

      <Drawer
        open={!!draft}
        onClose={() => setDraft(null)}
        title={isNew ? "Nouvelle raison" : "Modifier la raison"}
        footer={
          <div className="flex gap-2">
            {!isNew && (
              <button type="button" onClick={remove} aria-label="Supprimer" className="rounded-lg border border-[var(--panel-border)] px-3 text-[var(--danger)] hover:bg-[var(--danger)]/10">
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            <PrimaryButton className="flex-1" onClick={save} disabled={!draft?.name.trim()}>
              {isNew ? "Créer la raison" : "Enregistrer"}
            </PrimaryButton>
          </div>
        }
      >
        {draft && (
          <>
            <Section label="Nom">
              <input autoFocus value={draft.name} maxLength={60} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Pub, Spam, Insultes…" className={cn(INPUT, "h-10")} />
              <Select value={draft.category ?? ""} width="w-full" aria-label="Catégorie" options={[["", "Sans catégorie"], ...categories.map((c) => [c, c] as const)]} onChange={(v) => setDraft({ ...draft, category: v || null })} />
            </Section>
            <Section label="Sanction">
              <Pills label="Sanction" options={PRESET_ACTIONS} value={[draft.action]} onChange={([a]) => setDraft({ ...draft, action: a })} />
            </Section>
            <AnimatePresence mode="wait" initial={false}>
              {draft.action === "WARN" && (
                <motion.div key="warn" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={SPRING_LAYOUT}>
                  <Section label="Avertissement">
                    <Segmented label="Gravité" value={draft.severity} options={SEVERITIES} onChange={(v) => setDraft({ ...draft, severity: v })} />
                    <div className="grid grid-cols-2 gap-3">
                      <label className="space-y-1 text-[11px] text-[var(--text-muted)]">
                        Points
                        <input type="number" min={0} max={100} value={draft.points ?? ""} placeholder="Selon la gravité" onChange={(e) => setDraft({ ...draft, points: e.target.value === "" ? null : Math.max(0, Math.min(100, Number(e.target.value))) })} className={cn(INPUT, "h-9")} />
                      </label>
                      <label className="space-y-1 text-[11px] text-[var(--text-muted)]">
                        Expiration
                        <Select value={draft.expiryDays ?? -1} width="w-full" aria-label="Expiration" options={[[-1, "Celle du serveur"], ...EXPIRY_DAYS]} onChange={(v) => setDraft({ ...draft, expiryDays: v === -1 ? null : v })} />
                      </label>
                    </div>
                  </Section>
                </motion.div>
              )}
              {(draft.action === "TIMEOUT" || draft.action === "TEMPBAN") && (
                <motion.div key="dur" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={SPRING_LAYOUT}>
                  <Section label="Durée">
                    <Select value={draft.durationSeconds} width="w-full" aria-label="Durée" options={DURATIONS} onChange={(v) => setDraft({ ...draft, durationSeconds: v })} />
                  </Section>
                </motion.div>
              )}
            </AnimatePresence>
            <Section label="Raison envoyée au membre">
              <textarea value={draft.memberReason} maxLength={500} rows={3} onChange={(e) => setDraft({ ...draft, memberReason: e.target.value })} placeholder="Publicité non autorisée" className={cn(INPUT, "py-2")} />
            </Section>
            <Section label="Rôles autorisés sur /mod">
              <p className="text-[11px] text-[var(--text-muted)]">Ces rôles peuvent appliquer cette raison avec /mod, même sans permission de modération.</p>
              <RoleChips guildId={guildId} ids={draft.roleIds} addLabel="Ajouter un rôle" onChange={(ids) => setDraft({ ...draft, roleIds: ids })} />
            </Section>
          </>
        )}
      </Drawer>
    </ConsolePage>
  );
}
