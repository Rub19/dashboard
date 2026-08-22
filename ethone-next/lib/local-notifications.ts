"use client";

import { LocalNotifications } from "@capacitor/local-notifications";
import { isNative } from "./apple";

let permissionRequested = false;

export async function requestNotificationPermissions(): Promise<"granted" | "denied" | "not-native"> {
  if (!isNative()) return "not-native";
  try {
    const { display } = await LocalNotifications.requestPermissions();
    permissionRequested = true;
    return display === "granted" ? "granted" : "denied";
  } catch (err) {
    console.warn("Local notification permission request failed", err);
    return "denied";
  }
}

export async function checkNotificationPermissions(): Promise<"granted" | "denied" | "not-native"> {
  if (!isNative()) return "not-native";
  try {
    const { display } = await LocalNotifications.checkPermissions();
    return display === "granted" ? "granted" : "denied";
  } catch {
    return "denied";
  }
}

async function ensurePermission(): Promise<boolean> {
  if (!isNative()) return false;
  if (permissionRequested) {
    const status = await checkNotificationPermissions();
    return status === "granted";
  }
  const status = await requestNotificationPermissions();
  return status === "granted";
}

export function notificationIdFromString(prefix: string, id: string): number {
  // Simple stable hash for string IDs
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

  // Cancel any existing reminder first
  await cancelReminder(id);

  const at = new Date(task.dueDate);
  if (Number.isNaN(at.getTime()) || at.getTime() <= Date.now()) {
    return { ok: false, id };
  }

  const granted = await ensurePermission();
  if (!granted) return { ok: false, id };

  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          id,
          title: "Tâche à échéance",
          body: task.title || "Votre tâche arrive à échéance.",
          schedule: { at },
          sound: "default",
          extra: { type: "task-reminder", taskId: task.id },
        },
      ],
    });
    return { ok: true, id };
  } catch (err) {
    console.warn("Failed to schedule task reminder", err);
    return { ok: false, id };
  }
}

export async function triggerPomodoroCompletedNotification(sessionName: string): Promise<{ ok: boolean }> {
  if (!isNative()) return { ok: false };
  const granted = await ensurePermission();
  if (!granted) return { ok: false };

  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          id: notificationIdFromString("pomodoro", "completed"),
          title: sessionName || "Session Focus terminée !",
          body: "Session Focus terminée ! Prenez une pause.",
          schedule: { at: new Date(Date.now() + 500) },
          sound: "default",
          extra: { type: "pomodoro-completed" },
        },
      ],
    });
    return { ok: true };
  } catch (err) {
    console.warn("Failed to trigger pomodoro completion notification", err);
    return { ok: false };
  }
}

export async function schedulePomodoroEndNotification(
  sessionName: string,
  endAt: Date,
): Promise<{ ok: boolean; id: number }> {
  if (!isNative()) return { ok: false, id: 0 };

  const id = notificationIdFromString("pomodoro", "end");
  await cancelReminder(id);

  const at = new Date(endAt);
  if (Number.isNaN(at.getTime()) || at.getTime() <= Date.now()) {
    return { ok: false, id };
  }

  const granted = await ensurePermission();
  if (!granted) return { ok: false, id };

  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          id,
          title: sessionName || "Session Focus",
          body: "Session Focus terminée ! Prenez une pause.",
          schedule: { at },
          sound: "default",
          extra: { type: "pomodoro-completed" },
        },
      ],
    });
    return { ok: true, id };
  } catch (err) {
    console.warn("Failed to schedule pomodoro end notification", err);
    return { ok: false, id };
  }
}

export async function cancelReminder(id: number): Promise<void> {
  if (!isNative()) return;
  try {
    await LocalNotifications.cancel({ notifications: [{ id }] });
  } catch (err) {
    console.warn("Failed to cancel notification", err);
  }
}

export async function cancelAllNotifications(): Promise<void> {
  if (!isNative()) return;
  try {
    const pending = await LocalNotifications.getPending();
    const ids = pending.notifications.map((n) => ({ id: n.id }));
    if (ids.length > 0) {
      await LocalNotifications.cancel({ notifications: ids });
    }
  } catch (err) {
    console.warn("Failed to cancel all notifications", err);
  }
}
