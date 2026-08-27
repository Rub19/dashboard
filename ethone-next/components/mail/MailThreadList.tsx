"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Filter,
  ArrowUpDown,
  CheckSquare,
  Square,
  Archive,
  Trash2,
  MailOpen,
  Mail,
  Star,
  X,
  Inbox,
  Paperclip,
} from "lucide-react";
import { useI18n } from "@/lib/hooks/useI18n";
import Input from "@/components/Input";
import type { MailMessage } from "@/lib/hooks/useMail";
import MailThreadItem from "./MailThreadItem";
import { cn } from "@/lib/utils";

const FILTERS = ["all", "unread", "starred", "attachments"] as const;
type ThreadFilter = (typeof FILTERS)[number];

type SortMode = "date_desc" | "date_asc" | "sender" | "subject";

type MailThreadListProps = {
  title: string;
  grouped: MailMessage[][];
  activeThreadId?: string;
  loading?: boolean;
  search: string;
  onSearch: (value: string) => void;
  onSelect: (messages: MailMessage[]) => void;
  onToggleStar?: (msg: MailMessage) => void;
  onToggleRead?: (msg: MailMessage) => void;
  onArchive?: (msg: MailMessage) => void;
  onTrash?: (msg: MailMessage) => void;
  onBulkAction?: (action: "read" | "unread" | "star" | "unstar" | "archive" | "trash", messageIds: string[]) => Promise<void>;
};

export default function MailThreadList({
  title,
  grouped,
  activeThreadId,
  loading,
  search,
  onSearch,
  onSelect,
  onToggleStar,
  onToggleRead,
  onArchive,
  onTrash,
  onBulkAction,
}: MailThreadListProps) {
  const i18n = useI18n();
  const [filter, setFilter] = useState<ThreadFilter>("all");
  const [sort, setSort] = useState<SortMode>("date_desc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Filter & Sort
  const filtered = useMemo(() => {
    let list = [...grouped];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((thread) =>
        thread.some(
          (m) =>
            m.subject.toLowerCase().includes(q) ||
            (m.from_name || "").toLowerCase().includes(q) ||
            (m.from_address || "").toLowerCase().includes(q) ||
            (m.body_text || "").toLowerCase().includes(q)
        )
      );
    }

    if (filter === "unread") {
      list = list.filter((thread) => thread.some((m) => !m.is_read));
    } else if (filter === "starred") {
      list = list.filter((thread) => thread.some((m) => m.is_starred));
    } else if (filter === "attachments") {
      list = list.filter((thread) => thread.some((m) => m.attachments && m.attachments.length > 0));
    }

    // Sort
    return list.sort((a, b) => {
      const lastA = a[a.length - 1];
      const lastB = b[b.length - 1];
      const firstA = a[0];
      const firstB = b[0];

      if (sort === "date_desc") {
        return new Date(lastB.received_at).getTime() - new Date(lastA.received_at).getTime();
      }
      if (sort === "date_asc") {
        return new Date(lastA.received_at).getTime() - new Date(lastB.received_at).getTime();
      }
      if (sort === "sender") {
        return (firstA.from_name || firstA.from_address).localeCompare(firstB.from_name || firstB.from_address);
      }
      if (sort === "subject") {
        return (firstA.subject || "").localeCompare(firstB.subject || "");
      }
      return 0;
    });
  }, [grouped, search, filter, sort]);

  const total = grouped.length;
  const filteredCount = filtered.length;

  const allFilteredThreadIds = useMemo(() => {
    return filtered.map((thread) => thread[0]?.thread_id || thread[0]?.id).filter(Boolean);
  }, [filtered]);

  const isAllSelected = filteredCount > 0 && selectedIds.size === filteredCount;

  function toggleSelectAll() {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allFilteredThreadIds));
    }
  }

  function toggleSelectThread(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const selectedMessageIds = useMemo(() => {
    const ids: string[] = [];
    for (const thread of grouped) {
      const threadKey = thread[0]?.thread_id || thread[0]?.id;
      if (selectedIds.has(threadKey)) {
        ids.push(...thread.map((m) => m.id));
      }
    }
    return ids;
  }, [grouped, selectedIds]);

  async function handleBulk(action: "read" | "unread" | "star" | "unstar" | "archive" | "trash") {
    if (!onBulkAction || selectedMessageIds.length === 0) return;
    await onBulkAction(action, selectedMessageIds);
    setSelectedIds(new Set());
  }

  return (
    <div className="relative flex h-full w-[26rem] shrink-0 flex-col overflow-hidden rounded-2xl border border-[var(--panel-border)]/[0.12] bg-[var(--panel-bg)]/[0.45] shadow-sm backdrop-blur-[var(--panel-blur)]">
      {/* Header Bar */}
      <div className="shrink-0 space-y-2.5 border-b border-[var(--panel-border)]/[0.1] p-3.5 select-none">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-[var(--text-primary)] tracking-tight">{title}</h2>
            <span className="rounded-full bg-[var(--panel-border)]/[0.2] px-2 py-0.5 font-mono text-[10px] font-medium text-[var(--text-muted)]">
              {filteredCount} {filteredCount !== total ? `/ ${total}` : ""}
            </span>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={toggleSelectAll}
              className="flex items-center gap-1 rounded-lg border border-[var(--panel-border)]/[0.1] px-2 py-1 text-[10px] font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--panel-bg)] hover:text-[var(--text-primary)]"
              title={isAllSelected ? "Tout désélectionner" : "Tout sélectionner"}
            >
              {isAllSelected ? <CheckSquare className="h-3 w-3 text-[var(--accent-primary)]" /> : <Square className="h-3 w-3" />}
            </button>

            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortMode)}
              className="rounded-lg border border-[var(--panel-border)]/[0.1] bg-[var(--panel-bg)]/[0.5] px-2 py-1 text-[10px] font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer focus:outline-none"
            >
              <option value="date_desc">Plus récents</option>
              <option value="date_asc">Plus anciens</option>
              <option value="sender">Expéditeur</option>
              <option value="subject">Objet</option>
            </select>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Input
            type="search"
            icon="search"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={i18n("search", "Rechercher...")}
            className="w-full"
            inputSize="compact"
          />
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
          {FILTERS.map((id) => {
            const isActive = filter === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setFilter(id)}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 text-[10px] font-semibold transition-all",
                  isActive
                    ? "bg-[var(--accent-primary)] text-[var(--accent-contrast)] shadow-sm shadow-[var(--accent-primary)]/20"
                    : "border border-[var(--panel-border)]/[0.1] bg-[var(--panel-bg)]/[0.4] text-[var(--text-muted)] hover:bg-[var(--panel-bg)] hover:text-[var(--text-primary)]"
                )}
              >
                {id === "starred" && <Star className="h-3 w-3" />}
                {id === "attachments" && <Paperclip className="h-3 w-3" />}
                <span>
                  {id === "all"
                    ? "Tous"
                    : id === "unread"
                    ? "Non lus"
                    : id === "starred"
                    ? "Suivis"
                    : "Pièces jointes"}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Floating Bulk Action Bar */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-[8.5rem] inset-x-3 z-30 flex items-center justify-between rounded-xl border border-[var(--accent-primary)]/30 bg-[var(--bg-main)]/95 p-2 shadow-xl backdrop-blur-md"
          >
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)]">
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-[var(--accent-primary)] text-[10px] text-[var(--accent-contrast)]">
                {selectedIds.size}
              </span>
              <span>sélectionné(s)</span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleBulk("read")}
                className="rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--panel-bg)] hover:text-[var(--text-primary)]"
                title="Marquer comme lu"
              >
                <MailOpen className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => handleBulk("star")}
                className="rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--panel-bg)] hover:text-[var(--warning)]"
                title="Suivre"
              >
                <Star className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => handleBulk("archive")}
                className="rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--panel-bg)] hover:text-[var(--text-primary)]"
                title="Archiver"
              >
                <Archive className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => handleBulk("trash")}
                className="rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--danger)]/20 hover:text-[var(--danger)]"
                title="Supprimer"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                className="rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--panel-bg)] hover:text-[var(--text-primary)]"
                title="Annuler"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* List / Feed Area */}
      <div className="flex-1 overflow-y-auto [scrollbar-width:thin] divide-y divide-[var(--panel-border)]/[0.04]">
        {loading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-20 w-full animate-pulse rounded-xl border border-[var(--panel-border)]/[0.1] bg-[var(--panel-bg)]/[0.3]"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center p-8 text-center select-none">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--panel-border)]/[0.12] bg-[var(--panel-bg)]/[0.4] text-[var(--text-muted)] shadow-inner">
              <Inbox className="h-6 w-6" />
            </div>
            <h4 className="text-xs font-semibold text-[var(--text-primary)]">
              {search ? "Aucun résultat trouvé" : "Aucun message dans ce dossier"}
            </h4>
            <p className="mt-1 max-w-[200px] text-[11px] text-[var(--text-muted)] leading-relaxed">
              {search
                ? `Aucun message ne correspond à "${search}".`
                : "Les nouveaux messages arriveront ici automatiquement."}
            </p>
          </div>
        ) : (
          <div>
            {filtered.map((thread) => {
              const key = thread[0]?.thread_id || thread[0]?.id;
              const active = activeThreadId === key;
              const selected = selectedIds.has(key);
              const last = thread[thread.length - 1];

              return (
                <MailThreadItem
                  key={key}
                  messages={thread}
                  active={active}
                  selected={selected}
                  onSelectToggle={() => toggleSelectThread(key)}
                  onClick={() => onSelect(thread)}
                  onToggleStar={(e) => {
                    e.stopPropagation();
                    onToggleStar?.(last);
                  }}
                  onToggleRead={(e) => {
                    e.stopPropagation();
                    onToggleRead?.(last);
                  }}
                  onArchive={(e) => {
                    e.stopPropagation();
                    onArchive?.(last);
                  }}
                  onTrash={(e) => {
                    e.stopPropagation();
                    onTrash?.(last);
                  }}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
