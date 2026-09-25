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
import { EthoneIcon } from "@/components/EthoneIcon";
import { cn } from "@/lib/utils";

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

const inputCls = "h-8 rounded-lg border border-[var(--panel-border)] bg-[var(--bg-surface)] px-2 text-xs text-white outline-none focus:border-indigo-400/60";

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
      <button type="button" aria-label="Ajouter une condition" onClick={() => setOpen((v) => !v)} className="grid h-7 w-7 cursor-pointer place-items-center rounded-lg border border-[var(--panel-border)] text-zinc-300 transition hover:bg-white/10 hover:text-white">
        <Plus className="h-3.5 w-3.5" />
      </button>
      {open && (
        <ul className="absolute right-0 top-[calc(100%+6px)] z-30 w-64 overflow-hidden rounded-xl border border-[var(--panel-border)] bg-[var(--bg-surface)] p-1 shadow-2xl">
          {ADD_MENU.filter((m) => canGroup || m.kind !== "group").map((m) => (
            <li key={m.kind}>
              <button
                type="button"
                onClick={() => {
                  onAdd(m.kind);
                  setOpen(false);
                }}
                className="w-full cursor-pointer rounded-lg px-3 py-2 text-left transition hover:bg-white/[0.07]"
              >
                <span className="block text-xs font-semibold text-white">{m.label}</span>
                <span className="block text-[11px] text-zinc-500">{m.hint}</span>
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
    <select value={value} onChange={(e) => onChange(e.target.value as Op)} className={inputCls} aria-label="Comparaison">
      {OPS.map((o) => (
        <option key={o} value={o}>
          {OP_LABEL[o]}
        </option>
      ))}
    </select>
  );
}

function NumberInput({ value, onChange, min = 0, step = 1, width = "w-20" }: { value: number; onChange: (n: number) => void; min?: number; step?: number; width?: string }) {
  return <input type="number" min={min} step={step} value={Number.isFinite(value) ? value : 0} onChange={(e) => onChange(Number(e.target.value))} className={cn(inputCls, width, "tabular-nums")} />;
}

function PeriodSelect({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(Number(e.target.value))} className={inputCls} aria-label="Période">
      {(PERIODS.includes(value) ? PERIODS : [...PERIODS, value].sort((a, b) => a - b)).map((p) => (
        <option key={p} value={p}>
          sur {p} j
        </option>
      ))}
    </select>
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
          <span className="text-zinc-500">messages</span>
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
          <span className="text-zinc-500">heures</span>
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
          <span className="text-zinc-500">jours</span>
        </>
      );
      break;
    case "accountAge":
      title = "Ancienneté du compte";
      body = (
        <>
          <OpSelect value={leaf.op} onChange={(op) => onChange({ ...leaf, op })} />
          <NumberInput value={leaf.days} onChange={(days) => onChange({ ...leaf, days })} />
          <span className="text-zinc-500">jours</span>
        </>
      );
      break;
    default:
      title = "Rôle";
      body = (
        <>
          <select value={leaf.not ? "not" : "has"} onChange={(e) => onChange({ ...leaf, not: e.target.value === "not" })} className={inputCls} aria-label="Possède ou non">
            <option value="has">possède</option>
            <option value="not">ne possède pas</option>
          </select>
          <select value={leaf.roleId} onChange={(e) => onChange({ ...leaf, roleId: e.target.value })} className={cn(inputCls, "min-w-40")} aria-label="Rôle">
            <option value="">— choisir un rôle —</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </>
      );
  }
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--panel-border)] bg-white/[0.03] px-3 py-2 text-xs">
      <span className="w-40 shrink-0 font-semibold text-white">{title}</span>
      {body}
      <button type="button" aria-label="Supprimer la condition" onClick={onDelete} className="ml-auto cursor-pointer rounded-md p-1 text-zinc-500 transition hover:bg-rose-500/10 hover:text-rose-300">
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function GroupEditor({ group, roles, depth, onChange, onDelete }: { group: Group; roles: RoleInfo[]; depth: number; onChange: (g: Group) => void; onDelete?: () => void }) {
  const setChild = (i: number, node: Node) => onChange({ ...group, children: group.children.map((c, idx) => (idx === i ? node : c)) });
  const delChild = (i: number) => onChange({ ...group, children: group.children.filter((_, idx) => idx !== i) });
  return (
    <div className={cn("space-y-2 rounded-2xl border p-3", depth === 0 ? "border-[var(--panel-border)] bg-white/[0.02]" : "border-indigo-400/20 bg-indigo-400/[0.03]")}>
      <div className="flex items-center gap-2 text-xs">
        <span className="font-semibold text-zinc-300">Correspond si</span>
        <select value={group.match} onChange={(e) => onChange({ ...group, match: e.target.value as "ALL" | "ANY" })} className={cn(inputCls, "font-semibold")} aria-label="Type de groupe">
          <option value="ALL">TOUT est vrai (ET)</option>
          <option value="ANY">AU MOINS UN est vrai (OU)</option>
        </select>
        <span className="ml-auto flex items-center gap-1.5">
          <AddMenu canGroup={depth < 3} onAdd={(kind) => onChange({ ...group, children: [...group.children, newLeaf(kind)] })} />
          {onDelete && (
            <button type="button" aria-label="Supprimer le groupe" onClick={onDelete} className="cursor-pointer rounded-md p-1.5 text-zinc-500 transition hover:bg-rose-500/10 hover:text-rose-300">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </span>
      </div>
      {group.children.length === 0 && <p className="rounded-lg border border-dashed border-[var(--panel-border)] px-3 py-2 text-[11px] text-zinc-500">Groupe vide : il ne correspond à personne. Ajoutez une condition avec le bouton +.</p>}
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
      if (!res.ok) throw new Error(data?.error || String(res.status));
      if (okTitle) success(okTitle, okText ?? "");
      return data;
    } catch (err) {
      showError("Action impossible", err instanceof Error && err.message ? err.message : "Le bot n'a pas répondu.");
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
    <div className="h-full overflow-y-auto os-scroll [overscroll-behavior:contain] bg-[var(--bg-main)] p-4 pb-44 text-white sm:p-8">
      <div className="mx-auto w-full min-w-0 max-w-4xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href={`/discord${guildId ? `?guildId=${guildId}` : ""}`} className="inline-flex items-center gap-2 text-xs font-medium text-zinc-400 transition hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            Retour au hub Discord
          </Link>
          <button type="button" onClick={() => void load()} className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[var(--panel-border)] px-3 py-1.5 text-xs font-semibold text-zinc-300 transition hover:bg-white/[0.05]">
            <RefreshCw className="h-3.5 w-3.5" />
            Actualiser
          </button>
        </div>

        <header className="flex items-center gap-4">
          <span className="grid h-12 w-12 place-items-center rounded-2xl border border-[var(--panel-border)] bg-white/[0.03]">
            <EthoneIcon name="mod-roles" className="h-6 w-6 text-amber-300" />
          </span>
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight">Statroles</h1>
            <p className="mt-0.5 text-xs text-zinc-400">Des rôles donnés — et retirés — automatiquement selon l&apos;activité des membres dans la durée. Ce qu&apos;un rôle de niveau ne sait pas faire.</p>
          </div>
        </header>

        {state === "loading" && <div className="rounded-2xl border border-dashed border-[var(--panel-border)] p-8 text-center text-sm text-zinc-500">Chargement…</div>}
        {state === "offline" && <div className="rounded-2xl border border-dashed border-[var(--panel-border)] p-8 text-center text-sm text-zinc-400">Le bot n&apos;a pas répondu pour ce serveur. Vérifiez qu&apos;il est présent, puis actualisez.</div>}

        {state === "ok" && overview && cfg && (
          <>
            <div className={cn("flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between", cfg.enabled ? "border-emerald-500/25 bg-emerald-500/[0.05]" : "border-amber-500/25 bg-amber-500/[0.06]")}>
              <div className="text-xs leading-relaxed text-zinc-200">
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
                  <button type="button" disabled={busy} onClick={() => void runNow()} className="cursor-pointer rounded-xl border border-[var(--panel-border)] px-3 py-2 text-xs font-semibold text-zinc-200 transition hover:bg-white/[0.06] disabled:opacity-50">
                    Appliquer maintenant
                  </button>
                )}
                <button type="button" disabled={busy} onClick={() => void setEnabled(!cfg.enabled)} className="cursor-pointer rounded-xl bg-[#5865F2] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#4752C4] disabled:opacity-50">
                  {cfg.enabled ? "Désactiver" : "Activer"}
                </button>
              </div>
            </div>

            <section className="space-y-3 rounded-2xl border border-[var(--panel-border)] bg-white/[0.02] p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">Règles ({cfg.rules.length}/25)</h2>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(emptyRule());
                    setPreview(null);
                  }}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/15"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Nouvelle règle
                </button>
              </div>
              {cfg.rules.length === 0 ? (
                <p className="rounded-xl border border-dashed border-[var(--panel-border)] p-6 text-center text-xs text-zinc-500">Aucune règle. Exemple : rôle « Actif » pour ceux qui ont écrit au moins 100 messages sur 30 jours ET sont là depuis 30 jours.</p>
              ) : (
                <ul className="space-y-2">
                  {cfg.rules.map((r) => {
                    const role = roleName.get(r.roleId);
                    return (
                      <li key={r.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-white/[0.03] px-4 py-3 text-xs">
                        <span className={cn("h-2 w-2 shrink-0 rounded-full", r.enabled ? "bg-emerald-400" : "bg-zinc-600")} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-white">{r.name}</p>
                          <p className="truncate text-[11px] text-zinc-500">
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
                          className="cursor-pointer rounded-lg border border-[var(--panel-border)] px-2.5 py-1 font-semibold text-zinc-300 transition hover:bg-white/[0.06]"
                        >
                          Modifier
                        </button>
                        <button type="button" aria-label="Supprimer la règle" disabled={busy} onClick={() => void remove(r)} className="cursor-pointer rounded-lg p-1.5 text-zinc-400 transition hover:bg-rose-500/10 hover:text-rose-300">
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
        <div className="fixed inset-0 z-[var(--z-modal)] flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm sm:items-center" onClick={() => setEditing(null)} role="dialog" aria-modal="true" aria-label="Éditeur de règle">
          <div className="w-full max-w-3xl rounded-3xl border border-[var(--panel-border)] bg-[var(--bg-surface)] p-5 sm:p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-base font-bold">{cfg?.rules.some((r) => r.id === editing.id) ? "Modifier la règle" : "Nouvelle règle"}</h3>
              <button type="button" aria-label="Fermer" onClick={() => setEditing(null)} className="cursor-pointer rounded-lg p-1.5 text-zinc-400 transition hover:bg-white/10 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs text-zinc-400">
                Nom
                <input value={editing.name} maxLength={60} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className={cn(inputCls, "mt-1 h-10 w-full text-sm")} />
              </label>
              <label className="text-xs text-zinc-400">
                Rôle à attribuer
                <select value={editing.roleId} onChange={(e) => setEditing({ ...editing, roleId: e.target.value })} className={cn(inputCls, "mt-1 h-10 w-full text-sm")}>
                  <option value="">— choisir un rôle —</option>
                  {overview.roles.map((r) => (
                    <option key={r.id} value={r.id} disabled={!r.assignable}>
                      {r.name}
                      {!r.assignable ? " (non attribuable par le bot)" : ""}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {(
                [
                  ["removeWhenNotMatching", "Retirer le rôle quand les conditions ne sont plus remplies", "C'est ce qui distingue un statrole d'un rôle de niveau."],
                  ["enabled", "Règle active", "Désactivée, elle n'attribue ni ne retire rien."],
                ] as const
              ).map(([key, label, hint]) => (
                <button key={key} type="button" role="switch" aria-checked={editing[key]} onClick={() => setEditing({ ...editing, [key]: !editing[key] })} className="flex cursor-pointer items-start justify-between gap-3 rounded-xl border border-[var(--panel-border)] bg-white/[0.02] p-3 text-left transition hover:bg-white/[0.04]">
                  <span>
                    <span className="block text-xs font-semibold text-white">{label}</span>
                    <span className="mt-0.5 block text-[11px] text-zinc-500">{hint}</span>
                  </span>
                  <span className={cn("relative mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors", editing[key] ? "bg-[#5865F2]" : "bg-white/15")}>
                    <span className={cn("block h-4 w-4 rounded-full bg-white shadow transition-transform", editing[key] ? "translate-x-4" : "translate-x-0")} />
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-4">
              <p className="mb-2 text-xs font-semibold text-zinc-300">Conditions</p>
              <GroupEditor group={editing.root} roles={overview.roles} depth={0} onChange={(root) => setEditing({ ...editing, root })} />
            </div>

            <div className="mt-4 rounded-2xl border border-[var(--panel-border)] bg-white/[0.02] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold text-zinc-300">Aperçu</p>
                <button type="button" disabled={previewing || !editing.roleId} onClick={() => void runPreview()} className="cursor-pointer rounded-lg border border-[var(--panel-border)] px-3 py-1.5 text-xs font-semibold text-zinc-200 transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-50">
                  {previewing ? "Calcul…" : "Calculer l'aperçu"}
                </button>
              </div>
              {!editing.roleId && <p className="mt-2 text-[11px] text-zinc-500">Choisissez d&apos;abord le rôle à attribuer.</p>}
              {preview && (
                <div className="mt-3 space-y-2 text-xs">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {[
                      ["Correspondent", preview.matching],
                      ["Ont déjà le rôle", preview.holders],
                      ["Le recevraient", preview.toAdd],
                      ["Le perdraient", preview.toRemove],
                    ].map(([label, value]) => (
                      <div key={String(label)} className="rounded-xl bg-white/[0.04] px-3 py-2">
                        <p className="text-[11px] text-zinc-500">{label}</p>
                        <p className="text-lg font-bold tabular-nums text-white">{value}</p>
                      </div>
                    ))}
                  </div>
                  {preview.sample.length > 0 && <p className="text-[11px] text-zinc-400">Exemples : {preview.sample.map((s) => s.name).join(", ")}{preview.matching > preview.sample.length ? "…" : ""}</p>}
                  {preview.warnings.map((w, i) => (
                    <p key={i} className="text-[11px] text-amber-300">⚠ {w}</p>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button type="button" onClick={() => setEditing(null)} className="cursor-pointer rounded-xl border border-[var(--panel-border)] px-4 py-2 text-xs font-semibold text-zinc-300 transition hover:bg-white/[0.06]">
                Annuler
              </button>
              <button type="button" disabled={busy || !editing.roleId || !editing.name.trim()} onClick={() => void save()} className="cursor-pointer rounded-xl bg-[#5865F2] px-5 py-2 text-xs font-semibold text-white transition hover:bg-[#4752C4] disabled:cursor-not-allowed disabled:opacity-50">
                Enregistrer la règle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
