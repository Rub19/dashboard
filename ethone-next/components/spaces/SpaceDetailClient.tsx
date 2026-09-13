"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Users, UserPlus, Crown, Ban, Trash2, Plus, Check, Clock } from "lucide-react";
import { useSharedSpaces, useSpaceMembers, type SpaceMember } from "@/lib/hooks/useSharedSpaces";
import { useSpaceTasks } from "@/lib/hooks/useSpaceTasks";
import FlatCard from "@/components/FlatCard";
import Input from "@/components/Input";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ToastProvider";
import InviteMemberDialog from "@/components/spaces/InviteMemberDialog";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<SpaceMember["status"], string> = {
  pending: "En attente",
  active: "Actif",
  declined: "Refusé",
  revoked: "Révoqué",
};

const STATUS_CLASS: Record<SpaceMember["status"], string> = {
  pending: "bg-amber-500/15 text-amber-400",
  active: "bg-emerald-500/15 text-emerald-400",
  declined: "bg-[var(--panel-border)] text-[var(--text-muted)]",
  revoked: "bg-rose-500/15 text-rose-400",
};

export default function SpaceDetailClient() {
  const params = useParams();
  const router = useRouter();
  const spaceId = typeof params?.spaceId === "string" ? params.spaceId : Array.isArray(params?.spaceId) ? params.spaceId[0] : null;
  const { success, error: showError } = useToast();

  const { spaces } = useSharedSpaces();
  const space = useMemo(() => spaces.find((s) => s.id === spaceId) || null, [spaces, spaceId]);
  const { members, invite, revoke, remove: removeMember } = useSpaceMembers(spaceId);
  const { items: tasks, create, update, remove: removeTask } = useSpaceTasks(spaceId);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");

  async function addTask() {
    const title = taskTitle.trim();
    if (!title) return;
    await create({ title, description: null, is_completed: false, priority: "medium", due_date: null });
    setTaskTitle("");
  }

  async function toggleTask(id: string, isCompleted: boolean) {
    await update(id, { is_completed: !isCompleted });
  }

  async function handleRevoke(memberId: string) {
    try {
      await revoke(memberId);
      success("Accès révoqué");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Échec de la révocation.");
    }
  }

  async function handleRemove(memberId: string) {
    try {
      await removeMember(memberId);
      success("Membre supprimé");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Échec de la suppression.");
    }
  }

  if (!spaceId) return null;

  return (
    <div className="h-full min-h-0 w-full flex flex-col overflow-hidden p-4 sm:p-6">
      <div className="mx-auto flex h-full w-full max-w-4xl flex-col overflow-hidden">
        <div className="mb-4 flex shrink-0 items-center gap-3">
          <button type="button" onClick={() => router.push("/spaces")} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]" aria-label="Retour">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">{space?.name || "Espace partagé"}</h1>
          {space?.role === "owner" && (
            <span className="flex items-center gap-1 rounded-[var(--inset-radius)] bg-[var(--accent-primary)]/15 px-2 py-0.5 text-[10px] font-semibold text-[var(--accent-primary)]">
              <Crown className="h-3 w-3" /> Propriétaire
            </span>
          )}
        </div>

        <div className="min-h-0 w-full flex-1 space-y-4 overflow-y-auto os-scroll pb-6">
          <FlatCard>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                <Users className="h-4 w-4" /> Membres ({members.length})
              </h2>
              {space?.role === "owner" && (
                <Button type="button" variant="secondary" size="sm" onClick={() => setInviteOpen(true)} leftIcon={<UserPlus className="h-3.5 w-3.5" />}>
                  Inviter
                </Button>
              )}
            </div>
            <div className="space-y-1.5">
              {members.map((m) => (
                <div key={m.id} className="flex items-center justify-between rounded-[var(--inset-radius)] border border-[var(--panel-border)] px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-[var(--text-primary)]">{m.invited_email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn("rounded-[var(--inset-radius)] px-2 py-0.5 text-[10px] font-semibold", STATUS_CLASS[m.status])}>
                      {STATUS_LABEL[m.status]}
                    </span>
                    {space?.role === "owner" && m.status === "active" && (
                      <button type="button" aria-label="Révoquer" onClick={() => handleRevoke(m.id)} className="text-[var(--text-muted)] hover:text-rose-400">
                        <Ban className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {space?.role === "owner" && (
                      <button type="button" aria-label="Supprimer" onClick={() => handleRemove(m.id)} className="text-[var(--text-muted)] hover:text-rose-400">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {members.length === 0 && <p className="py-4 text-center text-xs text-[var(--text-muted)]">Personne d'autre pour l'instant.</p>}
            </div>
          </FlatCard>

          <FlatCard>
            <h2 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">Tâches partagées</h2>
            <div className="mb-3 flex gap-2">
              <Input
                type="text"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addTask()}
                placeholder="Ajouter une tâche..."
                inputSize="compact"
                className="min-w-0 flex-1"
              />
              <Button type="button" variant="primary" size="md" onClick={addTask} leftIcon={<Plus className="h-4 w-4" />} />
            </div>
            <div className="space-y-1.5">
              {tasks.map((task) => (
                <div key={task.id} className="flex items-center gap-3 rounded-[var(--inset-radius)] border border-[var(--panel-border)] px-3 py-2">
                  <button
                    type="button"
                    onClick={() => toggleTask(task.id, task.is_completed)}
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                      task.is_completed ? "border-emerald-500 bg-emerald-500 text-white" : "border-[var(--panel-border)] text-transparent"
                    )}
                    aria-label={task.is_completed ? "Marquer comme non terminée" : "Marquer comme terminée"}
                  >
                    <Check className="h-3 w-3" />
                  </button>
                  <p className={cn("min-w-0 flex-1 truncate text-sm", task.is_completed ? "text-[var(--text-muted)] line-through" : "text-[var(--text-primary)]")}>
                    {task.title}
                  </p>
                  <button type="button" aria-label="Supprimer la tâche" onClick={() => removeTask(task.id)} className="text-[var(--text-muted)] hover:text-rose-400">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {tasks.length === 0 && (
                <p className="flex items-center justify-center gap-1.5 py-6 text-center text-xs text-[var(--text-muted)]">
                  <Clock className="h-3.5 w-3.5" /> Aucune tâche pour l'instant.
                </p>
              )}
            </div>
          </FlatCard>
        </div>
      </div>

      <InviteMemberDialog isOpen={inviteOpen} onClose={() => setInviteOpen(false)} onInvite={invite} />
    </div>
  );
}
