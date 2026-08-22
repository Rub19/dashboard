"use client";

import { nativeShare } from "@/lib/native";

export async function shareNote(title: string, body: string, url?: string) {
  return nativeShare({
    title,
    text: body,
    url,
  });
}

export async function shareTaskList(tasks: { id: string; title: string; done?: boolean }[], url?: string) {
  const text = tasks.map((t) => `${t.done ? "[x]" : "[ ]"} ${t.title}`).join("\n");
  return nativeShare({
    title: "Tâches ETHONE",
    text,
    url,
  });
}

export async function shareUrl(path: string, title = "ETHONE") {
  const url = `https://ethone.dev/app${path}`;
  return nativeShare({ title, url });
}
