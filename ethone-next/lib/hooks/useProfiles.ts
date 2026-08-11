"use client";

import { useState, useEffect } from "react";

export type Profile = {
  id: string;
  name: string;
  type: "personal" | "work" | "development" | "study" | "gaming" | "streaming" | "creative";
  accent: string;
  widgets: string[];
  integrations: string[];
  createdAt: string;
};

const KEY = "ethone-profiles-v1";
const ACTIVE_KEY = "ethone-active-profile-v1";

export function useProfiles() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [active, setActive] = useState<string>("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      setProfiles(Array.isArray(parsed) ? parsed : []);
      setActive(localStorage.getItem(ACTIVE_KEY) || "");
    } catch {
      setProfiles([]);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem(KEY, JSON.stringify(profiles));
  }, [profiles, loaded]);

  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem(ACTIVE_KEY, active);
  }, [active, loaded]);

  function create(input: Omit<Profile, "id" | "createdAt">) {
    const profile: Profile = { ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    setProfiles((prev) => [...prev, profile]);
    setActive(profile.id);
    return profile;
  }

  function update(id: string, patch: Partial<Omit<Profile, "id" | "createdAt">>) {
    setProfiles((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  function remove(id: string) {
    setProfiles((prev) => prev.filter((p) => p.id !== id));
    if (active === id) setActive("");
  }

  function select(id: string) {
    if (profiles.find((p) => p.id === id)) setActive(id);
  }

  function duplicate(id: string) {
    const source = profiles.find((p) => p.id === id);
    if (!source) return;
    const copy: Profile = { ...source, id: crypto.randomUUID(), name: `${source.name} (copy)`, createdAt: new Date().toISOString() };
    setProfiles((prev) => [...prev, copy]);
  }

  return { profiles, active, loaded, create, update, remove, select, duplicate };
}
