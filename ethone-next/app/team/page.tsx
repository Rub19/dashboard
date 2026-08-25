"use client";

import { useMemo, useState } from "react";
import { Users, UserCheck, Clock, Send } from "lucide-react";

import { useI18n } from "@/lib/hooks/useI18n";
import { useTeam } from "@/lib/hooks/useTeam";
import { useToast } from "@/components/ToastProvider";
import Input from "@/components/Input";
import Select from "@/components/ui/Select";
import TeamMemberTable from "@/components/team/TeamMemberTable";
import Button from "@/components/ui/Button";
import type { TeamRole } from "@/lib/team-manager";

const ROLES: TeamRole[] = ["viewer", "assistant", "admin"];

const ROLE_LABELS: Record<TeamRole, string> = {
  owner: "Propriétaire",
  admin: "Admin",
  senior: "Développeur",
  junior: "Éditeur",
  assistant: "Éditeur",
  viewer: "Lecteur",
};

function StatCard({
  icon,
  value,
  label,
  sub,
  tone,
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  sub: string;
  tone?: "default" | "emerald" | "amber";
}) {
  const valueColor = tone === "emerald" ? "text-[var(--accent-primary)]" : tone === "amber" ? "text-amber-400" : "text-white";
  const borderColor = tone === "emerald" ? "hover:border-[var(--accent-primary)]" : tone === "amber" ? "hover:border-amber-500/30" : "hover:border-white/15";

  return (
    <div className={`v8-panel backdrop-blur-xl rounded-2xl p-4 flex items-center justify-between hover:border-white/15 transition-all ${borderColor}`}>
      <div>
        <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">{label}</p>
        <p className={`text-2xl font-bold font-mono ${valueColor} mt-0.5`}>{value}</p>
        <p className="text-[11px] text-zinc-500 mt-0.5">{sub}</p>
      </div>
      <div className="shrink-0 rounded-xl bg-white/[0.04] p-2.5 ring-1 ring-inset ring-white/[0.06]">{icon}</div>
    </div>
  );
}

export default function TeamPage() {
  const i18n = useI18n();
  const { success: toastSuccess, error: showError } = useToast();
  const { members, loading, error, invite, remove, update } = useTeam();

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<TeamRole>("viewer");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const stats = useMemo(() => ({
    total: members.length,
    active: members.filter((m) => m.status === "active").length,
    pending: members.filter((m) => m.status === "pending").length,
  }), [members]);

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

  async function handleRemove(id: string) {
    try {
      await remove(id);
      toastSuccess(i18n("deleted"));
    } catch {
      showError(i18n("error"));
    }
  }

  async function handleUpdateRole(id: string, newRole: TeamRole) {
    try {
      await update(id, newRole);
      toastSuccess(i18n("updated"));
    } catch {
      showError(i18n("error"));
    }
  }

  const roleOptions = ROLES.map((r) => ({ id: r, label: i18n(r) || ROLE_LABELS[r] }));

  return (
    <div className="h-full min-h-0 w-full flex flex-col overflow-hidden">
      <div className="shrink-0 mb-4">
        <h1 className="text-2xl font-bold text-white">{i18n("teamTitle")}</h1>
        <p className="text-sm text-zinc-500 mt-1">{i18n("teamDescription")}</p>
      </div>

      <div className="min-h-0 w-full flex-1 overflow-y-auto os-scroll space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <StatCard
          icon={<Users className="h-5 w-5 text-zinc-400" />}
          value={loading ? "-" : stats.total}
          label={i18n("total") || "Total"}
          sub={i18n("teamSeatsAvailable") || `Places disponibles : ${Math.max(0, 10 - stats.total)}/10`}
        />
        <StatCard
          icon={<UserCheck className="h-5 w-5 text-[var(--accent-primary)]" />}
          value={loading ? "-" : stats.active}
          label={i18n("active") || "Actifs"}
          sub={i18n("activeThisWeek") || "Actifs cette semaine"}
          tone="emerald"
        />
        <StatCard
          icon={<Clock className="h-5 w-5 text-amber-400" />}
          value={loading ? "-" : stats.pending}
          label={i18n("pending") || "En attente"}
          sub={i18n("pendingConfirmation") || "En attente de confirmation"}
          tone="amber"
        />
      </div>

      {/* Invite banner */}
      <div className="bg-zinc-950/80 border border-white/[0.08] backdrop-blur-xl rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder={i18n("emailPlaceholder") || "E-mail du collaborateur..."}
          aria-label={i18n("emailPlaceholder")}
          disabled={inviting}
          inputSize="compact"
          className="min-w-0 flex-1"
        />

        <Select
          value={role}
          onChange={(value) => setRole(value as TeamRole)}
          options={roleOptions}
          aria-label={i18n("role")}
          disabled={inviting}
          className="h-9 w-full md:w-36 text-xs"
        />

        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={submit}
          disabled={inviting || !email.trim()}
          isLoading={inviting}
          leftIcon={<Send className="h-3.5 w-3.5" />}
        >
          {i18n("sendInvitation") || "Envoyer l'invitation"}
        </Button>
      </div>

      {inviteError && (
        <p className="flex items-center gap-2 text-sm text-red-400">
          <span className="h-4 w-4 rounded-full bg-red-400/20" />
          {inviteError}
        </p>
      )}

      {success && (
        <p className="flex items-center gap-2 text-sm text-[var(--accent-primary)]">
          <span className="h-4 w-4 rounded-full bg-[var(--accent-primary)]" />
          {i18n("invitationSent") || "Invitation envoyée"}
        </p>
      )}

      {error ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
          {error.message}
        </div>
      ) : (
        <TeamMemberTable
          members={members}
          loading={loading}
          onUpdateRole={handleUpdateRole}
          onRemove={handleRemove}
        />
      )}
      </div>
    </div>
  );
}
