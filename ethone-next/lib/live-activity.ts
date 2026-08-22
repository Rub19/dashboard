"use client";

import { LiveActivity } from "capacitor-live-activity";
import { isNativeIOS } from "@/lib/apple";

export type LiveActivityMode = "focus" | "task" | "sound" | "sync";

export type LiveActivityData = {
  mode: LiveActivityMode;
  title: string;
  subtitle: string;
  progress?: string;
  accent?: string;
  action?: string;
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

function toContentState(data: LiveActivityData): Record<string, string> {
  return {
    mode: data.mode,
    title: data.title,
    subtitle: data.subtitle,
    progress: data.progress ?? "0",
    accent: data.accent ?? "classic",
    action: data.action ?? "",
  };
}

export async function startActivity(id: string, data: LiveActivityData) {
  if (!isNativeIOS()) return { activityId: "" };
  try {
    const { activityId } = await LiveActivity.startActivityWithPush({
      id,
      attributes: { id },
      contentState: toContentState(data),
    });
    return { activityId };
  } catch (err) {
    console.warn("Live activity start failed", err);
    return { activityId: "" };
  }
}

export async function updateActivity(id: string, data: LiveActivityData) {
  if (!isNativeIOS()) return;
  try {
    await LiveActivity.updateActivity({ id, contentState: toContentState(data) });
  } catch {
    // ignore
  }
}

export async function endActivity(id: string) {
  if (!isNativeIOS()) return;
  try {
    await LiveActivity.endActivity({ id, contentState: { mode: "sync", title: "", subtitle: "" } });
  } catch {
    // ignore
  }
}

/** Start or update a Focus/Pomodoro live activity. */
export async function setFocusActivity(id: string, title: string, remainingSeconds: number, totalSeconds: number) {
  const progress = totalSeconds ? String(Math.round((1 - remainingSeconds / totalSeconds) * 100)) : "0";
  const m = Math.floor(remainingSeconds / 60);
  const s = remainingSeconds % 60;
  const subtitle = `${m}:${s.toString().padStart(2, "0")}`;
  await updateActivity(id, { mode: "focus", title, subtitle, progress, action: "pause" });
}

/** Show an active task in the Dynamic Island. */
export async function setTaskActivity(id: string, title: string, remainingSeconds: number) {
  const subtitle = remainingSeconds > 0 ? `${Math.ceil(remainingSeconds / 60)} min` : "En cours";
  await updateActivity(id, { mode: "task", title, subtitle, action: "complete" });
}

/** Show sound ambiance wave. */
export async function setSoundActivity(id: string, title: string) {
  await updateActivity(id, { mode: "sound", title, subtitle: "Lecture", action: "stop" });
}

/** Flash a sync success alert. */
export async function flashSyncActivity(id: string, title = "Synchronisé") {
  await startActivity(id, { mode: "sync", title, subtitle: "OK", action: "" });
  setTimeout(() => endActivity(id), 1800);
}
