"use client";

import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { androidPredefinedHaptic, androidWaveform } from "@/lib/android";

function isNative() {
  if (typeof window === "undefined") return false;
  return Capacitor.isNativePlatform();
}

function isAndroid() {
  return Capacitor.getPlatform() === "android";
}

export async function hapticSelectionTick() {
  if (!isNative()) return;
  try {
    await Haptics.selectionChanged();
  } catch {
    // ignore
  }
}

export async function hapticLightImpact() {
  if (!isNative()) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch {
    // ignore
  }
}

export async function hapticMediumImpact() {
  if (!isNative()) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Medium });
  } catch {
    // ignore
  }
}

export async function hapticHeavyImpact() {
  if (!isNative()) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Heavy });
  } catch {
    // ignore
  }
}

export async function hapticRigidImpact() {
  // Capacitor 7 Haptics only exposes Light/Medium/Heavy; Heavy is used as a proxy for a rigid/stiff feedback.
  if (!isNative()) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Heavy });
  } catch {
    // ignore
  }
}

export async function hapticSoftImpact() {
  if (!isNative()) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch {
    // ignore
  }
}

export async function hapticSuccess() {
  if (!isNative()) return;
  try {
    await Haptics.notification({ type: NotificationType.Success });
  } catch {
    // ignore
  }
}

export async function hapticWarning() {
  if (!isNative()) return;
  try {
    await Haptics.notification({ type: NotificationType.Warning });
  } catch {
    // ignore
  }
}

export async function hapticError() {
  if (!isNative()) return;
  try {
    await Haptics.notification({ type: NotificationType.Error });
  } catch {
    // ignore
  }
}

/** Double-pulse success pattern (success + light tick). */
export async function hapticSuccessPattern() {
  if (isAndroid()) {
    await androidPredefinedHaptic("double");
    return;
  }
  await hapticSuccess();
  await new Promise((resolve) => setTimeout(resolve, 120));
  await hapticLightImpact();
}

/** Triple-shake error pattern (error + two rigid ticks). */
export async function hapticErrorPattern() {
  if (isAndroid()) {
    await androidWaveform([0, 80, 50, 80, 50, 120], [0, 255, 0, 255, 0, 80]);
    return;
  }
  await hapticError();
  await new Promise((resolve) => setTimeout(resolve, 80));
  await hapticRigidImpact();
  await new Promise((resolve) => setTimeout(resolve, 80));
  await hapticRigidImpact();
}

export type HapticProfile =
  | "selection"
  | "light"
  | "medium"
  | "heavy"
  | "rigid"
  | "soft"
  | "success"
  | "successPattern"
  | "warning"
  | "error"
  | "errorPattern";

const PROFILE_MAP: Record<HapticProfile, () => Promise<void>> = {
  selection: hapticSelectionTick,
  light: hapticLightImpact,
  medium: hapticMediumImpact,
  heavy: hapticHeavyImpact,
  rigid: hapticRigidImpact,
  soft: hapticSoftImpact,
  success: hapticSuccess,
  successPattern: hapticSuccessPattern,
  warning: hapticWarning,
  error: hapticError,
  errorPattern: hapticErrorPattern,
};

export function triggerHaptic(profile: HapticProfile) {
  if (!isNative()) return;
  PROFILE_MAP[profile]();
}
