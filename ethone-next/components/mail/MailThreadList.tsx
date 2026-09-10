"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckSquare, Square, Archive, Trash2, MailOpen, Star, X, Inbox, Paperclip } from "lucide-react";
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
  onBulkAction?: (
    action: "read" | "unread" | "star" | "unstar" | "archive" | "trash",
    messageIds: string[]
  ) => Promise<void>;
};

const FILTER_LABELS: Record<ThreadFilter, string> = {
  all: "Tous",
  unread: "Non lus",
  starred: "Suivis",
  attachments: "Pièces jointes",
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

    return list.sort((a, b) => {
      const lastA = a[a.length - 1];
      const lastB = b[b.length - 1];
      const firstA = a[0];
      const firstB = b[0];

      if (sort === "date_desc") return new Date(lastB.received_at).getTime() - new Date(lastA.received_at).getTime();
      if (sort === "date_asc") return new Date(lastA.received_at).getTime() - new Date(lastB.received_at).getTime();
      if (sort === "sender")
        return (firstA.from_name || firstA.from_address).localeCompare(firstB.from_name || firstB.from_address);
      if (sort === "subject") return (firstA.subject || "").localeCompare(firstB.subject || "");
      return 0;
    });
  }, [grouped, search, filter, sort]);

  const total = grouped.length;
  const filteredCount = filtered.length;

  const allFilteredThreadIds = useMemo(
    () => filtered.map((thread) => thread[0]?.thread_id || thread[0]?.id).filter(Boolean),
    [filtered]
  );

  const isAllSelected = filteredCount > 0 && selectedIds.size === filteredCount;

  function toggleSelectAll() {
    setSelectedIds(isAllSelected ? new Set() : new Set(allFilteredThreadIds));
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
      if (selectedIds.has(threadKey)) ids.push(...thread.map((m) => m.id));
    }
    return ids;
  }, [grouped, selectedIds]);

  async function handleBulk(action: "read" | "unread" | "star" | "unstar" | "archive" | "trash") {
    if (!onBulkAction || selectedMessageIds.length === 0) return;
    await onBulkAction(action, selectedMessageIds);
    setSelectedIds(new Set());
  }

  return (
    <div className="v8-panel relative flex h-full w-[26rem] shrink-0 flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 border-b border-[var(--panel-border)] px-4 pt-3.5 pb-3 select-none">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-baseline gap-2 min-w-0">
            <h2 className="truncate text-[15px] font-semibold text-[var(--text-primary)]">{title}</h2>
            <span className="shrink-0 text-xs text-[var(--text-muted)]">
              {filteredCount}
              {filteredCount !== total ? ` / ${total}` : ""}
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={toggleSelectAll}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
              title={isAllSelected ? "Tout désélectionner" : "Tout sélectionner"}
            >
              {isAllSelected ? <CheckSquare className="h-4 w-4 text-[var(--accent-primary)]" /> : <Square className="h-4 w-4" />}
            </button>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortMode)}
              className="cursor-pointer rounded-lg border border-[var(--panel-border)] bg-transparent px-2 py-1 text-xs text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] focus:outline-none"
            >
              <option value="date_desc">Plus récents</option>
              <option value="date_asc">Plus anciens</option>
              <option value="sender">Expéditeur</option>
              <option value="subject">Objet</option>
            </select>
          </div>
        </div>

        <div className="mt-2.5">
          <Input
            type="search"
            icon="search"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={i18n("search", "Rechercher un message…")}
            className="w-full"
            inputSize="compact"
          />
        </div>

        <div className="mt-2.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {FILTERS.map((id) => {
            const isActive = filter === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setFilter(id)}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors",
                  isActive
                    ? "bg-[var(--accent-primary)] text-[var(--accent-contrast)]"
                    : "text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
                )}
              >
                {id === "starred" && <Star className="h-3 w-3" />}
                {id === "attachments" && <Paperclip className="h-3 w-3" />}
                <span>{FILTER_LABELS[id]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bulk action strip */}
      <AnimatePresence initial={false}>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="shrink-0 overflow-hidden border-b border-[var(--panel-border)] bg-[var(--accent-primary)]/[0.06]"
          >
            <div className="flex items-center justify-between px-4 py-2">
              <span className="text-xs font-medium text-[var(--text-primary)]">
                {selectedIds.size} sélectionné{selectedIds.size > 1 ? "s" : ""}
              </span>
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => handleBulk("read")}
                  className="rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
                  title="Marquer comme lu"
                >
                  <MailOpen className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleBulk("star")}
                  className="rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--warning)]"
                  title="Suivre"
                >
                  <Star className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleBulk("archive")}
                  className="rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
                  title="Archiver"
                >
                  <Archive className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleBulk("trash")}
                  className="rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--danger)]/15 hover:text-[var(--danger)]"
                  title="Supprimer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedIds(new Set())}
                  className="rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
                  title="Annuler"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* List */}
      <div className="flex-1 divide-y divide-[var(--panel-border)]/60 overflow-y-auto os-scroll">
        {loading ? (
          <div className="space-y-2 p-3">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-16 w-full animate-pulse rounded-xl bg-[var(--surface-2)]/60" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center p-8 text-center select-none">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--surface-2)] text-[var(--text-muted)]">
              <Inbox className="h-5 w-5" />
            </div>
            <h4 className="text-sm font-medium text-[var(--text-primary)]">
              {search ? "Aucun résultat" : "Aucun message ici"}
            </h4>
            <p className="mt-1 max-w-[220px] text-xs leading-relaxed text-[var(--text-muted)]">
              {search
                ? `Rien ne correspond à « ${search} ».`
                : "Les nouveaux messages arriveront ici automatiquement."}
            </p>
          </div>
        ) : (
          filtered.map((thread) => {
            const key = thread[0]?.thread_id || thread[0]?.id;
            const last = thread[thread.length - 1];
            return (
              <MailThreadItem
                key={key}
                messages={thread}
                active={activeThreadId === key}
                selected={selectedIds.has(key)}
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
          })
        )}
      </div>
    </div>
  );
}
