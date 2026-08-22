"use client";

import { Capacitor, registerPlugin } from "@capacitor/core";
import { SignInWithApple } from "@capacitor-community/apple-sign-in";
import { BiometricAuth } from "@aparajita/capacitor-biometric-auth";
import { supabase } from "@/lib/supabase";

interface EthoneSpotlight {
  indexItems(options: { items: Array<{ id: string; title: string; description?: string; contentType: string; url: string; thumbnailData?: string }> }): Promise<{ indexed: number }>;
  deleteItems(options: { ids: string[] }): Promise<{ deleted: number }>;
  deleteAllItems(): Promise<{ deletedAll: boolean }>;
}

interface EthoneFocus {
  setFocusState(options: { active: boolean }): Promise<{ active: boolean }>;
  setPresence(options: { presence: string }): Promise<{ presence: string }>;
  getFocusState(): Promise<{ active: boolean; presence: string }>;
}

const EthoneSpotlight = registerPlugin<EthoneSpotlight>("EthoneSpotlight");
const EthoneFocus = registerPlugin<EthoneFocus>("EthoneFocus");

export function isNativeIOS() {
  if (typeof window === "undefined") return false;
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";
}

export function isNative() {
  if (typeof window === "undefined") return false;
  return Capacitor.isNativePlatform();
}

export async function signInWithApple() {
  if (!isNative()) {
    return { ok: false, error: new Error("Sign in with Apple n'est disponible que sur l'app native.") } as const;
  }

  try {
    const result = await SignInWithApple.authorize({
      clientId: "dev.ethone.app",
      redirectURI: "https://ethone.dev/auth/callback/apple",
      scopes: "email name",
      state: "ethone",
      nonce: "nonce",
    });

    const token = result.response?.identityToken;
    if (!token) {
      return { ok: false, error: new Error("Aucun token Apple reçu.") } as const;
    }

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: "apple",
      token,
    });

    if (error) {
      return { ok: false, error } as const;
    }

    return { ok: true, session: data.session } as const;
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err : new Error(String(err)) } as const;
  }
}

export async function checkBiometric() {
  if (!isNative()) return { available: false, reason: "plateforme" as const };
  try {
    const status = await BiometricAuth.checkBiometry();
    return {
      available: status.isAvailable,
      reason: status.reason,
      code: status.code,
      biometryType: status.biometryType,
    };
  } catch {
    return { available: false, reason: "erreur" as const };
  }
}

export async function authenticateWithBiometric(reason = "Authentifiez-vous pour accéder à vos données ETHONE.") {
  if (!isNative()) return { ok: false, error: new Error("Authentification biométrique non disponible.") } as const;
  try {
    await BiometricAuth.authenticate({
      reason,
      allowDeviceCredential: true,
    });
    return { ok: true } as const;
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err : new Error(String(err)) } as const;
  }
}

export async function indexSpotlightItems(
  items: Array<{ id: string; title: string; description?: string; contentType?: string; url: string; thumbnailData?: string }>
) {
  if (!isNativeIOS()) return { indexed: 0 };
  try {
    const typed = items.map((i) => ({
      ...i,
      contentType: i.contentType || "public.text",
    }));
    const res = await EthoneSpotlight.indexItems({ items: typed });
    return res;
  } catch {
    return { indexed: 0 };
  }
}

export async function deleteSpotlightItems(ids: string[]) {
  if (!isNativeIOS()) return { deleted: 0 };
  try {
    return await EthoneSpotlight.deleteItems({ ids });
  } catch {
    return { deleted: 0 };
  }
}

export async function clearSpotlightIndex() {
  if (!isNativeIOS()) return { deletedAll: false };
  try {
    return await EthoneSpotlight.deleteAllItems();
  } catch {
    return { deletedAll: false };
  }
}

export async function setNativeFocusState(active: boolean) {
  if (!isNativeIOS()) return { active };
  try {
    return await EthoneFocus.setFocusState({ active });
  } catch {
    return { active };
  }
}

export async function setNativePresence(presence: string) {
  if (!isNativeIOS()) return { presence };
  try {
    return await EthoneFocus.setPresence({ presence });
  } catch {
    return { presence };
  }
}

export async function getNativeFocusState() {
  if (!isNativeIOS()) return { active: false, presence: "En ligne" };
  try {
    return await EthoneFocus.getFocusState();
  } catch {
    return { active: false, presence: "En ligne" };
  }
}
