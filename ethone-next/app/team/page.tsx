"use client";

import { useState } from "react";
import { fetchWorker } from "@/lib/api";
import Card3D from "@/components/Card3D";
import { useI18n } from "@/lib/hooks/useI18n";
import { useLocalStorage } from "@/lib/hooks/useLocalStorage";
import { Users, Plus, Loader2, Check, AlertCircle, Trash2 } from "lucide-react";

const ROLES = ["owner", "admin", "member"] as const;

type Member = {
  id: number;
  email: string;
  role: (typeof ROLES)[number];
  status: "active" | "pending";
};

export default function TeamPage() {
  const i18n = useI18n();
  const [members, setMembers] = useLocalStorage<Member[]>("ethone:team", [
    { id: 1, email: "rub19.mailpro@gmail.com", role: "owner", status: "active" },
  ]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<(typeof ROLES)[number]>("member");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function invite() {
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await fetchWorker("/api/team/invite", {
        method: "POST",
        body: JSON.stringify({ email, role }),
      });

      setMembers([...members, { id: Date.now(), email, role, status: "pending" }]);
      setEmail("");
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "L'invitation a échoué.");
    } finally {
      setLoading(false);
    }
  }

  function remove(id: number) {
    setMembers(members.filter((m) => m.id !== id));
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
              onKeyDown={(e) => e.key === "Enter" && invite()}
              placeholder="email@exemple.com"
              disabled={loading}
              className="min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)] disabled:opacity-50"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as (typeof ROLES)[number])}
              disabled={loading}
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
              onClick={invite}
              disabled={loading}
              className="flex shrink-0 items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            </button>
          </div>

          {error && (
            <p className="flex items-center gap-2 text-sm text-red-400">
              <AlertCircle className="h-4 w-4" />
              {error}
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
              {m.id !== 1 && (
                <button type="button" onClick={() => remove(m.id)} className="text-[var(--muted)] hover:text-red-400">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </Card3D>
        ))}
      </div>
    </div>
  );
}
