"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Users, UserPlus, Crown, Ban, Trash2, Plus, Check, Clock, CalendarDays, StickyNote, MessageCircle, Link2, Unlink } from "@/components/icons/ph";
import { useSharedSpaces, useSpaceMembers, type SpaceMember } from "@/lib/hooks/useSharedSpaces";
import { useSpaceTasks } from "@/lib/hooks/useSpaceTasks";
import { useSpaceEvents } from "@/lib/hooks/useSpaceEvents";
import { useSpaceNotes } from "@/lib/hooks/useSpaceNotes";
import { useDiscordOAuth, canManageGuild } from "@/lib/hooks/useDiscordOAuth";
import FlatCard from "@/components/FlatCard";
import Input from "@/components/Input";
import Textarea from "@/components/Textarea";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ToastProvider";
import InviteMemberDialog from "@/components/spaces/InviteMemberDialog";
import { cn } from "@/lib/utils";

const BOT_API_URL = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "";

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

  const { spaces, linkDiscord } = useSharedSpaces();
  const space = useMemo(() => spaces.find((s) => s.id === spaceId) || null, [spaces, spaceId]);
  const { members, invite, revoke, remove: removeMember } = useSpaceMembers(spaceId);
  const { items: tasks, create, update, remove: removeTask } = useSpaceTasks(spaceId);
  const { items: events, create: createEvent, remove: removeEvent } = useSpaceEvents(spaceId);
  const { items: notes, create: createNote, remove: removeNote } = useSpaceNotes(spaceId);
  const { profile: discordProfile } = useDiscordOAuth();

  const [inviteOpen, setInviteOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [eventTitle, setEventTitle] = useState("");
  const [eventStart, setEventStart] = useState("");
  const [noteTitle, setNoteTitle] = useState("");
  const [noteBody, setNoteBody] = useState("");

  const [selectedGuildId, setSelectedGuildId] = useState("");
  const [channels, setChannels] = useState<{ id: string; name: string }[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState("");
  const [discordBusy, setDiscordBusy] = useState(false);

  const manageableGuilds = useMemo(
    () => (discordProfile?.guilds || []).filter(canManageGuild),
    [discordProfile]
  );

  useEffect(() => {
    if (!selectedGuildId || !BOT_API_URL) {
      setChannels([]);
      return;
    }
    let cancelled = false;
    fetch(`${BOT_API_URL}/api/guilds/${selectedGuildId}/shared-space/channels`, { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setChannels(Array.isArray(data?.channels) ? data.channels : []);
      })
      .catch(() => {
        if (!cancelled) setChannels([]);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedGuildId]);

  async function addTask() {
    const title = taskTitle.trim();
    if (!title) return;
    await create({ title, description: null, is_completed: false, priority: "medium", due_date: null });
    setTaskTitle("");
  }

  async function toggleTask(id: string, isCompleted: boolean) {
    await update(id, { is_completed: !isCompleted });
  }

  async function addEvent() {
    const title = eventTitle.trim();
    if (!title || !eventStart) return;
    await createEvent({
      title,
      description: null,
      start_at: new Date(eventStart).toISOString(),
      end_at: null,
      all_day: false,
    });
    setEventTitle("");
    setEventStart("");
  }

  async function addNote() {
    const title = noteTitle.trim();
    if (!title) return;
    await createNote({ title, body: noteBody });
    setNoteTitle("");
    setNoteBody("");
  }

  async function handleLinkDiscord() {
    if (!selectedGuildId || !selectedChannelId) return;
    setDiscordBusy(true);
    try {
      await linkDiscord(spaceId as string, { guildId: selectedGuildId, channelId: selectedChannelId });
      success("Serveur Discord lié");
      setSelectedGuildId("");
      setSelectedChannelId("");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Échec de la liaison.");
    } finally {
      setDiscordBusy(false);
    }
  }

  async function handleUnlinkDiscord() {
    setDiscordBusy(true);
    try {
      await linkDiscord(spaceId as string, { guildId: null, channelId: null });
      success("Serveur Discord délié");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Échec.");
    } finally {
      setDiscordBusy(false);
    }
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
                      <button type="button" aria-label="Révoquer" onClick={() => handleRevoke(m.id)} className="-m-2 p-2 text-[var(--text-muted)] hover:text-rose-400">
                        <Ban className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {space?.role === "owner" && (
                      <button type="button" aria-label="Supprimer" onClick={() => handleRemove(m.id)} className="-m-2 p-2 text-[var(--text-muted)] hover:text-rose-400">
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
                  <button type="button" aria-label="Supprimer la tâche" onClick={() => removeTask(task.id)} className="-m-2 p-2 text-[var(--text-muted)] hover:text-rose-400">
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

          <FlatCard>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
              <CalendarDays className="h-4 w-4" /> Calendrier partagé
            </h2>
            <div className="mb-3 flex flex-wrap gap-2">
              <Input
                type="text"
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
                placeholder="Titre de l'événement..."
                inputSize="compact"
                className="min-w-0 flex-1"
              />
              <Input
                type="datetime-local"
                value={eventStart}
                onChange={(e) => setEventStart(e.target.value)}
                inputSize="compact"
                className="w-auto"
              />
              <Button type="button" variant="primary" size="md" onClick={addEvent} leftIcon={<Plus className="h-4 w-4" />} />
            </div>
            <div className="space-y-1.5">
              {events.map((ev) => (
                <div key={ev.id} className="flex items-center gap-3 rounded-[var(--inset-radius)] border border-[var(--panel-border)] px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-[var(--text-primary)]">{ev.title}</p>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      {new Date(ev.start_at).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}
                    </p>
                  </div>
                  <button type="button" aria-label="Supprimer l'événement" onClick={() => removeEvent(ev.id)} className="-m-2 p-2 text-[var(--text-muted)] hover:text-rose-400">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {events.length === 0 && (
                <p className="flex items-center justify-center gap-1.5 py-6 text-center text-xs text-[var(--text-muted)]">
                  <Clock className="h-3.5 w-3.5" /> Aucun événement pour l'instant.
                </p>
              )}
            </div>
          </FlatCard>

          <FlatCard>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
              <StickyNote className="h-4 w-4" /> Notes partagées
            </h2>
            <div className="mb-3 space-y-2">
              <Input
                type="text"
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                placeholder="Titre de la note..."
                inputSize="compact"
              />
              <Textarea
                value={noteBody}
                onChange={(e) => setNoteBody(e.target.value)}
                placeholder="Contenu..."
                rows={2}
              />
              <Button type="button" variant="secondary" size="sm" onClick={addNote} leftIcon={<Plus className="h-3.5 w-3.5" />}>
                Ajouter la note
              </Button>
            </div>
            <div className="space-y-1.5">
              {notes.map((note) => (
                <div key={note.id} className="flex items-start gap-3 rounded-[var(--inset-radius)] border border-[var(--panel-border)] px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[var(--text-primary)]">{note.title}</p>
                    {note.body && <p className="mt-0.5 line-clamp-2 text-xs text-[var(--text-muted)]">{note.body}</p>}
                  </div>
                  <button type="button" aria-label="Supprimer la note" onClick={() => removeNote(note.id)} className="-m-2 p-2 text-[var(--text-muted)] hover:text-rose-400">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {notes.length === 0 && (
                <p className="flex items-center justify-center gap-1.5 py-6 text-center text-xs text-[var(--text-muted)]">
                  <Clock className="h-3.5 w-3.5" /> Aucune note pour l'instant.
                </p>
              )}
            </div>
          </FlatCard>

          {space?.role === "owner" && (
            <FlatCard>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                <MessageCircle className="h-4 w-4" /> Lien Discord
              </h2>
              {space?.discord_guild_id && space?.discord_channel_id ? (
                <div className="flex items-center justify-between rounded-[var(--inset-radius)] border border-[var(--panel-border)] px-3 py-2">
                  <p className="text-sm text-[var(--text-primary)]">
                    Activité de cet espace notifiée sur Discord (serveur lié).
                  </p>
                  <Button type="button" variant="secondary" size="sm" onClick={handleUnlinkDiscord} disabled={discordBusy} leftIcon={<Unlink className="h-3.5 w-3.5" />}>
                    Délier
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-[var(--text-muted)]">
                    Choisis un serveur Discord et un salon pour y recevoir les notifications d'activité de cet espace.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <div className="min-w-[180px] flex-1">
                      <Select
                        value={selectedGuildId}
                        onChange={(v) => {
                          setSelectedGuildId(v);
                          setSelectedChannelId("");
                        }}
                        placeholder="Choisir un serveur..."
                        options={manageableGuilds.map((g) => ({ id: g.id, label: g.name }))}
                      />
                    </div>
                    <div className="min-w-[180px] flex-1">
                      <Select
                        value={selectedChannelId}
                        onChange={setSelectedChannelId}
                        placeholder="Choisir un salon..."
                        disabled={!selectedGuildId}
                        options={channels.map((c) => ({ id: c.id, label: `#${c.name}` }))}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="primary"
                      size="md"
                      onClick={handleLinkDiscord}
                      disabled={!selectedGuildId || !selectedChannelId || discordBusy}
                      leftIcon={<Link2 className="h-4 w-4" />}
                    >
                      Lier
                    </Button>
                  </div>
                  {manageableGuilds.length === 0 && (
                    <p className="text-xs text-[var(--text-muted)]">
                      Aucun serveur administrable trouvé — connecte Discord ou rafraîchis ta connexion dans les réglages.
                    </p>
                  )}
                </div>
              )}
            </FlatCard>
          )}
        </div>
      </div>

      <InviteMemberDialog isOpen={inviteOpen} onClose={() => setInviteOpen(false)} onInvite={invite} />
    </div>
  );
}
