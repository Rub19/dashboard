"use client";

import { useEffect, useMemo, useState } from "react";
import { createTeamManager, type TeamMember } from "@/lib/team-manager";

export type { TeamMember };

export function useTeamManager(ownerId?: string) {
  const manager = useMemo(() => (ownerId ? createTeamManager(ownerId) : null), [ownerId]);
  const [state, setState] = useState<{ members: TeamMember[]; loading: boolean; error: string }>({ members: [], loading: false, error: "" });

  useEffect(() => {
    if (!manager) return;
    const unsubscribe = manager.subscribe((next) => setState(next));
    return () => { unsubscribe(); };
  }, [manager]);

  return {
    members: state.members,
    loading: state.loading,
    error: state.error ? new Error(state.error) : null,
    invite: manager ? manager.invite.bind(manager) : undefined,
    updateRole: manager ? manager.updateRole.bind(manager) : undefined,
    accept: manager ? manager.accept.bind(manager) : undefined,
    revoke: manager ? manager.revoke.bind(manager) : undefined,
    remove: manager ? manager.remove.bind(manager) : undefined,
    manager,
  };
}
