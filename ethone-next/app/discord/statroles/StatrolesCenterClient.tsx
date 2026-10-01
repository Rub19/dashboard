"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, RefreshCw, Plus, Trash2, X } from "@/components/icons/ph";
import { useToast } from "@/components/ToastProvider";
import { useDiscordOAuth } from "@/lib/hooks/useDiscordOAuth";
import { useResolvedGuildId } from "@/lib/hooks/useBotGuildIds";
import { subscribeGuildLive } from "@/lib/guildLive";
import { confirmDialog } from "@/lib/confirmDialog";
import PageHeader from "@/components/discord/PageHeader";
import { cn } from "@/lib/utils";
import Select from "@/components/ui/Select";
import { formatApiError, errorReason } from "@/lib/format-error";

const BOT_API_URL = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "";

type Op = ">=" | ">" | "<=" | "<" | "=";
type Leaf =
  | { kind: "messages"; days: number; op: Op; value: number }
  | { kind: "voice"; days: number; op: Op; hours: number }
  | { kind: "joinedAge"; op: Op; days: number }
  | { kind: "accountAge"; op: Op; days: number }
  | { kind: "hasRole"; roleId: string; not: boolean };
interface Group {
  kind: "group";
  match: "ALL" | "ANY";
  children: Node[];
}
type Node = Leaf | Group;

interface Rule {
  id: string;
  name: string;
  roleId: string;
  root: Group;
  removeWhenNotMatching: boolean;
  enabled: boolean;
}
interface RoleInfo {
  id: string;
  name: string;
  color: string;
  assignable: boolean;
}
interface Overview {
  config: { enabled: boolean; rules: Rule[]; lastRunAt: string | null; lastRun: { added: number; removed: number; errors: number; skipped: number } | null };
  statsEnabled: boolean;
  roles: RoleInfo[];
}
interface Preview {
  matching: number;
  holders: number;
  toAdd: number;
  toRemove: number;
  sample: Array<{ id: string; name: string }>;
  warnings: string[];
}

const OPS: Op[] = [">=", ">", "<=", "<", "="];
const OP_LABEL: Record<Op, string> = { ">=": "au moins", ">": "plus de", "<=": "au plus", "<": "moins de", "=": "exactement" };
const PERIODS = [1, 7, 14, 30, 60, 90, 180, 365];
const ADD_MENU: Array<{ kind: string; label: string; hint: string }> = [
  { kind: "messages", label: "Messages", hint: "nombre de messages sur une période" },
  { kind: "voice", label: "Vocal", hint: "heures passées en vocal sur une période" },
  { kind: "joinedAge", label: "Ancienneté sur le serveur", hint: "jours depuis l'arrivée" },
  { kind: "accountAge", label: "Ancienneté du compte", hint: "jours depuis la création du compte Discord" },
  { kind: "hasRole", label: "Rôle", hint: "possède (ou non) un rôle" },
  { kind: "group", label: "Groupe (Match)", hint: "sous-groupe TOUT / AU MOINS UN" },
];

const newLeaf = (kind: string): Node => {
  switch (kind) {
    case "messages":
      return { kind: "messages", days: 30, op: ">=", value: 100 };
    case "voice":
      return { kind: "voice", days: 30, op: ">=", hours: 5 };
    case "joinedAge":
      return { kind: "joinedAge", op: ">=", days: 30 };
    case "accountAge":
      return { kind: "accountAge", op: ">=", days: 90 };
    case "hasRole":
      return { kind: "hasRole", roleId: "", not: false };
    default:
      return { kind: "group", match: "ALL", children: [] };
  }
};

const emptyRule = (): Rule => ({
  id: `regle-${Math.random().toString(36).slice(2, 8)}`,
  name: "Nouvelle règle",
  roleId: "",
  root: { kind: "group", match: "ALL", children: [newLeaf("messages"), newLeaf("joinedAge")] },
  removeWhenNotMatching: true,
  enabled: true,
});

const inputCls = "h-8 rounded-xl border border-[var(--panel-border)] bg-[var(--bg-surface)] px-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--input-border-hover)]";

function countLeaves(n: Node): number {
  return n.kind === "group" ? n.children.reduce((s, c) => s + countLeaves(c), 0) : 1;
}

/** Menu « + » : ajoute une condition ou un sous-groupe. */
function AddMenu({ onAdd, canGroup }: { onAdd: (kind: string) => void; canGroup: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as globalThis.Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button type="button" aria-label="Ajouter une condition" onClick={() => setOpen((v) => !v)} className="grid h-7 w-7 cursor-pointer place-items-center rounded-xl border border-[var(--panel-border)] text-[var(--text-muted)] transition hover:bg-[var(--text-primary)]/10 hover:text-[var(--text-primary)]">
        <Plus className="h-3.5 w-3.5" />
      </button>
      {open && (
        <ul className="absolute right-0 top-[calc(100%+6px)] z-30 w-64 overflow-hidden rounded-xl border border-[var(--panel-border)] bg-[var(--bg-surface)] p-1 ">
          {ADD_MENU.filter((m) => canGroup || m.kind !== "group").map((m) => (
            <li key={m.kind}>
              <button
                type="button"
                onClick={() => {
                  onAdd(m.kind);
                  setOpen(false);
                }}
                className="w-full cursor-pointer rounded-xl px-3 py-2 text-left transition hover:bg-[var(--text-primary)]/10"
              >
                <span className="block text-xs font-semibold text-[var(--text-primary)]">{m.label}</span>
                <span className="block text-xs text-[var(--text-muted)]">{m.hint}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function OpSelect({ value, onChange }: { value: Op; onChange: (o: Op) => void }) {
  return (
    <Select
      value={value}
      onChange={(v) => onChange(v as Op)}
      size="sm"
      className="w-auto"
      aria-label="Comparaison"
      options={OPS.map((o) => ({ id: o, label: OP_LABEL[o] }))}
    />
  );
}

function NumberInput({ value, onChange, min = 0, step = 1, width = "w-20" }: { value: number; onChange: (n: number) => void; min?: number; step?: number; width?: string }) {
  return <input type="number" min={min} step={step} value={Number.isFinite(value) ? value : 0} onChange={(e) => onChange(Number(e.target.value))} className={cn(inputCls, width, "tabular-nums")} />;
}

function PeriodSelect({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <Select
      value={String(value)}
      onChange={(v) => onChange(Number(v))}
      size="sm"
      className="w-auto"
      aria-label="Période"
      options={(PERIODS.includes(value) ? PERIODS : [...PERIODS, value].sort((a, b) => a - b)).map((p) => ({ id: String(p), label: `sur ${p} j` }))}
    />
  );
}

function LeafEditor({ leaf, roles, onChange, onDelete }: { leaf: Leaf; roles: RoleInfo[]; onChange: (l: Leaf) => void; onDelete: () => void }) {
  let body: React.ReactNode;
  let title: string;
  switch (leaf.kind) {
    case "messages":
      title = "Messages";
      body = (
        <>
          <OpSelect value={leaf.op} onChange={(op) => onChange({ ...leaf, op })} />
          <NumberInput value={leaf.value} onChange={(value) => onChange({ ...leaf, value })} width="w-24" />
          <span className="text-[var(--text-muted)]">messages</span>
          <PeriodSelect value={leaf.days} onChange={(days) => onChange({ ...leaf, days })} />
        </>
      );
      break;
    case "voice":
      title = "Vocal";
      body = (
        <>
          <OpSelect value={leaf.op} onChange={(op) => onChange({ ...leaf, op })} />
          <NumberInput value={leaf.hours} step={0.5} onChange={(hours) => onChange({ ...leaf, hours })} />
          <span className="text-[var(--text-muted)]">heures</span>
          <PeriodSelect value={leaf.days} onChange={(days) => onChange({ ...leaf, days })} />
        </>
      );
      break;
    case "joinedAge":
      title = "Ancienneté sur le serveur";
      body = (
        <>
          <OpSelect value={leaf.op} onChange={(op) => onChange({ ...leaf, op })} />
          <NumberInput value={leaf.days} onChange={(days) => onChange({ ...leaf, days })} />
          <span className="text-[var(--text-muted)]">jours</span>
        </>
      );
      break;
    case "accountAge":
      title = "Ancienneté du compte";
      body = (
        <>
          <OpSelect value={leaf.op} onChange={(op) => onChange({ ...leaf, op })} />
          <NumberInput value={leaf.days} onChange={(days) => onChange({ ...leaf, days })} />
          <span className="text-[var(--text-muted)]">jours</span>
        </>
      );
      break;
    default:
      title = "Rôle";
      body = (
        <>
          <Select
            value={leaf.not ? "not" : "has"}
            onChange={(v) => onChange({ ...leaf, not: v === "not" })}
            size="sm"
            className="w-auto"
            aria-label="Possède ou non"
            options={[
              { id: "has", label: "possède" },
              { id: "not", label: "ne possède pas" },
            ]}
          />
          <Select
            value={leaf.roleId}
            onChange={(v) => onChange({ ...leaf, roleId: v })}
            size="sm"
            className="min-w-40"
            aria-label="Rôle"
            options={[
              { id: "", label: "— choisir un rôle —" },
              ...roles.map((r) => ({ id: r.id, label: r.name })),
            ]}
          />
        </>
      );
  }
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 px-3 py-2 text-xs">
      <span className="w-40 shrink-0 font-semibold text-[var(--text-primary)]">{title}</span>
      {body}
      <button type="button" aria-label="Supprimer la condition" onClick={onDelete} className="ml-auto cursor-pointer rounded-md p-1 text-[var(--text-muted)] transition hover:bg-rose-500/10 hover:text-rose-300">
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function GroupEditor({ group, roles, depth, onChange, onDelete }: { group: Group; roles: RoleInfo[]; depth: number; onChange: (g: Group) => void; onDelete?: () => void }) {
  const setChild = (i: number, node: Node) => onChange({ ...group, children: group.children.map((c, idx) => (idx === i ? node : c)) });
  const delChild = (i: number) => onChange({ ...group, children: group.children.filter((_, idx) => idx !== i) });
  return (
    <div className={cn("space-y-2 rounded-2xl border p-3", depth === 0 ? "border-[var(--panel-border)] bg-[var(--surface-raised)]/40" : "border-emerald-500/20 bg-emerald-500/[0.03]")}>
      <div className="flex items-center gap-2 text-xs">
        <span className="font-semibold text-[var(--text-muted)]">Correspond si</span>
        <Select
          value={group.match}
          onChange={(v) => onChange({ ...group, match: v as "ALL" | "ANY" })}
          size="sm"
          className="w-auto font-semibold"
          aria-label="Type de groupe"
          options={[
            { id: "ALL", label: "TOUT est vrai (ET)" },
            { id: "ANY", label: "AU MOINS UN est vrai (OU)" },
          ]}
        />
        <span className="ml-auto flex items-center gap-1.5">
          <AddMenu canGroup={depth < 3} onAdd={(kind) => onChange({ ...group, children: [...group.children, newLeaf(kind)] })} />
          {onDelete && (
            <button type="button" aria-label="Supprimer le groupe" onClick={onDelete} className="cursor-pointer rounded-md p-1.5 text-[var(--text-muted)] transition hover:bg-rose-500/10 hover:text-rose-300">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </span>
      </div>
      {group.children.length === 0 && <p className="rounded-xl border border-dashed border-[var(--panel-border)] px-3 py-2 text-xs text-[var(--text-muted)]">Groupe vide : il ne correspond à personne. Ajoutez une condition avec le bouton +.</p>}
      <div className="space-y-2 pl-3">
        {group.children.map((child, i) =>
          child.kind === "group" ? (
            <GroupEditor key={i} group={child} roles={roles} depth={depth + 1} onChange={(g) => setChild(i, g)} onDelete={() => delChild(i)} />
          ) : (
            <LeafEditor key={i} leaf={child} roles={roles} onChange={(l) => setChild(i, l)} onDelete={() => delChild(i)} />
          )
        )}
      </div>
    </div>
  );
}

/**
 * Statroles : rôles donnés ET retirés automatiquement selon l'activité. Constructeur visuel des conditions (groupes TOUT / AU
 * MOINS UN imbriqués), aperçu avant d'enregistrer, application toutes les 10 minutes par le bot.
 */
export default function StatrolesCenterClient() {
  const searchParams = useSearchParams();
  const { profile } = useDiscordOAuth();
  const guildId = useResolvedGuildId(searchParams.get("guildId"), profile?.guilds);
  const { success, error: showError } = useToast();

  const [overview, setOverview] = useState<Overview | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "offline">("loading");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<Rule | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewing, setPreviewing] = useState(false);

  const base = `${BOT_API_URL}/api/guilds/${encodeURIComponent(guildId)}/statroles`;

  const load = useCallback(async () => {
    if (!guildId || !BOT_API_URL) {
      setState(BOT_API_URL ? "loading" : "offline");
      return;
    }
    try {
      const res = await fetch(`${base}/overview`, { credentials: "include" });
      if (!res.ok) throw new Error(String(res.status));
      setOverview((await res.json()) as Overview);
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

  const roleName = useMemo(() => new Map((overview?.roles ?? []).map((r) => [r.id, r])), [overview]);

  const request = async (fn: () => Promise<Response>, okTitle?: string, okText?: string) => {
    setBusy(true);
    try {
      const res = await fn();
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(formatApiError(data?.error, ""));
      if (okTitle) success(okTitle, okText ?? "");
      return data;
    } catch (err) {
      showError("Action impossible", errorReason(err, "Le bot n'a pas répondu."));
      return null;
    } finally {
      setBusy(false);
    }
  };

  const setEnabled = async (enabled: boolean) => {
    const d = await request(() => fetch(`${base}/config`, { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled }) }), enabled ? "Statroles activés" : "Statroles désactivés", enabled ? "Les règles sont appliquées toutes les 10 minutes." : "Plus aucun rôle n'est attribué ni retiré.");
    if (d) await load();
  };

  const runNow = async () => {
    const d = await request(() => fetch(`${base}/run`, { method: "POST", credentials: "include" }));
    if (d?.summary) {
      const s = d.summary as { added: number; removed: number; errors: number; issues: string[] };
      success("Règles appliquées", `+${s.added} / −${s.removed}${s.errors ? ` · ${s.errors} erreur(s)` : ""}${s.issues.length ? ` · ${s.issues.join(" ; ")}` : ""}`);
      await load();
    }
  };

  const save = async () => {
    if (!editing) return;
    const body = { name: editing.name, roleId: editing.roleId, root: editing.root, removeWhenNotMatching: editing.removeWhenNotMatching, enabled: editing.enabled };
    const d = await request(() => fetch(`${base}/rules/${encodeURIComponent(editing.id)}`, { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }), "Règle enregistrée", "Elle est appliquée au prochain passage (ou tout de suite avec « Appliquer maintenant »).");
    if (d) {
      setEditing(null);
      setPreview(null);
      await load();
    }
  };

  const remove = async (rule: Rule) => {
    if (!(await confirmDialog(`Supprimer la règle « ${rule.name} » ? Les membres qui ont déjà le rôle le gardent, mais il ne sera plus géré automatiquement.`, { title: "Supprimer la règle", confirmLabel: "Supprimer", tone: "danger" }))) return;
    const d = await request(() => fetch(`${base}/rules/${encodeURIComponent(rule.id)}`, { method: "DELETE", credentials: "include" }), "Règle supprimée", "");
    if (d) await load();
  };

  const runPreview = async () => {
    if (!editing) return;
    setPreviewing(true);
    setPreview(null);
    const d = await request(() => fetch(`${base}/preview`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: editing.name, roleId: editing.roleId, root: editing.root, removeWhenNotMatching: editing.removeWhenNotMatching, enabled: editing.enabled }) }));
    if (d) setPreview(d as Preview);
    setPreviewing(false);
  };

  const cfg = overview?.config;

  return (
    <div className="mx-auto max-w-6xl w-full px-4 py-6 sm:px-6 text-[var(--text-primary)]">
      <div className="mx-auto w-full min-w-0 max-w-4xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href={`/discord${guildId ? `?guildId=${guildId}` : ""}`} className="inline-flex items-center gap-2 text-xs font-medium text-[var(--text-muted)] transition hover:text-[var(--text-primary)]">
            <ArrowLeft className="h-4 w-4" />
            Retour au hub Discord
          </Link>
          <button type="button" onClick={() => void load()} className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[var(--panel-border)] px-3 py-1.5 text-xs font-semibold text-[var(--text-muted)] transition hover:bg-[var(--surface-raised)]/70">
            <RefreshCw className="h-3.5 w-3.5" />
            Actualiser
          </button>
        </div>

        <PageHeader hideBack guildId={guildId} icon="mod-roles" tint="amber" title="Statroles" subtitle="Des rôles donnés, et retirés, automatiquement selon l'activité des membres dans la durée." />

        {state === "loading" && <div className="rounded-2xl border border-dashed border-[var(--panel-border)] p-8 text-center text-sm text-[var(--text-muted)]">Chargement…</div>}
        {state === "offline" && <div className="rounded-2xl border border-dashed border-[var(--panel-border)] p-8 text-center text-sm text-[var(--text-muted)]">Le bot n&apos;a pas répondu pour ce serveur. Vérifiez qu&apos;il est présent, puis actualisez.</div>}

        {state === "ok" && overview && cfg && (
          <>
            <div className={cn("flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between", cfg.enabled ? "border-emerald-500/25 bg-emerald-500/[0.05]" : "border-amber-500/25 bg-amber-500/[0.06]")}>
              <div className="text-xs leading-relaxed text-[var(--text-primary)]">
                {cfg.enabled ? (
                  <>
                    Module <strong>actif</strong> : les règles sont appliquées toutes les 10 minutes.
                    {cfg.lastRunAt && cfg.lastRun ? <> Dernier passage : +{cfg.lastRun.added} / −{cfg.lastRun.removed}{cfg.lastRun.errors ? ` · ${cfg.lastRun.errors} erreur(s)` : ""}.</> : null}
                  </>
                ) : (
                  <>Module <strong>désactivé</strong> (réglage par défaut) : aucun rôle n&apos;est attribué ni retiré.</>
                )}
                {!overview.statsEnabled && (
                  <p className="mt-1 text-amber-300">
                    Le module <Link href={`/discord/stats?guildId=${guildId}`} className="underline">Statistiques</Link> est désactivé : les conditions de messages et de vocal comptent 0 tant qu&apos;il ne collecte pas de données.
                  </p>
                )}
              </div>
              <div className="flex shrink-0 gap-2">
                {cfg.enabled && (
                  <button type="button" disabled={busy} onClick={() => void runNow()} className="cursor-pointer rounded-xl border border-[var(--panel-border)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] transition hover:bg-[var(--surface-raised)]/70 disabled:opacity-50">
                    Appliquer maintenant
                  </button>
                )}
                <button type="button" disabled={busy} onClick={() => void setEnabled(!cfg.enabled)} className="cursor-pointer rounded-xl bg-[var(--accent-primary)] px-4 py-2 text-sm font-semibold text-[var(--accent-contrast)] hover:brightness-110 disabled:opacity-50 btn-sheen transition-[filter,transform] duration-200 active:scale-[0.97] relative outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50">
                  {cfg.enabled ? "Désactiver" : "Activer"}
                </button>
              </div>
            </div>

            <section className="space-y-3 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">Règles ({cfg.rules.length}/25)</h2>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(emptyRule());
                    setPreview(null);
                  }}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[var(--text-primary)]/10 px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] transition hover:bg-[var(--text-primary)]/15"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Nouvelle règle
                </button>
              </div>
              {cfg.rules.length === 0 ? (
                <p className="rounded-xl border border-dashed border-[var(--panel-border)] p-6 text-center text-xs text-[var(--text-muted)]">Aucune règle. Exemple : rôle « Actif » pour ceux qui ont écrit au moins 100 messages sur 30 jours ET sont là depuis 30 jours.</p>
              ) : (
                <ul className="space-y-2">
                  {cfg.rules.map((r) => {
                    const role = roleName.get(r.roleId);
                    return (
                      <li key={r.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-[var(--surface-raised)]/40 px-4 py-3 text-xs">
                        <span className={cn("h-2 w-2 shrink-0 rounded-full", r.enabled ? "bg-emerald-400" : "bg-[var(--text-primary)]/20")} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-[var(--text-primary)]">{r.name}</p>
                          <p className="truncate text-xs text-[var(--text-muted)]">
                            Rôle{" "}
                            <span className="rounded px-1 font-semibold" style={{ color: role?.color && role.color !== "#000000" ? role.color : undefined }}>
                              {role ? `@${role.name}` : "(rôle supprimé)"}
                            </span>{" "}
                            · {countLeaves(r.root)} condition(s) · {r.removeWhenNotMatching ? "retiré si plus rempli" : "conservé une fois obtenu"}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setEditing(JSON.parse(JSON.stringify(r)) as Rule);
                            setPreview(null);
                          }}
                          className="cursor-pointer rounded-xl border border-[var(--panel-border)] px-2.5 py-1 font-semibold text-[var(--text-muted)] transition hover:bg-[var(--surface-raised)]/70"
                        >
                          Modifier
                        </button>
                        <button type="button" aria-label="Supprimer la règle" disabled={busy} onClick={() => void remove(r)} className="cursor-pointer rounded-xl p-1.5 text-[var(--text-muted)] transition hover:bg-rose-500/10 hover:text-rose-300">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </>
        )}
      </div>

      {editing && overview && (
        <div className="fixed inset-0 z-[var(--z-modal)] flex items-start justify-center overflow-y-auto bg-black/60 p-4 sm:items-center" onClick={() => setEditing(null)} role="dialog" aria-modal="true" aria-label="Éditeur de règle">
          <div className="w-full max-w-3xl rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--bg-surface)] p-5 sm:p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-base font-bold">{cfg?.rules.some((r) => r.id === editing.id) ? "Modifier la règle" : "Nouvelle règle"}</h3>
              <button type="button" aria-label="Fermer" onClick={() => setEditing(null)} className="cursor-pointer rounded-xl p-1.5 text-[var(--text-muted)] transition hover:bg-[var(--text-primary)]/10 hover:text-[var(--text-primary)]">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs text-[var(--text-muted)]">
                Nom
                <input value={editing.name} maxLength={60} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className={cn(inputCls, "mt-1 h-10 w-full text-sm")} />
              </label>
              <label className="text-xs text-[var(--text-muted)]">
                Rôle à attribuer
                <Select
                  value={editing.roleId}
                  onChange={(v) => setEditing({ ...editing, roleId: v })}
                  className="mt-1 w-full"
                  aria-label="Rôle à attribuer"
                  options={[
                    { id: "", label: "— choisir un rôle —" },
                    ...overview.roles.map((r) => ({
                      id: r.id,
                      label: r.name + (!r.assignable ? " (non attribuable par le bot)" : ""),
                      disabled: !r.assignable,
                    })),
                  ]}
                />
              </label>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {(
                [
                  ["removeWhenNotMatching", "Retirer le rôle quand les conditions ne sont plus remplies", "C'est ce qui distingue un statrole d'un rôle de niveau."],
                  ["enabled", "Règle active", "Désactivée, elle n'attribue ni ne retire rien."],
                ] as const
              ).map(([key, label, hint]) => (
                <button key={key} type="button" role="switch" aria-checked={editing[key]} onClick={() => setEditing({ ...editing, [key]: !editing[key] })} className="flex cursor-pointer items-start justify-between gap-3 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-3 text-left transition hover:bg-[var(--surface-raised)]/70">
                  <span>
                    <span className="block text-xs font-semibold text-[var(--text-primary)]">{label}</span>
                    <span className="mt-0.5 block text-xs text-[var(--text-muted)]">{hint}</span>
                  </span>
                  <span className={cn("relative mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors", editing[key] ? "bg-emerald-500" : "bg-[var(--text-primary)]/15")}>
                    <span className={cn("block h-4 w-4 rounded-full bg-white shadow transition-transform", editing[key] ? "translate-x-4" : "translate-x-0")} />
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-4">
              <p className="mb-2 text-xs font-semibold text-[var(--text-muted)]">Conditions</p>
              <GroupEditor group={editing.root} roles={overview.roles} depth={0} onChange={(root) => setEditing({ ...editing, root })} />
            </div>

            <div className="mt-4 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold text-[var(--text-muted)]">Aperçu</p>
                <button type="button" disabled={previewing || !editing.roleId} onClick={() => void runPreview()} className="cursor-pointer rounded-xl border border-[var(--panel-border)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] transition hover:bg-[var(--surface-raised)]/70 disabled:cursor-not-allowed disabled:opacity-50">
                  {previewing ? "Calcul…" : "Calculer l'aperçu"}
                </button>
              </div>
              {!editing.roleId && <p className="mt-2 text-xs text-[var(--text-muted)]">Choisissez d&apos;abord le rôle à attribuer.</p>}
              {preview && (
                <div className="mt-3 space-y-2 text-xs">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {[
                      ["Correspondent", preview.matching],
                      ["Ont déjà le rôle", preview.holders],
                      ["Le recevraient", preview.toAdd],
                      ["Le perdraient", preview.toRemove],
                    ].map(([label, value]) => (
                      <div key={String(label)} className="rounded-xl bg-[var(--surface-raised)]/40 px-3 py-2">
                        <p className="text-xs text-[var(--text-muted)]">{label}</p>
                        <p className="text-lg font-bold tabular-nums text-[var(--text-primary)]">{value}</p>
                      </div>
                    ))}
                  </div>
                  {preview.sample.length > 0 && <p className="text-xs text-[var(--text-muted)]">Exemples : {preview.sample.map((s) => s.name).join(", ")}{preview.matching > preview.sample.length ? "…" : ""}</p>}
                  {preview.warnings.map((w, i) => (
                    <p key={i} className="text-xs text-amber-300">⚠ {w}</p>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button type="button" onClick={() => setEditing(null)} className="cursor-pointer rounded-xl border border-[var(--panel-border)] px-4 py-2 text-xs font-semibold text-[var(--text-muted)] transition hover:bg-[var(--surface-raised)]/70">
                Annuler
              </button>
              <button type="button" disabled={busy || !editing.roleId || !editing.name.trim()} onClick={() => void save()} className="cursor-pointer rounded-xl bg-[var(--accent-primary)] px-5 py-2 text-sm font-semibold text-[var(--accent-contrast)] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 btn-sheen transition-[filter,transform] duration-200 active:scale-[0.97] relative outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50">
                Enregistrer la règle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
