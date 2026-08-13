"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { createTeamManager, type TeamMember, type TeamRole, type TeamStatus } from "@/lib/team-manager";

export type { TeamMember, TeamRole, TeamStatus };

export function useTeam() {
  const { user } = useAuth();
  const ownerId = user?.id || "";
  const manager = useMemo(() => (ownerId ? createTeamManager(ownerId) : null), [ownerId]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!manager) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = manager.subscribe((state) => {
      setMembers(state.members);
      setLoading(state.loading);
      setError(state.error ? new Error(state.error) : null);
    });
    manager.listMembers().finally(() => setLoading(false));
    return () => { unsubscribe(); };
  }, [manager]);

  async function invite(email: string, role: string, displayName?: string) {
    if (!manager) throw new Error("Team manager not available");
    const result = await manager.invite({ email, role: role as TeamRole, displayName });
    if (!result.ok) throw new Error(result.message || "Échec de l'invitation");
    return result.member;
  }

  async function remove(id: string) {
    if (!manager) throw new Error("Team manager not available");
    const result = await manager.remove(id);
    if (!result.ok) throw new Error(result.message || "Échec de la suppression");
  }

  async function update(id: string, role: string) {
    if (!manager) throw new Error("Team manager not available");
    const result = await manager.updateRole(id, role as TeamRole);
    if (!result.ok) throw new Error(result.message || "Échec de la mise à jour");
    return result.member;
  }

  return { members, loading, error, reload: () => manager?.listMembers(), invite, remove, update };
}
