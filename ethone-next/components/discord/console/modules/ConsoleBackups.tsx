"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { confirmDialog } from "@/lib/confirmDialog";
import { sinceLabel } from "@/lib/discord/security-scan";
import { pageStagger } from "@/lib/motion-variants";
import { SPRING_LAYOUT } from "@/lib/ease";
import { cn } from "@/lib/utils";
import { BOT_API_URL, ConsolePage, EmptyLine, GhostButton, Panel, Row, Segmented, StatTile, Stepper, Switch, useGuildApi } from "../kit";

type BackupType = "FULL" | "PARTIAL" | "PRE_CHANGE" | "ROLLBACK";
type Backup = {
  backupId: string;
  name: string;
  createdAt: string;
  createdBy: { tag: string };
  type: BackupType;
  status: "COMPLETED" | "IN_PROGRESS" | "FAILED" | "CORRUPTED";
  isProtected: boolean;
  sizeBytes: number;
  objectCounts: { channels: number; roles: number };
  includedComponents: string[];
};
type Plan = { counts: { willCreate: number; willModify: number; willDelete: number; willSkip: number }; actions: { action: "CREATE" | "MODIFY" | "DELETE" | "SKIP"; type: string; name: string; reason?: string; details?: string }[] };
type Job = { jobId: string; status: string; currentStep: string; progressPercent: number; errors: string[]; logs: string[]; rollbackBackupId?: string };
type Kpis = { totalBackups: number; lastBackupAt: string | null; storageUsedBytes: number; scheduledEnabled: boolean; nextScheduledAt: string | null; healthStatus: "HEALTHY" | "WARNING" | "CRITICAL" };
type Settings = {
  enabled: boolean;
  frequency: "6h" | "12h" | "daily" | "weekly";
  preferredTime: string;
  retentionCount: number;
  retentionDays: number;
  autoBackupBeforeMajorChanges: boolean;
};

const TYPE: Record<BackupType, string> = { FULL: "Complète", PARTIAL: "Partielle", PRE_CHANGE: "Avant modification", ROLLBACK: "Retour arrière" };
const FREQ: [Settings["frequency"], string][] = [
  ["6h", "6 h"],
  ["12h", "12 h"],
  ["daily", "Jour"],
  ["weekly", "Semaine"],
];
/** Éléments que le bot sait vraiment restaurer (les emojis et paramètres Discord ne le sont pas). */
const RESTORABLE: [string, string][] = [
  ["ROLES", "Rôles"],
  ["CATEGORIES", "Catégories"],
  ["CHANNELS", "Salons"],
  ["PERMISSIONS", "Permissions des salons"],
  ["ETHONE_CONFIG", "Réglages d'Etho"],
];
const ACTION_LABEL: Record<Plan["actions"][number]["action"], [string, string]> = {
  CREATE: ["Créé", "text-[var(--success)]"],
  MODIFY: ["Mis à jour", "text-[var(--text-primary)]"],
  DELETE: ["Supprimé", "text-[var(--danger)]"],
  SKIP: ["Ignoré", "text-[var(--text-muted)]"],
};
const DONE = ["COMPLETED", "PARTIAL", "FAILED", "ROLLED_BACK"];
const size = (b: number) => (b > 1_048_576 ? `${(b / 1_048_576).toFixed(1)} Mo` : `${Math.max(1, Math.round(b / 1024))} Ko`);

/** Sauvegardes (format Keeper) : planification, rétention, sauvegarde manuelle, liste et restauration guidée (plan avant d'agir). */
export default function ConsoleBackups({ guildId }: { guildId: string }) {
  const api = useGuildApi(guildId);
  const [list, setList] = useState<Backup[] | null>(null);
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [name, setName] = useState("");
  const [protect, setProtect] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [restoreFor, setRestoreFor] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [l, o, s] = await Promise.all([
      api<{ backups: Backup[] }>("/backups"),
      api<{ kpis: Kpis }>("/backups/overview", { silent: true }),
      api<Settings>("/backups/settings", { silent: true }),
    ]);
    setList(l?.backups ?? []);
    if (o?.kpis) setKpis(o.kpis);
    if (s) setSettings(s);
  }, [api]);
  useEffect(() => {
    void load();
  }, [load]);

  const saveSettings = async (patch: Partial<Settings>) => {
    setSettings((s) => (s ? { ...s, ...patch } : s));
    const r = await api<Settings>("/backups/settings", { method: "PUT", json: patch });
    if (r) setSettings(r);
    else void load();
  };
  const create = async () => {
    setBusy("create");
    const r = await api<Backup>("/backups", {
      method: "POST",
      json: { name: name.trim(), type: "FULL", isProtected: protect },
      headers: { "x-idempotency-key": `backup-${guildId}-${Date.now()}` },
    });
    setBusy(null);
    if (r) {
      setName("");
      setProtect(false);
      void load();
    }
  };
  const toggleProtect = async (b: Backup) => {
    setBusy(b.backupId);
    const r = await api(`/backups/${b.backupId}/protect`, { method: "PATCH", json: { isProtected: !b.isProtected } });
    setBusy(null);
    if (r) setList((l) => l?.map((x) => (x.backupId === b.backupId ? { ...x, isProtected: !b.isProtected } : x)) ?? null);
  };
  const verify = async (b: Backup) => {
    setBusy(b.backupId);
    const r = await api<{ valid: boolean; readiness: "READY" | "WARNING" | "CORRUPTED"; notes: string[] }>(`/backups/${b.backupId}/test`, { method: "POST" });
    setBusy(null);
    if (r) setNote(`« ${b.name} » : ${r.readiness === "READY" ? "intacte et restaurable" : r.readiness === "WARNING" ? "restaurable, avec des avertissements" : "corrompue"}. ${r.notes.join(" ")}`);
  };
  const remove = async (b: Backup) => {
    if (!(await confirmDialog(`Supprimer la sauvegarde « ${b.name} » ? C'est définitif.`, { title: "Supprimer", confirmLabel: "Supprimer" }))) return;
    if (await api(`/backups/${b.backupId}`, { method: "DELETE" })) void load();
  };

  const backups = (list ?? []).slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <ConsolePage title="Sauvegardes">
      <motion.div variants={pageStagger} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Sauvegardes" value={kpis?.totalBackups ?? (list ? backups.length : "—")} />
        <StatTile label="Dernière" value={kpis?.lastBackupAt ? sinceLabel(kpis.lastBackupAt) : "—"} />
        <StatTile label="Espace utilisé" value={kpis ? size(kpis.storageUsedBytes) : "—"} />
        <StatTile
          label="Prochaine automatique"
          value={kpis?.scheduledEnabled && kpis.nextScheduledAt ? new Date(kpis.nextScheduledAt).toLocaleString("fr-FR", { weekday: "short", hour: "2-digit", minute: "2-digit" }) : "—"}
          hint={kpis && !kpis.scheduledEnabled ? "Planification coupée" : undefined}
          accent={kpis?.healthStatus === "CRITICAL" ? "var(--danger)" : undefined}
        />
      </motion.div>

      <Panel title="Nouvelle sauvegarde" subtitle="Rôles, salons, catégories, permissions, emojis et réglages d'Etho.">
        <div className="flex flex-wrap items-center gap-3 px-5 py-3.5">
          <input
            value={name}
            maxLength={80}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && name.trim() && create()}
            placeholder="Nom (ex. avant refonte des salons)"
            aria-label="Nom de la sauvegarde"
            className="h-9 min-w-0 flex-1 rounded-lg border border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]/70"
          />
          <label className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
            <Switch checked={protect} onChange={setProtect} label="Protéger" />
            Protéger
          </label>
          <button type="button" disabled={!name.trim() || busy === "create"} onClick={create} className="rounded-lg bg-[var(--accent-primary)] px-4 py-2 text-xs font-bold text-white hover:opacity-90 disabled:opacity-40">
            {busy === "create" ? "Sauvegarde…" : "Sauvegarder maintenant"}
          </button>
        </div>
      </Panel>

      {note && (
        <Panel>
          <div className="flex items-center justify-between gap-3 px-5 py-3">
            <p className="text-xs text-[var(--text-primary)]">{note}</p>
            <GhostButton onClick={() => setNote(null)}>OK</GhostButton>
          </div>
        </Panel>
      )}

      <Panel title="Sauvegardes du serveur" subtitle="Une sauvegarde protégée n'est jamais supprimée par la rétention.">
        {!list ? (
          <EmptyLine>Chargement…</EmptyLine>
        ) : backups.length === 0 ? (
          <EmptyLine>Aucune sauvegarde pour l&apos;instant.</EmptyLine>
        ) : (
          <ul>
            {backups.map((b) => (
              <li key={b.backupId} className="flex flex-wrap items-center gap-3 border-t border-[var(--panel-border)] px-5 py-3 first:border-t-0">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-[var(--text-primary)]">
                    {b.isProtected && <span className="mr-1.5 text-[11px] text-[var(--success)]">Protégée</span>}
                    {b.name}
                  </p>
                  <p className="truncate text-[11px] text-[var(--text-muted)]">
                    <span className={cn(b.status !== "COMPLETED" && "text-[var(--danger)]")}>{b.status === "COMPLETED" ? TYPE[b.type] : b.status === "IN_PROGRESS" ? "En cours" : "Échec"}</span> · {sinceLabel(b.createdAt)} · {b.createdBy?.tag} · {b.objectCounts?.roles ?? 0} rôles,{" "}
                    {b.objectCounts?.channels ?? 0} salons · {size(b.sizeBytes)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <GhostButton disabled={b.status !== "COMPLETED"} onClick={() => setRestoreFor(restoreFor === b.backupId ? null : b.backupId)}>
                    {restoreFor === b.backupId ? "Fermer" : "Restaurer"}
                  </GhostButton>
                  <GhostButton disabled={busy === b.backupId} onClick={() => verify(b)}>
                    Vérifier
                  </GhostButton>
                  <a
                    href={`${BOT_API_URL}/api/guilds/${guildId}/backups/${b.backupId}/download`}
                    className="rounded-lg border border-[var(--panel-border)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
                  >
                    Télécharger
                  </a>
                  <GhostButton disabled={busy === b.backupId} onClick={() => toggleProtect(b)}>
                    {b.isProtected ? "Ne plus protéger" : "Protéger"}
                  </GhostButton>
                  <GhostButton disabled={b.isProtected} onClick={() => remove(b)}>
                    Supprimer
                  </GhostButton>
                </div>
                <AnimatePresence initial={false}>
                  {restoreFor === b.backupId && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={SPRING_LAYOUT} className="basis-full overflow-hidden">
                      <RestorePanel guildId={guildId} backup={b} onDone={load} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Planification et rétention">
        {!settings ? (
          <EmptyLine>Chargement…</EmptyLine>
        ) : (
          <>
            <Row label="Sauvegarde automatique">
              <Switch checked={settings.enabled} onChange={(v) => saveSettings({ enabled: v })} label="Sauvegarde automatique" />
            </Row>
            <Row label="Fréquence">
              <Segmented label="Fréquence" value={settings.frequency} options={FREQ} onChange={(v) => saveSettings({ frequency: v })} />
            </Row>
            {(settings.frequency === "daily" || settings.frequency === "weekly") && (
              <Row label="Heure">
                <input
                  type="time"
                  value={settings.preferredTime}
                  onChange={(e) => /^\d{2}:\d{2}$/.test(e.target.value) && saveSettings({ preferredTime: e.target.value })}
                  aria-label="Heure de la sauvegarde"
                  className="h-9 rounded-lg border border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]/70"
                />
              </Row>
            )}
            <Row label="Garder au plus" hint="Les plus anciennes sont supprimées (sauf les protégées).">
              <Stepper value={settings.retentionCount} min={1} max={30} unit="sauvegardes" onCommit={(n) => saveSettings({ retentionCount: n })} />
            </Row>
            <Row label="Pendant">
              <Stepper value={settings.retentionDays} min={1} max={90} unit="jours" onCommit={(n) => saveSettings({ retentionDays: n })} />
            </Row>
            <Row label="Avant les grosses modifications" hint="Etho sauvegarde avant une configuration assistée ou une restauration.">
              <Switch checked={settings.autoBackupBeforeMajorChanges} onChange={(v) => saveSettings({ autoBackupBeforeMajorChanges: v })} label="Avant les grosses modifications" />
            </Row>
          </>
        )}
      </Panel>
    </ConsolePage>
  );
}

/**
 * Restauration guidée : choix des éléments et du mode, plan détaillé calculé par le bot, confirmation, puis suivi en direct.
 * Le bot crée toujours une sauvegarde « retour arrière » protégée juste avant d'appliquer.
 */
function RestorePanel({ guildId, backup, onDone }: { guildId: string; backup: Backup; onDone: () => void }) {
  const api = useGuildApi(guildId);
  const available = RESTORABLE.filter(([k]) => backup.includedComponents?.includes(k));
  const [components, setComponents] = useState<string[]>(available.map(([k]) => k));
  const [level, setLevel] = useState<"SAFE" | "DESTRUCTIVE">("SAFE");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [planning, setPlanning] = useState(false);
  const [serverName, setServerName] = useState<string | null>(null);
  const [confirmName, setConfirmName] = useState("");
  const [job, setJob] = useState<Job | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearInterval(timer.current), []);
  useEffect(() => {
    if (level === "DESTRUCTIVE" && serverName === null) api<{ settings: { name: string } }>("/server/settings", { silent: true }).then((r) => setServerName(r?.settings.name ?? ""));
  }, [api, level, serverName]);

  // Le plan est recalculé à chaque changement de choix : jamais de lancement sur un plan périmé.
  useEffect(() => {
    if (components.length === 0) return setPlan(null);
    let cancelled = false;
    setPlanning(true);
    api<Plan>(`/backups/${backup.backupId}/preview-restore`, { method: "POST", json: { safetyLevel: level, mode: "FULL", selectedComponents: components } }).then((r) => {
      if (cancelled) return;
      setPlanning(false);
      setPlan(r);
    });
    return () => {
      cancelled = true;
    };
  }, [api, backup.backupId, components, level]);

  const start = async () => {
    const r = await api<Job>(`/backups/${backup.backupId}/restore`, {
      method: "POST",
      json: { safetyLevel: level, mode: "FULL", selectedComponents: components, confirmServerName: confirmName },
      headers: { "x-idempotency-key": `restore-${backup.backupId}-${Date.now()}` },
    });
    if (!r?.jobId) return;
    setJob(r);
    let ticks = 0;
    timer.current = window.setInterval(async () => {
      ticks += 1;
      const j = await api<Job>(`/backups/jobs/${r.jobId}`, { silent: true });
      if (j) setJob(j);
      if ((j && DONE.includes(j.status)) || ticks > 120) {
        window.clearInterval(timer.current);
        onDone();
      }
    }, 1500);
  };

  const toggle = (k: string) => setComponents((c) => (c.includes(k) ? c.filter((x) => x !== k) : [...c, k]));
  const destructiveOk = level !== "DESTRUCTIVE" || (serverName !== null && confirmName === serverName);
  const changes = plan ? plan.counts.willCreate + plan.counts.willModify + plan.counts.willDelete : 0;

  if (job) {
    const finished = DONE.includes(job.status);
    return (
      <div className="mt-3 space-y-2 rounded-lg border border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))]/40 p-4">
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="font-semibold text-[var(--text-primary)]">
            {job.status === "COMPLETED" ? "Restauration terminée" : job.status === "PARTIAL" ? "Restauration partielle" : job.status === "FAILED" ? "Échec de la restauration" : job.currentStep}
          </span>
          <span className="tabular-nums text-[var(--text-muted)]">{job.progressPercent} %</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-[var(--panel-border)]">
          <motion.div
            className={cn("h-full rounded-full", job.status === "FAILED" ? "bg-[var(--danger)]" : job.status === "PARTIAL" ? "bg-[var(--warning)]" : "bg-[var(--success)]")}
            animate={{ width: `${job.progressPercent}%` }}
            transition={SPRING_LAYOUT}
          />
        </div>
        {job.errors.length > 0 && (
          <ul className="max-h-28 overflow-y-auto text-[11px] text-[var(--danger)]">
            {job.errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        )}
        <details className="text-[11px] text-[var(--text-muted)]" open={!finished}>
          <summary className="cursor-pointer">Journal ({job.logs.length})</summary>
          <ul className="mt-1 max-h-40 overflow-y-auto font-mono">
            {job.logs.slice(-60).map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        </details>
        {job.rollbackBackupId && <p className="text-[11px] text-[var(--text-muted)]">Retour arrière possible : la sauvegarde protégée « Rollback auto » a été créée juste avant.</p>}
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-3 rounded-lg border border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))]/40 p-4">
      {available.length === 0 ? (
        <p className="text-xs text-[var(--text-muted)]">Cette sauvegarde ne contient rien que le bot sache restaurer.</p>
      ) : (
        <>
          <div>
            <p className="mb-1.5 text-[11px] font-semibold text-[var(--text-muted)]">Restaurer</p>
            <div className="flex flex-wrap gap-1.5">
              {available.map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={components.includes(k)}
                  onClick={() => toggle(k)}
                  className={cn(
                    "rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors",
                    components.includes(k) ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--text-primary)]" : "border-[var(--panel-border)] text-[var(--text-muted)]"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-[11px] font-semibold text-[var(--text-muted)]">Mode</p>
            <Segmented
              label="Mode de restauration"
              value={level}
              options={[
                ["SAFE", "Ajouter et mettre à jour"],
                ["DESTRUCTIVE", "Remettre à l'identique"],
              ]}
              onChange={setLevel}
            />
            <p className="mt-1 text-[11px] text-[var(--text-muted)]">
              {level === "SAFE" ? "Recrée ce qui manque et remet les réglages de ce qui existe. Rien n'est supprimé." : "Supprime aussi les rôles et salons absents de la sauvegarde."}
            </p>
          </div>
          <div>
            <p className="mb-1.5 text-[11px] font-semibold text-[var(--text-muted)]">Ce qui va se passer</p>
            {planning || !plan ? (
              <p className="text-xs text-[var(--text-muted)]">{components.length === 0 ? "Choisis au moins un élément." : "Calcul du plan…"}</p>
            ) : (
              <>
                <div className="grid grid-cols-4 gap-2 text-center">
                  {(
                    [
                      ["Créés", plan.counts.willCreate, "var(--success)"],
                      ["Mis à jour", plan.counts.willModify, "var(--text-primary)"],
                      ["Supprimés", plan.counts.willDelete, "var(--danger)"],
                      ["Ignorés", plan.counts.willSkip, "var(--text-muted)"],
                    ] as const
                  ).map(([label, n, color]) => (
                    <div key={label} className="rounded-lg border border-[var(--panel-border)] py-2">
                      <p className="text-lg font-bold tabular-nums" style={{ color }}>
                        {n}
                      </p>
                      <p className="text-[10px] text-[var(--text-muted)]">{label}</p>
                    </div>
                  ))}
                </div>
                {plan.actions.length > 0 && (
                  <ul className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-[var(--panel-border)]">
                    {plan.actions
                      .slice()
                      .sort((a, z) => ["DELETE", "CREATE", "MODIFY", "SKIP"].indexOf(a.action) - ["DELETE", "CREATE", "MODIFY", "SKIP"].indexOf(z.action))
                      .map((a, i) => (
                        <li key={i} className="flex items-center gap-2 border-t border-[var(--panel-border)] px-3 py-1.5 text-[11px] first:border-t-0">
                          <span className={cn("w-20 shrink-0 font-semibold", ACTION_LABEL[a.action][1])}>{ACTION_LABEL[a.action][0]}</span>
                          <span className="w-16 shrink-0 text-[var(--text-muted)]">{a.type === "ROLE" ? "Rôle" : a.type === "CATEGORY" ? "Catégorie" : a.type === "CHANNEL" ? "Salon" : a.type}</span>
                          <span className="min-w-0 flex-1 truncate text-[var(--text-primary)]">{a.name}</span>
                          {a.reason && <span className="hidden truncate text-[var(--text-muted)] sm:block">{a.reason}</span>}
                        </li>
                      ))}
                  </ul>
                )}
              </>
            )}
          </div>
          {level === "DESTRUCTIVE" && (
            <div>
              <p className="mb-1.5 text-[11px] font-semibold text-[var(--danger)]">Pour confirmer, tape le nom exact du serveur{serverName ? ` : « ${serverName} »` : ""}</p>
              <input
                value={confirmName}
                onChange={(e) => setConfirmName(e.target.value)}
                aria-label="Nom du serveur pour confirmer"
                className="h-9 w-full max-w-sm rounded-lg border border-[var(--danger)]/40 bg-[var(--surface-base,var(--bg-main))] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--danger)]"
              />
            </div>
          )}
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] text-[var(--text-muted)]">Etho crée d&apos;abord une sauvegarde « retour arrière » de l&apos;état actuel.</p>
            <button
              type="button"
              disabled={!plan || planning || changes === 0 || !destructiveOk}
              onClick={start}
              className={cn("rounded-lg px-4 py-2 text-xs font-bold text-white hover:opacity-90 disabled:opacity-40", level === "DESTRUCTIVE" ? "bg-[var(--danger)]" : "bg-[var(--accent-primary)]")}
            >
              Restaurer ({changes} changement{changes > 1 ? "s" : ""})
            </button>
          </div>
        </>
      )}
    </div>
  );
}
