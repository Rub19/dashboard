"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Hash, Edit3, ListFilter, X, Check, Loader2, ChevronDown, ChevronRight, Search,
  Volume2, Mic, Folder, Image as ImageIcon, MessageSquare, MessagesSquare,
} from "@/components/icons/ph";
import { cn } from "@/lib/utils";
import { subscribeGuildLive } from "@/lib/guildLive";

export interface ChannelOption {
  id: string;
  name: string;
  type?: number;
  /** Fil / post de forum : salon parent (forum ou texte). */
  parentId?: string | null;
  parentName?: string | null;
  categoryName?: string | null;
  /** Post d'un salon forum / média (type 11). */
  isPost?: boolean;
  tags?: { id: string; name: string; emoji?: string | null }[];
}

export interface ChannelPickerProps {
  value: string | null | undefined;
  onChange: (channelId: string, channel?: ChannelOption) => void;
  channels?: ChannelOption[];
  guildId?: string | null;
  placeholder?: string;
  emptyLabel?: string;
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
  required?: boolean;
  allowClear?: boolean;
  /** ex: [0, 5] pour salons textuels. 15/16 = forums/médias ET leurs posts ; 11 = posts seuls. */
  filterTypes?: number[];
  size?: "sm" | "default";
}

const BOT_API_URL = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "";
const globalChannelCache = new Map<string, ChannelOption[]>();
const globalChannelLoading = new Map<string, Promise<ChannelOption[]>>();

const isThreadType = (t?: number) => t === 10 || t === 11 || t === 12;
const isForumType = (t?: number) => t === 15 || t === 16;

type Tag = { id: string; name: string; emoji?: string | null };

/**
 * Aplatit la réponse /server/channels : categories[].channels, orphanChannels, channels,
 * + posts de forum (channel.posts) et fils (data.threads). Tout est optionnel.
 */
function parseChannelsPayload(data: any): ChannelOption[] {
  const out: ChannelOption[] = [];
  const byId = new Map<string, ChannelOption>();
  const tagMaps = new Map<string, Map<string, Tag>>();

  const toTag = (t: any): Tag => ({
    id: String(t.id ?? t.name),
    name: String(t.name ?? ""),
    emoji: typeof t.emoji === "string" ? t.emoji : t.emoji?.name ?? t.emojiName ?? null,
  });
  const resolveTags = (raw: any, forumId: string) => {
    if (!Array.isArray(raw)) return undefined;
    const known = tagMaps.get(forumId);
    const tags = raw
      .map((t: any) => (t && typeof t === "object" ? t : known?.get(String(t))))
      .filter((t: any) => t && t.name)
      .map((t: any) => toTag(t));
    return tags.length ? tags : undefined;
  };
  const add = (o: ChannelOption) => {
    if (byId.has(o.id)) return;
    byId.set(o.id, o);
    out.push(o);
  };
  const addThread = (t: any, parent: ChannelOption | undefined, parentId: string, category: string | null) => {
    if (!t?.id || !t?.name) return;
    const isPost = isForumType(parent?.type) || t.isPost === true;
    add({
      id: String(t.id),
      name: String(t.name),
      type: isPost ? 11 : t.type ?? 11,
      parentId,
      parentName: parent?.name ?? t.parentName ?? null,
      categoryName: parent?.categoryName ?? category,
      isPost,
      tags: resolveTags(t.appliedTags ?? t.tags, parentId),
    });
  };
  const addChannel = (c: any, category: string | null) => {
    if (!c?.id || !c?.name) return;
    const id = String(c.id);
    const cat: string | null = c.categoryName ?? category;
    if (isForumType(c.type) && Array.isArray(c.availableTags)) {
      tagMaps.set(id, new Map(c.availableTags.filter((t: any) => t?.id).map((t: any) => [String(t.id), toTag(t)])));
    }
    // parentId n'a de sens que pour les fils : pour un salon normal c'est la catégorie.
    const self: ChannelOption = { id, name: String(c.name), type: c.type, categoryName: cat };
    if (isThreadType(c.type)) {
      self.parentId = c.parentId ? String(c.parentId) : null;
      self.parentName = c.parentName ?? null;
      self.isPost = c.isPost === true;
    }
    add(self);
    if (Array.isArray(c.posts)) for (const p of c.posts) addThread(p, self, id, cat);
  };

  for (const cat of data.categories || []) {
    for (const c of cat?.channels || []) addChannel(c, cat?.name ? String(cat.name) : null);
  }
  for (const c of data.orphanChannels || []) addChannel(c, null);
  if (Array.isArray(data.channels)) for (const c of data.channels) addChannel(c, null);
  if (Array.isArray(data.threads)) {
    for (const t of data.threads) {
      const pid = t?.parentId ? String(t.parentId) : "";
      if (pid) addThread(t, byId.get(pid), pid, null);
    }
  }
  return out;
}

/** Posts visibles avec le type 11, ou avec le type 15/16 de leur forum ; le type 0 ne les inclut pas. */
function allowedByTypes(c: ChannelOption, types: number[], byId: Map<string, ChannelOption>): boolean {
  if (c.type === undefined) return true;
  if (c.isPost) {
    if (types.includes(11)) return true;
    const pt = c.parentId ? byId.get(c.parentId)?.type : undefined;
    return pt !== undefined ? types.includes(pt) : types.includes(15) || types.includes(16);
  }
  return types.includes(c.type);
}

function TypeIcon({ c, className }: { c: Pick<ChannelOption, "type" | "isPost">; className?: string }) {
  if (c.isPost || isThreadType(c.type)) return <MessageSquare className={className} />;
  switch (c.type) {
    case 15: return <MessagesSquare className={className} />;
    case 16: return <ImageIcon className={className} />;
    case 2: return <Volume2 className={className} />;
    case 13: return <Mic className={className} />;
    case 4: return <Folder className={className} />;
    default: return <Hash className={className} />;
  }
}

interface Row {
  key: string;
  kind: "header" | "clear" | "item";
  label?: string;
  ch?: ChannelOption;
  depth?: 0 | 1;
  selectable: boolean;
  childCount?: number;
}

/** Regroupe par catégorie, imbrique les posts/fils sous leur salon parent, applique la recherche. */
function buildRows(list: ChannelOption[], q: string, collapsed: Set<string>, rawById: Map<string, ChannelOption>): Row[] {
  const ids = new Set(list.map((c) => c.id));
  const children = new Map<string, ChannelOption[]>();
  const pseudo = new Set<string>();
  const tops: ChannelOption[] = [];
  for (const c of list) {
    if (c.parentId && (c.isPost || isThreadType(c.type))) {
      children.set(c.parentId, [...(children.get(c.parentId) ?? []), c]);
      if (!ids.has(c.parentId) && !pseudo.has(c.parentId)) {
        // Parent filtré (ex. filterTypes=[11]) : affiché comme en-tête non sélectionnable.
        pseudo.add(c.parentId);
        tops.push(rawById.get(c.parentId) ?? { id: c.parentId, name: c.parentName || "Salon", type: c.isPost ? 15 : 0, categoryName: c.categoryName });
      }
    } else {
      tops.push(c);
    }
  }

  const groups = new Map<string, ChannelOption[]>();
  for (const c of tops) {
    const k = c.categoryName || "";
    groups.set(k, [...(groups.get(k) ?? []), c]);
  }
  const order = [...groups.keys()].sort((a, b) => (a === "" ? -1 : b === "" ? 1 : 0));
  const m = (s?: string | null) => !!s && s.toLowerCase().includes(q);

  const rows: Row[] = [];
  for (const cat of order) {
    const catMatch = !q || m(cat);
    const groupRows: Row[] = [];
    for (const c of groups.get(cat)!) {
      const kids = children.get(c.id) ?? [];
      const selfMatch = catMatch || m(c.name);
      const shownKids = selfMatch ? kids : kids.filter((k) => m(k.name));
      if (!selfMatch && shownKids.length === 0) continue;
      groupRows.push({ key: `c:${c.id}`, kind: "item", ch: c, depth: 0, selectable: !pseudo.has(c.id), childCount: kids.length });
      if (q || !collapsed.has(c.id)) {
        for (const k of shownKids) groupRows.push({ key: `c:${k.id}`, kind: "item", ch: k, depth: 1, selectable: true });
      }
    }
    if (groupRows.length === 0) continue;
    if (cat) rows.push({ key: `h:${cat}`, kind: "header", label: cat, selectable: false });
    rows.push(...groupRows);
  }
  return rows;
}

/**
 * Charge les salons d'un serveur depuis l'API bot avec mise en cache mémoire
 */
export async function fetchGuildChannels(guildId: string): Promise<ChannelOption[]> {
  if (globalChannelCache.has(guildId)) {
    return globalChannelCache.get(guildId)!;
  }
  if (globalChannelLoading.has(guildId)) {
    return globalChannelLoading.get(guildId)!;
  }

  const promise = (async () => {
    try {
      // 1. Essayer /server/channels (arborescence complète)
      const res = await fetch(`${BOT_API_URL}/api/guilds/${guildId}/server/channels`, {
        credentials: "include",
      }).catch(() => null);

      if (res && res.ok) {
        const data = await res.json().catch(() => null);
        if (data) {
          const parsed = parseChannelsPayload(data);
          if (parsed.length > 0) {
            globalChannelCache.set(guildId, parsed);
            return parsed;
          }
        }
      }

      // 2. Fallback sur /polls/channels ou /giveaways/channels
      const fallbackRes = await fetch(`${BOT_API_URL}/api/guilds/${guildId}/polls/channels`, {
        credentials: "include",
      }).catch(() => null);

      if (fallbackRes && fallbackRes.ok) {
        const data = await fallbackRes.json().catch(() => null);
        if (Array.isArray(data?.channels)) {
          const parsed = data.channels.map((c: any) => ({
            id: String(c.id),
            name: String(c.name),
            type: c.type ?? 0,
          }));
          globalChannelCache.set(guildId, parsed);
          return parsed;
        }
      }
    } catch {
      // Erreur silencieuse
    }
    return [];
  })();

  globalChannelLoading.set(guildId, promise);
  const result = await promise;
  globalChannelLoading.delete(guildId);
  return result;
}

interface PopoverPos {
  left: number;
  width: number;
  top?: number;
  bottom?: number;
  maxHeight: number;
}

export default function ChannelPicker({
  value,
  onChange,
  channels: propChannels,
  guildId,
  placeholder = "ID du salon (ex: 123456789012345678)",
  emptyLabel = "— Sélectionner un salon —",
  className,
  inputClassName,
  disabled = false,
  allowClear = true,
  filterTypes,
  size = "default",
}: ChannelPickerProps) {
  const [fetchedChannels, setFetchedChannels] = useState<ChannelOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<PopoverPos | null>(null);
  const [query, setQuery] = useState("");
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const open = pos !== null;

  // Un salon est créé, renommé ou supprimé sur Discord : on oublie le cache et on recharge la liste en direct.
  useEffect(() => {
    if (!guildId) return;
    return subscribeGuildLive(guildId, (ev) => {
      if (ev.type === "DISCORD_EVENT" && ev.payload?.kind === "channels") {
        globalChannelCache.delete(guildId);
        setRefreshTick((t) => t + 1);
      }
    });
  }, [guildId]);

  // Charger les salons via guildId si non fournis
  useEffect(() => {
    if (propChannels && propChannels.length > 0) return;
    if (!guildId) return;

    if (globalChannelCache.has(guildId)) {
      setFetchedChannels(globalChannelCache.get(guildId)!);
      return;
    }

    let active = true;
    setLoading(true);
    fetchGuildChannels(guildId)
      .then((list) => {
        if (active) {
          setFetchedChannels(list);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [guildId, propChannels, refreshTick]);

  // Liste finale des salons disponibles
  const rawChannels = (propChannels && propChannels.length > 0) ? propChannels : fetchedChannels;
  const rawById = useMemo(() => new Map(rawChannels.map((c) => [c.id, c])), [rawChannels]);
  const availableChannels = useMemo(() => {
    if (!filterTypes || filterTypes.length === 0) return rawChannels;
    return rawChannels.filter((c) => allowedByTypes(c, filterTypes, rawById));
  }, [rawChannels, rawById, filterTypes]);

  const currentId = (value || "").trim();
  const matchedChannel = useMemo(() => {
    if (!currentId) return null;
    return availableChannels.find((c) => c.id === currentId) || null;
  }, [availableChannels, currentId]);

  // Déterminer le mode initial :
  // Si on a des salons ou si le salon courant correspond à un salon connu -> mode "select"
  // Sinon si currentId est renseigné mais non trouvé dans une liste chargée -> mode "id"
  const [mode, setMode] = useState<"select" | "id">(() => {
    if (currentId && availableChannels.length > 0 && !matchedChannel) {
      return "id";
    }
    return "select";
  });

  // Quand on bascule en mode ID, donner le focus
  const handleToggleMode = () => {
    const nextMode = mode === "select" ? "id" : "select";
    setPos(null);
    setMode(nextMode);
    if (nextMode === "id") {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const rows = useMemo(() => {
    const list = buildRows(availableChannels, query.trim().toLowerCase(), collapsed, rawById);
    return allowClear && !query.trim() ? [{ key: "clear", kind: "clear" as const, selectable: true }, ...list] : list;
  }, [availableChannels, query, collapsed, rawById, allowClear]);
  const selectable = useMemo(() => rows.filter((r) => r.selectable), [rows]);
  const activeRowKey = selectable.some((r) => r.key === activeKey) ? activeKey : selectable[0]?.key ?? null;

  const closePopover = () => setPos(null);
  const openPopover = () => {
    const el = triggerRef.current;
    if (!el || disabled || loading) return;
    const r = el.getBoundingClientRect();
    const below = window.innerHeight - r.bottom - 12;
    const above = r.top - 12;
    const up = below < 260 && above > below;
    const width = Math.min(Math.max(r.width, 280), window.innerWidth - 16);
    setQuery("");
    setActiveKey(currentId ? `c:${currentId}` : null);
    setPos({
      left: Math.max(8, Math.min(r.left, window.innerWidth - width - 8)),
      width,
      ...(up ? { bottom: window.innerHeight - r.top + 4 } : { top: r.bottom + 4 }),
      maxHeight: Math.min(380, up ? above : below),
    });
  };

  // Fermeture : clic extérieur, redimensionnement, défilement extérieur.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (popoverRef.current?.contains(t) || triggerRef.current?.contains(t)) return;
      setPos(null);
    };
    const onScroll = (e: Event) => {
      if (!popoverRef.current?.contains(e.target as Node)) setPos(null);
    };
    const onResize = () => setPos(null);
    document.addEventListener("mousedown", onDown);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  // Garde la ligne active visible pendant la navigation clavier.
  useEffect(() => {
    popoverRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: "nearest" });
  }, [activeRowKey, open]);

  const pick = (row: Row) => {
    if (row.kind === "clear") onChange("");
    else if (row.ch) onChange(row.ch.id, row.ch);
    closePopover();
    triggerRef.current?.focus();
  };

  const handleSearchKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      closePopover();
      triggerRef.current?.focus();
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (selectable.length === 0) return;
      const i = selectable.findIndex((r) => r.key === activeRowKey);
      const n = (i + (e.key === "ArrowDown" ? 1 : -1) + selectable.length) % selectable.length;
      setActiveKey(selectable[n].key);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const row = selectable.find((r) => r.key === activeRowKey);
      if (row) pick(row);
    }
  };

  const toggleCollapsed = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const isSmall = size === "sm";

  return (
    <div className={cn("space-y-1 w-full", className)}>
      <div className="relative flex items-center gap-1.5">
        {mode === "select" ? (
          <div className="relative flex-1 min-w-0">
            <button
              ref={triggerRef}
              type="button"
              disabled={disabled || loading}
              onClick={() => (open ? closePopover() : openPopover())}
              aria-haspopup="listbox"
              aria-expanded={open}
              className={cn(
                "w-full flex items-center gap-2 rounded-xl border border-[var(--panel-border)] bg-[var(--text-primary)]/[0.04] text-left text-[var(--text-primary)] outline-none transition-all cursor-pointer hover:border-[var(--text-primary)]/20 focus:border-[var(--accent-primary)]/60 focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent-primary)_14%,transparent)] disabled:opacity-50",
                isSmall ? "h-8 px-2.5 pr-8 text-[11px]" : "h-9 px-3 pr-8 text-xs",
                inputClassName
              )}
            >
              {matchedChannel ? (
                <>
                  <TypeIcon c={matchedChannel} className="w-3.5 h-3.5 shrink-0 text-zinc-400" />
                  <span className="truncate">{matchedChannel.name}</span>
                </>
              ) : currentId ? (
                <span className="truncate"># Salon sélectionné ({currentId})</span>
              ) : (
                <span className="truncate text-zinc-400">{allowClear ? emptyLabel : "— Sélectionner un salon —"}</span>
              )}
            </button>

            {/* Indicateur de chargement ou chevron */}
            <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500">
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
              )}
            </div>

            {open && pos && typeof document !== "undefined" &&
              createPortal(
                <div
                  ref={popoverRef}
                  style={{ position: "fixed", left: pos.left, width: pos.width, top: pos.top, bottom: pos.bottom, maxHeight: pos.maxHeight }}
                  className="pop-in z-[1000] flex flex-col overflow-hidden rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)] shadow-2xl shadow-black/50"
                >
                  <div className="flex items-center gap-2 border-b border-[var(--panel-border)] px-3 py-2">
                    <Search className="w-3.5 h-3.5 shrink-0 text-[var(--text-muted)]" />
                    <input
                      autoFocus
                      value={query}
                      onChange={(e) => {
                        setQuery(e.target.value);
                        setActiveKey(null);
                      }}
                      onKeyDown={handleSearchKey}
                      placeholder="Rechercher un salon"
                      aria-label="Rechercher un salon"
                      className="w-full bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
                    />
                  </div>

                  <div role="listbox" className="min-h-0 flex-1 overflow-y-auto py-1">
                    {rows.map((row) => {
                      if (row.kind === "header") {
                        return (
                          <div key={row.key} className="truncate px-3 pb-1 pt-2.5 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                            {row.label}
                          </div>
                        );
                      }
                      const active = row.key === activeRowKey;
                      if (row.kind === "clear") {
                        return (
                          <div
                            key={row.key}
                            role="option"
                            aria-selected={!currentId}
                            data-active={active}
                            onClick={() => pick(row)}
                            onMouseEnter={() => setActiveKey(row.key)}
                            className={cn("mx-1 flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-[var(--text-muted)]", active && "bg-zinc-800/80")}
                          >
                            <X className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{emptyLabel}</span>
                          </div>
                        );
                      }
                      const c = row.ch!;
                      const selected = c.id === currentId;
                      const badge = c.type === 15 ? "Forum" : c.type === 16 ? "Média" : null;
                      return (
                        <div
                          key={row.key}
                          role="option"
                          aria-selected={selected}
                          aria-disabled={!row.selectable}
                          data-active={active}
                          onClick={row.selectable ? () => pick(row) : undefined}
                          onMouseEnter={row.selectable ? () => setActiveKey(row.key) : undefined}
                          className={cn(
                            "mx-1 flex items-center gap-2 rounded-lg py-1.5 pr-2 text-sm",
                            row.depth === 1 ? "pl-7" : "pl-2",
                            row.selectable ? "cursor-pointer text-[var(--text-primary)]" : "cursor-default text-[var(--text-muted)]",
                            active && "bg-zinc-800/80",
                            selected && "text-amber-300"
                          )}
                        >
                          {row.childCount ? (
                            <button
                              type="button"
                              aria-label={collapsed.has(c.id) ? "Déplier" : "Replier"}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleCollapsed(c.id);
                              }}
                              className="-ml-1 shrink-0 cursor-pointer text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                            >
                              {collapsed.has(c.id) && !query.trim() ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                          ) : null}
                          <TypeIcon c={c} className="w-3.5 h-3.5 shrink-0 text-[var(--text-muted)]" />
                          <span className="truncate">{c.name}</span>
                          {badge && (
                            <span className="shrink-0 rounded-md border border-[var(--panel-border)] px-1.5 text-[10px] uppercase leading-4 text-[var(--text-muted)]">
                              {badge}
                            </span>
                          )}
                          {c.isPost && c.tags?.slice(0, 2).map((t) => (
                            <span key={t.id} className="shrink-0 rounded-full border border-[var(--panel-border)] px-1.5 text-[10px] leading-4 text-[var(--text-muted)]">
                              {t.emoji ? `${t.emoji} ` : ""}{t.name}
                            </span>
                          ))}
                          {selected && <Check className="ml-auto w-3.5 h-3.5 shrink-0 text-amber-400" />}
                        </div>
                      );
                    })}
                    {rows.every((r) => r.kind === "clear") && (
                      <div className="px-3 py-3 text-center text-xs text-[var(--text-muted)]">
                        {query.trim() ? "Aucun salon trouvé" : "Aucun salon disponible"}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleToggleMode}
                    className="flex cursor-pointer items-center gap-2 border-t border-[var(--panel-border)] px-3 py-2 text-left text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  >
                    <Edit3 className="w-3 h-3 text-amber-400" />
                    Saisir un ID manuellement...
                  </button>
                </div>,
                document.body
              )}
          </div>
        ) : (
          <div className="relative flex-1 min-w-0">
            <div className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500">
              <Hash className="w-3.5 h-3.5" />
            </div>
            <input
              ref={inputRef}
              type="text"
              value={currentId}
              onChange={(e) => {
                const val = e.target.value.trim();
                const found = availableChannels.find((c) => c.id === val);
                onChange(val, found);
              }}
              disabled={disabled}
              placeholder={placeholder}
              className={cn(
                "w-full rounded-xl border border-[var(--panel-border)] bg-[var(--text-primary)]/[0.04] pl-8 pr-8 text-[var(--text-primary)] font-mono outline-none transition-all hover:border-[var(--text-primary)]/20 focus:border-[var(--accent-primary)]/60 focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent-primary)_14%,transparent)] disabled:opacity-50",
                isSmall ? "h-8 text-[11px]" : "h-9 text-xs",
                inputClassName
              )}
            />
            {currentId && allowClear && !disabled && (
              <button
                type="button"
                onClick={() => onChange("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                title="Effacer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Bouton de bascule Liste <-> Saisie ID */}
        <button
          type="button"
          onClick={handleToggleMode}
          disabled={disabled}
          className={cn(
            "shrink-0 rounded-xl border transition-all flex items-center justify-center cursor-pointer disabled:opacity-40",
            isSmall ? "h-8 px-2 text-[10px]" : "h-9 px-2.5 text-xs",
            mode === "id"
              ? "border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
              : "border-[var(--panel-border)] bg-[var(--surface-raised)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--text-primary)]/[0.07]"
          )}
          title={
            mode === "select"
              ? "Basculer vers la saisie manuelle de l'identifiant (ID)"
              : "Basculer vers la liste déroulante des salons"
          }
        >
          {mode === "select" ? (
            <span className="flex items-center gap-1 font-semibold">
              <Edit3 className="w-3 h-3 text-amber-400" />
              <span>ID</span>
            </span>
          ) : (
            <span className="flex items-center gap-1 font-semibold">
              <ListFilter className="w-3 h-3 text-amber-400" />
              <span>Liste</span>
            </span>
          )}
        </button>
      </div>

      {/* Indication visuelle en mode ID si le salon est reconnu */}
      {mode === "id" && matchedChannel && (
        <div className="flex items-center gap-1 text-[11px] text-[var(--accent-primary)] pl-1">
          <Check className="w-3 h-3" />
          <span>
            Salon reconnu : <strong className="text-[var(--text-primary)]">#{matchedChannel.name}</strong>
          </span>
        </div>
      )}
    </div>
  );
}
