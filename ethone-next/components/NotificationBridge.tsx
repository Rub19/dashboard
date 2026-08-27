"use client";

import { useEffect } from "react";
import { useNotifications } from "@/lib/hooks/useNotifications";
import { useI18n } from "@/lib/hooks/useI18n";
import { fetchWorker } from "@/lib/api";

export default function NotificationBridge() {
  const { add } = useNotifications();
  const i18n = useI18n();

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const res = await fetchWorker("/api/mail/notifications?unread=true&limit=20");
        if (!mounted || !res) return;

        const list = Array.isArray(res)
          ? res
          : Array.isArray((res as { items?: unknown }).items)
            ? (res as { items: unknown[] }).items
            : Array.isArray((res as { data?: unknown }).data)
              ? (res as { data: unknown[] }).data
              : [];

        for (const item of list) {
          if (!item || typeof item !== "object") continue;
          const raw = item as Record<string, unknown>;
          const subject = typeof raw.subject === "string" && raw.subject ? raw.subject : i18n("newMail", "Nouveau mail");
          const from =
            typeof raw.from === "string" ? raw.from : typeof raw.sender === "string" ? raw.sender : "";
          const important = raw.important === true;

          add({
            title: subject,
            message: from,
            category: "mail",
            priority: important ? "important" : "normal",
            type: "mail",
            source: "ETHONE Mail",
            data: { url: "/mail/" },
          });
        }
      } catch (err) {
        console.error("NotificationBridge mail fetch failed:", err);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [add, i18n]);

  return null;
}
