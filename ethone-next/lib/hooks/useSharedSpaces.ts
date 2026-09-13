"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchWorker, WorkerError } from "@/lib/api";

export interface SharedSpace {
  id: string;
  owner_id: string;
  name: string;
  role: "owner" | "member";
  created_at: string;
  updated_at: string;
}

export type SpaceMemberStatus = "pending" | "active" | "declined" | "revoked";

export interface SpaceMember {
  id: string;
  space_id: string;
  invited_email: string;
  user_id: string | null;
  role: "owner" | "member";
  status: SpaceMemberStatus;
  invite_token_expires_at: string;
  invited_by: string;
  invited_at: string;
  accepted_at: string | null;
  updated_at: string;
}

function errorMessage(err: unknown): string {
  if (err instanceof WorkerError) return err.message;
  if (err instanceof Error) return err.message;
  return String(err);
}

// Talks to the Worker (not direct Supabase) because invite/accept/revoke all
// need server-side authorization logic the client can't safely do itself —
// see worker/src/routes/shared-spaces.js. Space *tasks* (once you're a
// member) go direct-to-Supabase instead — see useSpaceTasks.ts.
export function useSharedSpaces() {
  const [spaces, setSpaces] = useState<SharedSpace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWorker("/api/shared-spaces");
      setSpaces(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(new Error(errorMessage(err)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const createSpace = useCallback(
    async (name: string) => {
      const res = await fetchWorker("/api/shared-spaces", { method: "POST", body: JSON.stringify({ name }) });
      await reload();
      return res.data as SharedSpace;
    },
    [reload]
  );

  const deleteSpace = useCallback(
    async (id: string) => {
      await fetchWorker("/api/shared-spaces", { method: "DELETE", body: JSON.stringify({ id }) });
      await reload();
    },
    [reload]
  );

  return { spaces, loading, error, reload, createSpace, deleteSpace };
}

export function useSpaceMembers(spaceId: string | null) {
  const [members, setMembers] = useState<SpaceMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const reload = useCallback(async () => {
    if (!spaceId) {
      setMembers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWorker(`/api/shared-spaces/members?space_id=${encodeURIComponent(spaceId)}`);
      setMembers(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(new Error(errorMessage(err)));
    } finally {
      setLoading(false);
    }
  }, [spaceId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const invite = useCallback(
    async (email: string) => {
      if (!spaceId) return null;
      const res = await fetchWorker("/api/shared-spaces/members", {
        method: "POST",
        body: JSON.stringify({ space_id: spaceId, email }),
      });
      await reload();
      return res.data as { member: SpaceMember; sent: boolean };
    },
    [spaceId, reload]
  );

  const revoke = useCallback(
    async (memberId: string) => {
      await fetchWorker("/api/shared-spaces/members", { method: "PATCH", body: JSON.stringify({ id: memberId, status: "revoked" }) });
      await reload();
    },
    [reload]
  );

  const remove = useCallback(
    async (memberId: string) => {
      await fetchWorker("/api/shared-spaces/members", { method: "DELETE", body: JSON.stringify({ id: memberId }) });
      await reload();
    },
    [reload]
  );

  return { members, loading, error, reload, invite, revoke, remove };
}
