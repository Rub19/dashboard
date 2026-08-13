"use client";

import { supabase } from "@/lib/supabase";

export const TEAM_ROLES = ["owner", "admin", "senior", "junior", "assistant", "viewer"] as const;
export const TEAM_STATUSES = ["pending", "active", "declined", "revoked"] as const;

export type TeamRole = (typeof TEAM_ROLES)[number];
export type TeamStatus = (typeof TEAM_STATUSES)[number];

export interface TeamMember {
  id: string;
  email: string;
  displayName: string;
  display_name: string;
  role: TeamRole;
  status: TeamStatus;
  avatarUrl: string;
  avatar_url: string;
  initials: string;
  seed: string;
  inviteToken: string;
  invite_token: string;
  invitedAt: string;
  invited_at: string;
  acceptedAt: string | null;
  accepted_at: string | null;
  updatedAt: string;
  updated_at: string;
}

function cleanText(value: unknown, limit = 240): string {
  return String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, limit);
}

function validEmail(value: unknown): string {
  const email = cleanText(value, 320).toLowerCase();
  return email.length >= 5 && email.length <= 320 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

function normalizeRole(role: unknown): TeamRole {
  const lower = String(role || "").toLowerCase();
  return (TEAM_ROLES as readonly string[]).includes(lower) ? (lower as TeamRole) : "viewer";
}

function normalizeStatus(status: unknown): TeamStatus {
  const lower = String(status || "").toLowerCase();
  return (TEAM_STATUSES as readonly string[]).includes(lower) ? (lower as TeamStatus) : "pending";
}

function generateAvatarSeed(email: string, displayName: string): string {
  return String(email || displayName || "?").trim().toLowerCase();
}

function initialsFrom(name: string, email: string): string {
  const source = String(name || email || "?").trim();
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  if (!parts.length) return "?";
  const first = parts[0][0] || "";
  const second = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + second).toUpperCase() || first.toUpperCase() || "?";
}

function newId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function newToken(): string {
  const bytes = new Uint8Array(24);
  if (typeof crypto === "undefined" || !crypto.getRandomValues) {
    throw new Error("team-manager: crypto.getRandomValues is required for secure invite tokens");
  }
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function memberFromRow(row: Record<string, unknown>): TeamMember {
  const email = validEmail(row.email);
  const displayName = cleanText(row.display_name || "", 80);
  const avatarUrl = cleanText(row.avatar_url || "", 1200);
  return {
    id: String(row.id || newId()),
    email,
    displayName,
    display_name: displayName,
    role: normalizeRole(row.role),
    status: normalizeStatus(row.status),
    avatarUrl,
    avatar_url: avatarUrl,
    initials: initialsFrom(displayName, email),
    seed: generateAvatarSeed(email, displayName),
    inviteToken: cleanText(row.invite_token || "", 128),
    invite_token: cleanText(row.invite_token || "", 128),
    invitedAt: String(row.invited_at || new Date().toISOString()),
    invited_at: String(row.invited_at || new Date().toISOString()),
    acceptedAt: row.accepted_at ? String(row.accepted_at) : null,
    accepted_at: row.accepted_at ? String(row.accepted_at) : null,
    updatedAt: String(row.updated_at || new Date().toISOString()),
    updated_at: String(row.updated_at || new Date().toISOString())
  };
}

function rowFromMember(member: TeamMember, ownerId: string): Record<string, unknown> {
  return {
    id: member.id,
    owner_id: ownerId,
    email: member.email,
    role: member.role,
    status: member.status,
    display_name: member.displayName,
    avatar_url: member.avatarUrl,
    invite_token: member.inviteToken,
    invited_at: member.invitedAt,
    accepted_at: member.acceptedAt,
    updated_at: member.updatedAt
  };
}

function normalizeMember(member: Partial<TeamMember>): TeamMember {
  const email = validEmail(member.email || "");
  const displayName = cleanText(member.displayName || member.display_name || "", 80);
  const avatarUrl = cleanText(member.avatarUrl || member.avatar_url || "", 1200);
  const seed = generateAvatarSeed(email, displayName);
  const now = new Date().toISOString();
  return {
    id: String(member.id || newId()),
    email,
    displayName,
    display_name: displayName,
    role: normalizeRole(member.role),
    status: normalizeStatus(member.status),
    avatarUrl,
    avatar_url: avatarUrl,
    initials: initialsFrom(displayName, email),
    seed,
    inviteToken: cleanText(member.inviteToken || member.invite_token || "", 128),
    invite_token: cleanText(member.inviteToken || member.invite_token || "", 128),
    invitedAt: String(member.invitedAt || member.invited_at || now),
    invited_at: String(member.invitedAt || member.invited_at || now),
    acceptedAt: member.acceptedAt || member.accepted_at || null,
    accepted_at: member.acceptedAt || member.accepted_at || null,
    updatedAt: String(member.updatedAt || member.updated_at || now),
    updated_at: String(member.updatedAt || member.updated_at || now)
  };
}

export function inviteUrl(token: string, baseUrl = ""): string {
  const origin = baseUrl || (typeof location !== "undefined" ? location.origin : "https://ethone.dev");
  return `${origin}/join?team-invite=${encodeURIComponent(token)}`;
}

export interface TeamManagerState {
  members: TeamMember[];
  loading: boolean;
  error: string;
}

export type TeamListener = (state: TeamManagerState) => void;

export interface TeamManager {
  listMembers: () => Promise<TeamMember[]>;
  invite: (input: { email: string; role?: TeamRole; displayName?: string }) => Promise<{ ok: boolean; status: string; message?: string; member?: TeamMember; url?: string; token?: string }>;
  updateRole: (id: string, role: TeamRole) => Promise<{ ok: boolean; member?: TeamMember; message?: string }>;
  accept: (id: string) => Promise<{ ok: boolean; member?: TeamMember; message?: string }>;
  revoke: (id: string) => Promise<{ ok: boolean; member?: TeamMember; message?: string }>;
  remove: (id: string) => Promise<{ ok: boolean; message?: string }>;
  setLoading: (value: boolean) => void;
  subscribe: (fn: TeamListener) => () => boolean;
  destroy: () => void;
  ROLES: typeof TEAM_ROLES;
  STATUSES: typeof TEAM_STATUSES;
  normalizeRole: (role: unknown) => TeamRole;
  inviteUrl: (token: string, baseUrl?: string) => string;
}

export function createTeamManager(ownerId: string): TeamManager {
  const storage = typeof localStorage !== "undefined" ? localStorage : null;
  const storageKey = `ethone:team:${ownerId || "local"}`;
  const listeners = new Set<TeamListener>();
  let members: TeamMember[] = [];
  let loading = false;
  let syncError = "";

  function key() {
    return storageKey;
  }

  function loadLocal() {
    try {
      const raw = storage?.getItem?.(key());
      if (!raw) {
        members = [];
        return members;
      }
      const parsed = JSON.parse(raw);
      members = Array.isArray(parsed) ? parsed.map(normalizeMember) : [];
    } catch {
      members = [];
    }
    return members;
  }

  function saveLocal(list: TeamMember[]) {
    try { storage?.setItem?.(key(), JSON.stringify(list)); } catch {}
  }

  function notify() {
    listeners.forEach((fn) => {
      try { fn({ members: [...members], loading, error: syncError }); } catch {}
    });
  }

  async function loadRemote(): Promise<boolean> {
    if (!ownerId) return false;
    const { data, error } = await supabase.from("ethone_team_members").select("*").eq("owner_id", ownerId).order("invited_at", { ascending: false });
    if (error) throw error;
    members = (Array.isArray(data) ? data : []).map(memberFromRow);
    saveLocal(members);
    return true;
  }

  async function listMembers() {
    if (!members.length) loadLocal();
    loading = true;
    syncError = "";
    notify();
    try {
      await loadRemote();
    } catch (err) {
      syncError = err instanceof Error ? err.message : "Impossible de synchroniser l'équipe.";
    } finally {
      loading = false;
      notify();
    }
    return [...members];
  }

  async function invite({ email, role = "viewer", displayName = "" }: { email: string; role?: TeamRole; displayName?: string }) {
    const safeEmail = validEmail(email);
    if (!safeEmail) return { ok: false, status: "invalid", message: "Adresse e-mail invalide." };

    const existing = members.find((m) => m.email === safeEmail);
    if (existing) return { ok: false, status: "duplicate", message: "Cet e-mail a déjà été invité." };

    const token = newToken();
    const nowIso = new Date().toISOString();
    const member = normalizeMember({
      email: safeEmail,
      role,
      displayName: cleanText(displayName, 80),
      status: "pending",
      inviteToken: token,
      invitedAt: nowIso,
      updatedAt: nowIso
    });

    try {
      const { error } = await supabase.from("ethone_team_members").insert(rowFromMember(member, ownerId));
      if (error) {
        if (error.code === "23505") return { ok: false, status: "duplicate", message: "Cet e-mail a déjà été invité." };
        throw error;
      }
      members.push(member);
      saveLocal(members);
      notify();
      const url = inviteUrl(token);
      return { ok: true, status: "invited", member, url, token };
    } catch (err) {
      syncError = err instanceof Error ? err.message : "Échec de l'invitation.";
      notify();
      return { ok: false, status: "failed", message: syncError };
    }
  }

  async function updateRole(id: string, role: TeamRole) {
    const safeRole = normalizeRole(role);
    const index = members.findIndex((m) => m.id === id);
    if (index === -1) return { ok: false, message: "Membre introuvable." };
    const member = members[index];
    member.role = safeRole;
    member.updatedAt = new Date().toISOString();

    try {
      const { error } = await supabase.from("ethone_team_members").update({ role: safeRole, updated_at: member.updatedAt }).eq("id", id).eq("owner_id", ownerId);
      if (error) throw error;
    } catch (err) {
      syncError = err instanceof Error ? err.message : "Échec de la mise à jour.";
    }
    saveLocal(members);
    notify();
    return { ok: true, member };
  }

  async function accept(id: string) {
    const index = members.findIndex((m) => m.id === id);
    if (index === -1) return { ok: false, message: "Membre introuvable." };
    const member = members[index];
    member.status = "active";
    member.acceptedAt = new Date().toISOString();
    member.updatedAt = new Date().toISOString();

    try {
      const { error } = await supabase.from("ethone_team_members").update({ status: "active", accepted_at: member.acceptedAt, updated_at: member.updatedAt }).eq("id", id).eq("owner_id", ownerId);
      if (error) throw error;
    } catch (err) {
      syncError = err instanceof Error ? err.message : "Échec de l'acceptation.";
    }
    saveLocal(members);
    notify();
    return { ok: true, member };
  }

  async function revoke(id: string) {
    const index = members.findIndex((m) => m.id === id);
    if (index === -1) return { ok: false, message: "Membre introuvable." };
    const member = members[index];
    member.status = "revoked";
    member.updatedAt = new Date().toISOString();

    try {
      const { error } = await supabase.from("ethone_team_members").update({ status: "revoked", updated_at: member.updatedAt }).eq("id", id).eq("owner_id", ownerId);
      if (error) throw error;
    } catch (err) {
      syncError = err instanceof Error ? err.message : "Échec de la révocation.";
    }
    saveLocal(members);
    notify();
    return { ok: true, member };
  }

  async function remove(id: string) {
    const index = members.findIndex((m) => m.id === id);
    if (index === -1) return { ok: false, message: "Membre introuvable." };

    try {
      const { error } = await supabase.from("ethone_team_members").delete().eq("id", id).eq("owner_id", ownerId);
      if (error) throw error;
    } catch (err) {
      syncError = err instanceof Error ? err.message : "Échec de la suppression.";
    }
    members.splice(index, 1);
    saveLocal(members);
    notify();
    return { ok: true };
  }

  function setLoading(value: boolean) {
    loading = Boolean(value);
    notify();
  }

  function subscribe(fn: TeamListener) {
    if (typeof fn !== "function") return () => false;
    if (!members.length) loadLocal();
    listeners.add(fn);
    listMembers();
    return () => listeners.delete(fn);
  }

  function destroy() {
    listeners.clear();
    members = [];
  }

  return Object.freeze({
    listMembers,
    invite,
    updateRole,
    accept,
    revoke,
    remove,
    setLoading,
    subscribe,
    destroy,
    ROLES: TEAM_ROLES,
    STATUSES: TEAM_STATUSES,
    normalizeRole,
    inviteUrl
  });
}
