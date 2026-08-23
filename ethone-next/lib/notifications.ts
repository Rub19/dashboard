"use client";

function isNative() {
  return false;
}

function isIOS() {
  return false;
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
  _onToken?: (token: string) => void,
  _onMessage?: (notification: { data?: Record<string, string>; title?: string; body?: string }) => void,
  _onAction?: (action: { actionId: string; notification?: { data?: Record<string, string> }; inputValue?: string }) => void
) {
  if (!isNative()) return;
}

export async function scheduleLocalNotification(
  _id: number,
  _title: string,
  _body: string,
  _at: Date,
  _data?: Record<string, string>,
  _category?: NotificationCategory
) {
  if (!isNative()) return;
  console.warn("Local notifications are only available in the native app.");
}

export async function cancelLocalNotifications(_ids?: number[]) {
  if (!isNative()) return;
}

export async function setBadgeCount(_count: number) {
  if (!isNative()) return;
}

export async function clearBadge() {
  if (!isNative()) return;
}

export function getNotificationCategories(): NotificationCategoryConfig[] {
  return CATEGORIES;
}

export async function syncBadgeWithTaskCount(remainingTasks: number) {
  if (!isIOS()) return;
  await setBadgeCount(Math.max(0, remainingTasks));
}
