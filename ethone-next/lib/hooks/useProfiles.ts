"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchWorker } from "@/lib/api";

export type Profile = {
  id: string;
  name: string;
  type: "personal" | "work" | "development" | "study" | "gaming" | "streaming" | "creative";
  accent: string;
  widgets: string[];
  integrations: string[];
  createdAt: string;
};

function mapProfile(p: Record<string, unknown>): Profile {
  return {
    id: String(p.id),
    name: String(p.name),
    type: String(p.type) as Profile["type"],
    accent: String(p.accent || "violet"),
    widgets: Array.isArray(p.widgets) ? p.widgets.map((x) => String(x)) : [],
    integrations: Array.isArray(p.integrations) ? p.integrations.map((x) => String(x)) : [],
    createdAt: String(p.created_at || p.createdAt || new Date().toISOString()),
  };
}

export function useProfiles() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [active, setActive] = useState<string>("");
  const [loaded, setLoaded] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const res = await fetchWorker("/api/profiles");
      const list = Array.isArray(res?.data?.list) ? res.data.list.map(mapProfile) : [];
      const activeProfile = res?.data?.active ? mapProfile(res.data.active) : list[0] || null;
      setProfiles(list);
      setActive(activeProfile?.id || "");
    } catch {
      setProfiles([]);
      setActive("");
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  async function create(input: Omit<Profile, "id" | "createdAt">) {
    const res = await fetchWorker("/api/profiles", {
      method: "POST",
      body: JSON.stringify(input),
    });
    const created = res?.data ? mapProfile(res.data) : null;
    if (!created) throw new Error("Profile creation failed");
    await fetchAll();
    return created;
  }

  async function update(id: string, patch: Partial<Omit<Profile, "id" | "createdAt">>) {
    const existing = profiles.find((p) => p.id === id);
    if (!existing) throw new Error("Profile not found");
    const body = { id, ...patch };
    await fetchWorker("/api/profiles", {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    await fetchAll();
  }

  async function remove(id: string) {
    await fetchWorker("/api/profiles", {
      method: "DELETE",
      body: JSON.stringify({ id }),
    });
    await fetchAll();
  }

  async function select(id: string) {
    const p = profiles.find((x) => x.id === id);
    if (!p) throw new Error("Profile not found");
    setActive(id);
    try {
      await fetchWorker("/api/profiles/activate", {
        method: "POST",
        body: JSON.stringify({ id }),
      });
      await fetchAll();
    } catch {
      setActive((prev) => (prev === id ? "" : prev));
      throw new Error("Failed to activate profile");
    }
  }

  async function duplicate(id: string) {
    const source = profiles.find((p) => p.id === id);
    if (!source) throw new Error("Profile not found");
    return create({
      name: `${source.name} (copy)`,
      type: source.type,
      accent: source.accent,
      widgets: [...source.widgets],
      integrations: [...source.integrations],
    });
  }

  return { profiles, active, loaded, reload: fetchAll, create, update, remove, select, duplicate };
}
