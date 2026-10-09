"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { confirmDialog } from "@/lib/confirmDialog";
import { sinceLabel } from "@/lib/discord/security-scan";
import { pageStagger } from "@/lib/motion-variants";
import { cn } from "@/lib/utils";
import { ConsolePage, EmptyLine, GhostButton, Panel, Row, Segmented, StatTile, Stepper, roleColor, useGuildApi } from "../kit";

type RoleRow = { id: string; name: string; color: string; memberCount: number; sensitive: string[]; secured: boolean; editable: boolean };
type MemberRow = { userId: string; displayName: string; avatar: string | null; roleNames: string[]; status: "none" | "invited" | "pending" | "active"; sessionExpiresAt: string | null; lockedUntil: string | null };
type Audit = { id: string; type: string; detail: string; at: string; userName: string | null };
type Overview = {
  config: { enabled: boolean; sessionMinutes: number; roles: { roleId: string }[] };
  roles: RoleRow[];
  members: MemberRow[];
  audit: Audit[];
  bot: { canManageRoles: boolean };
};

const STATUS: Record<MemberRow["status"], [string, string]> = {
  none: ["Pas invité", "text-[var(--text-muted)]"],
  invited: ["Invité", "text-[var(--warning)]"],
  pending: ["Configuration en cours", "text-[var(--text-primary)]"],
  active: ["Protégé", "text-[var(--success)]"],
};

/**
 * Rôles sécurisés (format Keeper) : les permissions sensibles d'un rôle ne s'activent qu'après un code à usage unique
 * (/elevate), pour qu'un compte volé ne puisse pas s'en servir.
 */
export default function ConsoleSecureRoles({ guildId }: { guildId: string }) {
  const api = useGuildApi(guildId);
  const [ov, setOv] = useState<Overview | null>(null);
  const [roleFilter, setRoleFilter] = useState<"sensitive" | "all">("sensitive");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await api<Overview>("/secure-roles/overview");
    if (r) setOv(r);
  }, [api]);
  useEffect(() => {
    void load();
  }, [load]);

  const call = async (key: string, path: string, method: string, json?: unknown) => {
    setBusy(key);
    const r = await api(path, { method, json });
    setBusy(null);
    if (r) void load();
    return r;
  };
  const secure = async (r: RoleRow) => {
    if (!(await confirmDialog(`Sécuriser « ${r.name} » ? Ses ${r.memberCount} membre(s) perdent ses permissions sensibles jusqu'à ce qu'ils valident un code avec /elevate. Ils sont invités automatiquement.`, { title: "Sécuriser le rôle", confirmLabel: "Sécuriser" })))
      return;
    await call(`role:${r.id}`, "/secure-roles/roles", "POST", { roleId: r.id });
  };
  const restore = async (r: RoleRow) => {
    if (!(await confirmDialog(`Restaurer « ${r.name} » ? Le rôle retrouve toutes ses permissions sans code.`, { title: "Restaurer le rôle", confirmLabel: "Restaurer" }))) return;
    await call(`role:${r.id}`, `/secure-roles/roles/${r.id}`, "DELETE");
  };
  const resetMember = async (m: MemberRow) => {
    if (!(await confirmDialog(`Réinitialiser l'authentification de ${m.displayName} ? Sa session est fermée et il devra être réinvité (téléphone perdu, compte suspect).`, { title: "Réinitialiser", confirmLabel: "Réinitialiser" }))) return;
    await call(`m:${m.userId}`, `/secure-roles/members/${m.userId}/reset`, "POST", {});
  };

  if (!ov) {
    return (
      <ConsolePage title="Rôles sécurisés">
        <Panel>
          <EmptyLine>Chargement…</EmptyLine>
        </Panel>
      </ConsolePage>
    );
  }
  const secured = ov.roles.filter((r) => r.secured);
  const shownRoles = ov.roles.filter((r) => r.secured || roleFilter === "all" || r.sensitive.length > 0);
  const sessions = ov.members.filter((m) => m.sessionExpiresAt).length;

  return (
    <ConsolePage title="Rôles sécurisés">
      {!ov.config.enabled && (
        <Panel>
          <p className="px-5 py-3 text-xs text-[var(--warning)]">Module désactivé. Active-le avec l&apos;interrupteur en haut de la page avant de sécuriser un rôle.</p>
        </Panel>
      )}
      {!ov.bot.canManageRoles && (
        <Panel>
          <p className="px-5 py-3 text-xs text-[var(--danger)]">Etho n&apos;a pas la permission « Gérer les rôles » : il ne peut ni sécuriser ni ouvrir de session.</p>
        </Panel>
      )}

      <motion.div variants={pageStagger} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Rôles sécurisés" value={secured.length} hint="25 au maximum" />
        <StatTile label="Membres protégés" value={ov.members.filter((m) => m.status === "active").length} hint={`sur ${ov.members.length}`} />
        <StatTile label="Sessions ouvertes" value={sessions} />
        <StatTile label="En attente" value={ov.members.filter((m) => m.status === "invited" || m.status === "pending").length} hint="invités ou en configuration" />
      </motion.div>

      <Panel title="Fonctionnement">
        <Row label="Comment ça marche" hint="Seuls les membres invités par un administrateur peuvent s'enrôler.">
          <p className="text-xs leading-relaxed text-[var(--text-muted)]">
            Un membre invité tape <code className="rounded bg-[var(--surface-hover)] px-1">/elevate</code> : Etho lui donne une clé pour son application d&apos;authentification. Ensuite,{" "}
            <code className="rounded bg-[var(--surface-hover)] px-1">/elevate code:123456</code> rend les permissions sensibles pendant la durée de session.
          </p>
        </Row>
        <Row label="Durée d'une session">
          <Stepper value={ov.config.sessionMinutes} min={5} max={240} step={5} unit="minutes" onCommit={(n) => call("cfg", "/secure-roles/config", "PUT", { sessionMinutes: n })} />
        </Row>
      </Panel>

      <Panel
        title="Rôles"
        actions={
          <Segmented
            label="Rôles affichés"
            value={roleFilter}
            options={[
              ["sensitive", "Avec permissions sensibles"],
              ["all", "Tous"],
            ]}
            onChange={setRoleFilter}
          />
        }
      >
        {shownRoles.length === 0 ? (
          <EmptyLine>Aucun rôle avec des permissions sensibles.</EmptyLine>
        ) : (
          <ul>
            {shownRoles.map((r) => (
              <li key={r.id} className="flex items-center gap-3 border-t border-[var(--panel-border)] px-5 py-3 first:border-t-0">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: roleColor(r.color) }} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-[var(--text-primary)]">
                    {r.name}
                    {r.secured && <span className="ml-2 text-[11px] font-semibold text-[var(--success)]">Sécurisé</span>}
                  </p>
                  <p className="truncate text-[11px] text-[var(--text-muted)]">
                    {r.memberCount} membre{r.memberCount > 1 ? "s" : ""}
                    {r.sensitive.length ? ` · ${r.sensitive.join(", ")}` : ""}
                  </p>
                </div>
                {r.secured ? (
                  <GhostButton disabled={busy === `role:${r.id}`} onClick={() => restore(r)}>
                    Restaurer
                  </GhostButton>
                ) : (
                  <GhostButton disabled={!ov.config.enabled || !r.editable || r.sensitive.length === 0 || busy === `role:${r.id}`} onClick={() => secure(r)}>
                    {r.editable ? "Sécuriser" : "Au-dessus d'Etho"}
                  </GhostButton>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Équipe" subtitle="Membres qui ont un rôle sécurisé.">
        {ov.members.length === 0 ? (
          <EmptyLine>Personne n&apos;a de rôle sécurisé.</EmptyLine>
        ) : (
          <ul>
            {ov.members.map((m) => (
              <li key={m.userId} className="flex flex-wrap items-center gap-3 border-t border-[var(--panel-border)] px-5 py-3 first:border-t-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {m.avatar ? <img src={m.avatar} alt="" className="h-7 w-7 rounded-full" /> : <span className="h-7 w-7 rounded-full bg-[var(--panel-border)]" />}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-[var(--text-primary)]">{m.displayName}</p>
                  <p className="truncate text-[11px] text-[var(--text-muted)]">
                    <span className={STATUS[m.status][1]}>{STATUS[m.status][0]}</span> · {m.roleNames.join(", ")}
                    {m.sessionExpiresAt ? ` · session jusqu'à ${new Date(m.sessionExpiresAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}` : ""}
                    {m.lockedUntil && new Date(m.lockedUntil) > new Date() ? " · bloqué (trop d'essais)" : ""}
                  </p>
                </div>
                <div className="flex gap-1.5">
                  {(m.status === "none" || m.status === "invited") && (
                    <GhostButton disabled={busy === `m:${m.userId}`} onClick={() => call(`m:${m.userId}`, `/secure-roles/members/${m.userId}/invite`, "POST", {})}>
                      {m.status === "invited" ? "Réinviter" : "Inviter"}
                    </GhostButton>
                  )}
                  {m.sessionExpiresAt && (
                    <GhostButton disabled={busy === `m:${m.userId}`} onClick={() => call(`m:${m.userId}`, `/secure-roles/members/${m.userId}/revoke`, "POST", {})}>
                      Terminer la session
                    </GhostButton>
                  )}
                  {(m.status === "pending" || m.status === "active") && (
                    <GhostButton disabled={busy === `m:${m.userId}`} onClick={() => resetMember(m)}>
                      Réinitialiser
                    </GhostButton>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Journal">
        {ov.audit.length === 0 ? (
          <EmptyLine>Aucune action pour l&apos;instant.</EmptyLine>
        ) : (
          <ul className="max-h-80 overflow-y-auto">
            {ov.audit.map((a) => (
              <li key={a.id} className={cn("flex items-start gap-3 border-t border-[var(--panel-border)] px-5 py-2.5 first:border-t-0")}>
                <span className="w-24 shrink-0 text-[11px] text-[var(--text-muted)]">{sinceLabel(a.at)}</span>
                <p className="min-w-0 flex-1 text-xs text-[var(--text-primary)]">
                  {a.userName && <span className="font-semibold">{a.userName} · </span>}
                  {a.detail}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </ConsolePage>
  );
}
