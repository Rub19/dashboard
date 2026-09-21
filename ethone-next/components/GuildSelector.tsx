"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { useBotGuildIds } from "@/lib/hooks/useBotGuildIds";
import { cn } from "@/lib/utils";

export interface GuildOption {
  id: string;
  name: string;
  icon?: string | null;
  iconUrl?: string | null;
}

interface GuildSelectorProps<T extends GuildOption> {
  guilds: T[];
  /** Identifiant du serveur sélectionné ("" = aucun). */
  value: string;
  onChange: (guild: T) => void;
  className?: string;
}

/** Couleur stable dérivée du nom, pour les serveurs sans icône. */
function tint(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return `hsl(${h} 55% 42%)`;
}

function initials(name: string): string {
  const words = name.replace(/[^\p{L}\p{N}\s]/gu, " ").trim().split(/\s+/).filter(Boolean);
  const letters = words.length > 1 ? words[0][0] + words[1][0] : (words[0] || name).slice(0, 2);
  return letters.toUpperCase();
}

function GuildIcon({ guild, size }: { guild: GuildOption; size: number }) {
  const [failed, setFailed] = useState(false);
  const src = guild.iconUrl || (guild.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=64` : null);
  const style = { width: size, height: size };
  if (src && !failed) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" style={style} className="shrink-0 rounded-lg object-cover" onError={() => setFailed(true)} />;
  }
  return (
    <span
      style={{ ...style, background: tint(guild.name), fontSize: Math.round(size * 0.38) }}
      className="flex shrink-0 items-center justify-center rounded-lg font-bold text-white"
      aria-hidden
    >
      {initials(guild.name)}
    </span>
  );
}

/**
 * Sélecteur de serveur moderne : icône, recherche instantanée, serveurs où le bot est présent en
 * premier avec un badge, navigation au clavier (↑ ↓ Entrée Échap). Remplace le menu natif du navigateur.
 */
export function GuildSelector<T extends GuildOption>({ guilds, value, onChange, className }: GuildSelectorProps<T>) {
  const botIds = useBotGuildIds(guilds);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const hasBot = (id: string) => Boolean(botIds?.includes(id));
  const selected = guilds.find((g) => g.id === value) ?? null;

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = guilds.filter((g) => !q || g.name.toLowerCase().includes(q));
    // Le bot d'abord (là où l'on peut agir), puis ordre alphabétique.
    return [...filtered].sort((a, b) => Number(hasBot(b.id)) - Number(hasBot(a.id)) || a.name.localeCompare(b.name, "fr", { sensitivity: "base" }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guilds, query, botIds]);

  const botCount = rows.filter((g) => hasBot(g.id)).length;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setCursor(Math.max(0, rows.findIndex((g) => g.id === value)));
      setTimeout(() => searchRef.current?.focus(), 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${cursor}"]`)?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  const choose = (g: T) => {
    onChange(g);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(rows.length - 1, c + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(0, c - 1));
    } else if (e.key === "Enter" && rows[cursor]) {
      e.preventDefault();
      choose(rows[cursor]);
    }
  };

  return (
    <div ref={rootRef} className={cn("relative", className)} onKeyDown={onKeyDown}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          "flex h-10 w-full min-w-[13rem] max-w-[20rem] items-center gap-2.5 rounded-xl border bg-white/[0.04] px-2.5 text-left text-xs font-medium text-white transition-all cursor-pointer",
          open ? "border-[var(--accent-primary)] shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent-primary)_18%,transparent)]" : "border-[var(--panel-border)] hover:bg-white/[0.07]"
        )}
      >
        {selected ? <GuildIcon guild={selected} size={24} /> : <span className="h-6 w-6 shrink-0 rounded-lg bg-white/10" />}
        <span className="min-w-0 flex-1 truncate">{selected?.name || "Choisir un serveur"}</span>
        {selected && hasBot(selected.id) && <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" title="Le bot est présent" />}
        <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 text-white/50 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[21rem] max-w-[calc(100vw-2rem)] origin-top-right overflow-hidden rounded-2xl border border-[var(--panel-border)] bg-[var(--bg-surface-elevated,#17181d)] shadow-2xl shadow-black/60 backdrop-blur-xl">
          <div className="flex items-center gap-2 border-b border-[var(--panel-border)] px-3 py-2.5">
            <Search className="h-3.5 w-3.5 shrink-0 text-white/40" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setCursor(0);
              }}
              placeholder="Rechercher un serveur…"
              className="w-full bg-transparent text-xs text-white outline-none placeholder:text-white/35"
            />
            <span className="shrink-0 text-[10px] tabular-nums text-white/35">{rows.length}</span>
          </div>

          <ul ref={listRef} role="listbox" className="max-h-80 overflow-y-auto p-1.5 os-scroll">
            {rows.length === 0 && <li className="px-3 py-6 text-center text-xs text-white/40">Aucun serveur ne correspond.</li>}
            {rows.map((g, i) => {
              const withBot = hasBot(g.id);
              const isSelected = g.id === value;
              const showBotHeader = i === 0 && withBot && botCount > 0;
              const showOthersHeader = !withBot && (i === 0 || hasBot(rows[i - 1].id)) && botCount > 0;
              return (
                <li key={g.id} role="presentation">
                  {showBotHeader && <p className="px-2.5 pb-1 pt-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300/80">Le bot est présent</p>}
                  {showOthersHeader && <p className="px-2.5 pb-1 pt-3 text-[10px] font-bold uppercase tracking-wider text-white/35">Autres serveurs</p>}
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    data-index={i}
                    onMouseEnter={() => setCursor(i)}
                    onClick={() => choose(g)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors cursor-pointer",
                      i === cursor ? "bg-white/[0.08]" : "hover:bg-white/[0.05]",
                      !withBot && botIds !== null && "opacity-60"
                    )}
                  >
                    <GuildIcon guild={g} size={30} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-semibold text-white">{g.name}</span>
                      <span className={cn("block text-[10px]", withBot ? "text-emerald-300/80" : "text-white/35")}>
                        {botIds === null ? "…" : withBot ? "Bot présent" : "Sans le bot"}
                      </span>
                    </span>
                    {isSelected && <Check className="h-4 w-4 shrink-0 text-[var(--accent-primary)]" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
