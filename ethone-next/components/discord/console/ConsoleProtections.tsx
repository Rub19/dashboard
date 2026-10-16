"use client";

import { Fragment, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, Ban, Bot, Camera, ChevronRight, CircleCheck, FolderClosed, Gavel, Hash, History, Info, LayoutGrid, Lock, LogOut, MessageSquare, PenLine, Search, Server, Timer, TriangleAlert, UserCog, UserRoundMinus, Users, Volume2, WandSparkles, type LucideIcon } from "lucide-react";
import ChannelPicker, { fetchGuildChannels, type ChannelOption } from "../ChannelPicker";
import { confirmDialog } from "@/lib/confirmDialog";
import { useToast } from "@/components/ToastProvider";
import { SPRING_LAYOUT, SPRING_PILL } from "@/lib/ease";
import { cn } from "@/lib/utils";
import { ChannelAdder, Chip, EmptyLine, GhostButton, MemberPicker, RoleChips, Segmented, Select, Stepper, Switch, useGuildApi } from "./kit";
import type { ConsoleView } from "../HubSidebar";
import { useMediaQuery } from "@/lib/hooks/useMediaQuery";
import { tx } from "@/lib/tx";

type Punish = "none" | "timeout" | "derank" | "kick" | "ban";
type Kind = "quota" | "watched" | "link" | "words" | "toxicity" | "scam" | "alt" | "rollback" | "reorder";
type Def = {
  key: string;
  label: string;
  category: string;
  description: string;
  kind: Kind;
  specific?: "webhookAction" | "maxPerMessage" | "ghostPing" | "textWall" | "duplicate" | "emojiAbuse" | "watchedChannels";
  verb?: string;
  noun?: [string, string];
  aftermath?: string;
  deletesMessage?: boolean;
  lockdownAdvised?: boolean;
  channelExempt?: boolean;
  noWhitelistLimit?: boolean;
};
type Settings = {
  enabled: boolean;
  quotaMax?: number;
  quotaSeconds?: number;
  punish: Punish;
  timeoutSeconds: number;
  lockdown: boolean;
  logChannelId: string | null;
  mentionRoleIds: string[];
  mentionEveryone: boolean;
  logMode: "abuse" | "all";
  notifyOwner: boolean;
  ignoreEthoOwners: boolean;
  useGlobalWhitelist: boolean;
  exceptionQuotaMax: number | null;
  exceptionQuotaSeconds: number | null;
  wlUsers: string[];
  wlRoles: string[];
  wlChannels: string[];
  wlCategories: string[];
  watchedPerms?: string[];
  watchedRoles?: string[];
  webhookAction?: "delete" | "recreate" | "none";
  linkTypes?: Array<"general" | "discord" | "images">;
  allowedDomains?: string[];
  enforcement?: "bot" | "automod";
  bannedWords?: string[];
  toxicityThreshold?: number;
  ignoreUntargeted?: boolean;
  maxPerMessage?: number;
  ghostMaxAgeSeconds?: number;
  ghostNotify?: boolean;
  maxChars?: number;
  maxLines?: number;
  ignoreCodeBlocks?: boolean;
  matchMode?: "similar" | "exact";
  minLength?: number;
  maxEmojis?: number;
  countCustom?: boolean;
  countUnicode?: boolean;
  minAccountAgeDays?: number;
  dmMessage?: string;
  backupIntervalHours?: number;
  watchedChannels?: string[];
};
type Data = {
  categories: string[];
  catalog: Def[];
  defaultWatchedPerms: string[];
  settings: Record<string, Settings>;
  lockdown: { at: string; reason: string; roles: Record<string, string> } | null;
  lastBackupAt: string | null;
  missingPermissions: string[];
};

const PUNISHMENTS: Array<{ id: Punish; label: string; hint: string; icon: typeof Ban }> = [
  { id: "none", label: "Aucune", hint: "Alerte seulement", icon: PenLine },
  { id: "timeout", label: "Timeout", hint: "Réduit au silence", icon: Timer },
  { id: "derank", label: "Retirer les rôles", hint: "Perd tout pouvoir", icon: UserRoundMinus },
  { id: "kick", label: "Expulser", hint: "Peut revenir", icon: LogOut },
  { id: "ban", label: "Bannir", hint: "Définitif", icon: Ban },
];
const PERMS: Array<[string, string]> = [
  ["Administrator", "Administrateur"],
  ["ManageGuild", "Gérer le serveur"],
  ["ManageRoles", "Gérer les rôles"],
  ["ManageChannels", "Gérer les salons"],
  ["ManageWebhooks", "Gérer les webhooks"],
  ["BanMembers", "Bannir"],
  ["KickMembers", "Expulser"],
  ["ModerateMembers", "Exclure temporairement"],
  ["ManageMessages", "Gérer les messages"],
  ["MentionEveryone", "Mentionner @everyone"],
  ["ManageGuildExpressions", "Gérer les expressions"],
  ["ManageNicknames", "Gérer les pseudos"],
  ["ManageThreads", "Gérer les fils"],
  ["ManageEvents", "Gérer les événements"],
  ["MoveMembers", "Déplacer des membres"],
  ["MuteMembers", "Rendre muet"],
  ["DeafenMembers", "Mettre en sourdine"],
  ["ViewAuditLog", "Voir les logs"],
];
const UNITS: Array<[number, string]> = [
  [1, "secondes"],
  [60, "minutes"],
  [3600, "heures"],
  [86400, "jours"],
];
const WINDOW_PRESETS: Array<[number, string]> = [
  [10, "10 s"],
  [60, "1 min"],
  [300, "5 min"],
  [600, "10 min"],
];
const TIMEOUT_PRESETS: Array<[number, string]> = [
  [30, "30 s"],
  [60, "1 min"],
  [600, "10 min"],
  [3600, "1 h"],
  [86400, "1 j"],
  [604800, "7 j"],
];
const INSTANT_DELETE = new Set(["antiLink", "antiBadWord", "antiMentionUsers", "antiMentionRoles", "antiMentionEveryone", "antiTextWall", "antiEmojiAbuse", "antiScam", "antiToxicity"]);
const PUNISH_TEXT: Record<Punish, string> = {
  none: "prévient l'équipe",
  timeout: "met l'auteur en timeout",
  derank: "retire tous les rôles de l'auteur",
  kick: "expulse l'auteur",
  ban: "bannit l'auteur",
};

const dur = (s: number) => (s % 86400 === 0 ? `${s / 86400} j` : s % 3600 === 0 ? `${s / 3600} h` : s % 60 === 0 ? `${s / 60} min` : `${s} s`);
const unitOf = (s: number) => [...UNITS].reverse().find(([u]) => s % u === 0 && s / u >= 1)?.[0] ?? 1;
const hasPunish = (d: Def) => d.kind !== "rollback" && d.kind !== "reorder";
const hasAlert = (d: Def) => d.kind !== "rollback";

/** À compléter : active mais sans salon de log (ou sans mot interdit). */
export function isIncomplete(d: Def, s: Settings) {
  if (!s.enabled || d.kind === "rollback") return false;
  return !s.logChannelId || (d.kind === "words" && !(s.bannedWords ?? []).length) || (d.specific === "watchedChannels" && !(s.watchedChannels ?? []).length);
}

/** Phrase « Ce que fait Etho » (même texte que /protection voir). */
function describe(d: Def, s: Settings): string {
  if (d.key === "antiReorganisation") return "Dès qu'un rôle est déplacé dans la liste, Etho le remet à sa place.";
  const sanction = PUNISH_TEXT[s.punish] + (s.punish === "timeout" ? ` ${dur(s.timeoutSeconds)}` : "");
  const parts = [INSTANT_DELETE.has(d.key) ? "supprime le message" : "", s.punish === "none" ? "" : sanction].filter(Boolean);
  const action = parts.length ? `Etho ${parts.join(" et ")}` : "Etho prévient l'équipe";
  switch (d.kind) {
    case "quota": {
      const n = s.quotaMax ?? 1;
      const extra = d.specific === "maxPerMessage" ? ` mentionnant plus de ${s.maxPerMessage} ${d.key === "antiMentionRoles" ? "rôles" : "membres"}` : "";
      if (n === 1) {
        const one = d.noun && d.noun[0] !== "fois" ? ` ${d.noun[0] === "invitation" ? "une" : "un"} ${d.noun[0]}` : "";
        return `Dès qu'un membre ${d.verb}${one}${extra}, ${action}.`;
      }
      return `Si un même membre ${d.verb} ${n} ${d.noun?.[1] ?? "fois"}${extra} en moins de ${dur(s.quotaSeconds ?? 60)}, ${action}.`;
    }
    case "alt":
      return `Dès qu'un compte créé il y a moins de ${s.minAccountAgeDays ?? 7} jours rejoint, Etho lui envoie un message privé${s.punish === "none" ? " et prévient l'équipe" : ` puis ${sanction.replace("l'auteur", "le compte")}`}.`;
    case "toxicity":
      return `Dès qu'un message atteint un taux de toxicité de ${s.toxicityThreshold ?? 90} %, ${action}.`;
    case "rollback":
      return `Etho prend une photo complète du serveur toutes les ${s.backupIntervalHours ?? 24} h pour tout restaurer après un incident.`;
    default:
      return `Dès qu'un membre ${d.verb}, ${action}.`;
  }
}

/** Met en gras les chiffres et ce que fait Etho, comme la carte de Keeper. */
function Sentence({ text }: { text: string }) {
  const [before, after] = text.split(/(?=Etho )/);
  const bold = (t: string) =>
    t.split(/(\d+(?:\s(?:%|s|min|h|j|jours?|membres?|rôles?|messages?|salons?|webhooks?|fils?|bots?|stickers?|emojis?|pavés?|ghost pings?|fois))?)/g).map((p, i) => (i % 2 ? <strong key={i} className="font-semibold text-[var(--text-primary)]">{p}</strong> : <Fragment key={i}>{p}</Fragment>));
  return (
    <p className="text-[15px] leading-relaxed text-[var(--text-secondary,var(--text-primary))]">
      {bold(before)}
      {after && (
        <>
          {tx("Etho")}{" "} <strong className="font-semibold text-[var(--text-primary)]">{after.replace(/^Etho /, "").replace(/\.$/, "")}</strong>.
        </>
      )}
    </p>
  );
}

// --- Petits contrôles ----------------------------------------------------------------------------------------------

function Field({ label, hint, children, info }: { label: ReactNode; hint?: ReactNode; info?: string; children: ReactNode }) {
  return (
    <div className="grid items-start gap-2 py-3 sm:grid-cols-[13rem_1fr]">
      <div className="pt-1.5">
        <span className="flex items-center gap-1.5 text-[13px] font-semibold text-[var(--text-primary)]">
          {label}
          {info && (
            <span title={info} className="text-[var(--text-muted)]">
              <Info className="h-3.5 w-3.5" />
            </span>
          )}
        </span>
        {hint && <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--text-muted)]">{hint}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function Section({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className="border-t border-[var(--panel-border)] px-5 py-5 sm:px-6">
      <h3 className="mb-2 flex items-center gap-3 text-base font-bold text-[var(--text-primary)]">
        <span className="grid h-6 w-6 place-items-center rounded-full border border-[var(--panel-border)] text-[11px] font-semibold text-[var(--text-muted)]">{n}</span>
        {title}
      </h3>
      <div className="sm:pl-9">{children}</div>
    </section>
  );
}

/** Durée = nombre + unité + raccourcis (format Keeper). */
function DurationField({ seconds, onCommit, presets, max }: { seconds: number; onCommit: (s: number) => void; presets: Array<[number, string]>; max: number }) {
  const unit = unitOf(seconds);
  const [draft, setDraft] = useState(String(seconds / unit));
  const [u, setU] = useState(unit);
  useEffect(() => {
    setU(unitOf(seconds));
    setDraft(String(seconds / unitOf(seconds)));
  }, [seconds]);
  const commit = (n: number, unitSec: number) => {
    const total = Math.min(max, Math.max(1, Math.round(n) * unitSec));
    if (total !== seconds) onCommit(total);
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex h-9 rounded-lg border border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))]">
        <input
          value={draft}
          inputMode="numeric"
          aria-label={tx("Durée")}
          onChange={(e) => setDraft(e.target.value.replace(/\D/g, "").slice(0, 4))}
          onBlur={() => commit(Number(draft) || 1, u)}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          className="w-16 rounded-l-lg bg-transparent px-3 text-sm font-semibold tabular-nums text-[var(--text-primary)] outline-none"
        />
        <Select
          value={u}
          options={UNITS}
          onChange={(next) => {
            setU(next);
            commit(Number(draft) || 1, next);
          }}
          aria-label={tx("Unité")}
          size="sm"
          buttonClassName="h-full rounded-none rounded-r-lg border-y-0 border-r-0 border-l border-[var(--panel-border)] bg-transparent px-2.5"
        />
      </div>
      <div className="flex flex-wrap gap-1">
        {presets.map(([v, l]) => (
          <button
            key={v}
            type="button"
            onClick={() => v !== seconds && onCommit(v)}
            className={cn("rounded-md px-2 py-1 text-xs font-medium transition-colors", v === seconds ? "bg-[var(--success)]/15 text-[var(--success)]" : "text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]")}
          >
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Liste de mots ou de domaines : Entrée ajoute, la croix retire. */
function TagInput({ values, onChange, max, placeholder }: { values: string[]; onChange: (v: string[]) => void; max: number; placeholder: string }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const items = draft
      .split(/[,\n]/)
      .map((x) => x.trim().toLowerCase())
      .filter((x) => x && !values.includes(x));
    if (items.length) onChange([...values, ...items].slice(0, max));
    setDraft("");
  };
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          value={draft}
          maxLength={100}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          onBlur={() => draft.trim() && add()}
          className="h-9 w-full max-w-sm rounded-lg border border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]/70"
        />
        <span className="shrink-0 text-xs tabular-nums text-[var(--text-muted)]">
          {values.length}/{max}
        </span>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {values.map((v) => (
            <Chip key={v} label={v} onRemove={() => onChange(values.filter((x) => x !== v))} />
          ))}
        </div>
      )}
    </div>
  );
}

/** Membres et bots exemptés : noms résolus par la recherche du bot. */
function MemberChips({ guildId, ids, onChange }: { guildId: string; ids: string[]; onChange: (ids: string[]) => void }) {
  const api = useGuildApi(guildId);
  const [names, setNames] = useState<Record<string, string>>({});
  useEffect(() => {
    for (const id of ids) {
      if (names[id]) continue;
      api<{ members: Array<{ id: string; displayName: string }> }>(`/console/members/search?q=${id}`, { silent: true }).then((r) => {
        const hit = r?.members?.find((m) => m.id === id);
        setNames((n) => ({ ...n, [id]: hit?.displayName ?? id }));
      });
    }
  }, [ids, api, names]);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {ids.map((id) => (
        <Chip key={id} label={names[id] ?? "…"} onRemove={() => onChange(ids.filter((x) => x !== id))} />
      ))}
      <MemberPicker guildId={guildId} label={tx("Membre")} excludeIds={ids} onPick={(m) => onChange([...ids, m.id])} />
    </div>
  );
}

function ChannelChips({ ids, channels, onChange, guildId, categories }: { ids: string[]; channels: ChannelOption[]; onChange: (ids: string[]) => void; guildId: string; categories?: boolean }) {
  const name = (id: string) => channels.find((c) => c.id === id)?.name ?? "supprimé";
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {ids.map((id) => (
        <Chip key={id} label={name(id)} onRemove={() => onChange(ids.filter((x) => x !== id))}>
          {categories ? <FolderClosed className="h-3 w-3 text-[var(--text-muted)]" /> : <Hash className="h-3 w-3 text-[var(--text-muted)]" />}
        </Chip>
      ))}
      {categories ? (
        <div className="w-48">
          <ChannelPicker guildId={guildId} value="" filterTypes={[4]} placeholder={tx("+ Catégorie")} onChange={(id) => id && !ids.includes(id) && onChange([...ids, id])} />
        </div>
      ) : (
        <ChannelAdder guildId={guildId} excludeIds={ids} onPick={(c) => onChange([...ids, c.id])} />
      )}
    </div>
  );
}

// --- Page ----------------------------------------------------------------------------------------------------------

type Filter = "all" | "on" | "off" | "todo";

/** Protections (format Keeper) : liste par catégorie à gauche, réglages de la protection choisie à droite. */
const CATEGORY_META: Record<string, { icon: LucideIcon; description: string }> = {
  "Sanctions en série": { icon: Gavel, description: "Bans, expulsions et timeouts en rafale par un même membre du staff." },
  Salons: { icon: Hash, description: "Création, suppression et modification de salons." },
  "Rôles et permissions": { icon: UserCog, description: "Rôles créés, supprimés, modifiés ou distribués." },
  "Bots et intégrations": { icon: Bot, description: "Bots invités, webhooks et fils de discussion." },
  Vocal: { icon: Volume2, description: "Mutes, sourdines, déconnexions et déplacements forcés." },
  Serveur: { icon: Server, description: "Nom, icône, emojis, invitations, événements et réglages généraux." },
  Messages: { icon: MessageSquare, description: "Spam, liens, mentions, mots interdits et arnaques." },
  Membres: { icon: Users, description: "Comptes suspects à l'arrivée et pseudos changés en série." },
  Sauvegarde: { icon: History, description: "Photos du serveur pour tout restaurer après un incident." },
};

export default function ConsoleProtections({
  guildId,
  onOpenView,
  onOpenSetup,
}: {
  guildId: string;
  onOpenView?: (v: ConsoleView, opts?: { logsTab?: "incidents" | "journal" | "channels" }) => void;
  onOpenSetup?: () => void;
}) {
  const api = useGuildApi(guildId);
  const { success, error: toastError } = useToast();
  const reduced = useReducedMotion();
  const [data, setData] = useState<Data | null>(null);
  const [channels, setChannels] = useState<ChannelOption[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [prepared, setPrepared] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [category, setCategory] = useState<string>("all");
  const [detailOpen, setDetailOpen] = useState(false);

  const load = useCallback(async () => {
    const r = await api<Data>("/protections");
    if (r) setData(r);
  }, [api]);
  useEffect(() => {
    void load();
    fetchGuildChannels(guildId).then(setChannels);
    const p = new URLSearchParams(window.location.search).get("p");
    if (p) {
      setSelected(p);
      setDetailOpen(true);
    }
  }, [guildId, load]);

  // Téléphone : la liste occupe l'écran ; toucher une protection ouvre son détail (bouton retour).
  const isPhone = useMediaQuery("(max-width: 1023px)");
  const select = (key: string) => {
    setSelected(key);
    const url = new URL(window.location.href);
    url.searchParams.set("p", key);
    window.history.replaceState(window.history.state, "", url);
  };

  const save = async (key: string, patch: Partial<Settings>) => {
    setData((d) => (d ? { ...d, settings: { ...d.settings, [key]: { ...d.settings[key], ...patch } } } : d));
    const r = await api<{ settings: Settings; warning: string | null }>(`/protections/${key}`, { method: "PATCH", json: patch });
    if (r) {
      setData((d) => (d ? { ...d, settings: { ...d.settings, [key]: r.settings } } : d));
      // Compteur « Protections X/45 » de la barre latérale.
      if ("enabled" in patch) window.dispatchEvent(new Event("etho:protections-changed"));
      if (r.warning) toastError("AutoMod", r.warning);
    } else void load();
  };

  const liftLockdown = async () => {
    if (!(await confirmDialog(tx("Rendre aux rôles les permissions retirées par le verrouillage ?"), { title: tx("Lever le verrouillage"), confirmLabel: tx("Lever") }))) return;
    setBusy("lift");
    const r = await api<Data & { restored: number }>("/protections/lockdown/lift", { method: "POST", json: {} });
    setBusy(null);
    if (r) {
      setData(r);
      success(tx("Verrouillage levé"), tx("Permissions rendues à {restored} rôle{v1}.", { restored: r.restored, v1: r.restored > 1 ? "s" : "" }));
    }
  };
  const backupNow = async () => {
    setBusy("backup");
    const r = await api<{ lastBackupAt: string }>("/protections/rollback/now", { method: "POST", json: {} });
    setBusy(null);
    if (r) {
      setData((d) => (d ? { ...d, lastBackupAt: r.lastBackupAt } : d));
      success(tx("Serveur capturé"), tx("La sauvegarde est dans le module Sauvegardes."));
    }
  };

  const counts = useMemo(() => {
    if (!data) return { all: 0, on: 0, off: 0, todo: 0 };
    const list = data.catalog.map((d) => [d, data.settings[d.key]] as const);
    return { all: list.length, on: list.filter(([, s]) => s.enabled).length, off: list.filter(([, s]) => !s.enabled).length, todo: list.filter(([d, s]) => isIncomplete(d, s)).length };
  }, [data]);

  if (!data)
    return (
      <div className="mx-auto w-full max-w-6xl">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl">{tx("Protections")}</h1>
        <div className="mt-6 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]">
          <EmptyLine>{tx("Chargement…")}</EmptyLine>
        </div>
      </div>
    );

  const query = q.trim().toLowerCase();
  const visible = data.catalog.filter((d) => {
    const s = data.settings[d.key];
    if (filter === "on" && !s.enabled) return false;
    if (filter === "off" && s.enabled) return false;
    if (filter === "todo" && !isIncomplete(d, s)) return false;
    return !query || `${d.label} ${d.description} ${d.category}`.toLowerCase().includes(query);
  });
  const current = data.catalog.find((d) => d.key === selected && visible.includes(d)) ?? visible[0] ?? null;

  const visibleCats = data.categories.filter((cat) => visible.some((d) => d.category === cat));
  const shownCats = category === "all" ? visibleCats : visibleCats.filter((c) => c === category);
  const activeTotal = data.catalog.filter((d) => d.kind !== "rollback").length;
  const activeOn = data.catalog.filter((d) => d.kind !== "rollback" && data.settings[d.key].enabled).length;
  const toggleCategory = async (cat: string) => {
    const items = data.catalog.filter((d) => d.category === cat && d.kind !== "rollback");
    const target = !items.every((d) => data.settings[d.key].enabled);
    for (const d of items) if (data.settings[d.key].enabled !== target) await save(d.key, { enabled: target });
  };
  const open = (key: string) => {
    select(key);
    setDetailOpen(true);
  };

  return (
    <motion.div initial={reduced ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }} className="mx-auto w-full max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl">{tx("Protections")}</h1>
        <div className="flex items-center gap-2">
          {onOpenView && (
            <button
              type="button"
              onClick={() => onOpenView("logs", { logsTab: "incidents" })}
              className="flex items-center gap-2 rounded-xl border border-[var(--panel-border)] px-3.5 py-2 text-[13px] font-semibold text-[var(--text-primary)] transition-[background-color,transform] hover:bg-[var(--surface-hover)] active:scale-[0.98] cursor-pointer"
            >
              <History className="h-4 w-4" />
              <span>{tx("Incidents")}</span>
            </button>
          )}
          {onOpenSetup && (
            <button
              type="button"
              onClick={onOpenSetup}
              className="flex items-center gap-2 rounded-xl border border-[var(--panel-border)] px-3.5 py-2 text-[13px] font-semibold text-[var(--text-primary)] transition-[background-color,transform] hover:bg-[var(--surface-hover)] active:scale-[0.98] cursor-pointer"
            >
              <WandSparkles className="h-4 w-4" />
              <span>{tx("Configuration assistée")}</span>
            </button>
          )}
        </div>
      </div>

      {data.lockdown && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--danger)]/40 bg-[var(--danger)]/10 px-4 py-3">
          <Lock className="h-4 w-4 shrink-0 text-[var(--danger)]" />
          <p className="min-w-0 flex-1 text-[13px] text-[var(--text-primary)]">
            <strong>{tx("Serveur verrouillé.")}</strong> {data.lockdown.reason}{tx(". Les permissions sensibles de")}{" "} {Object.keys(data.lockdown.roles).length} {" "}{tx("rôle")}{Object.keys(data.lockdown.roles).length > 1 ? "s" : ""} {" "}{tx("sont retirées.")}
          </p>
          <GhostButton onClick={liftLockdown} disabled={busy === "lift"}>
            {busy === "lift" ? "…" : tx("Lever le verrouillage")}
          </GhostButton>
        </div>
      )}
      {data.missingPermissions.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-[var(--warning)]/40 bg-[var(--warning)]/10 px-4 py-3">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-[var(--warning)]" />
          <p className="text-[13px] text-[var(--text-primary)]">
            <strong>{tx("Permission à vérifier sur Discord.")}</strong> {" "}{tx("Il manque à Etho :")}{" "} {data.missingPermissions.join(", ")}{tx(". Sans elles, certaines protections ne peuvent ni détecter ni réparer.")}
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[15.5rem_1fr]">
        <aside className={cn("space-y-3 lg:sticky lg:top-4 lg:self-start", isPhone && detailOpen && "hidden")}>
          <label className="flex h-10 items-center gap-2 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)] px-3 transition-colors focus-within:border-[var(--accent-primary)]/60">
            <Search className="h-4 w-4 text-[var(--text-muted)]" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tx("Spam, liens, rôles…")} aria-label={tx("Chercher une protection")} className="min-w-0 flex-1 bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" />
          </label>
          <nav aria-label={tx("Catégories de protections")} className="space-y-0.5">
            {(["all", ...data.categories] as const).map((cat) => {
              const items = cat === "all" ? data.catalog : data.catalog.filter((d) => d.category === cat);
              const on = items.filter((d) => data.settings[d.key].enabled).length;
              const Icon = cat === "all" ? LayoutGrid : CATEGORY_META[cat]?.icon ?? LayoutGrid;
              const active = category === cat;
              const locked = cat === "Sauvegarde";
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setCategory(cat);
                    setDetailOpen(false);
                  }}
                  aria-current={active}
                  className="relative isolate flex h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-sm transition-colors cursor-pointer"
                >
                  {active && <motion.span layoutId="prot-cat" transition={SPRING_LAYOUT} className="absolute inset-0 -z-10 rounded-xl bg-[var(--surface-hover)]" />}
                  <Icon className={cn("h-4 w-4 shrink-0 transition-colors", active ? "text-[var(--accent-primary)]" : "text-[var(--text-muted)]")} />
                  <span className={cn("min-w-0 flex-1 truncate font-medium", active ? "text-[var(--text-primary)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]")}>{cat === "all" ? tx("Toutes") : cat}</span>
                  {locked ? <Lock className="h-3.5 w-3.5 text-[var(--text-muted)]" aria-label={tx("Sauvegarde")} /> : <span className="text-xs tabular-nums text-[var(--text-muted)]">{on}/{items.length}</span>}
                </button>
              );
            })}
          </nav>
          <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)] p-4">
            <div className="flex items-baseline justify-between">
              <span className="text-[13px] font-medium text-[var(--text-muted)]">{tx("Protections actives")}</span>
              <span className="text-base font-bold tabular-nums text-[var(--text-primary)]">
                {activeOn}
                <span className="text-[var(--text-muted)]">/{activeTotal}</span>
              </span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--surface-hover)]">
              <motion.div className="h-full rounded-full bg-[var(--accent-primary)]" initial={false} animate={{ width: `${Math.max(2, (activeOn / Math.max(1, activeTotal)) * 100)}%` }} transition={SPRING_LAYOUT} />
            </div>
          </div>
        </aside>

        <div className="min-w-0 space-y-4">
          <div className="inline-flex flex-wrap gap-1 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)] p-1" role="tablist" aria-label={tx("Filtrer les protections")}>
            {(
              [
                ["all", "Toutes", counts.all],
                ["on", "Actives", counts.on],
                ["off", "Inactives", counts.off],
                ["todo", "À compléter", counts.todo],
              ] as const
            ).map(([id, label, n]) => (
              <button key={id} type="button" role="tab" aria-selected={filter === id} onClick={() => setFilter(id)} className="relative isolate flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-semibold cursor-pointer">
                {filter === id && <motion.span layoutId="prot-filter" transition={SPRING_PILL} className="absolute inset-0 -z-10 rounded-lg border border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))]" />}
                {id === "todo" && <TriangleAlert className="h-3.5 w-3.5 text-[var(--warning)]" />}
                <span className={filter === id ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"}>{label}</span>
                <span className="text-[11px] tabular-nums text-[var(--text-muted)]">{n}</span>
              </button>
            ))}
          </div>

          <AnimatePresence mode="popLayout" initial={false}>
            {detailOpen && current ? (
              <motion.div key={`detail-${current.key}`} initial={reduced ? false : { opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={reduced ? { opacity: 0 } : { opacity: 0, x: -16 }} transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }} className="overflow-hidden rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-raised)]">
                <button type="button" onClick={() => setDetailOpen(false)} className="flex w-full items-center gap-2 border-b border-[var(--panel-border)] px-5 py-3 text-[13px] font-semibold text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] cursor-pointer">
                  <ArrowLeft className="h-4 w-4" />
                  {category === "all" ? tx("Toutes les protections") : category}
                </button>
                <Detail
                  def={current}
                  s={data.settings[current.key]}
                  guildId={guildId}
                  channels={channels}
                  defaultWatchedPerms={data.defaultWatchedPerms}
                  lastBackupAt={data.lastBackupAt}
                  prepared={Boolean(prepared[current.key])}
                  onPrepare={() => setPrepared((p) => ({ ...p, [current.key]: true }))}
                  onSave={(patch) => save(current.key, patch)}
                  onBackupNow={backupNow}
                  busy={busy}
                />
              </motion.div>
            ) : (
              <motion.div key={`list-${category}`} initial={reduced ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }} className="space-y-4">
                {shownCats.length === 0 && <p className="rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-raised)] px-5 py-10 text-center text-sm text-[var(--text-muted)]">{tx("Aucune protection ne correspond.")}</p>}
                {shownCats.map((cat) => {
                  const meta = CATEGORY_META[cat];
                  const Icon = meta?.icon ?? LayoutGrid;
                  const items = visible.filter((d) => d.category === cat);
                  const toggleable = data.catalog.filter((d) => d.category === cat && d.kind !== "rollback");
                  const allOn = toggleable.length > 0 && toggleable.every((d) => data.settings[d.key].enabled);
                  return (
                    <section key={cat} className="overflow-hidden rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-raised)]">
                      <header className="flex items-center gap-3 border-b border-[var(--panel-border)] px-5 py-4">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-primary)]/15 text-[var(--accent-primary)]">
                          <Icon className="h-4.5 w-4.5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <h2 className="text-base font-bold text-[var(--text-primary)]">{cat}</h2>
                          {meta && <p className="text-[13px] text-[var(--text-muted)]">{meta.description}</p>}
                        </div>
                        {toggleable.length > 0 && (
                          <button type="button" onClick={() => void toggleCategory(cat)} className="shrink-0 rounded-xl border border-[var(--panel-border)] px-3 py-1.5 text-[13px] font-semibold text-[var(--text-primary)] transition-[background-color,transform] hover:bg-[var(--surface-hover)] active:scale-[0.97] cursor-pointer">
                            {allOn ? tx("Tout désactiver") : tx("Tout activer")}
                          </button>
                        )}
                      </header>
                      <ul>
                        {items.map((d, i) => {
                          const st = data.settings[d.key];
                          const todo = isIncomplete(d, st);
                          return (
                            <motion.li
                              key={d.key}
                              initial={reduced ? false : { opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1], delay: reduced ? 0 : Math.min(i, 12) * 0.025 }}
                              className="group flex items-center gap-4 border-b border-[var(--panel-border)] px-5 py-3.5 last:border-b-0 transition-colors hover:bg-[var(--surface-hover)]/50"
                            >
                              <motion.span animate={{ scale: st.enabled ? 1 : 0.8, backgroundColor: st.enabled ? "var(--success)" : "var(--text-muted)" }} transition={SPRING_PILL} className="h-1.5 w-1.5 shrink-0 rounded-full opacity-80" aria-hidden="true" />
                              <button type="button" onClick={() => open(d.key)} className="min-w-0 flex-1 text-left cursor-pointer">
                                <span className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                                  {d.label}
                                  {todo && <TriangleAlert className="h-3.5 w-3.5 text-[var(--warning)]" aria-label={tx("À compléter")} />}
                                </span>
                                <span className="mt-0.5 block text-[13px] text-[var(--text-muted)]">{todo ? "À compléter : choisis un salon de logs" + (d.specific === "watchedChannels" ? " et les salons surveillés" : d.kind === "words" ? " et les mots interdits" : "") + "." : d.description}</span>
                              </button>
                              {d.kind !== "rollback" && <Switch checked={st.enabled} onChange={(v) => save(d.key, { enabled: v })} label={`${d.label} ${st.enabled ? "activée" : "désactivée"}`} />}
                              <button type="button" onClick={() => open(d.key)} aria-label={tx("Régler {label}", { label: d.label })} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--text-muted)] transition-[color,transform] group-hover:translate-x-0.5 group-hover:text-[var(--text-primary)] cursor-pointer">
                                <ChevronRight className="h-4 w-4" />
                              </button>
                            </motion.li>
                          );
                        })}
                      </ul>
                    </section>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

function Detail({
  def,
  s,
  guildId,
  channels,
  defaultWatchedPerms,
  lastBackupAt,
  prepared,
  onPrepare,
  onSave,
  onBackupNow,
  busy,
}: {
  def: Def;
  s: Settings;
  guildId: string;
  channels: ChannelOption[];
  defaultWatchedPerms: string[];
  lastBackupAt: string | null;
  prepared: boolean;
  onPrepare: () => void;
  onSave: (patch: Partial<Settings>) => void;
  onBackupNow: () => void;
  busy: string | null;
}) {
  const open = s.enabled || prepared;
  const api = useGuildApi(guildId);
  const [checks, setChecks] = useState<{ label: string; ok: boolean; detail?: string }[] | null>(null);
  const [testing, setTesting] = useState(false);
  // Le propriétaire est toujours ignoré par les protections : ce test vérifie à sa place ce qui ferait échouer une réaction.
  const runTest = async () => {
    setTesting(true);
    const r = await api<{ checks: { label: string; ok: boolean; detail?: string }[] }>(`/protections/${def.key}/test`, { method: "POST", json: {} });
    setTesting(false);
    if (r) setChecks(r.checks);
  };
  const [dm, setDm] = useState(s.dmMessage ?? "");
  useEffect(() => setDm(s.dmMessage ?? ""), [s.dmMessage, def.key]);
  let n = 0;

  return (
    <div>
      <header className="flex items-start justify-between gap-4 px-5 pt-5 sm:px-6">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-[var(--text-muted)]">{def.category}</p>
          <h2 className="mt-1 text-xl font-bold text-[var(--text-primary)]">{def.label}</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">{def.description}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2.5 pt-1">
          <span className={cn("text-[13px] font-semibold", s.enabled ? "text-[var(--success)]" : "text-[var(--text-muted)]")}>{s.enabled ? tx("Activée") : tx("Désactivée")}</span>
          <Switch checked={s.enabled} onChange={(v) => onSave({ enabled: v })} label={def.label} />
        </div>
      </header>

      <div className="mx-5 my-4 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))]/60 px-4 py-3.5 sm:mx-6">
        <p className="mb-1 text-xs font-semibold text-[var(--text-muted)]">{s.enabled ? tx("Ce que fait Etho") : tx("Une fois activée")}</p>
        <Sentence text={describe(def, s)} />
        {def.aftermath && (
          <p className="mt-2 flex items-start gap-1.5 text-xs text-[var(--text-muted)]">
            <CircleCheck className="mt-px h-3.5 w-3.5 shrink-0 text-[var(--success)]" />
            {def.aftermath}
          </p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[var(--panel-border)] pt-3">
          <GhostButton onClick={runTest} disabled={testing}>
            {testing ? tx("Test…") : tx("Tester la protection")}
          </GhostButton>
          <span className="text-[11px] text-[var(--text-muted)]">{tx("Vérifie les permissions d'Etho, sa place dans les rôles et le salon de log (message de test).")}</span>
        </div>
        {checks && (
          <ul className="mt-2 space-y-1">
            {checks.map((c) => (
              <li key={c.label} className="flex items-start gap-2 text-xs">
                {c.ok ? <CircleCheck className="mt-px h-3.5 w-3.5 shrink-0 text-[var(--success)]" /> : <TriangleAlert className="mt-px h-3.5 w-3.5 shrink-0 text-[var(--warning)]" />}
                <span className="text-[var(--text-primary)]">
                  {c.label}
                  {c.detail && <span className="text-[var(--text-muted)]"> — {c.detail}</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <AnimatePresence initial={false} mode="wait">
        {!open ? (
          <motion.div key="folded" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-3 border-t border-[var(--panel-border)] px-6 py-10 text-center">
            <p className="text-xs text-[var(--text-muted)]">{tx("Les réglages sont repliés tant que la protection est désactivée.")}</p>
            <GhostButton onClick={onPrepare}>{tx("Préparer les réglages")}</GhostButton>
          </motion.div>
        ) : (
          <motion.div key="open" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={SPRING_LAYOUT} className="overflow-hidden">
            {/* 1. Détection */}
            {def.kind !== "rollback" && (
              <Section n={++n} title={tx("Détection")}>
                {def.kind === "quota" && (
                  <Field label={tx("Seuil")} info="Nombre d'actions d'un même membre, dans la fenêtre de temps, avant la sanction.">
                    <div className="flex flex-wrap items-center gap-2">
                      <Stepper value={s.quotaMax ?? 1} min={1} max={1000} unit={(s.quotaMax ?? 1) > 1 ? def.noun?.[1] : def.noun?.[0]} onCommit={(v) => onSave({ quotaMax: v })} />
                      <span className="text-sm text-[var(--text-muted)]">{tx("en moins de")}</span>
                      <DurationField seconds={s.quotaSeconds ?? 60} max={604800} presets={WINDOW_PRESETS} onCommit={(v) => onSave({ quotaSeconds: v })} />
                    </div>
                  </Field>
                )}
                {def.specific === "maxPerMessage" && (
                  <Field label={tx("Mentions par message")} hint={tx("Au-delà, le message compte.")}>
                    <Stepper value={s.maxPerMessage ?? 5} min={1} max={50} unit="max" onCommit={(v) => onSave({ maxPerMessage: v })} />
                  </Field>
                )}
                {def.specific === "ghostPing" && (
                  <>
                    <Field label={tx("Délai")} hint={tx("Une mention supprimée dans ce délai après l'envoi compte comme un ghost ping.")}>
                      <DurationField seconds={s.ghostMaxAgeSeconds ?? 60} max={3600} presets={[[30, "30 s"], [60, "1 min"], [300, "5 min"]]} onCommit={(v) => onSave({ ghostMaxAgeSeconds: v })} />
                    </Field>
                    <Field label={tx("Prévenir dans le salon")} hint={tx("Indique qui a mentionné qui, sans notifier personne une deuxième fois.")}>
                      <Switch checked={s.ghostNotify ?? true} onChange={(v) => onSave({ ghostNotify: v })} label={tx("Prévenir dans le salon")} />
                    </Field>
                  </>
                )}
                {def.specific === "textWall" && (
                  <>
                    <Field label={tx("Caractères maximum")} hint={tx("Au-delà, le message est un pavé. Un emoji compte pour un caractère.")}>
                      <Stepper value={s.maxChars ?? 1500} min={50} max={4000} step={50} unit={tx("caractères")} onCommit={(v) => onSave({ maxChars: v })} />
                    </Field>
                    <Field label={tx("Lignes maximum")} hint={tx("Les sauts de ligne comptent, même les lignes vides.")}>
                      <Stepper value={s.maxLines ?? 20} min={2} max={200} unit="lignes" onCommit={(v) => onSave({ maxLines: v })} />
                    </Field>
                    <Field label={tx("Ignorer les blocs de code")} hint={tx("Utile dans un salon d'entraide où l'on colle du code.")}>
                      <Switch checked={s.ignoreCodeBlocks ?? false} onChange={(v) => onSave({ ignoreCodeBlocks: v })} label={tx("Ignorer les blocs de code")} />
                    </Field>
                  </>
                )}
                {def.specific === "duplicate" && (
                  <>
                    <Field label={tx("Comparaison")} hint={tx("« Très ressemblants » repère aussi une copie avec un mot ou un chiffre changé.")}>
                      <Segmented
                        label={tx("Comparaison")}
                        value={s.matchMode ?? "similar"}
                        options={[
                          ["similar", "Très ressemblants"],
                          ["exact", "Identiques"],
                        ]}
                        onChange={(v) => onSave({ matchMode: v })}
                      />
                    </Field>
                    <Field label={tx("Longueur minimale")} hint={tx("Les messages plus courts ne sont jamais comparés.")}>
                      <Stepper value={s.minLength ?? 2} min={1} max={200} unit={tx("caractères")} onCommit={(v) => onSave({ minLength: v })} />
                    </Field>
                  </>
                )}
                {def.specific === "watchedChannels" && (
                  <Field label={tx("Salons surveillés")} hint={tx("Seuls ces salons (ou les salons de ces catégories) sont protégés. Obligatoire.")}>
                    <ChannelChips guildId={guildId} channels={channels} ids={s.watchedChannels ?? []} onChange={(ids) => onSave({ watchedChannels: ids })} />
                  </Field>
                )}
                {def.specific === "emojiAbuse" && (
                  <>
                    <Field label={tx("Emojis par message")} hint={tx("Un emoji composé (drapeau, famille, teinte de peau) compte pour un.")}>
                      <Stepper value={s.maxEmojis ?? 10} min={1} max={100} unit="max" onCommit={(v) => onSave({ maxEmojis: v })} />
                    </Field>
                    <Field label={tx("Emojis classiques")} hint={tx("😀, ❤️, 👍 et les autres emojis de Discord.")}>
                      <Switch checked={s.countUnicode ?? true} disabled={(s.countUnicode ?? true) && !(s.countCustom ?? true)} onChange={(v) => onSave({ countUnicode: v })} label={tx("Compter les emojis classiques")} />
                    </Field>
                    <Field label={tx("Emojis du serveur")} hint={tx("Les emojis personnalisés, animés compris.")}>
                      <Switch checked={s.countCustom ?? true} disabled={(s.countCustom ?? true) && !(s.countUnicode ?? true)} onChange={(v) => onSave({ countCustom: v })} label={tx("Compter les emojis du serveur")} />
                    </Field>
                  </>
                )}
                {def.kind === "watched" && (
                  <>
                    <Field label={tx("Permissions surveillées")} hint={tx("Vide : {v0}.", { v0: defaultWatchedPerms.map((p) => PERMS.find(([k]) => k === p)?.[1] ?? p).join(", ").toLowerCase() })}>
                      <div className="flex flex-wrap gap-1.5">
                        {PERMS.map(([k, l]) => {
                          const on = (s.watchedPerms ?? []).includes(k);
                          return (
                            <button
                              key={k}
                              type="button"
                              aria-pressed={on}
                              onClick={() => onSave({ watchedPerms: on ? (s.watchedPerms ?? []).filter((x) => x !== k) : [...(s.watchedPerms ?? []), k] })}
                              className={cn("rounded-md border px-2 py-1 text-xs font-medium transition-colors", on ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--text-primary)]" : "border-[var(--panel-border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]")}
                            >
                              {l}
                            </button>
                          );
                        })}
                      </div>
                    </Field>
                    <Field label={tx("Rôles protégés")} hint={tx("Surveillés quelle que soit leur permission.")}>
                      <RoleChips guildId={guildId} ids={s.watchedRoles ?? []} onChange={(ids) => onSave({ watchedRoles: ids })} />
                    </Field>
                  </>
                )}
                {(def.kind === "link" || def.kind === "words") && (
                  <Field label={tx("Mode d'application")} hint={s.enforcement === "automod" ? tx("Discord bloque le message avant sa publication (règle AutoMod créée par Etho).") : tx("Etho supprime le message juste après sa publication.")}>
                    <Segmented
                      label={tx("Mode d'application")}
                      value={s.enforcement ?? "bot"}
                      options={[
                        ["bot", "Etho"],
                        ["automod", "AutoMod Discord"],
                      ]}
                      onChange={(v) => onSave({ enforcement: v })}
                    />
                  </Field>
                )}
                {def.kind === "link" && (
                  <>
                    <Field label={tx("Liens bloqués")}>
                      <div className="grid gap-2 sm:grid-cols-3">
                        {(
                          [
                            ["general", "Tous les liens", "Tout lien http ou https"],
                            ["discord", "Discord", "discord.gg et invitations"],
                            ["images", "Images", "Liens vers des images"],
                          ] as const
                        ).map(([k, l, h]) => {
                          const on = (s.linkTypes ?? []).includes(k);
                          return (
                            <button
                              key={k}
                              type="button"
                              aria-pressed={on}
                              onClick={() => {
                                const next = on ? (s.linkTypes ?? []).filter((x) => x !== k) : [...(s.linkTypes ?? []), k];
                                if (next.length) onSave({ linkTypes: next });
                              }}
                              className={cn("rounded-lg border px-3 py-2 text-left transition-colors", on ? "border-[var(--success)]/60 bg-[var(--success)]/10" : "border-[var(--panel-border)] hover:bg-[var(--surface-hover)]")}
                            >
                              <span className="block text-[13px] font-semibold text-[var(--text-primary)]">{l}</span>
                              <span className="block text-[11px] text-[var(--text-muted)]">{h}</span>
                            </button>
                          );
                        })}
                      </div>
                    </Field>
                    <Field label={tx("Domaines autorisés")} hint={tx("Un domaine couvre ses sous-domaines (youtube.com couvre m.youtube.com).")}>
                      <TagInput values={s.allowedDomains ?? []} max={100} placeholder="youtube.com" onChange={(v) => onSave({ allowedDomains: v })} />
                    </Field>
                  </>
                )}
                {def.kind === "words" && (
                  <Field label={tx("Mots interdits")} hint={tx("Mots entiers, majuscules et accents ignorés. Virgule pour en ajouter plusieurs.")}>
                    <TagInput values={s.bannedWords ?? []} max={500} placeholder={tx("Ajouter un mot")} onChange={(v) => onSave({ bannedWords: v })} />
                  </Field>
                )}
                {def.kind === "toxicity" && (
                  <>
                    <Field label={tx("Taux de toxicité maximal")} hint={tx("Plus bas, plus sévère, mais plus d'erreurs. Analyse locale en français et en anglais.")}>
                      <Stepper value={s.toxicityThreshold ?? 90} min={10} max={100} step={5} unit="%" onCommit={(v) => onSave({ toxicityThreshold: v })} />
                    </Field>
                    <Field label={tx("Ignorer les toxicités sans cible")} hint={tx("Une insulte visant quelqu'un compte toujours.")}>
                      <Switch checked={s.ignoreUntargeted ?? true} onChange={(v) => onSave({ ignoreUntargeted: v })} label={tx("Ignorer les toxicités sans cible")} />
                    </Field>
                  </>
                )}
                {def.kind === "scam" && <p className="py-2 text-sm text-[var(--text-muted)]">{tx("Détection automatique : faux Nitro, faux sites Discord et Steam, jetons de compte collés, arnaques aux skins.")}</p>}
                {def.kind === "reorder" && <p className="py-2 text-sm text-[var(--text-muted)]">{tx("Discord n'indique pas qui déplace un rôle : il n'y a donc ni seuil ni sanction. Désactive la protection le temps de réorganiser tes rôles toi-même.")}</p>}
                {def.kind === "alt" && (
                  <>
                    <Field label={tx("Ancienneté minimale")} hint={tx("Âge du compte Discord.")}>
                      <Stepper value={s.minAccountAgeDays ?? 7} min={1} max={365} unit="jours" onCommit={(v) => onSave({ minAccountAgeDays: v })} />
                    </Field>
                    <Field label={tx("Message privé")} hint={tx("Vide : message par défaut.")}>
                      <textarea
                        value={dm}
                        maxLength={500}
                        rows={2}
                        placeholder={tx("Désolé, ton compte Discord est trop récent pour rejoindre ce serveur. Reviens dans quelques jours.")}
                        onChange={(e) => setDm(e.target.value)}
                        onBlur={() => dm !== (s.dmMessage ?? "") && onSave({ dmMessage: dm })}
                        className="w-full rounded-lg border border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]/70"
                      />
                    </Field>
                  </>
                )}
              </Section>
            )}

            {def.kind === "rollback" && (
              <Section n={++n} title={tx("Sauvegarde")}>
                <Field label={tx("Fréquence")}>
                  <Segmented
                    label={tx("Fréquence")}
                    value={s.backupIntervalHours ?? 24}
                    options={[
                      [6, "6 h"],
                      [12, "12 h"],
                      [24, "24 h"],
                      [168, "7 j"],
                    ]}
                    onChange={(v) => onSave({ backupIntervalHours: v })}
                  />
                </Field>
                <Field label={tx("Dernière capture")} hint={tx("Les captures se restaurent depuis le module Sauvegardes.")}>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-sm text-[var(--text-primary)]">{lastBackupAt ? new Date(lastBackupAt).toLocaleString("fr-FR") : tx("Aucune pour l'instant")}</span>
                    <GhostButton onClick={onBackupNow} disabled={busy === "backup"}>
                      <Camera className="h-3.5 w-3.5" />
                      {busy === "backup" ? tx("Capture…") : tx("Capturer maintenant")}
                    </GhostButton>
                  </div>
                </Field>
              </Section>
            )}

            {/* 2. Punition */}
            {hasPunish(def) && (
              <Section n={++n} title={tx("Punition")}>
                <div className="grid grid-cols-2 gap-2 py-2 sm:grid-cols-3 xl:grid-cols-5">
                  {PUNISHMENTS.map((p) => {
                    const on = s.punish === p.id;
                    const Icon = p.icon;
                    return (
                      <button key={p.id} type="button" aria-pressed={on} onClick={() => !on && onSave({ punish: p.id })} className="relative isolate rounded-lg border border-[var(--panel-border)] px-3 py-2.5 text-left transition-[transform] active:scale-[0.98]">
                        {on && <motion.span layoutId={`punish-${def.key}`} transition={SPRING_PILL} className="absolute inset-0 -z-10 rounded-lg border border-[var(--success)]/70 bg-[var(--success)]/10" />}
                        <span className={cn("flex items-center gap-1.5 text-[13px] font-semibold", on ? "text-[var(--text-primary)]" : "text-[var(--text-secondary,var(--text-primary))]")}>
                          <Icon className="h-3.5 w-3.5" />
                          {p.label}
                        </span>
                        <span className="mt-0.5 block text-[11px] text-[var(--text-muted)]">{p.hint}</span>
                      </button>
                    );
                  })}
                </div>
                {def.key === "antiWebhook" && (
                  <Field label={tx("Webhook créé")}>
                    <Segmented
                      label={tx("Action sur le webhook")}
                      value={s.webhookAction ?? "delete"}
                      options={[
                        ["delete", "Supprimer le webhook"],
                        ["recreate", "Recréer le salon"],
                        ["none", "Ne rien faire"],
                      ]}
                      onChange={(v) => onSave({ webhookAction: v })}
                    />
                  </Field>
                )}
                <AnimatePresence initial={false}>
                  {s.punish === "timeout" && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                      <Field label={tx("Durée du timeout")}>
                        <DurationField seconds={s.timeoutSeconds} max={28 * 86400} presets={TIMEOUT_PRESETS} onCommit={(v) => onSave({ timeoutSeconds: v })} />
                      </Field>
                    </motion.div>
                  )}
                </AnimatePresence>
                {def.kind !== "alt" && (
                  <Field
                    label={
                      <span className="flex flex-wrap items-center gap-2">
                        {tx("Verrouiller le serveur")}
                        {def.lockdownAdvised && <span className="rounded-md bg-[var(--accent-primary)]/15 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--accent-primary)]">{tx("Conseillé ici")}</span>}
                      </span>
                    }
                    info="Retire aussi les permissions sensibles de tous les rôles du serveur. Radical, mais stoppe net une attaque en cours. Le verrouillage se lève d'un clic."
                  >
                    <div className="flex items-center gap-3 pt-0.5">
                      <Switch checked={s.lockdown} onChange={(v) => onSave({ lockdown: v })} label={tx("Verrouiller le serveur")} />
                      <span className="text-xs text-[var(--text-muted)]">{s.lockdown ? tx("Activé") : tx("Désactivé")}</span>
                    </div>
                  </Field>
                )}
              </Section>
            )}

            {/* 3. Alerte */}
            {hasAlert(def) && (
              <Section n={++n} title={tx("Alerte")}>
                <Field label={tx("Salon de log")} hint={!s.logChannelId ? tx("Sans salon, la protection agit sans prévenir personne.") : undefined}>
                  <div className="max-w-md">
                    <ChannelPicker guildId={guildId} value={s.logChannelId ?? ""} filterTypes={[0, 5]} placeholder={tx("Choisir un salon")} onChange={(id) => onSave({ logChannelId: id || null })} />
                  </div>
                </Field>
                <Field label={tx("Mentionner à chaque sanction")}>
                  <div className="space-y-2.5">
                    <RoleChips guildId={guildId} ids={s.mentionRoleIds} onChange={(ids) => onSave({ mentionRoleIds: ids })} />
                    <div className="flex items-center gap-3">
                      <Switch checked={s.mentionEveryone} onChange={(v) => onSave({ mentionEveryone: v })} label={tx("Mentionner aussi @everyone")} />
                      <span className="text-[13px] text-[var(--text-muted)]">{tx("Mentionner aussi @everyone")}</span>
                    </div>
                  </div>
                </Field>
                {def.kind === "quota" && (
                  <Field label={tx("Logs")} hint={s.logMode === "all" ? tx("Chaque action détectée est notée, même sous le seuil.") : tx("Seules les sanctions sont notées.")}>
                    <Segmented
                      label={tx("Logs")}
                      value={s.logMode}
                      options={[
                        ["abuse", "Abus seulement"],
                        ["all", "Toutes les actions"],
                      ]}
                      onChange={(v) => onSave({ logMode: v })}
                    />
                  </Field>
                )}
                <Field label={tx("Avertir le propriétaire en cas d'abus")} hint={tx("Message privé au propriétaire du serveur (une fois par minute au plus).")}>
                  <Switch checked={s.notifyOwner} onChange={(v) => onSave({ notifyOwner: v })} label={tx("Avertir le propriétaire")} />
                </Field>
              </Section>
            )}

            {/* 4. Whitelist */}
            {def.kind !== "rollback" && def.kind !== "reorder" && (
              <Section n={++n} title={tx("Whitelist")}>
                {def.kind !== "alt" && (
                  <>
                    <Field label={tx("Owners Etho")} hint={tx("Les owners du bot sur ce serveur ne déclenchent pas la protection.")}>
                      <Switch checked={s.ignoreEthoOwners} onChange={(v) => onSave({ ignoreEthoOwners: v })} label={tx("Ignorer les owners Etho")} />
                    </Field>
                    <Field label={tx("Whitelist globale")} hint={tx("Membres, bots et rôles de la page Whitelist.")}>
                      <Switch checked={s.useGlobalWhitelist} onChange={(v) => onSave({ useGlobalWhitelist: v })} label={tx("Appliquer la whitelist globale")} />
                    </Field>
                  </>
                )}
                {!def.noWhitelistLimit && (
                  <Field label={tx("Limite de la whitelist")} info="Immunité totale, ou un seuil à part pour les membres whitelistés.">
                    <div className="flex flex-wrap items-center gap-3">
                      <Segmented
                        label={tx("Limite de la whitelist")}
                        value={s.exceptionQuotaMax == null ? "immune" : "quota"}
                        options={[
                          ["immune", "Immunité totale"],
                          ["quota", "Seuil dédié"],
                        ]}
                        onChange={(v) =>
                          onSave(v === "quota" ? { exceptionQuotaMax: Math.max(2 * (s.quotaMax ?? 1), 2), exceptionQuotaSeconds: s.quotaSeconds ?? 60 } : { exceptionQuotaMax: null, exceptionQuotaSeconds: null })
                        }
                      />
                      {s.exceptionQuotaMax != null && (
                        <div className="flex flex-wrap items-center gap-2">
                          <Stepper value={s.exceptionQuotaMax} min={1} max={1000} unit="actions" onCommit={(v) => onSave({ exceptionQuotaMax: v })} />
                          <span className="text-sm text-[var(--text-muted)]">{tx("en moins de")}</span>
                          <DurationField seconds={s.exceptionQuotaSeconds ?? s.quotaSeconds ?? 60} max={604800} presets={WINDOW_PRESETS} onCommit={(v) => onSave({ exceptionQuotaSeconds: v })} />
                        </div>
                      )}
                    </div>
                  </Field>
                )}
                <div className="pt-3">
                  <p className="text-[13px] font-semibold text-[var(--text-primary)]">{tx("Propres à cette protection")}</p>
                  <p className="text-[11px] text-[var(--text-muted)]">{tx("Ajoutés ou retirés immédiatement.")}</p>
                </div>
                <Field label={<span className="font-medium text-[var(--text-muted)]">{tx("Membres et bots")}</span>}>
                  <MemberChips guildId={guildId} ids={s.wlUsers} onChange={(ids) => onSave({ wlUsers: ids })} />
                </Field>
                {def.kind !== "alt" && (
                  <Field label={<span className="font-medium text-[var(--text-muted)]">{tx("Rôles")}</span>}>
                    <RoleChips guildId={guildId} ids={s.wlRoles} onChange={(ids) => onSave({ wlRoles: ids })} />
                  </Field>
                )}
                {def.channelExempt && (
                  <>
                    <Field label={<span className="font-medium text-[var(--text-muted)]">{tx("Salons")}</span>}>
                      <ChannelChips guildId={guildId} channels={channels} ids={s.wlChannels} onChange={(ids) => onSave({ wlChannels: ids })} />
                    </Field>
                    <Field label={<span className="font-medium text-[var(--text-muted)]">{tx("Catégories")}</span>}>
                      <ChannelChips guildId={guildId} channels={channels} categories ids={s.wlCategories} onChange={(ids) => onSave({ wlCategories: ids })} />
                    </Field>
                  </>
                )}
              </Section>
            )}
            <div className="h-4" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Compteur « Protections actives » de la vue d'ensemble (même règle que cette page). */
export function protectionCount(data: { catalog: Def[]; settings: Record<string, Settings> } | null): { active: number; total: number; todo: number } | null {
  if (!data) return null;
  return {
    active: data.catalog.filter((d) => data.settings[d.key]?.enabled).length,
    total: data.catalog.length,
    todo: data.catalog.filter((d) => data.settings[d.key] && isIncomplete(d, data.settings[d.key])).length,
  };
}

