"use client";

import { useEffect } from "react";
import { useNotifications } from "@/lib/hooks/useNotifications";
import { useDynamicIslandQueue } from "@/lib/hooks/useDynamicIslandQueue";
import { useToast } from "@/components/ToastProvider";
import { useI18n } from "@/lib/hooks/useI18n";
import { fetchWorker } from "@/lib/api";

export default function NotificationBridge() {
  const { add, focusDigest, clearFocusDigest } = useNotifications();
  const { register } = useDynamicIslandQueue();
  const { info } = useToast();
  const i18n = useI18n();

  // Listen for Island notification events
  useEffect(() => {
    function handleIslandNotification(e: Event) {
      const customEvent = e as CustomEvent<{ id: string; title: string; message?: string; priority?: string }>;
      const notif = customEvent.detail;
      if (!notif) return;

      register({
        id: notif.id || `notif-${Date.now()}`,
        type: "notification",
        priority: notif.priority === "critical" ? 7 : 6,
        duration: 4000,
        content: {
          title: notif.title,
          subtitle: notif.message,
        },
      });
    }

    function handleFocusEnd() {
      if (focusDigest.length > 0) {
        info(
          "Session Focus terminée",
          `${focusDigest.length} notification(s) reportée(s) reçue(s)`,
        );
      }
    }

    window.addEventListener("ethone:island-notification", handleIslandNotification);
    window.addEventListener("v8:stop-focus", handleFocusEnd);
    window.addEventListener("v8:focus-completed", handleFocusEnd);

    return () => {
      window.removeEventListener("ethone:island-notification", handleIslandNotification);
      window.removeEventListener("v8:stop-focus", handleFocusEnd);
      window.removeEventListener("v8:focus-completed", handleFocusEnd);
    };
  }, [register, focusDigest, info]);

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
            action: {
              label: "Ouvrir Mail",
              route: "mail",
            },
          });
        }
      } catch {
        // Silently handle offline / disconnected worker without console errors
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [add, i18n]);

  return null;
}
