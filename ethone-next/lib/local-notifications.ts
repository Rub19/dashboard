"use client";

import { isNative } from "./apple";

export async function requestNotificationPermissions(): Promise<"granted" | "denied" | "not-native"> {
  if (!isNative()) return "not-native";
  return "denied";
}

export async function checkNotificationPermissions(): Promise<"granted" | "denied" | "not-native"> {
  if (!isNative()) return "not-native";
  return "denied";
}

export function notificationIdFromString(prefix: string, id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  const prefixHash = (() => {
    let h = 0;
    for (let i = 0; i < prefix.length; i++) {
      h = (h << 5) - h + prefix.charCodeAt(i);
      h |= 0;
    }
    return h;
  })();
  return Math.abs(prefixHash + hash) % 2_147_483_647 || 1;
}

export async function scheduleTaskReminder(task: {
  id: string;
  title: string;
  dueDate: Date;
}): Promise<{ ok: boolean; id: number }> {
  if (!isNative()) return { ok: false, id: 0 };
  const id = notificationIdFromString("task", task.id);
  console.warn("Local notifications are only available in the native app.");
  return { ok: false, id };
}

export async function triggerPomodoroCompletedNotification(_sessionName: string): Promise<{ ok: boolean }> {
  if (!isNative()) return { ok: false };
  console.warn("Local notifications are only available in the native app.");
  return { ok: false };
}

export async function schedulePomodoroEndNotification(
  _sessionName: string,
  _endAt: Date,
): Promise<{ ok: boolean; id: number }> {
  if (!isNative()) return { ok: false, id: 0 };
  const id = notificationIdFromString("pomodoro", "end");
  console.warn("Local notifications are only available in the native app.");
  return { ok: false, id };
}

export async function cancelReminder(_id: number): Promise<void> {
  if (!isNative()) return;
}

export async function cancelAllNotifications(): Promise<void> {
  if (!isNative()) return;
}
