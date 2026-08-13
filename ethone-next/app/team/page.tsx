"use client";

import { useMemo, useState } from "react";
import Card3D from "@/components/Card3D";
import Input from "@/components/Input";
import { useI18n } from "@/lib/hooks/useI18n";
import { useTeam } from "@/lib/hooks/useTeam";
import { Icon } from "@/lib/icons";
import { useToast } from "@/components/ToastProvider";

const ROLES = ["owner", "admin", "senior", "junior", "assistant", "viewer"] as const;

export default function TeamPage() {
  const i18n = useI18n();
  const { success: toastSuccess, error: showError } = useToast();
  const { members, loading, error, invite, remove, update } = useTeam();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<(typeof ROLES)[number]>("viewer");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [query, setQuery] = useState("");

  async function submit() {
    if (!email.trim()) return;
    setInviting(true);
    setInviteError(null);
    setSuccess(false);

    try {
      await invite(email, role);
      setEmail("");
      setSuccess(true);
      toastSuccess(i18n("invited"));
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : i18n("inviteError"));
      showError(i18n("error"));
    } finally {
      setInviting(false);
    }
  }

  async function deleteMember(id: string) {
    try {
      await remove(id);
      toastSuccess(i18n("deleted"));
    } catch {
      showError(i18n("error"));
    }
  }

  async function changeRole(id: string, role: string) {
    try {
      await update(id, role);
      toastSuccess(i18n("updated"));
    } catch {
      showError(i18n("error"));
    }
  }

  const filtered = useMemo(() => {
    if (!query.trim()) return members;
    const q = query.toLowerCase();
    return members.filter(
      (m) => m.email.toLowerCase().includes(q) || (m.display_name || "").toLowerCase().includes(q)
    );
  }, [members, query]);

  const stats = useMemo(() => ({
    total: members.length,
    active: members.filter((m) => m.status === "active").length,
    pending: members.filter((m) => m.status === "pending").length,
  }), [members]);

  function statusClass(status: string) {
    switch (status) {
      case "active":
        return "bg-emerald-500/10 text-emerald-400";
      case "pending":
        return "bg-amber-500/10 text-amber-400";
      case "declined":
      case "revoked":
        return "bg-red-500/10 text-red-400";
      default:
        return "bg-[var(--surface-raised)] text-[var(--muted)]";
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{i18n("teamTitle")}</h1>

      <div className="grid grid-cols-3 gap-3">
        <Card3D>
          <p className="text-xs text-[var(--muted)]">{i18n("total")}</p>
          <p className="text-2xl font-bold">{loading ? "-" : stats.total}</p>
        </Card3D>
        <Card3D>
          <p className="text-xs text-[var(--muted)]">{i18n("active")}</p>
          <p className="text-2xl font-bold text-emerald-400">{loading ? "-" : stats.active}</p>
        </Card3D>
        <Card3D>
          <p className="text-xs text-[var(--muted)]">{i18n("pending")}</p>
          <p className="text-2xl font-bold text-amber-400">{loading ? "-" : stats.pending}</p>
        </Card3D>
      </div>

      <Card3D>
        <div className="space-y-3">
          <label className="text-sm font-medium">{i18n("inviteMember")}</label>
          <div className="flex gap-2">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              aria-label={i18n("emailPlaceholder")}
              placeholder={i18n("emailPlaceholder")}
              disabled={inviting}
              className="min-w-0 flex-1"
            />
            <select
              aria-label={i18n("role")}
              value={role}
              onChange={(e) => setRole(e.target.value as (typeof ROLES)[number])}
              disabled={inviting}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-2 py-2 text-sm disabled:opacity-50"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {i18n(r)}
                </option>
              ))}
            </select>
            <button
              type="button"
              aria-label={i18n("add")}
              onClick={submit}
              disabled={inviting}
              className="flex shrink-0 items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {inviting ? <Icon name="loader-2" className="h-4 w-4 animate-spin" /> : <Icon name="plus" className="h-4 w-4" />}
            </button>
          </div>

          {inviteError && (
            <p className="flex items-center gap-2 text-sm text-red-400">
              <Icon name="alert-circle" className="h-4 w-4" />
              {inviteError}
            </p>
          )}

          {success && (
            <p className="flex items-center gap-2 text-sm text-emerald-400">
              <Icon name="check" className="h-4 w-4" />
              {i18n("invitationSent")}
            </p>
          )}
        </div>
      </Card3D>

      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={i18n("search")}
        aria-label={i18n("search")}
        icon="search"
      />

      {loading ? (
        <Card3D>
          <div className="h-4 w-1/3 animate-pulse rounded bg-[var(--border)]" />
        </Card3D>
      ) : error ? (
        <Card3D>
          <p className="text-sm text-red-400">{error.message}</p>
        </Card3D>
      ) : (
        <div className="space-y-3">
          {filtered.map((m) => (
            <Card3D key={m.id}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-raised)] text-[var(--muted)]">
                    <Icon name="users" className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{m.email}</p>
                    <p className="text-xs text-[var(--muted)]">{m.display_name || "—"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${statusClass(m.status)}`}>
                    {i18n(m.status)}
                  </span>
                  {m.role === "owner" ? (
                    <span className="shrink-0 rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] font-medium text-violet-400">
                      {i18n(m.role)}
                    </span>
                  ) : (
                    <select
                      aria-label={i18n("role")}
                      value={m.role}
                      onChange={(e) => changeRole(m.id, e.target.value)}
                      className="shrink-0 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs"
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>{i18n(r)}</option>
                      ))}
                    </select>
                  )}
                  {m.role !== "owner" && (
                    <button type="button" onClick={() => deleteMember(m.id)} className="rounded p-1 text-[var(--muted)] hover:bg-red-500/10 hover:text-red-400">
                      <Icon name="trash-2" className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </Card3D>
          ))}
        </div>
      )}
    </div>
  );
}
