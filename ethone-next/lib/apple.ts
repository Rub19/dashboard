"use client";

import { supabase } from "@/lib/supabase";

export function isNativeIOS() {
  return false;
}

export function isNative() {
  return false;
}

export async function signInWithApple() {
  return { ok: false, error: new Error("Sign in with Apple n'est disponible que sur l'app native.") } as const;
}

export async function checkBiometric() {
  return { available: false, reason: "plateforme" as const };
}

export async function setNativeFocusState(active: boolean, durationMinutes = 25) {
  return { active };
}

export async function authenticateWithBiometric(reason = "Authentifiez-vous pour accéder à vos données ETHONE.") {
  return { ok: false, error: new Error("Authentification biométrique non disponible.") } as const;
}

export async function indexSpotlightItems(
  items: Array<{ id: string; title: string; description?: string; contentType?: string; url: string; thumbnailData?: string }>
) {
  return { indexed: 0 };
}

export async function deleteSpotlightItems(ids: string[]) {
  return { deleted: 0 };
}

export async function clearSpotlightIndex() {
  return { deletedAll: false };
}

export async function setNativePresence(presence: string) {
  return { presence };
}

export async function getNativeFocusState() {
  return { active: false, presence: "En ligne" };
}
