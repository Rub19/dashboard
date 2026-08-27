"use client";

import { useState, useMemo } from "react";
import { Icon } from "@/lib/icons";
import { useI18n } from "@/lib/hooks/useI18n";
import { cn } from "@/lib/utils";
import type { BrainConversation } from "@/lib/hooks/useBrain";

interface BrainSidebarProps {
  conversations: BrainConversation[];
  activeConvId: string;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onToggleFavorite: (id: string) => void;
  isOpen: boolean;
  onClose?: () => void;
}

export default function BrainSidebar({
  conversations,
  activeConvId,
  onSelect,
  onNew,
  onDelete,
  onRename,
  onToggleFavorite,
  isOpen,
  onClose,
}: BrainSidebarProps) {
  const i18n = useI18n();
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const filteredConversations = useMemo(() => {
    if (!search.trim()) return conversations;
    const q = search.toLowerCase();
    return conversations.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.messages.some((m) => m.content.toLowerCase().includes(q))
    );
  }, [conversations, search]);

  const favorites = useMemo(() => {
    return filteredConversations.filter((c) => c.favorite);
  }, [filteredConversations]);

  const recents = useMemo(() => {
    return filteredConversations.filter((c) => !c.favorite);
  }, [filteredConversations]);

  const startRename = (c: BrainConversation) => {
    setEditingId(c.id);
    setEditTitle(c.title);
  };

  const submitRename = (id: string) => {
    if (editTitle.trim()) {
      onRename(id, editTitle.trim());
    }
    setEditingId(null);
  };

  return (
    <aside
      className={cn(
        "flex h-full w-72 shrink-0 flex-col border-r border-[var(--panel-border)] bg-[var(--panel-bg)]/80 backdrop-blur-xl transition-all duration-300",
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0 hidden md:flex"
      )}
    >
      {/* Header with New Conversation CTA */}
      <div className="flex flex-col gap-3 p-3.5 border-b border-[var(--panel-border)]/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] font-bold text-xs">
              <Icon name="brain" className="h-4 w-4" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
              Conversations
            </span>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="md:hidden flex h-6 w-6 items-center justify-center rounded text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              <Icon name="x" className="h-4 w-4" />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={onNew}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent-primary)] py-2 px-3 text-xs font-semibold text-[var(--accent-contrast)] shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Icon name="plus" className="h-3.5 w-3.5" />
          Nouvelle discussion
        </button>

        {/* Search Bar */}
        <div className="relative">
          <Icon
            name="magnifying-glass"
            className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-muted)]"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher..."
            className="w-full rounded-lg border border-[var(--panel-border)]/70 bg-[var(--surface-raised)]/60 py-1.5 pl-8 pr-2.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--accent-primary)] focus:outline-none"
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto os-scroll p-2 space-y-4">
        {/* Favorites */}
        {favorites.length > 0 && (
          <div className="space-y-1">
            <span className="px-2 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Favoris
            </span>
            {favorites.map((c) => renderConversationItem(c))}
          </div>
        )}

        {/* Recents */}
        <div className="space-y-1">
          <span className="px-2 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Récents
          </span>
          {recents.length === 0 && favorites.length === 0 && (
            <p className="px-2 py-4 text-center text-xs text-[var(--text-muted)]">
              Aucune conversation trouvée
            </p>
          )}
          {recents.map((c) => renderConversationItem(c))}
        </div>
      </div>
    </aside>
  );

  function renderConversationItem(c: BrainConversation) {
    const isActive = c.id === activeConvId;
    const isEditing = editingId === c.id;

    return (
      <div
        key={c.id}
        onClick={() => onSelect(c.id)}
        className={cn(
          "group relative flex items-center justify-between rounded-xl px-2.5 py-2 text-xs font-medium transition-all cursor-pointer",
          isActive
            ? "bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] font-semibold shadow-sm"
            : "text-[var(--text-muted)] hover:bg-[var(--surface-hover)]/40 hover:text-[var(--text-primary)]"
        )}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Icon
            name={c.favorite ? "star" : "chat-circle"}
            className={cn(
              "h-3.5 w-3.5 shrink-0",
              c.favorite ? "text-amber-400 fill-current" : ""
            )}
          />
          {isEditing ? (
            <input
              type="text"
              autoFocus
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={() => submitRename(c.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitRename(c.id);
                if (e.key === "Escape") setEditingId(null);
              }}
              onClick={(e) => e.stopPropagation()}
              className="w-full rounded bg-[var(--surface-raised)] px-1 py-0.5 text-xs text-[var(--text-primary)] focus:outline-none"
            />
          ) : (
            <span className="truncate">{c.title}</span>
          )}
        </div>

        {/* Hover Actions */}
        {!isEditing && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(c.id);
              }}
              className="p-1 text-[var(--text-muted)] hover:text-amber-400"
              title="Favori"
            >
              <Icon name="star" className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                startRename(c);
              }}
              className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              title="Renommer"
            >
              <Icon name="pencil" className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(c.id);
              }}
              className="p-1 text-[var(--text-muted)] hover:text-[var(--danger)]"
              title="Supprimer"
            >
              <Icon name="trash" className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>
    );
  }
}
