"use client";

import { useState } from "react";
import Card3D from "@/components/Card3D";
import { useI18n } from "@/lib/hooks/useI18n";
import { useTeam } from "@/lib/hooks/useTeam";
import { Users, Plus, Loader2, Check, AlertCircle, Trash2 } from "lucide-react";

const ROLES = ["owner", "admin", "member"] as const;

export default function TeamPage() {
  const i18n = useI18n();
  const { members, loading, error, invite, remove } = useTeam();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<(typeof ROLES)[number]>("member");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function submit() {
    if (!email.trim()) return;
    setInviting(true);
    setInviteError(null);
    setSuccess(false);

    try {
      await invite(email, role);
      setEmail("");
      setSuccess(true);
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "L'invitation a échoué.");
    } finally {
      setInviting(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{i18n("team")}</h1>

      <Card3D>
        <div className="space-y-3">
          <label className="text-sm font-medium">Inviter un membre</label>
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="email@exemple.com"
              disabled={inviting}
              className="min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)] disabled:opacity-50"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as (typeof ROLES)[number])}
              disabled={inviting}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-2 py-2 text-sm disabled:opacity-50"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={submit}
              disabled={inviting}
              className="flex shrink-0 items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            </button>
          </div>

          {inviteError && (
            <p className="flex items-center gap-2 text-sm text-red-400">
              <AlertCircle className="h-4 w-4" />
              {inviteError}
            </p>
          )}

          {success && (
            <p className="flex items-center gap-2 text-sm text-emerald-400">
              <Check className="h-4 w-4" />
              Invitation envoyée.
            </p>
          )}
        </div>
      </Card3D>

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
          {members.map((m) => (
            <Card3D key={m.id}>
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-raised)] text-[var(--muted)]">
                  <Users className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{m.email}</p>
                  <p className="text-xs text-[var(--muted)] capitalize">{m.status}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    m.role === "owner"
                      ? "bg-violet-500/10 text-violet-400"
                      : m.role === "admin"
                      ? "bg-amber-500/10 text-amber-400"
                      : "bg-sky-500/10 text-sky-400"
                  }`}
                >
                  {m.role}
                </span>
                {m.role !== "owner" && (
                  <button type="button" onClick={() => remove(m.id)} className="text-[var(--muted)] hover:text-red-400">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </Card3D>
          ))}
        </div>
      )}
    </div>
  );
}
