"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

/**
 * Profil du compte — source unique, partagée par tous les écrans et synchronisée en direct entre appareils.
 *
 * Stocké dans `ethone_public_profiles` (une ligne par compte) : chargé une fois, mis à jour par Supabase Realtime
 * quand un autre appareil enregistre, et écrit de façon optimiste (l'interface change tout de suite, la base suit).
 */

export type PresenceStatus = "online" | "busy" | "dnd" | "away" | "invisible";

export type AccountProfile = {
  displayName: string;
  username: string;
  bio: string;
  avatarUrl: string;
  avatarId: string;
  frameId: string;
  backgroundId: string;
  accentColor: string;
  presence: PresenceStatus;
  statusText: string;
  statusEmoji: string;
};

type Row = {
  user_id: string;
  display_name: string | null;
  username: string | null;
  bio: string | null;
  avatar_url: string | null;
  avatar_id: string | null;
  avatar_frame_id: string | null;
  profile_background_id: string | null;
  accent_color: string | null;
  presence_status: string | null;
  status_text: string | null;
  status_emoji: string | null;
};

const PRESENCES: PresenceStatus[] = ["online", "busy", "dnd", "away", "invisible"];

const EMPTY: AccountProfile = {
  displayName: "",
  username: "",
  bio: "",
  avatarUrl: "",
  avatarId: "",
  frameId: "none",
  backgroundId: "",
  accentColor: "",
  presence: "online",
  statusText: "",
  statusEmoji: "",
};

function fromRow(r: Row): AccountProfile {
  const presence = PRESENCES.includes(r.presence_status as PresenceStatus) ? (r.presence_status as PresenceStatus) : "online";
  return {
    displayName: r.display_name ?? "",
    username: r.username ?? "",
    bio: r.bio ?? "",
    avatarUrl: r.avatar_url ?? "",
    avatarId: r.avatar_id ?? "",
    frameId: r.avatar_frame_id || "none",
    backgroundId: r.profile_background_id ?? "",
    accentColor: r.accent_color ?? "",
    presence,
    statusText: r.status_text ?? "",
    statusEmoji: r.status_emoji ?? "",
  };
}

function toRow(p: Partial<AccountProfile>): Partial<Row> {
  const r: Partial<Row> = {};
  if (p.displayName !== undefined) r.display_name = p.displayName.trim().slice(0, 80);
  if (p.username !== undefined) r.username = p.username.trim().toLowerCase().replace(/^@+/, "");
  if (p.bio !== undefined) r.bio = p.bio.slice(0, 300);
  if (p.avatarUrl !== undefined) r.avatar_url = p.avatarUrl;
  if (p.avatarId !== undefined) r.avatar_id = p.avatarId.slice(0, 64);
  if (p.frameId !== undefined) r.avatar_frame_id = p.frameId.slice(0, 64);
  if (p.backgroundId !== undefined) r.profile_background_id = p.backgroundId.slice(0, 64);
  if (p.accentColor !== undefined) r.accent_color = p.accentColor.slice(0, 32);
  if (p.presence !== undefined) r.presence_status = p.presence;
  if (p.statusText !== undefined) r.status_text = p.statusText.slice(0, 80);
  if (p.statusEmoji !== undefined) r.status_emoji = p.statusEmoji.slice(0, 16);
  return r;
}

/** Message lisible pour une erreur d'enregistrement (pseudo déjà pris, format invalide…). */
export function describeProfileError(err: unknown): string {
  const e = err as { code?: string; message?: string };
  const msg = e?.message || "";
  if (e?.code === "23505" || /username_idx|duplicate key/i.test(msg)) return "Ce pseudo est déjà utilisé par un autre compte.";
  if (/username_format/.test(msg)) return "Pseudo : 3 à 32 caractères, lettres minuscules, chiffres, « . », « _ » ou « - ».";
  if (/avatar_url/.test(msg)) return "Cette image ne peut pas être utilisée comme avatar.";
  if (/bio_length/.test(msg)) return "La bio dépasse 300 caractères.";
  if (/display_name_length/.test(msg)) return "Le nom affiché dépasse 80 caractères.";
  return "Impossible d'enregistrer le profil pour le moment.";
}

// ───────────────────────── store partagé (un chargement et un abonnement temps réel pour toute l'application)

type State = { userId: string | null; profile: AccountProfile; loaded: boolean; exists: boolean };
let state: State = { userId: null, profile: EMPTY, loaded: false, exists: false };
const listeners = new Set<() => void>();
let channel: RealtimeChannel | null = null;
let loadToken = 0;

function emit(next: Partial<State>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

async function attach(userId: string | null) {
  if (state.userId === userId && state.loaded) return;
  const token = ++loadToken;
  if (channel) {
    void supabase.removeChannel(channel);
    channel = null;
  }
  emit({ userId, profile: EMPTY, loaded: !userId, exists: false });
  if (!userId) return;

  const { data } = await supabase.from("ethone_public_profiles").select("*").eq("user_id", userId).maybeSingle();
  if (token !== loadToken) return;
  emit({ profile: data ? fromRow(data as Row) : EMPTY, loaded: true, exists: Boolean(data) });

  channel = supabase
    .channel(`account_profile_${userId.slice(0, 8)}_${token}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "ethone_public_profiles", filter: `user_id=eq.${userId}` }, (payload) => {
      if (token !== loadToken) return;
      const row = payload.new as Row | undefined;
      if (row && row.user_id) emit({ profile: fromRow(row), exists: true });
    });
  channel.subscribe();
}

let authBound = false;
function bindAuth() {
  if (authBound || typeof window === "undefined") return;
  authBound = true;
  supabase.auth.getSession().then(({ data }) => void attach(data.session?.user?.id ?? null));
  supabase.auth.onAuthStateChange((_event, session) => void attach(session?.user?.id ?? null));
}

/**
 * Enregistre des champs du profil. Optimiste : l'interface de tous les écrans change tout de suite ; en cas d'échec
 * l'ancienne valeur revient et l'erreur est renvoyée (à afficher avec describeProfileError).
 */
export async function saveAccountProfile(patch: Partial<AccountProfile>, seed?: Partial<AccountProfile>): Promise<void> {
  const userId = state.userId;
  if (!userId) throw new Error("Connectez-vous pour enregistrer votre profil.");
  const previous = state.profile;
  const next = { ...previous, ...patch };
  emit({ profile: next });
  try {
    if (state.exists) {
      const { error } = await supabase.from("ethone_public_profiles").update(toRow(patch)).eq("user_id", userId);
      if (error) throw error;
    } else {
      // Première fois : la ligne est créée avec les valeurs connues (métadonnées du compte) plus la modification.
      const { error } = await supabase.from("ethone_public_profiles").insert({ user_id: userId, ...toRow({ ...seed, ...next }) });
      if (error) throw error;
      emit({ exists: true });
    }
  } catch (err) {
    emit({ profile: previous });
    throw err;
  }
  // Compatibilité : le bot et quelques anciens écrans lisent encore les métadonnées du compte.
  const meta: Record<string, string> = {};
  if (patch.displayName !== undefined) meta.display_name = next.displayName;
  if (patch.username !== undefined) meta.username = next.username;
  if (patch.avatarUrl !== undefined) meta.custom_avatar_url = next.avatarUrl;
  if (patch.bio !== undefined) meta.bio = next.bio;
  if (Object.keys(meta).length) void supabase.auth.updateUser({ data: meta }).catch(() => undefined);
}

/** Envoie une image recadrée (data URL) dans le stockage du compte et renvoie son adresse publique. */
export async function uploadAvatarImage(dataUrl: string): Promise<string> {
  const userId = state.userId;
  if (!userId) throw new Error("Connectez-vous pour importer une image.");
  const blob = await (await fetch(dataUrl)).blob();
  const ext = blob.type === "image/png" ? "png" : blob.type === "image/jpeg" ? "jpg" : "webp";
  const path = `${userId}/avatar-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("profile-media").upload(path, blob, { contentType: blob.type, upsert: false, cacheControl: "31536000" });
  if (error) throw error;
  return supabase.storage.from("profile-media").getPublicUrl(path).data.publicUrl;
}

export function useAccountProfile() {
  useEffect(bindAuth, []);
  const snap = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => state,
  );
  return { profile: snap.profile, loaded: snap.loaded, signedIn: Boolean(snap.userId), exists: snap.exists };
}
