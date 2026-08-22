"use client";

import { Capacitor } from "@capacitor/core";
import {
  Haptics,
  ImpactStyle,
  NotificationType,
} from "@capacitor/haptics";

function isNative() {
  if (typeof window === "undefined") return false;
  return Capacitor.isNativePlatform();
}

function isSupported() {
  if (typeof window === "undefined") return false;
  try {
    return typeof Haptics?.impact === "function";
  } catch {
    return false;
  }
}

export async function hapticLight() {
  if (!isNative() || !isSupported()) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch {
    // ignore
  }
}

export async function hapticMedium() {
  if (!isNative() || !isSupported()) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Medium });
  } catch {
    // ignore
  }
}

export async function hapticSuccess() {
  if (!isNative() || !isSupported()) return;
  try {
    await Haptics.notification({ type: NotificationType.Success });
  } catch {
    // ignore
  }
}

export async function hapticWarning() {
  if (!isNative() || !isSupported()) return;
  try {
    await Haptics.notification({ type: NotificationType.Warning });
  } catch {
    // ignore
  }
}

export async function hapticError() {
  if (!isNative() || !isSupported()) return;
  try {
    await Haptics.notification({ type: NotificationType.Error });
  } catch {
    // ignore
  }
}

export async function hapticSelection() {
  if (!isNative() || !isSupported()) return;
  try {
    await Haptics.selectionChanged();
  } catch {
    // ignore
  }
}
