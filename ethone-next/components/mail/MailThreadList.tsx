"use client";

import { useMemo, useState } from "react";
import { useI18n } from "@/lib/hooks/useI18n";
import Input from "@/components/Input";
import type { MailMessage } from "@/lib/hooks/useMail";
import MailThreadItem from "./MailThreadItem";

const FILTERS = ["all", "unread", "starred"] as const;
type ThreadFilter = (typeof FILTERS)[number];

type MailThreadListProps = {
  title: string;
  grouped: MailMessage[][];
  activeThreadId?: string;
  loading?: boolean;
  search: string;
  onSearch: (value: string) => void;
  onSelect: (messages: MailMessage[]) => void;
  onToggleStar?: (msg: MailMessage) => void;
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
}: MailThreadListProps) {
  const i18n = useI18n();
  const [filter, setFilter] = useState<ThreadFilter>("all");

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
    }

    return list.sort((a, b) => new Date(b[b.length - 1].received_at).getTime() - new Date(a[a.length - 1].received_at).getTime());
  }, [grouped, search, filter]);

  const total = grouped.length;

  return (
    <div className="flex h-full w-96 shrink-0 flex-col rounded-2xl v8-panel backdrop-blur-xl overflow-hidden">
      <div className="shrink-0 space-y-2 border-b border-white/[0.06] p-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">{title}</h2>
          <span className="rounded-md bg-white/[0.05] px-1.5 py-0.5 text-[10px] font-mono text-zinc-400">{total}</span>
        </div>

        <Input
          type="search"
          icon="search"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={i18n("search")}
          className="w-full"
          inputSize="compact"
        />

        <div className="flex items-center gap-1.5">
          {FILTERS.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className={`rounded-md px-2.5 py-1 text-[10px] font-medium transition-colors ${
                filter === id
                  ? "bg-[var(--accent-primary)] text-[var(--accent-contrast)]"
                  : "bg-white/[0.04] text-[var(--text-muted)] hover:bg-white/[0.06] hover:text-[var(--text-primary)]"
              }`}
            >
              {i18n(id) || id}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="space-y-2 p-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 w-full animate-pulse rounded-lg bg-white/[0.04]" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-xs text-zinc-500">{i18n("noMessages") || "Aucun message"}</p>
          </div>
        ) : (
          <div>
            {filtered.map((thread) => {
              const key = thread[0]?.thread_id || thread[0]?.id;
              const active = activeThreadId === key;
              const last = thread[thread.length - 1];
              return (
                <MailThreadItem
                  key={key}
                  messages={thread}
                  active={active}
                  onClick={() => onSelect(thread)}
                  onToggleStar={(e) => {
                    e.stopPropagation();
                    onToggleStar?.(last);
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
