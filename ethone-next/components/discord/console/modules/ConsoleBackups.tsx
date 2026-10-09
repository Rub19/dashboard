"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { confirmDialog } from "@/lib/confirmDialog";
import { sinceLabel } from "@/lib/discord/security-scan";
import { pageStagger } from "@/lib/motion-variants";
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
};
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
const size = (b: number) => (b > 1_048_576 ? `${(b / 1_048_576).toFixed(1)} Mo` : `${Math.max(1, Math.round(b / 1024))} Ko`);

/** Sauvegardes (format Keeper) : planification, rétention, sauvegarde manuelle et liste. La restauration garde son assistant détaillé. */
export default function ConsoleBackups({ guildId }: { guildId: string }) {
  const api = useGuildApi(guildId);
  const [list, setList] = useState<Backup[] | null>(null);
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [name, setName] = useState("");
  const [protect, setProtect] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

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
                  <Link href={`/discord/backups/${b.backupId}?guildId=${guildId}`} className="rounded-lg border border-[var(--panel-border)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-hover)]">
                    Restaurer
                  </Link>
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
