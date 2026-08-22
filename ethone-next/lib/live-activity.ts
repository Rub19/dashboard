"use client";

import { LiveActivity } from "capacitor-live-activity";
import { isNativeIOS } from "@/lib/apple";

export type LiveActivityData = {
  focusTitle?: string;
  focusMode?: string;
  timeRemaining?: string;
  progress?: string;
  aura?: string;
  taskTitle?: string;
  taskId?: string;
};

export async function areActivitiesSupported() {
  if (!isNativeIOS()) return false;
  try {
    const { value } = await LiveActivity.isAvailable();
    return value;
  } catch {
    return false;
  }
}

export async function startFocusActivity(id: string, title: string, durationSeconds: number, aura = "classic") {
  if (!isNativeIOS()) return { activityId: "" };
  try {
    const { activityId } = await LiveActivity.startActivityWithPush({
      id,
      attributes: {
        focusTitle: title,
        aura,
      },
      contentState: {
        focusTitle: title,
        timeRemaining: formatTime(durationSeconds),
        progress: "0",
        aura,
      },
    });
    return { activityId };
  } catch (err) {
    console.warn("Live activity start failed", err);
    return { activityId: "" };
  }
}

export async function updateFocusActivity(id: string, updates: LiveActivityData) {
  if (!isNativeIOS()) return;
  try {
    const contentState: Record<string, string> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) contentState[key] = value;
    }
    await LiveActivity.updateActivity({ id, contentState });
  } catch {
    // ignore
  }
}

export async function endFocusActivity(id: string) {
  if (!isNativeIOS()) return;
  try {
    await LiveActivity.endActivity({ id, contentState: {} });
  } catch {
    // ignore
  }
}

function formatTime(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
