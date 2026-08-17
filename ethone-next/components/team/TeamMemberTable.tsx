"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Shield, UserX, Users } from "lucide-react";
import { useI18n } from "@/lib/hooks/useI18n";
import Select from "@/components/ui/Select";
import type { TeamMember, TeamRole, TeamStatus } from "@/lib/team-manager";

const FILTERS = ["all", "admins", "members", "pending"] as const;

const ROLE_META: Record<TeamRole, { label: string; color: string; border: string; bg: string }> = {
  owner: { label: "Propriétaire", color: "text-violet-400", border: "border-violet-500/30", bg: "bg-violet-500/10" },
  admin: { label: "Admin", color: "text-purple-400", border: "border-purple-500/30", bg: "bg-purple-500/10" },
  senior: { label: "Développeur", color: "text-cyan-400", border: "border-cyan-500/30", bg: "bg-cyan-500/10" },
  junior: { label: "Éditeur", color: "text-sky-400", border: "border-sky-500/30", bg: "bg-sky-500/10" },
  assistant: { label: "Éditeur", color: "text-sky-400", border: "border-sky-500/30", bg: "bg-sky-500/10" },
  viewer: { label: "Lecteur", color: "text-zinc-400", border: "border-zinc-500/30", bg: "bg-zinc-500/10" },
};

const ROLES: TeamRole[] = ["owner", "admin", "senior", "junior", "assistant", "viewer"];

const FILTER_LABELS: Record<(typeof FILTERS)[number], string> = {
  all: "Tous",
  admins: "Admins",
  members: "Membres",
  pending: "En attente",
};

type TeamMemberTableProps = {
  members: TeamMember[];
  loading?: boolean;
  onUpdateRole: (id: string, role: TeamRole) => void;
  onRemove: (id: string) => void;
};

function Avatar({ member }: { member: TeamMember }) {
  const bg = `linear-gradient(135deg, #${member.seed.slice(0, 6)}20, #${member.seed.slice(6, 12) || "27272a"}20)`;

  return (
    <span
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/[0.08] text-[11px] font-bold text-zinc-200"
      style={{ background: bg }}
    >
      {member.initials || "?"}
    </span>
  );
}

function StatusBadge({ status, invitedAt }: { status: TeamStatus; invitedAt?: string }) {
  const i18n = useI18n();
  if (status === "active") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-400">
        <span className="h-2 w-2 rounded-full bg-emerald-400" />
        {i18n("online") || "En ligne"}
      </span>
    );
  }
  if (status === "pending" && invitedAt) {
    const date = new Date(invitedAt).toLocaleDateString();
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-amber-400">
        <span className="h-2 w-2 rounded-full bg-amber-400" />
        {i18n("invitedOn") || "Invité le"} {date}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-zinc-500">
      <span className="h-2 w-2 rounded-full bg-zinc-500" />
      {i18n(status) || status}
    </span>
  );
}

function RoleBadge({ role }: { role: TeamRole }) {
  const meta = ROLE_META[role] || ROLE_META.viewer;
  return (
    <span className={`inline-flex rounded-lg border px-2 py-0.5 text-[10px] font-medium capitalize ${meta.color} ${meta.border} ${meta.bg}`}>
      {meta.label}
    </span>
  );
}

export default function TeamMemberTable({ members, loading, onUpdateRole, onRemove }: TeamMemberTableProps) {
  const i18n = useI18n();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");

  const filtered = useMemo(() => {
    let list = members;

    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((m) => m.email.toLowerCase().includes(q) || (m.display_name || "").toLowerCase().includes(q));
    }

    switch (filter) {
      case "admins":
        list = list.filter((m) => m.role === "owner" || m.role === "admin");
        break;
      case "members":
        list = list.filter((m) => m.role !== "owner" && m.role !== "admin" && m.status === "active");
        break;
      case "pending":
        list = list.filter((m) => m.status === "pending");
        break;
      default:
        break;
    }

    return list;
  }, [members, query, filter]);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={i18n("search")}
            aria-label={i18n("search")}
            className="w-full sm:w-72 rounded-xl border border-white/10 bg-white/[0.03] py-2 pl-9 pr-3 text-xs text-zinc-200 placeholder-zinc-500 outline-none focus:border-emerald-500/50"
          />
        </div>

        <div className="flex items-center gap-1.5 rounded-xl border border-white/[0.06] bg-white/[0.02] p-1">
          {FILTERS.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className={`relative rounded-lg px-3 py-1.5 text-[11px] font-medium transition-colors ${
                filter === id ? "text-white" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {filter === id && (
                <motion.div
                  layoutId="teamFilterPill"
                  className="absolute inset-0 rounded-lg bg-emerald-500/15 border border-emerald-500/30"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10">{i18n(`teamFilter${id}`) || FILTER_LABELS[id]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-zinc-950/70 backdrop-blur-xl">
        <div className="grid grid-cols-12 px-4 py-2.5 bg-white/[0.02] border-b border-white/[0.05] text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
          <span className="col-span-5">{i18n("member")}</span>
          <span className="col-span-3">{i18n("role")}</span>
          <span className="col-span-2">{i18n("status")}</span>
          <span className="col-span-2 text-right">{i18n("actions") || "Actions"}</span>
        </div>

        {loading ? (
          <div className="space-y-1 p-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-12 w-full animate-pulse rounded bg-white/[0.04]" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="h-8 w-8 text-zinc-600 mb-2" />
            <p className="text-sm font-medium text-zinc-300">
              {i18n("teamEmptyTitle") || "Vous êtes le seul membre de cet espace"}
            </p>
            <p className="text-xs text-zinc-500 mt-1 max-w-xs">
              {i18n("teamEmptyDescription") ||
                "Invitez des collaborateurs pour partager vos flows, vos intégrations et vos notes."}
            </p>
          </div>
        ) : (
          <div>
            <AnimatePresence initial={false}>
              {filtered.map((m) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15 }}
                  className="grid grid-cols-12 items-center px-4 py-3 border-b border-white/[0.04] last:border-b-0 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="col-span-5 flex items-center gap-3 min-w-0">
                    <Avatar member={m} />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-white">{m.display_name || m.email}</p>
                      <p className="truncate text-[11px] text-zinc-500">{m.email}</p>
                    </div>
                  </div>

                  <div className="col-span-3">
                    {m.role === "owner" ? (
                      <RoleBadge role="owner" />
                    ) : (
                      <Select
                        value={m.role}
                        onChange={(value) => onUpdateRole(m.id, value as TeamRole)}
                        options={ROLES.map((r) => ({ id: r, label: i18n(r) || ROLE_META[r].label }))}
                        aria-label={i18n("role")}
                        className="h-7 w-28 text-[10px]"
                      />
                    )}
                  </div>

                  <div className="col-span-2">
                    <StatusBadge status={m.status} invitedAt={m.invited_at} />
                  </div>

                  <div className="col-span-2 flex items-center justify-end gap-1">
                    {m.role !== "owner" && (
                      <>
                        <button
                          type="button"
                          onClick={() => onUpdateRole(m.id, (m.role === "admin" ? "viewer" : "admin") as TeamRole)}
                          aria-label={i18n("editRole") || "Modifier le rôle"}
                          className="rounded p-1.5 text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-white"
                        >
                          <Shield className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onRemove(m.id)}
                          aria-label={i18n("removeMember") || "Retirer"}
                          className="rounded p-1.5 text-zinc-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
                        >
                          <UserX className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
