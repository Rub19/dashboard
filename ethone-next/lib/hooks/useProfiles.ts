"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

// Module-level so every useProfiles() consumer (SettingsProvider, the top-bar
// ProfileDropdown, the command palette…) shares one in-flight request and a
// short result cache — previously each instance had its own useRef guard, so N
// mounts × M auth events = an /api/profiles burst that hit the edge 429.
type ProfilesResult = { list: Profile[]; activeId: string };
let _profilesInFlight: Promise<ProfilesResult | null> | null = null;
let _profilesCache: { at: number; result: ProfilesResult } | null = null;
const PROFILES_CACHE_TTL = 4000;

async function fetchProfilesShared(force: boolean): Promise<ProfilesResult | null> {
  if (!force && _profilesCache && Date.now() - _profilesCache.at < PROFILES_CACHE_TTL) {
    return _profilesCache.result;
  }
  if (_profilesInFlight) return _profilesInFlight;
  _profilesInFlight = (async () => {
    try {
      const res = force
        ? await fetchWorker("/api/profiles")
        : await fetchWorkerCached("/api/profiles");
      const list =
        Array.isArray(res?.data?.list) && res.data.list.length > 0
          ? res.data.list.map(mapProfile)
          : DEFAULT_LOCAL_PROFILES;
      const activeEntry = res?.data?.active ? mapProfile(res.data.active) : list[0] || DEFAULT_LOCAL_PROFILES[0];
      const result: ProfilesResult = { list, activeId: activeEntry?.id || list[0]?.id || "personal" };
      _profilesCache = { at: Date.now(), result };
      return result;
    } catch {
      return null;
    } finally {
      _profilesInFlight = null;
    }
  })();
  return _profilesInFlight;
}

/** Drop the shared profiles cache (after a profile mutation or on sign-out). */
export function invalidateProfilesCache() {
  _profilesCache = null;
}

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
    if (force) invalidateProfilesCache();
    const result = await fetchProfilesShared(force);
    if (result) {
      setProfiles(result.list);
      setActive(result.activeId);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("ethone_local_profiles", JSON.stringify(result.list));
          localStorage.setItem("ethone_active_profile_id", result.activeId);
        } catch {}
      }
    } else {
      setProfiles((prev) => (prev.length > 0 ? prev : DEFAULT_LOCAL_PROFILES));
      setActive((prev) => prev || "personal");
    }
    setLoaded(true);
  }, []);

  // Tracks the signed-in user id so the auth-state listener below only
  // force-refetches when the user actually changed (sign in / sign out /
  // account switch) — not on every GoTrue event. TOKEN_REFRESHED and
  // INITIAL_SESSION fire for the same user and carry no new profile data;
  // re-fetching on those (previously unconditional) is what let a refresh
  // retry burst turn into a /api/profiles request storm.
  const lastUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    // Only hit /api/profiles when there's actually a session. On the login
    // page (no session) this endpoint 401s — skip it and fall back to the
    // local defaults; the auth listener below refetches once the user signs in.
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      if (data.session) {
        fetchAll();
      } else {
        setLoaded(true);
      }
    });
    const handleAuthChange = () => fetchAll(true);
    if (typeof window !== "undefined") {
      window.addEventListener("ethone:identity:update", handleAuthChange);
    }
    const { data: authSub } = supabase.auth.onAuthStateChange((_event, session) => {
      const userId = session?.user?.id ?? null;
      if (lastUserIdRef.current === undefined) {
        // First event since mount (typically INITIAL_SESSION): just record
        // the user, the effect's own fetchAll() above already covers it.
        lastUserIdRef.current = userId;
        return;
      }
      if (userId === lastUserIdRef.current) return;
      lastUserIdRef.current = userId;
      fetchAll(true);
    });
    return () => {
      cancelled = true;
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
