"use client";

import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { LocalNotifications } from "@capacitor/local-notifications";
import { Badge } from "@capawesome/capacitor-badge";

function isNative() {
  if (typeof window === "undefined") return false;
  return Capacitor.isNativePlatform();
}

function isIOS() {
  return isNative() && Capacitor.getPlatform() === "ios";
}

export type NotificationCategory = "ETHONE_TASK" | "ETHONE_BRAIN" | "ETHONE_CALENDAR";

export interface NotificationAction {
  actionId: string;
  title: string;
  foreground?: boolean;
  destructive?: boolean;
  requiresAuthentication?: boolean;
  textInput?: { buttonTitle: string; placeholder: string };
}

export interface NotificationCategoryConfig {
  id: NotificationCategory;
  actions: NotificationAction[];
  hiddenPreviewsBodyPlaceholder?: string;
  categorySummaryFormat?: string;
}

const CATEGORIES: NotificationCategoryConfig[] = [
  {
    id: "ETHONE_TASK",
    actions: [
      { actionId: "ETHONE_TASK_DONE", title: "Marquer comme fait", foreground: false },
      { actionId: "ETHONE_TASK_POSTPONE", title: "Reporter 15 min", foreground: false },
    ],
    hiddenPreviewsBodyPlaceholder: "%u nouvelles tâches",
    categorySummaryFormat: "%u tâches ETHONE",
  },
  {
    id: "ETHONE_BRAIN",
    actions: [
      {
        actionId: "ETHONE_BRAIN_REPLY",
        title: "Répondre",
        foreground: true,
        textInput: { buttonTitle: "Envoyer", placeholder: "Votre idée..." },
      },
    ],
    hiddenPreviewsBodyPlaceholder: "%u messages Brain",
    categorySummaryFormat: "%u messages Brain",
  },
  {
    id: "ETHONE_CALENDAR",
    actions: [
      { actionId: "ETHONE_CALENDAR_SNOOZE", title: "Reporter 10 min", foreground: false },
      { actionId: "ETHONE_CALENDAR_OPEN", title: "Ouvrir", foreground: true },
    ],
    hiddenPreviewsBodyPlaceholder: "%u événements",
    categorySummaryFormat: "%u événements ETHONE",
  },
];

export async function initializePushAndLocalNotifications(
  onToken?: (token: string) => void,
  onMessage?: (notification: { data?: Record<string, string>; title?: string; body?: string }) => void,
  onAction?: (action: { actionId: string; notification?: { data?: Record<string, string> }; inputValue?: string }) => void
) {
  if (!isNative()) return;

  try {
    const perm = await PushNotifications.checkPermissions();
    if (perm.receive !== "granted") {
      await PushNotifications.requestPermissions();
    }

    PushNotifications.register();

    PushNotifications.addListener("registration", (token) => {
      onToken?.(token.value);
    });

    PushNotifications.addListener("pushNotificationReceived", (notification) => {
      onMessage?.({
        title: notification.title,
        body: notification.body,
        data: notification.data as Record<string, string> | undefined,
      });
    });

    PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
      onAction?.({
        actionId: action.actionId,
        notification: { data: action.notification.data as Record<string, string> | undefined },
        inputValue: (action as { inputValue?: string }).inputValue,
      });
    });

    await PushNotifications.createChannel({
      id: "ethone-general",
      name: "ETHONE",
      description: "Notifications générales ETHONE",
      importance: 4,
      visibility: 1,
      vibration: true,
    });
  } catch {
    // ignore on web
  }
}

export async function scheduleLocalNotification(
  id: number,
  title: string,
  body: string,
  at: Date,
  data?: Record<string, string>,
  category?: NotificationCategory
) {
  if (!isNative()) return;
  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          id,
          title,
          body,
          schedule: { at },
          extra: data,
          actionTypeId: category,
          sound: "beep.wav",
          channelId: "ethone-general",
        },
      ],
    });
  } catch (err) {
    console.warn("Local notification failed", err);
  }
}

export async function cancelLocalNotifications(ids?: number[]) {
  if (!isNative()) return;
  try {
    if (ids && ids.length > 0) {
      const pending = await LocalNotifications.getPending();
      const toCancel = pending.notifications
        .filter((n) => ids.includes(n.id))
        .map((n) => n.id);
      await LocalNotifications.cancel({ notifications: toCancel.map((id) => ({ id })) });
    } else {
      const pending = await LocalNotifications.getPending();
      await LocalNotifications.cancel({ notifications: pending.notifications.map((n) => ({ id: n.id })) });
    }
  } catch {
    // ignore
  }
}

export async function setBadgeCount(count: number) {
  if (!isNative()) return;
  try {
    await Badge.set({ count });
  } catch {
    // ignore
  }
}

export async function clearBadge() {
  if (!isNative()) return;
  try {
    await Badge.clear();
  } catch {
    // ignore
  }
}

export function getNotificationCategories(): NotificationCategoryConfig[] {
  return CATEGORIES;
}

export async function syncBadgeWithTaskCount(remainingTasks: number) {
  if (!isIOS()) return;
  await setBadgeCount(Math.max(0, remainingTasks));
}
