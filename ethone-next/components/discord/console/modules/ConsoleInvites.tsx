"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import ChannelPicker, { fetchGuildChannels, type ChannelOption } from "../../ChannelPicker";
import { confirmDialog } from "@/lib/confirmDialog";
import { useToast } from "@/components/ToastProvider";
import { SPRING_LAYOUT } from "@/lib/ease";
import { pageStagger } from "@/lib/motion-variants";
import { cn } from "@/lib/utils";
import { ConsolePage, EmptyLine, GhostButton, Panel, RoleAdder, Row, StatTile, Stepper, Switch, useGuildApi } from "../kit";

type Settings = { enabled: boolean; trackBots: boolean; rewardsEnabled: boolean; notificationChannel?: string; notificationEvents: { onValidJoin: boolean; onSuspiciousJoin: boolean; onReward: boolean; onLeave: boolean }; notificationMessageTemplate: string };
type Kpis = { totalInvites: number; validInvites: number; fakeJoins: number; leftMembers: number; joinsThisWeek: number };
type Leader = { rank: number; userId: string; userTag: string; validInvites: number; leftMembers: number; suspiciousInvites: number };
type Reward = { id: string; name: string; requiredValidInvites: number; roleId?: string; roleName?: string };
type Link = { code: string; creator: string; uses: number; maxUses: number | string; expires: string; url: string };

/** Invitations (format Keeper) : qui fait venir qui, annonces, paliers de récompense et liens du serveur. */
export default function ConsoleInvites({ guildId }: { guildId: string }) {
  const api = useGuildApi(guildId);
  const { success } = useToast();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [leaders, setLeaders] = useState<Leader[] | null>(null);
  const [rewards, setRewards] = useState<Reward[] | null>(null);
  const [links, setLinks] = useState<Link[] | null>(null);
  const [template, setTemplate] = useState("");
  const [tier, setTier] = useState(5);
  const [syncing, setSyncing] = useState(false);
  const [channels, setChannels] = useState<ChannelOption[]>([]);

  const loadLinks = useCallback(async () => {
    const r = await api<{ links: Link[] }>("/invites/links", { silent: true });
    setLinks((r?.links ?? []).sort((a, b) => b.uses - a.uses));
  }, [api]);
  useEffect(() => {
    api<{ settings: Settings }>("/invites/settings").then((r) => {
      if (!r) return;
      setSettings(r.settings);
      setTemplate(r.settings.notificationMessageTemplate);
    });
    api<{ kpis: Kpis }>("/invites/overview", { silent: true }).then((r) => r && setKpis(r.kpis));
    api<{ leaderboard: Leader[] }>("/invites/leaderboard", { silent: true }).then((r) => setLeaders((r?.leaderboard ?? []).slice(0, 10)));
    api<{ rewards: Reward[] }>("/invites/rewards").then((r) => setRewards(r?.rewards ?? []));
    void loadLinks();
    fetchGuildChannels(guildId).then(setChannels);
  }, [api, guildId, loadLinks]);

  const save = async (patch: Partial<Settings>) => {
    if (settings) setSettings({ ...settings, ...patch });
    const r = await api<{ settings: Settings }>("/invites/settings", { method: "PUT", json: patch });
    if (r) setSettings(r.settings);
  };
  const events = (patch: Partial<Settings["notificationEvents"]>) => settings && save({ notificationEvents: { ...settings.notificationEvents, ...patch } });

  const addReward = async (role: { id: string; name: string }) => {
    const r = await api<{ reward: Reward }>("/invites/rewards", { method: "POST", json: { name: `${tier} invitations`, requiredValidInvites: tier, roleId: role.id, roleName: role.name } });
    if (r) setRewards((l) => [...(l ?? []), r.reward].sort((a, b) => a.requiredValidInvites - b.requiredValidInvites));
  };
  const removeReward = async (rw: Reward) => {
    if (!(await confirmDialog(`Retirer le palier de ${rw.requiredValidInvites} invitations ? Les rôles déjà donnés restent.`, { title: "Retirer le palier", confirmLabel: "Retirer" }))) return;
    const r = await api(`/invites/rewards/${rw.id}`, { method: "DELETE" });
    if (r) setRewards((l) => l?.filter((x) => x.id !== rw.id) ?? null);
  };
  const sync = async () => {
    setSyncing(true);
    const r = await api("/invites/sync", { method: "POST", json: {} });
    setSyncing(false);
    if (r) {
      success("Liens à jour", "Les compteurs Discord ont été relus.");
      void loadLinks();
    }
  };

  return (
    <ConsolePage title="Invitations">
      <motion.div variants={pageStagger} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Arrivées suivies" value={kpis?.totalInvites ?? "—"} hint={kpis ? `${kpis.joinsThisWeek} cette semaine` : undefined} />
        <StatTile label="Valides" value={kpis?.validInvites ?? "—"} />
        <StatTile label="Suspectes" value={kpis?.fakeJoins ?? "—"} />
        <StatTile label="Repartis" value={kpis?.leftMembers ?? "—"} />
      </motion.div>

      <Panel title="Suivi" actions={settings && <Switch checked={settings.enabled} onChange={(v) => save({ enabled: v })} label="Suivi des invitations" />}>
        {!settings ? (
          <EmptyLine>Chargement…</EmptyLine>
        ) : (
          <div className={cn("transition-opacity", !settings.enabled && "pointer-events-none opacity-50")}>
            <Row label="Compter les bots">
              <Switch checked={settings.trackBots} onChange={(v) => save({ trackBots: v })} label="Compter les bots" />
            </Row>
            <Row label="Salon des annonces" hint="Vide : aucune annonce.">
              <ChannelPicker guildId={guildId} value={channels.find((c) => c.name === settings.notificationChannel)?.id ?? settings.notificationChannel ?? ""} filterTypes={[0]} placeholder="Aucun" onChange={(id) => save({ notificationChannel: id })} />
            </Row>
            {settings.notificationChannel && (
              <>
                <Row label="Annoncer les arrivées">
                  <Switch checked={settings.notificationEvents.onValidJoin} onChange={(v) => events({ onValidJoin: v })} label="Annoncer les arrivées" />
                </Row>
                {settings.notificationEvents.onValidJoin && (
                  <Row label="Message" hint="{user}, {inviter}, {inviteCount}, {server}.">
                    <textarea
                      value={template}
                      maxLength={2000}
                      rows={2}
                      onChange={(e) => setTemplate(e.target.value)}
                      onBlur={() => template.trim() && template !== settings.notificationMessageTemplate && save({ notificationMessageTemplate: template })}
                      className="w-full rounded-lg border border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]/70"
                    />
                  </Row>
                )}
                <Row label="Signaler les arrivées suspectes" hint="Comptes récents ou vagues d'arrivées par le même lien.">
                  <Switch checked={settings.notificationEvents.onSuspiciousJoin} onChange={(v) => events({ onSuspiciousJoin: v })} label="Signaler les arrivées suspectes" />
                </Row>
              </>
            )}
          </div>
        )}
      </Panel>

      <Panel title="Récompenses" subtitle="Un rôle donné quand un membre atteint un nombre d'invitations valides." actions={settings && <Switch checked={settings.rewardsEnabled} onChange={(v) => save({ rewardsEnabled: v })} label="Récompenses" />}>
        {!rewards ? (
          <EmptyLine>Chargement…</EmptyLine>
        ) : (
          <div className={cn("transition-opacity", settings && !settings.rewardsEnabled && "opacity-50")}>
            <ul>
              <AnimatePresence initial={false}>
                {rewards.map((rw) => (
                  <motion.li key={rw.id} layout initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} transition={SPRING_LAYOUT} className="flex items-center gap-3 border-b border-[var(--panel-border)] px-5 py-3">
                    <span className="w-24 shrink-0 text-[13px] font-semibold tabular-nums text-[var(--text-primary)]">{rw.requiredValidInvites} invit.</span>
                    <span className="flex min-w-0 flex-1 items-center gap-2 text-sm text-[var(--text-primary)]">
                      <span className="truncate">{rw.roleName ?? "Rôle"}</span>
                    </span>
                    <button type="button" onClick={() => removeReward(rw)} aria-label={`Retirer le palier ${rw.requiredValidInvites}`} className="rounded-md p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--danger)]">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
            <div className="flex flex-wrap items-center gap-2 px-5 py-3">
              <span className="text-xs text-[var(--text-muted)]">Nouveau palier :</span>
              <Stepper value={tier} min={1} max={1000} unit="invitations" onCommit={setTier} />
              <RoleAdder guildId={guildId} label="Rôle" excludeIds={rewards.filter((r) => r.requiredValidInvites === tier).map((r) => r.roleId ?? "")} onPick={addReward} />
            </div>
          </div>
        )}
      </Panel>

      <Panel title="Meilleurs inviteurs">
        {!leaders ? (
          <EmptyLine>Chargement…</EmptyLine>
        ) : leaders.length === 0 ? (
          <EmptyLine>Aucune arrivée suivie pour l&apos;instant.</EmptyLine>
        ) : (
          <ul>
            {leaders.map((l) => (
              <li key={l.userId} className="flex items-center gap-3 border-t border-[var(--panel-border)] px-5 py-2.5 first:border-t-0">
                <span className="w-6 shrink-0 text-xs tabular-nums text-[var(--text-muted)]">{l.rank}</span>
                <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-[var(--text-primary)]">{l.userTag}</span>
                <span className="text-xs tabular-nums text-[var(--text-muted)]">
                  <span className="font-semibold text-[var(--text-primary)]">{l.validInvites}</span> valide{l.validInvites > 1 ? "s" : ""}
                  {l.leftMembers > 0 && ` · ${l.leftMembers} parti${l.leftMembers > 1 ? "s" : ""}`}
                  {l.suspiciousInvites > 0 && ` · ${l.suspiciousInvites} suspect${l.suspiciousInvites > 1 ? "s" : ""}`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Liens d'invitation" actions={<GhostButton onClick={sync} disabled={syncing}>{syncing ? "Lecture…" : "Actualiser"}</GhostButton>}>
        {!links ? (
          <EmptyLine>Chargement…</EmptyLine>
        ) : links.length === 0 ? (
          <EmptyLine>Aucun lien connu. Actualise pour relire ceux du serveur.</EmptyLine>
        ) : (
          <ul>
            {links.map((l) => (
              <li key={l.code} className="flex items-center gap-3 border-t border-[var(--panel-border)] px-5 py-2.5 first:border-t-0">
                <a href={l.url} target="_blank" rel="noreferrer" className="w-28 shrink-0 truncate font-mono text-xs text-[var(--text-primary)] hover:underline">
                  {l.code}
                </a>
                <span className="min-w-0 flex-1 truncate text-xs text-[var(--text-muted)]">{l.creator}</span>
                <span className="text-xs tabular-nums text-[var(--text-muted)]">
                  {l.uses}
                  {typeof l.maxUses === "number" ? ` / ${l.maxUses}` : ""} utilisation{l.uses > 1 ? "s" : ""} · {l.expires === "Jamais" ? "sans expiration" : `expire le ${l.expires}`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </ConsolePage>
  );
}
