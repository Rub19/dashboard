"use client";

function isNative() {
  return false;
}

function isAndroid() {
  return false;
}

export async function hapticSelectionTick() {}

export async function hapticLightImpact() {}

export async function hapticMediumImpact() {}

export async function hapticHeavyImpact() {}

export async function hapticRigidImpact() {}

export async function hapticSoftImpact() {}

export async function hapticSuccess() {}

export async function hapticWarning() {}

export async function hapticError() {}

/** Double-pulse success pattern (success + light tick). */
export async function hapticSuccessPattern() {
  if (isAndroid()) return;
  await hapticSuccess();
  await new Promise((resolve) => setTimeout(resolve, 120));
  await hapticLightImpact();
}

/** Triple-shake error pattern (error + two rigid ticks). */
export async function hapticErrorPattern() {
  if (isAndroid()) return;
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
