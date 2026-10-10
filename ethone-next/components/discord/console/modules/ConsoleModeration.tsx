"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import ChannelPicker from "../../ChannelPicker";
import { confirmDialog } from "@/lib/confirmDialog";
import { useToast } from "@/components/ToastProvider";
import { sinceLabel } from "@/lib/discord/security-scan";
import { SPRING_LAYOUT } from "@/lib/ease";
import { pageStagger } from "@/lib/motion-variants";
import { cn } from "@/lib/utils";
import { ConsolePage, EmptyLine, GhostButton, MemberPicker, Panel, RoleChips, Row, Segmented, StatTile, Stepper, Switch, useGuildApi, type MemberHit } from "../kit";
import { MemberRecord, ReportsPanel } from "./ModerationRecords";

type Action = "WARN" | "TIMEOUT" | "KICK" | "BAN" | "UNBAN" | "SOFTBAN" | "QUARANTINE";
type Case = { caseNumber: number; userId: string; userTag: string; moderatorTag: string; action: Action; reason: string; createdAt: string; status: "ACTIVE" | "EXPIRED" | "REVOKED"; source: string; durationSeconds: number | null };
type Stats = { totalCases: number; casesToday: number; activeSanctionsCount: number; pendingReports: number };
type Settings = { logChannelId?: string; quarantineRoleId?: string; staffAbuseLimits: { maxBansPerMinute: number; maxKicksPerMinute: number; maxTimeoutsPerMinute: number } };
type Escalation = { enabled: boolean; threshold: number; action: "timeout" | "kick" | "ban"; durationSeconds: number };
type Ban = { userId: string; userTag: string; reason: string };

const ACTION_LABEL: Record<Action, string> = { WARN: "Avertissement", TIMEOUT: "Exclusion temporaire", KICK: "Expulsion", BAN: "Bannissement", UNBAN: "Débannissement", SOFTBAN: "Softban", QUARANTINE: "Quarantaine" };
const SOURCE_LABEL: Record<string, string> = { MANUAL: "", AUTOMOD: "automod", ANTI_RAID: "anti-raid", SECURITY: "sécurité", SYSTEM: "système" };
const input = "h-9 w-full rounded-lg border border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]/70";

function durationLabel(s: number | null) {
  if (!s) return "";
  if (s < 3600) return `${Math.round(s / 60)} min`;
  if (s < 86400) return `${Math.round(s / 3600)} h`;
  return `${Math.round(s / 86400)} j`;
}

/** Modération (format Keeper) : sanctionner, sanctions récentes, bannis, salon des sanctions et règles automatiques. */
export default function ConsoleModeration({ guildId }: { guildId: string }) {
  const api = useGuildApi(guildId);
  const { success } = useToast();
  const [stats, setStats] = useState<Stats | null>(null);
  const [cases, setCases] = useState<Case[] | null>(null);
  const [bans, setBans] = useState<Ban[] | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [modLog, setModLog] = useState<string | null>(null);
  const [esc, setEsc] = useState<Escalation | null>(null);
  const [target, setTarget] = useState<MemberHit | null>(null);
  const [action, setAction] = useState<"WARN" | "TIMEOUT" | "KICK" | "BAN">("WARN");
  const [minutes, setMinutes] = useState(60);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const loadCases = useCallback(async () => {
    const [o, c] = await Promise.all([api<{ stats: Stats }>("/moderation/overview", { silent: true }), api<{ cases: Case[] }>("/moderation/cases?limit=25")]);
    if (o) setStats(o.stats);
    setCases(c?.cases ?? []);
  }, [api]);
  const loadBans = useCallback(async () => {
    const b = await api<{ bans: Ban[] }>("/moderation/bans", { silent: true });
    setBans(b?.bans ?? []);
  }, [api]);

  useEffect(() => {
    void loadCases();
    void loadBans();
    api<{ settings: Settings }>("/moderation/settings").then((r) => r && setSettings(r.settings));
    api<{ modLogChannelId: string | null }>("/moderation/mod-log-channel", { silent: true }).then((r) => r && setModLog(r.modLogChannelId));
    api<{ escalation: Escalation }>("/moderation/warning-escalation", { silent: true }).then((r) => r && setEsc(r.escalation));
  }, [api, loadCases, loadBans]);

  const saveSettings = async (patch: Partial<{ [K in keyof Settings]: Settings[K] | null }>) => {
    const r = await api<{ settings: Settings }>("/moderation/settings", { method: "PUT", json: patch });
    if (r) setSettings(r.settings);
  };
  // Commandes Discord et sanctions du tableau de bord écrivent chacune dans leur salon : on règle les deux ensemble.
  const setLogChannel = async (id: string) => {
    const r = await api<{ modLogChannelId: string | null }>("/moderation/mod-log-channel", { method: "PUT", json: { channelId: id } });
    if (r) setModLog(r.modLogChannelId);
    await saveSettings({ logChannelId: id });
  };
  const saveEsc = async (patch: Partial<Escalation>) => {
    if (!esc) return;
    setEsc({ ...esc, ...patch });
    const r = await api<{ escalation: Escalation }>("/moderation/warning-escalation", { method: "PUT", json: patch });
    if (r) setEsc(r.escalation);
  };

  const sanction = async () => {
    if (!target || busy) return;
    const label = ACTION_LABEL[action].toLowerCase();
    if (action !== "WARN" && !(await confirmDialog(`${ACTION_LABEL[action]} de ${target.displayName}${action === "TIMEOUT" ? ` pendant ${durationLabel(minutes * 60)}` : ""} ?`, { title: "Sanctionner", confirmLabel: "Confirmer" }))) return;
    setBusy("sanction");
    const r = await api<{ case: Case }>("/moderation/cases", {
      method: "POST",
      json: { userId: target.id, userTag: target.username, action, reason: reason.trim() || undefined, durationSeconds: action === "TIMEOUT" ? minutes * 60 : undefined },
    });
    setBusy(null);
    if (r) {
      success("Sanction appliquée", `${target.displayName} : ${label} (case #${r.case.caseNumber}).`);
      setTarget(null);
      setReason("");
      void loadCases();
      if (action === "BAN") void loadBans();
    }
  };

  const revert = async (c: Case) => {
    if (!(await confirmDialog(`Révoquer la case #${c.caseNumber} (${ACTION_LABEL[c.action].toLowerCase()} de ${c.userTag}) ?${c.action === "BAN" || c.action === "TIMEOUT" ? " La sanction est levée sur Discord." : ""}`, { title: "Révoquer", confirmLabel: "Révoquer" }))) return;
    setBusy(`case:${c.caseNumber}`);
    const r = await api(`/moderation/cases/${c.caseNumber}/revert`, { method: "POST", json: {} });
    setBusy(null);
    if (r) {
      setCases((list) => list?.map((x) => (x.caseNumber === c.caseNumber ? { ...x, status: "REVOKED" } : x)) ?? null);
      if (c.action === "BAN") void loadBans();
    }
  };

  const unban = async (b: Ban) => {
    if (!(await confirmDialog(`Débannir ${b.userTag} ?`, { title: "Débannir", confirmLabel: "Débannir" }))) return;
    setBusy(`ban:${b.userId}`);
    const r = await api("/moderation/unban", { method: "POST", json: { userId: b.userId } });
    setBusy(null);
    if (r) {
      setBans((list) => list?.filter((x) => x.userId !== b.userId) ?? null);
      void loadCases();
    }
  };

  const logChannel = modLog ?? settings?.logChannelId ?? "";

  return (
    <ConsolePage title="Modération">
      <motion.div variants={pageStagger} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Sanctions aujourd'hui" value={stats?.casesToday ?? "—"} />
        <StatTile label="Sanctions actives" value={stats?.activeSanctionsCount ?? "—"} />
        <StatTile label="Total" value={stats?.totalCases ?? "—"} />
        <StatTile label="Signalements en attente" value={stats?.pendingReports ?? "—"} />
      </motion.div>

      <Panel title="Sanctionner un membre" actions={<GhostButton onClick={sanction} disabled={!target || busy === "sanction"}>{busy === "sanction" ? "Application…" : "Appliquer"}</GhostButton>}>
        <Row label="Membre">
          {target ? (
            <span className="inline-flex items-center gap-2 rounded-lg border border-[var(--panel-border)] py-1 pl-1 pr-2 text-sm text-[var(--text-primary)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={target.avatarUrl} alt="" className="h-6 w-6 rounded-full" />
              {target.displayName}
              <span className="text-xs text-[var(--text-muted)]">@{target.username}</span>
              <button type="button" onClick={() => setTarget(null)} aria-label="Changer de membre" className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ) : (
            <MemberPicker guildId={guildId} label="Choisir" onPick={setTarget} />
          )}
        </Row>
        <Row label="Sanction">
          <Segmented
            label="Sanction"
            value={action}
            options={[
              ["WARN", "Avertir"],
              ["TIMEOUT", "Exclure"],
              ["KICK", "Expulser"],
              ["BAN", "Bannir"],
            ]}
            onChange={setAction}
          />
        </Row>
        <AnimatePresence initial={false}>
          {action === "TIMEOUT" && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <Row label="Durée" hint="28 jours au plus (limite Discord).">
                <Stepper value={minutes} min={1} max={40320} unit="min" onCommit={setMinutes} />
              </Row>
            </motion.div>
          )}
        </AnimatePresence>
        <Row label="Motif" hint="Visible dans la case et le salon des sanctions.">
          <input value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} placeholder="Aucun motif" className={input} />
        </Row>
      </Panel>

      <Panel title="Sanctions récentes">
        {!cases ? (
          <EmptyLine>Chargement…</EmptyLine>
        ) : cases.length === 0 ? (
          <EmptyLine>Aucune sanction pour l&apos;instant.</EmptyLine>
        ) : (
          <ul>
            {cases.map((c) => (
              <li key={c.caseNumber} className={cn("flex flex-wrap items-center gap-3 border-t border-[var(--panel-border)] px-5 py-3 first:border-t-0", c.status === "REVOKED" && "opacity-60")}>
                <span className="w-12 shrink-0 font-mono text-xs text-[var(--text-muted)]">#{c.caseNumber}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-[var(--text-primary)]">
                    {ACTION_LABEL[c.action]}
                    {c.durationSeconds ? ` · ${durationLabel(c.durationSeconds)}` : ""} <span className="font-normal text-[var(--text-muted)]">· {c.userTag}</span>
                  </p>
                  <p className="truncate text-[11px] text-[var(--text-muted)]">
                    {c.reason} · par {c.moderatorTag}
                    {SOURCE_LABEL[c.source] ? ` (${SOURCE_LABEL[c.source]})` : ""} · {sinceLabel(c.createdAt)}
                    {c.status === "REVOKED" ? " · révoquée" : c.status === "EXPIRED" ? " · terminée" : ""}
                  </p>
                </div>
                {c.status === "ACTIVE" && c.action !== "UNBAN" && (
                  <GhostButton onClick={() => revert(c)} disabled={busy !== null}>
                    Révoquer
                  </GhostButton>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <ReportsPanel guildId={guildId} />
      <MemberRecord guildId={guildId} />

      <Panel title="Bannis" subtitle={bans && bans.length >= 100 ? "Les 100 derniers." : undefined}>
        {!bans ? (
          <EmptyLine>Chargement…</EmptyLine>
        ) : bans.length === 0 ? (
          <EmptyLine>Personne n&apos;est banni.</EmptyLine>
        ) : (
          <ul>
            <AnimatePresence initial={false}>
              {bans.map((b) => (
                <motion.li key={b.userId} layout exit={{ opacity: 0, height: 0 }} transition={SPRING_LAYOUT} className="flex items-center gap-3 border-t border-[var(--panel-border)] px-5 py-3 first:border-t-0">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-[var(--text-primary)]">{b.userTag}</p>
                    <p className="truncate text-[11px] text-[var(--text-muted)]">{b.reason}</p>
                  </div>
                  <GhostButton onClick={() => unban(b)} disabled={busy !== null}>
                    Débannir
                  </GhostButton>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </Panel>

      <Panel title="Réglages">
        {!settings ? (
          <EmptyLine>Chargement…</EmptyLine>
        ) : (
          <>
            <Row label="Salon des sanctions" hint="Chaque sanction y est annoncée, ainsi que les alertes d'abus du staff.">
              <ChannelPicker guildId={guildId} value={logChannel} filterTypes={[0, 5]} allowClear={false} placeholder="Choisir un salon" onChange={setLogChannel} />
            </Row>
            <Row label="Rôle de quarantaine" hint="Donné par la sanction Quarantaine, retiré à son expiration.">
              <RoleChips guildId={guildId} ids={settings.quarantineRoleId ? [settings.quarantineRoleId] : []} max={1} onChange={(ids) => saveSettings({ quarantineRoleId: ids[0] ?? null })} />
            </Row>
          </>
        )}
      </Panel>

      <Panel title="Avertissements" subtitle="Sanction automatique quand un membre cumule des avertissements actifs (/warn)." actions={esc && <Switch checked={esc.enabled} onChange={(v) => saveEsc({ enabled: v })} label="Sanction automatique" />}>
        {!esc ? (
          <EmptyLine>Chargement…</EmptyLine>
        ) : (
          <div className={cn("transition-opacity", !esc.enabled && "pointer-events-none opacity-50")}>
            <Row label="Au bout de">
              <Stepper value={esc.threshold} min={1} max={20} unit="avertissements" onCommit={(n) => saveEsc({ threshold: n })} />
            </Row>
            <Row label="Sanction">
              <Segmented
                label="Sanction automatique"
                value={esc.action}
                options={[
                  ["timeout", "Exclure"],
                  ["kick", "Expulser"],
                  ["ban", "Bannir"],
                ]}
                onChange={(v) => saveEsc({ action: v })}
              />
            </Row>
            {esc.action === "timeout" && (
              <Row label="Durée de l'exclusion">
                <Stepper value={Math.round(esc.durationSeconds / 60)} min={1} max={40320} unit="min" onCommit={(n) => saveEsc({ durationSeconds: n * 60 })} />
              </Row>
            )}
          </div>
        )}
      </Panel>

      <Panel title="Abus du staff" subtitle="Alerte dans le salon des sanctions quand un modérateur dépasse ces seuils en une minute.">
        {!settings ? (
          <EmptyLine>Chargement…</EmptyLine>
        ) : (
          (
            [
              ["maxBansPerMinute", "Bannissements"],
              ["maxKicksPerMinute", "Expulsions"],
              ["maxTimeoutsPerMinute", "Exclusions"],
            ] as const
          ).map(([k, label]) => (
            <Row key={k} label={label}>
              <Stepper value={settings.staffAbuseLimits[k]} min={1} max={100} unit="par minute" onCommit={(n) => saveSettings({ staffAbuseLimits: { ...settings.staffAbuseLimits, [k]: n } })} />
            </Row>
          ))
        )}
      </Panel>
    </ConsolePage>
  );
}
