"use client";

import { Capacitor } from "@capacitor/core";
import { SignInWithApple } from "@capacitor-community/apple-sign-in";
import { BiometricAuth } from "@aparajita/capacitor-biometric-auth";
import { supabase } from "@/lib/supabase";

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
