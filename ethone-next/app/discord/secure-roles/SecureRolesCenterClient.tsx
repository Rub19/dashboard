"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, RefreshCw, X } from "@/components/icons/ph";
import { useToast } from "@/components/ToastProvider";
import { useDiscordOAuth } from "@/lib/hooks/useDiscordOAuth";
import { useResolvedGuildId } from "@/lib/hooks/useBotGuildIds";
import { subscribeGuildLive } from "@/lib/guildLive";
import { confirmDialog } from "@/lib/confirmDialog";
import { EthoneIcon } from "@/components/EthoneIcon";
import { cn } from "@/lib/utils";

const BOT_API_URL = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "";
const WELCOME_KEY = "ethone.secureRoles.welcomeSeen";

interface RoleRow {
  id: string;
  name: string;
  color: string;
  memberCount: number;
  sensitive: string[];
  secured: boolean;
  editable: boolean;
}
interface MemberRow {
  userId: string;
  tag: string;
  displayName: string;
  avatar: string | null;
  roleNames: string[];
  status: "none" | "invited" | "pending" | "active";
  lockedUntil: string | null;
  sessionExpiresAt: string | null;
}
interface AuditRow {
  id: string;
  type: string;
  userId: string | null;
  userName: string | null;
  detail: string;
  at: string;
}
interface Overview {
  config: { enabled: boolean; sessionMinutes: number; roles: Array<{ roleId: string; permissionsRoleId: string }> };
  roles: RoleRow[];
  members: MemberRow[];
  audit: AuditRow[];
  bot: { canManageRoles: boolean };
}

const STATUS: Record<MemberRow["status"], { label: string; cls: string }> = {
  none: { label: "Pas invité", cls: "bg-zinc-800 text-zinc-300" },
  invited: { label: "Invité", cls: "bg-amber-500/15 text-amber-300" },
  pending: { label: "Configuration en cours", cls: "bg-sky-500/15 text-sky-300" },
  active: { label: "Protégé", cls: "bg-emerald-500/15 text-emerald-300" },
};
const AUDIT_LABEL: Record<string, string> = {
  secured: "Rôle sécurisé",
  restored: "Rôle restauré",
  invited: "Invitation",
  enrolled: "Authentification activée",
  elevated: "Session ouverte",
  ended: "Session terminée",
  failed: "Code erroné",
  locked: "Compte bloqué",
  blocked: "Tentative bloquée",
  reset: "Réinitialisation",
};
const AUDIT_TONE: Record<string, string> = { failed: "text-amber-300", locked: "text-rose-300", blocked: "text-rose-300", elevated: "text-emerald-300" };
const DURATIONS = [5, 10, 15, 30, 60, 120, 240];

const PERM_FR: Record<string, string> = {
  Administrator: "Administrateur",
  ManageGuild: "Gérer le serveur",
  ManageRoles: "Gérer les rôles",
  ManageChannels: "Gérer les salons",
  ManageWebhooks: "Gérer les webhooks",
  ManageGuildExpressions: "Gérer les émojis",
  ManageEvents: "Gérer les événements",
  ViewAuditLog: "Voir les logs du serveur",
  KickMembers: "Expulser",
  BanMembers: "Bannir",
  ModerateMembers: "Exclure temporairement",
  ManageMessages: "Gérer les messages",
  ManageThreads: "Gérer les fils",
  MentionEveryone: "Mentionner @everyone",
  MoveMembers: "Déplacer en vocal",
  MuteMembers: "Rendre muet",
  DeafenMembers: "Mettre en sourdine",
};
const permLabel = (p: string) => PERM_FR[p] ?? p;

const fmtTime = (iso: string) => new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

function Item({ n, title, text }: { n: string; title: string; text: string }) {
  return (
    <div className="flex gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-xs font-bold text-emerald-300">{n}</span>
      <div>
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-zinc-400">{text}</p>
      </div>
    </div>
  );
}

/** Fenêtre d'accueil : le problème, le principe, ce que l'équipe voit. Affichée une fois, rouvrable depuis « Comment ça marche ». */
function WelcomeModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Rôles sécurisés">
      <div className="w-full max-w-lg rounded-3xl border border-[var(--panel-border)] bg-[var(--bg-surface)] p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-300">
              <EthoneIcon name="mod-security" className="h-6 w-6" />
            </span>
            <h2 className="text-lg font-bold text-white">Protégez votre équipe avec les rôles sécurisés</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" className="cursor-pointer rounded-lg p-1.5 text-zinc-400 hover:bg-white/5 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-5 space-y-4">
          <Item n="1" title="Le problème" text="Un compte du personnel piraté suffit pour bannir vos membres, supprimer vos salons ou casser les rôles, en quelques secondes." />
          <Item n="2" title="La solution" text="Les permissions sensibles (bannir, gérer les rôles, administrateur…) quittent le rôle visible pour un rôle caché. Le membre ne l'obtient que quelques minutes, après un code à usage unique de son application d'authentification (/elevate). Un pirate qui a le compte Discord n'a pas le code." />
          <Item n="3" title="Invisible pour votre équipe" text="Le rôle garde son nom, sa couleur et sa place dans la hiérarchie. Vos modérateurs continuent de discuter normalement ; ils tapent /elevate seulement quand ils doivent sanctionner." />
        </div>
        <button type="button" onClick={onClose} className="mt-6 w-full cursor-pointer rounded-xl bg-[#5865F2] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#4752C4]">
          Compris, commencer
        </button>
      </div>
    </div>
  );
}

export default function SecureRolesCenterClient() {
  const searchParams = useSearchParams();
  const { profile } = useDiscordOAuth();
  const guildId = useResolvedGuildId(searchParams.get("guildId"), profile?.guilds);
  const { success, error: showError } = useToast();

  const [data, setData] = useState<Overview | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "offline">("loading");
  const [busy, setBusy] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [welcome, setWelcome] = useState(false);

  const base = `${BOT_API_URL}/api/guilds/${encodeURIComponent(guildId)}/secure-roles`;

  useEffect(() => {
    try {
      if (!localStorage.getItem(WELCOME_KEY)) setWelcome(true);
    } catch {
      /* stockage indisponible : pas de fenêtre d'accueil automatique */
    }
  }, []);
  const closeWelcome = () => {
    setWelcome(false);
    try {
      localStorage.setItem(WELCOME_KEY, "1");
    } catch {
      /* ignoré */
    }
  };

  const load = useCallback(async () => {
    if (!guildId || !BOT_API_URL) {
      setState(BOT_API_URL ? "loading" : "offline");
      return;
    }
    try {
      const res = await fetch(`${base}/overview`, { credentials: "include" });
      if (!res.ok) throw new Error(String(res.status));
      setData((await res.json()) as Overview);
      setState("ok");
    } catch {
      setState("offline");
    }
  }, [guildId, base]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!guildId) return;
    let t: ReturnType<typeof setTimeout> | null = null;
    const unsub = subscribeGuildLive(guildId, (e) => {
      if (e.type !== "CONFIG_UPDATED") return;
      if (t) clearTimeout(t);
      t = setTimeout(() => void load(), 300);
    });
    return () => {
      if (t) clearTimeout(t);
      unsub();
    };
  }, [guildId, load]);

  const call = async (key: string, path: string, method: string, body: unknown, okTitle: string, okText = "") => {
    setBusy(key);
    try {
      const res = await fetch(`${base}${path}`, { method, credentials: "include", headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || String(res.status));
      await load();
      success(okTitle, okText);
      return json;
    } catch (err) {
      showError("Action impossible", err instanceof Error && err.message ? err.message : "Le bot n'a pas répondu.");
      return null;
    } finally {
      setBusy(null);
    }
  };

  const secure = async (role: RoleRow) => {
    const ok = await confirmDialog(
      `Sécuriser « ${role.name} » ?\n\nLes permissions ${role.sensitive.map(permLabel).join(", ")} seront retirées de ce rôle et données à un rôle caché « 🔐 ${role.name} ». Les ${role.memberCount} membre(s) qui l'ont devront taper /elevate avec un code d'application d'authentification pour les retrouver 30 minutes. Vous pouvez restaurer le rôle à tout moment.`,
      { title: "Sécuriser ce rôle", confirmLabel: "Sécuriser", tone: "danger" }
    );
    if (!ok) return;
    const out = await call(`role:${role.id}`, "/roles", "POST", { roleId: role.id }, "Rôle sécurisé", "Les membres concernés sont invités à configurer leur code avec /elevate.");
    if (out?.invited != null) success("Invitations", `${out.invited} membre(s) invité(s) à configurer leur authentification.`);
  };

  const restore = async (role: RoleRow) => {
    if (!(await confirmDialog(`Restaurer « ${role.name} » ? Ses permissions d'origine lui sont rendues et le rôle caché est supprimé : le rôle n'est plus protégé.`, { title: "Restaurer le rôle", confirmLabel: "Restaurer", tone: "danger" }))) return;
    await call(`role:${role.id}`, `/roles/${role.id}`, "DELETE", undefined, "Rôle restauré");
  };

  const resetMember = async (m: MemberRow) => {
    if (!(await confirmDialog(`Réinitialiser l'authentification de ${m.displayName} ? Sa session est fermée et il devra être réinvité pour configurer un nouveau code (téléphone perdu, compte suspect).`, { title: "Réinitialiser", confirmLabel: "Réinitialiser", tone: "danger" }))) return;
    await call(`m:${m.userId}`, `/members/${m.userId}/reset`, "POST", {}, "Authentification réinitialisée");
  };

  const back = (
    <Link href={`/discord${guildId ? `?guildId=${guildId}` : ""}`} className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-xs font-semibold text-zinc-300 transition hover:bg-zinc-800 hover:text-white">
      <ArrowLeft className="h-3.5 w-3.5 text-zinc-400" />
      Retour Discord
    </Link>
  );

  if (state !== "ok" || !data) {
    return (
      <div className="h-full overflow-y-auto px-4 pb-44 pt-6 text-white sm:px-6 lg:px-10">
        {back}
        <p className="mt-8 text-sm text-zinc-400">{state === "offline" ? "Le bot est injoignable ou n'est pas sur ce serveur : impossible de charger les rôles sécurisés." : "Chargement…"}</p>
      </div>
    );
  }

  const { config } = data;
  const risky = data.roles.filter((r) => r.sensitive.length > 0 || r.secured);
  const others = data.roles.filter((r) => r.sensitive.length === 0 && !r.secured);

  return (
    <div className="h-full overflow-y-auto bg-[var(--bg-main)] px-4 pb-44 pt-6 text-white sm:px-6 lg:px-10">
      {welcome && <WelcomeModal onClose={closeWelcome} />}
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="mb-2 flex items-center gap-2">{back}</div>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Rôles sécurisés</h1>
            <p className="mt-1 max-w-2xl text-sm text-zinc-400">Les permissions sensibles de votre équipe ne s&apos;activent qu&apos;après un code à usage unique.</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setWelcome(true)} className="cursor-pointer rounded-xl border border-zinc-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/5">
              Comment ça marche
            </button>
            <button type="button" onClick={() => void load()} aria-label="Actualiser" className="cursor-pointer rounded-xl border border-zinc-700 p-2 text-zinc-300 transition hover:bg-white/5">
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {!config.enabled ? (
          <section className="rounded-3xl border border-[var(--panel-border)] bg-white/[0.02] p-8 text-center">
            <h2 className="text-lg font-bold">Votre équipe n&apos;est pas encore protégée</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-zinc-400">Activez le module, puis choisissez les rôles à sécuriser. Rien ne change tant que vous n&apos;avez pas sécurisé un rôle.</p>
            <button type="button" disabled={busy === "enable"} onClick={() => void call("enable", "/config", "PUT", { enabled: true }, "Module activé")} className="mt-6 cursor-pointer rounded-xl bg-[#5865F2] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#4752C4] disabled:opacity-50">
              Activer les rôles sécurisés
            </button>
          </section>
        ) : (
          <>
            {!data.bot.canManageRoles && <p className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">Le bot n&apos;a pas la permission « Gérer les rôles » : il ne pourra pas sécuriser de rôle. Ajoutez-la à son rôle dans Paramètres du serveur → Rôles, en le plaçant au-dessus des rôles à protéger.</p>}

            <section className="rounded-2xl border border-[var(--panel-border)] bg-white/[0.02] p-5">
              <h2 className="text-base font-bold">1. Choisir les rôles à protéger</h2>
              <p className="mt-1 text-xs text-zinc-400">Le bot doit être placé au-dessus du rôle dans la hiérarchie et posséder lui-même les permissions déplacées (le rôle Administrateur du bot suffit).</p>
              <div className="mt-4 divide-y divide-white/5">
                {risky.length === 0 && <p className="py-3 text-sm text-zinc-400">Aucun rôle ne porte de permission sensible.</p>}
                {risky.map((r) => (
                  <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 text-sm font-semibold">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: r.color && r.color !== "#000000" ? r.color : "#71717a" }} />
                        <span className="truncate">{r.name}</span>
                        <span className="text-[11px] font-normal text-zinc-500">{r.memberCount} membre(s)</span>
                        {r.secured && <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-300">Sécurisé</span>}
                      </p>
                      {!r.secured && (
                        <p className="mt-1 flex flex-wrap gap-1">
                          {r.sensitive.map((p) => (
                            <span key={p} className="rounded bg-rose-500/10 px-1.5 py-0.5 text-[11px] text-rose-300">
                              {permLabel(p)}
                            </span>
                          ))}
                        </p>
                      )}
                    </div>
                    {r.secured ? (
                      <button type="button" disabled={busy === `role:${r.id}`} onClick={() => void restore(r)} className="cursor-pointer rounded-xl border border-zinc-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/5 disabled:opacity-50">
                        Restaurer
                      </button>
                    ) : (
                      <button type="button" disabled={!r.editable || busy === `role:${r.id}`} title={r.editable ? undefined : "Ce rôle est au-dessus du rôle du bot"} onClick={() => void secure(r)} className="cursor-pointer rounded-xl bg-[#5865F2] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#4752C4] disabled:cursor-not-allowed disabled:opacity-40">
                        {busy === `role:${r.id}` ? "Sécurisation…" : "Sécuriser"}
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {others.length > 0 && (
                <button type="button" onClick={() => setShowAll((v) => !v)} className="mt-3 cursor-pointer text-xs text-zinc-400 hover:text-white">
                  {showAll ? "Masquer" : `Voir ${others.length === 1 ? "le rôle sans permission sensible" : `les ${others.length} rôles sans permission sensible`}`}
                </button>
              )}
              {showAll && <p className="mt-2 text-xs text-zinc-500">{others.map((r) => r.name).join(" · ")}</p>}
            </section>

            <section className="rounded-2xl border border-[var(--panel-border)] bg-white/[0.02] p-5">
              <h2 className="text-base font-bold">2. Membres protégés</h2>
              <p className="mt-1 text-xs text-zinc-400">
                Chaque membre invité tape <code className="rounded bg-black/30 px-1">/elevate</code> sur Discord : le bot lui donne une clé à ajouter dans son application d&apos;authentification, puis <code className="rounded bg-black/30 px-1">/elevate code:123456</code> ouvre une session de {config.sessionMinutes} minutes. Seuls les membres invités par un administrateur peuvent s&apos;enrôler, pour qu&apos;un compte volé ne puisse pas configurer son propre code.
              </p>
              {data.members.length === 0 ? (
                <p className="mt-4 text-sm text-zinc-400">Aucun membre ne possède de rôle sécurisé pour l&apos;instant.</p>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[560px] text-left text-xs">
                    <thead className="text-zinc-500">
                      <tr>
                        <th className="pb-2 font-semibold">Membre</th>
                        <th className="pb-2 font-semibold">État</th>
                        <th className="pb-2 font-semibold">Session</th>
                        <th className="pb-2 text-right font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {data.members.map((m) => (
                        <tr key={m.userId}>
                          <td className="py-2.5 pr-3">
                            <span className="flex items-center gap-2">
                              {m.avatar ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={m.avatar} alt="" className="h-7 w-7 rounded-full" />
                              ) : (
                                <span className="h-7 w-7 rounded-full bg-zinc-800" />
                              )}
                              <span>
                                <span className="block text-sm font-semibold text-white">{m.displayName}</span>
                                <span className="block text-[11px] text-zinc-500">{m.roleNames.join(", ")}</span>
                              </span>
                            </span>
                          </td>
                          <td className="py-2.5 pr-3">
                            <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", STATUS[m.status].cls)}>{STATUS[m.status].label}</span>
                            {m.lockedUntil && new Date(m.lockedUntil).getTime() > Date.now() && <span className="ml-2 text-[11px] text-rose-300">bloqué jusqu&apos;à {new Date(m.lockedUntil).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>}
                          </td>
                          <td className="py-2.5 pr-3 text-zinc-300">{m.sessionExpiresAt ? `jusqu'à ${new Date(m.sessionExpiresAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}` : "—"}</td>
                          <td className="py-2.5 text-right">
                            <span className="inline-flex flex-wrap justify-end gap-1.5">
                              {(m.status === "none" || m.status === "invited") && (
                                <button type="button" disabled={busy === `m:${m.userId}`} onClick={() => void call(`m:${m.userId}`, `/members/${m.userId}/invite`, "POST", {}, "Invitation envoyée", "Le membre peut maintenant taper /elevate sur Discord (valable 24 h).")} className="cursor-pointer rounded-lg border border-zinc-700 px-2.5 py-1 font-semibold text-white transition hover:bg-white/5 disabled:opacity-50">
                                  {m.status === "invited" ? "Réinviter" : "Inviter"}
                                </button>
                              )}
                              {m.sessionExpiresAt && (
                                <button type="button" disabled={busy === `m:${m.userId}`} onClick={() => void call(`m:${m.userId}`, `/members/${m.userId}/revoke`, "POST", {}, "Session terminée")} className="cursor-pointer rounded-lg border border-zinc-700 px-2.5 py-1 font-semibold text-white transition hover:bg-white/5 disabled:opacity-50">
                                  Terminer la session
                                </button>
                              )}
                              {(m.status === "pending" || m.status === "active") && (
                                <button type="button" disabled={busy === `m:${m.userId}`} onClick={() => void resetMember(m)} className="cursor-pointer rounded-lg border border-rose-500/30 px-2.5 py-1 font-semibold text-rose-300 transition hover:bg-rose-500/10 disabled:opacity-50">
                                  Réinitialiser
                                </button>
                              )}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-[var(--panel-border)] bg-white/[0.02] p-5">
              <h2 className="text-base font-bold">3. Réglages</h2>
              <label className="mt-3 block max-w-xs text-xs text-zinc-400">
                Durée d&apos;une session
                <select value={config.sessionMinutes} disabled={busy === "duration"} onChange={(e) => void call("duration", "/config", "PUT", { sessionMinutes: Number(e.target.value) }, "Durée enregistrée", "Elle s'applique aux prochaines sessions.")} className="mt-1 h-10 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--bg-surface)] px-3 text-sm text-white">
                  {DURATIONS.map((d) => (
                    <option key={d} value={d}>
                      {d < 60 ? `${d} minutes` : `${d / 60} heure${d > 60 ? "s" : ""}`}
                    </option>
                  ))}
                </select>
              </label>
              <p className="mt-3 text-[11px] text-zinc-500">Le module ne peut être désactivé qu&apos;une fois tous les rôles restaurés, pour ne jamais enfermer votre équipe hors de ses permissions. Si quelqu&apos;un se donne à la main un rôle caché sans code, le bot le retire aussitôt et le consigne dans le journal.</p>
            </section>

            <section className="rounded-2xl border border-[var(--panel-border)] bg-white/[0.02] p-5">
              <h2 className="text-base font-bold">Journal</h2>
              {data.audit.length === 0 ? (
                <p className="mt-3 text-sm text-zinc-400">Aucune activité pour l&apos;instant.</p>
              ) : (
                <ul className="mt-3 divide-y divide-white/5 text-xs">
                  {data.audit.map((a) => (
                    <li key={a.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-2">
                      <span className="w-28 shrink-0 text-zinc-500">{fmtTime(a.at)}</span>
                      <span className={cn("w-44 shrink-0 font-semibold", AUDIT_TONE[a.type] ?? "text-white")}>{AUDIT_LABEL[a.type] ?? a.type}</span>
                      <span className="text-zinc-300">
                        {a.userName ? `${a.userName} · ` : ""}
                        {a.detail}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
