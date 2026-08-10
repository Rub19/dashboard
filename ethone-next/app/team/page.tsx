"use client";

import { useState } from "react";
import Card3D from "@/components/Card3D";
import { Users, Plus, Mail, Shield } from "lucide-react";

const ROLES = ["owner", "admin", "member"] as const;

export default function TeamPage() {
  const [members, setMembers] = useState([
    { id: 1, email: "rub19.mailpro@gmail.com", role: "owner", status: "active" },
  ]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<typeof ROLES[number]>("member");

  function invite() {
    if (!email.trim()) return;
    setMembers([...members, { id: Date.now(), email, role, status: "pending" }]);
    setEmail("");
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Équipe</h1>

      <Card3D>
        <div className="space-y-3">
          <label className="text-sm font-medium">Inviter un membre</label>
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemple.com"
              className="min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-2 py-2 text-sm"
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
              className="flex shrink-0 items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
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
            </div>
          </Card3D>
        ))}
      </div>
    </div>
  );
}
