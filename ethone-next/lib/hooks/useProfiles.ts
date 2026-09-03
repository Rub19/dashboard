"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchWorker } from "@/lib/api";
import { fetchWorkerCached } from "@/lib/hooks/useCachedFetch";
import { supabase } from "@/lib/supabase";

export type Profile = {
  id: string;
  name: string;
  type: "personal" | "work" | "development" | "study" | "gaming" | "streaming" | "creative";
  accent: string;
  workspace: "personal" | "focus" | "studio";
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
    workspace: (String(p.workspace_id || p.workspace || "personal").toLowerCase() as Profile["workspace"]) || "personal",
    widgets: Array.isArray(p.widgets) ? p.widgets.map((x) => String(x)) : [],
    integrations: Array.isArray(p.integrations) ? p.integrations.map((x) => String(x)) : [],
    createdAt: String(p.created_at || p.createdAt || new Date().toISOString()),
  };
}

const DEFAULT_LOCAL_PROFILES: Profile[] = [
  {
    id: "personal",
    name: "Personnel",
    type: "personal",
    accent: "emerald",
    workspace: "personal",
    widgets: ["tasks", "brain", "focus", "weather"],
    integrations: [],
    createdAt: new Date().toISOString(),
  },
];

export function useProfiles() {
  const [profiles, setProfiles] = useState<Profile[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("ethone_local_profiles");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return DEFAULT_LOCAL_PROFILES;
  });

  const [active, setActive] = useState<string>(() => {
    if (typeof window !== "undefined") {
      try {
        const savedActive = localStorage.getItem("ethone_active_profile_id");
        if (savedActive) return savedActive;
      } catch {}
    }
    return "personal";
  });

  const [loaded, setLoaded] = useState(false);

  const activeProfile = useMemo(
    () => profiles.find((p) => p.id === active) || profiles[0] || DEFAULT_LOCAL_PROFILES[0],
    [profiles, active]
  );

  const fetchAll = useCallback(async (force = false) => {
    try {
      const res = force
        ? await fetchWorker("/api/profiles")
        : await fetchWorkerCached("/api/profiles");
      const list = Array.isArray(res?.data?.list) && res.data.list.length > 0
        ? res.data.list.map(mapProfile)
        : DEFAULT_LOCAL_PROFILES;
      const activeEntry = res?.data?.active ? mapProfile(res.data.active) : list[0] || DEFAULT_LOCAL_PROFILES[0];
      setProfiles(list);
      setActive(activeEntry?.id || list[0]?.id || "personal");
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("ethone_local_profiles", JSON.stringify(list));
          localStorage.setItem("ethone_active_profile_id", activeEntry?.id || list[0]?.id || "personal");
        } catch {}
      }
    } catch {
      // Retain existing local profiles or default
      setProfiles((prev) => (prev.length > 0 ? prev : DEFAULT_LOCAL_PROFILES));
      setActive((prev) => prev || "personal");
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const handleAuthChange = () => fetchAll(true);
    if (typeof window !== "undefined") {
      window.addEventListener("ethone:identity:update", handleAuthChange);
    }
    const { data: authSub } = supabase.auth.onAuthStateChange(() => {
      fetchAll(true);
    });
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("ethone:identity:update", handleAuthChange);
      }
      authSub?.subscription?.unsubscribe();
    };
  }, [fetchAll]);

  async function create(input: Omit<Profile, "id" | "createdAt">) {
    const res = await fetchWorker("/api/profiles", {
      method: "POST",
      body: JSON.stringify({
        name: input.name,
        type: input.type,
        accent: input.accent,
        workspace_id: input.workspace,
        widgets: input.widgets,
        integrations: input.integrations,
      }),
    });
    const created = res?.data ? mapProfile(res.data) : null;
    if (!created) throw new Error("Profile creation failed");
    await fetchAll(true);
    return created;
  }

  async function update(id: string, patch: Partial<Omit<Profile, "id" | "createdAt">>) {
    const existing = profiles.find((p) => p.id === id);
    if (!existing) throw new Error("Profile not found");
    const body: Record<string, unknown> = { id };
    if (patch.name !== undefined) body.name = patch.name;
    if (patch.type !== undefined) body.type = patch.type;
    if (patch.accent !== undefined) body.accent = patch.accent;
    if (patch.workspace !== undefined) body.workspace_id = patch.workspace;
    if (patch.widgets !== undefined) body.widgets = patch.widgets;
    if (patch.integrations !== undefined) body.integrations = patch.integrations;

    await fetchWorker("/api/profiles", {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    await fetchAll(true);
  }

  async function remove(id: string) {
    await fetchWorker("/api/profiles", {
      method: "DELETE",
      body: JSON.stringify({ id }),
    });
    await fetchAll(true);
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
      await fetchAll(true);
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
      workspace: source.workspace,
      widgets: [...source.widgets],
      integrations: [...source.integrations],
    });
  }

  return { profiles, active, activeProfile, loaded, reload: () => fetchAll(true), create, update, remove, select, duplicate };
}
