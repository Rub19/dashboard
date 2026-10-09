"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { GroupEditor, countLeaves, emptyRule, type Overview, type Preview, type Rule } from "@/app/discord/statroles/StatrolesCenterClient";
import { confirmDialog } from "@/lib/confirmDialog";
import { sinceLabel } from "@/lib/discord/security-scan";
import { SPRING_LAYOUT } from "@/lib/ease";
import { pageStagger } from "@/lib/motion-variants";
import { ConsolePage, EmptyLine, GhostButton, Panel, RoleChips, Row, StatTile, Switch, roleColor, useGuildApi } from "../kit";

/** Rôles de stats (format Keeper) : rôles donnés et retirés automatiquement selon l'activité des membres. */
export default function ConsoleStatroles({ guildId }: { guildId: string }) {
  const api = useGuildApi(guildId);
  const [ov, setOv] = useState<Overview | null>(null);
  const [editing, setEditing] = useState<Rule | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await api<Overview>("/statroles/overview");
    if (r) setOv(r);
  }, [api]);
  useEffect(() => {
    void load();
  }, [load]);

  const open = (rule: Rule | null) => {
    setPreview(null);
    if (!rule) {
      setEditing(emptyRule());
      setIsNew(true);
    } else if (editing?.id === rule.id) {
      setEditing(null);
    } else {
      setEditing(structuredClone(rule));
      setIsNew(false);
    }
  };
  const body = (r: Rule) => ({ name: r.name, roleId: r.roleId, root: r.root, removeWhenNotMatching: r.removeWhenNotMatching, enabled: r.enabled });
  const saveRule = async (r: Rule) => {
    setBusy(true);
    const res = await api<{ config: Overview["config"] }>(`/statroles/rules/${r.id}`, { method: "PUT", json: body(r) });
    setBusy(false);
    if (res) {
      setOv((o) => (o ? { ...o, config: res.config } : o));
      setEditing(null);
    }
  };
  const toggleRule = async (r: Rule, enabled: boolean) => {
    const res = await api<{ config: Overview["config"] }>(`/statroles/rules/${r.id}`, { method: "PUT", json: { ...body(r), enabled } });
    if (res) setOv((o) => (o ? { ...o, config: res.config } : o));
  };
  const removeRule = async (r: Rule) => {
    if (!(await confirmDialog(`Supprimer la règle « ${r.name} » ? Les rôles déjà donnés restent en place.`, { title: "Supprimer", confirmLabel: "Supprimer" }))) return;
    if (await api(`/statroles/rules/${r.id}`, { method: "DELETE" })) {
      setEditing(null);
      void load();
    }
  };
  const runPreview = async () => {
    if (!editing) return;
    setBusy(true);
    const r = await api<Preview>("/statroles/preview", { method: "POST", json: body(editing) });
    setBusy(false);
    setPreview(r);
  };
  const runNow = async () => {
    setBusy(true);
    const r = await api<{ summary: { added: number; removed: number } }>("/statroles/run", { method: "POST" });
    setBusy(false);
    if (r) void load();
  };

  const roleName = (id: string) => ov?.roles.find((r) => r.id === id);
  const rules = ov?.config.rules ?? [];
  const canSave = !!editing && !!editing.roleId && editing.name.trim().length > 0 && countLeaves(editing.root) > 0 && !busy;

  const editor = (r: Rule) => (
    <div className="border-t border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))]/40">
      <Row label="Nom">
        <input
          value={r.name}
          maxLength={60}
          onChange={(e) => setEditing({ ...r, name: e.target.value })}
          aria-label="Nom de la règle"
          className="h-9 w-64 rounded-lg border border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]/70"
        />
      </Row>
      <Row label="Rôle donné" hint="Le rôle doit être sous le rôle d'Etho.">
        <RoleChips guildId={guildId} ids={r.roleId ? [r.roleId] : []} max={1} onChange={(ids) => setEditing({ ...r, roleId: ids[0] ?? "" })} />
        {r.roleId && roleName(r.roleId) && !roleName(r.roleId)!.assignable && <p className="mt-1 text-[11px] text-[var(--warning)]">Etho ne peut pas donner ce rôle (trop haut ou géré par une intégration).</p>}
      </Row>
      <Row label="Retirer automatiquement" hint="Le rôle est retiré aux membres qui ne remplissent plus les conditions.">
        <Switch checked={r.removeWhenNotMatching} onChange={(v) => setEditing({ ...r, removeWhenNotMatching: v })} label="Retirer automatiquement" />
      </Row>
      <div className="border-t border-[var(--panel-border)] px-5 py-4">
        <p className="mb-2 text-[13px] font-semibold text-[var(--text-primary)]">Conditions</p>
        <GroupEditor group={r.root} roles={ov?.roles ?? []} depth={0} onChange={(root) => setEditing({ ...r, root })} />
      </div>
      {preview && (
        <div className="grid grid-cols-2 gap-2 border-t border-[var(--panel-border)] px-5 py-3 text-center sm:grid-cols-4">
          {(
            [
              ["Correspondent", preview.matching],
              ["Ont déjà le rôle", preview.holders],
              ["Le recevraient", preview.toAdd],
              ["Le perdraient", preview.toRemove],
            ] as const
          ).map(([label, n]) => (
            <div key={label}>
              <p className="text-lg font-bold tabular-nums text-[var(--text-primary)]">{n}</p>
              <p className="text-[11px] text-[var(--text-muted)]">{label}</p>
            </div>
          ))}
          {preview.sample.length > 0 && <p className="col-span-full text-left text-[11px] text-[var(--text-muted)]">Exemples : {preview.sample.map((s) => s.name).join(", ")}</p>}
          {preview.warnings.map((w) => (
            <p key={w} className="col-span-full text-left text-[11px] text-[var(--warning)]">
              {w}
            </p>
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-1.5 border-t border-[var(--panel-border)] px-5 py-3">
        <GhostButton disabled={busy || !r.roleId} onClick={runPreview}>
          Calculer l&apos;aperçu
        </GhostButton>
        <button type="button" disabled={!canSave} onClick={() => saveRule(r)} className="rounded-lg bg-[var(--accent-primary)] px-3 py-1.5 text-xs font-bold text-white hover:opacity-90 disabled:opacity-40">
          Enregistrer
        </button>
        <GhostButton onClick={() => setEditing(null)}>Annuler</GhostButton>
        <span className="flex-1" />
        {!isNew && <GhostButton onClick={() => removeRule(r)}>Supprimer</GhostButton>}
      </div>
    </div>
  );

  return (
    <ConsolePage
      title="Rôles de stats"
      actions={
        <GhostButton disabled={busy || !ov?.config.enabled || rules.length === 0} onClick={runNow}>
          Appliquer maintenant
        </GhostButton>
      }
    >
      {ov && !ov.config.enabled && (
        <Panel>
          <p className="px-5 py-3 text-xs text-[var(--warning)]">Module désactivé : aucun rôle n&apos;est donné ni retiré. Active-le avec l&apos;interrupteur en haut de la page.</p>
        </Panel>
      )}
      {ov && !ov.statsEnabled && (
        <Panel>
          <p className="px-5 py-3 text-xs text-[var(--warning)]">Le module Statistiques est coupé : les conditions de messages et de vocal ne peuvent pas être évaluées.</p>
        </Panel>
      )}

      <motion.div variants={pageStagger} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Règles" value={ov ? rules.length : "—"} hint="25 au maximum" />
        <StatTile label="Actives" value={ov ? rules.filter((r) => r.enabled).length : "—"} />
        <StatTile label="Derniers rôles donnés" value={ov?.config.lastRun ? `+${ov.config.lastRun.added}` : "—"} hint={ov?.config.lastRunAt ? sinceLabel(ov.config.lastRunAt) : "Appliqué toutes les 10 min"} />
        <StatTile label="Derniers retirés" value={ov?.config.lastRun ? `−${ov.config.lastRun.removed}` : "—"} />
      </motion.div>

      <Panel
        title="Règles"
        subtitle="Etho vérifie les règles toutes les 10 minutes."
        actions={
          rules.length < 25 && (
            <GhostButton disabled={!!editing && isNew} onClick={() => open(null)}>
              Nouvelle règle
            </GhostButton>
          )
        }
      >
        {!ov ? (
          <EmptyLine>Chargement…</EmptyLine>
        ) : (
          <>
            <AnimatePresence initial={false}>
              {editing && isNew && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={SPRING_LAYOUT} className="overflow-hidden">
                  {editor(editing)}
                </motion.div>
              )}
            </AnimatePresence>
            {rules.length === 0 && !(editing && isNew) && <EmptyLine>Aucune règle. Exemple : « Actif » pour 100 messages en 30 jours.</EmptyLine>}
            <ul>
              {rules.map((r) => {
                const role = roleName(r.roleId);
                return (
                  <li key={r.id} className="border-t border-[var(--panel-border)] first:border-t-0">
                    <div className="flex items-center gap-3 px-5 py-3">
                      <button type="button" onClick={() => open(r)} aria-expanded={editing?.id === r.id} className="min-w-0 flex-1 text-left">
                        <p className="truncate text-[13px] font-semibold text-[var(--text-primary)]">{r.name}</p>
                        <p className="flex items-center gap-1.5 truncate text-[11px] text-[var(--text-muted)]">
                          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: roleColor(role?.color) }} />
                          {role?.name ?? "rôle supprimé"} · {countLeaves(r.root)} condition{countLeaves(r.root) > 1 ? "s" : ""}
                          {r.removeWhenNotMatching ? " · retiré automatiquement" : ""}
                        </p>
                      </button>
                      <Switch checked={r.enabled} onChange={(v) => toggleRule(r, v)} label={`Activer ${r.name}`} />
                    </div>
                    <AnimatePresence initial={false}>
                      {editing && !isNew && editing.id === r.id && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={SPRING_LAYOUT} className="overflow-hidden">
                          {editor(editing)}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </Panel>
    </ConsolePage>
  );
}
