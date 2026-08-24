"use client";

import { useMemo } from "react";
import { Wrench, Sparkles, RefreshCw, Tag, Dot } from "lucide-react";
import { motion } from "framer-motion";
import { useSettings } from "@/components/SettingsProvider";
import { cn } from "@/lib/utils";
import type { ChangelogEntry } from "@/data/changelog";

function parseVersion(v: string) {
  const parts = v.replace(/^v/, "").split(".").map(Number);
  return parts;
}

function compareVersion(a: string, b: string) {
  const av = parseVersion(a);
  const bv = parseVersion(b);
  for (let i = 0; i < Math.max(av.length, bv.length); i++) {
    const x = av[i] || 0;
    const y = bv[i] || 0;
    if (x !== y) return x - y;
  }
  return 0;
}

const FR_MONTHS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

function parseDate(dateStr: string): Date | null {
  const iso = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  const fr = dateStr.match(/^(\d{1,2})\s+([a-zA-ZÀ-ÿéûãñ]+)\s+(\d{4})$/);
  if (fr) {
    const day = Number(fr[1]);
    const monthName = fr[2].toLowerCase();
    const month = FR_MONTHS.findIndex((m) => m.toLowerCase() === monthName);
    if (month !== -1) return new Date(Number(fr[3]), month, day);
  }
  const ts = Date.parse(dateStr);
  return isNaN(ts) ? null : new Date(ts);
}

function compareDateDesc(a: ChangelogEntry, b: ChangelogEntry) {
  const da = parseDate(a.date);
  const db = parseDate(b.date);
  if (!da || !db) return 0;
  return db.getTime() - da.getTime();
}

type ItemType = "fix" | "feature" | "change" | "version" | "default";

const FIX_RE = /corrige|corrections?|corrig[ée]|fix|bug|r[ée]sout|r[ée]solu|probl[èe]me|fermeture|d[ée]faut|[ée]choue|r[ée]solution|fiable|retour|restaur|restor|revert|patch|cass[ée]|broken|failed/i;
const FEATURE_RE = /nouveau|nouveaut[ée]|ajout|ajout[ée]|permet|int[èe]gre|impl[ée]mente|affiche|pr[ée]pare|introduit|support|active|nouvelle|nuev[oa]|added|new|neu|hinzugef[üu]gt|a[nñ]adido/i;
const CHANGE_RE = /changement|change|chang[ée]|modifie|modification|mise [àa] jour|update|polish|passe|devient|remplace|remplac[ée]|am[ée]liore|am[ée]lioration|r[ée]duit|augmente|actualis[ée]|actualizad[oa]|aktualisiert|verbessert|redesign|refonte|suppression|uniformisation/i;
const VERSION_RE = /version|mise [àa] jour en|versi[óo]n|versione|aktualisiert/i;

function classifyText(text: string): ItemType {
  if (VERSION_RE.test(text)) return "version";
  if (FIX_RE.test(text)) return "fix";
  if (CHANGE_RE.test(text)) return "change";
  if (FEATURE_RE.test(text)) return "feature";
  return "default";
}

function classifyItem(item: string, title: string): ItemType {
  const type = classifyText(item);
  if (type !== "default") return type;
  const titleType = classifyText(title);
  if (titleType !== "version") return titleType;
  return "default";
}

const TYPE_CONFIG: Record<
  ItemType,
  {
    icon: React.ComponentType<{ className?: string }>;
    dot: string;
    iconColor: string;
    badgeBg: string;
    badgeBorder: string;
    badgeText: string;
    borderColor: string;
  }
> = {
  fix: {
    icon: Wrench,
    dot: "bg-blue-400",
    iconColor: "text-blue-400",
    badgeBg: "bg-blue-500/10",
    badgeBorder: "border-blue-500/30",
    badgeText: "text-blue-300",
    borderColor: "rgba(96,165,250,0.35)",
  },
  feature: {
    icon: Sparkles,
    dot: "bg-[--accent-primary]",
    iconColor: "text-[--accent-primary]",
    badgeBg: "bg-[--accent-primary]",
    badgeBorder: "border-[--accent-primary]",
    badgeText: "text-[--accent-primary]",
    borderColor: "var(--glow-color)",
  },
  change: {
    icon: RefreshCw,
    dot: "bg-amber-400",
    iconColor: "text-amber-400",
    badgeBg: "bg-amber-500/10",
    badgeBorder: "border-amber-500/30",
    badgeText: "text-amber-300",
    borderColor: "rgba(251,191,36,0.35)",
  },
  version: {
    icon: Tag,
    dot: "bg-purple-400",
    iconColor: "text-purple-400",
    badgeBg: "bg-purple-500/10",
    badgeBorder: "border-purple-500/30",
    badgeText: "text-purple-300",
    borderColor: "rgba(168,85,247,0.35)",
  },
  default: {
    icon: Dot,
    dot: "bg-zinc-500",
    iconColor: "text-zinc-400",
    badgeBg: "bg-zinc-500/10",
    badgeBorder: "border-zinc-500/20",
    badgeText: "text-zinc-300",
    borderColor: "rgba(161,161,170,0.25)",
  },
};

function formatDate(dateStr: string, locale = "fr") {
  try {
    return new Date(dateStr).toLocaleDateString(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function ChangelogItem({ item, title, dim }: { item: string; title: string; dim?: boolean }) {
  const type = classifyItem(item, title);
  const cfg = TYPE_CONFIG[type];
  const Icon = cfg.icon;

  return (
    <li
      className={cn(
        "flex items-start gap-2.5 text-sm font-medium leading-relaxed",
        dim ? "text-zinc-300" : "text-zinc-100",
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full",
          type === "default" ? "bg-zinc-500/20" : cfg.badgeBg,
        )}
      >
        <Icon className={cn("h-2.5 w-2.5", cfg.iconColor)} />
      </span>
      <span>{item}</span>
    </li>
  );
}

function ChangelogCard({
  entry,
  index,
  compact,
}: {
  entry: ChangelogEntry;
  index: number;
  compact?: boolean;
}) {
  const { settings } = useSettings();

  const itemTypes = useMemo(
    () => entry.items.map((item) => classifyItem(item, entry.title)),
    [entry],
  );

  const entryType = useMemo<ItemType>(() => {
    const counts: Record<ItemType, number> = { fix: 0, feature: 0, change: 0, version: 0, default: 0 };
    itemTypes.forEach((t) => {
      if (t !== "version") counts[t]++;
    });
    const dominant = (Object.keys(counts) as ItemType[]).reduce((a, b) =>
      counts[a] >= counts[b] ? a : b,
    );
    if (dominant !== "default" && counts[dominant] > 0) return dominant;
    const titleType = classifyText(entry.title);
    if (titleType !== "version") return titleType;
    return "default";
  }, [itemTypes, entry.title]);

  const cfg = TYPE_CONFIG[entryType];
  const dim = index > 0;

  const content = (
    <div
      className={cn(
        "relative flex flex-col gap-2.5 overflow-hidden rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4 shadow-[var(--panel-shadow)] backdrop-blur-[var(--panel-blur)] transition-all duration-200",
        compact ? "p-3.5" : "p-5",
        dim ? "opacity-90" : "hover:border-[var(--accent)]/30",
      )}
      style={{ borderLeftColor: cfg.borderColor, borderLeftWidth: compact ? "2px" : "3px" }}
    >
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
          <span className={cn("text-base font-bold", dim ? "text-zinc-200" : "text-white")}>
            {entry.title}
          </span>
          <span
            className="w-fit shrink-0 rounded-md border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] font-medium text-amber-300"
          >
            {entry.version}
          </span>
        </div>
        <span className="shrink-0 text-[10px] text-zinc-500">
          {formatDate(entry.date, settings.language)}
        </span>
      </div>

      <ul className={cn("flex flex-col", compact ? "gap-1.5" : "gap-2")}>
        {entry.items.map((item, i) => (
          <ChangelogItem key={i} item={item} title={entry.title} dim={dim} />
        ))}
      </ul>
    </div>
  );

  if (compact) return content;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
    >
      {content}
    </motion.div>
  );
}

interface ChangelogListProps {
  entries: ChangelogEntry[];
  limit?: number;
  compact?: boolean;
  className?: string;
}

export default function ChangelogList({ entries, limit, compact, className }: ChangelogListProps) {
  const sorted = useMemo(
    () => [...entries].sort((a, b) => compareDateDesc(a, b) || compareVersion(b.version, a.version)),
    [entries],
  );
  const visible = limit ? sorted.slice(0, limit) : sorted;

  return (
    <div className={cn("flex flex-col", compact ? "gap-2.5" : "gap-4", className)}>
      {visible.map((entry, index) => (
        <ChangelogCard key={entry.version} entry={entry} index={index} compact={compact} />
      ))}
    </div>
  );
}
