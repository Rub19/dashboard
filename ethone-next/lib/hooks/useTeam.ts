"use client";

import { useEffect, useState } from "react";
import { fetchWorker } from "@/lib/api";

export type TeamMember = {
  id: string;
  email: string;
  role: string;
  status: "pending" | "active" | "declined" | "revoked";
  display_name?: string;
  invited_at: string;
};

export function useTeam() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWorker("/api/team/members");
      setMembers(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function invite(email: string, role: string, displayName?: string) {
    const res = await fetchWorker("/api/team/members", {
      method: "POST",
      body: JSON.stringify({ email, role, display_name: displayName }),
    });
    await load();
    return res.data;
  }

  async function remove(id: string) {
    await fetchWorker("/api/team/members", {
      method: "DELETE",
      body: JSON.stringify({ id }),
    });
    setMembers(members.filter((m) => m.id !== id));
  }

  return { members, loading, error, reload: load, invite, remove };
}
