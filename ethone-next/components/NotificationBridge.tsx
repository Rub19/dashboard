"use client";

import { useEffect } from "react";
import { useNotifications } from "@/lib/hooks/useNotifications";
import { useDynamicIslandQueue } from "@/lib/hooks/useDynamicIslandQueue";
import { useToast } from "@/components/ToastProvider";
import { useI18n } from "@/lib/hooks/useI18n";
import { useSettings } from "@/components/SettingsProvider";
import { useAuth } from "@/components/AuthProvider";
import { fetchWorker } from "@/lib/api";

export default function NotificationBridge() {
  const { add, focusDigest } = useNotifications();
  const { register } = useDynamicIslandQueue();
  const { info } = useToast();
  const i18n = useI18n();
  const { settings } = useSettings();
  const { user } = useAuth();

  // Listen for Island notification events
  useEffect(() => {
    function handleIslandNotification(e: Event) {
      const customEvent = e as CustomEvent<{ id: string; title: string; message?: string; priority?: string }>;
      const notif = customEvent.detail;
      if (!notif || !settings.islandShowNotifications) return;

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

    function handleUploadIsland(e: Event) {
      const customEvent = e as CustomEvent<{ id: string; fileName: string; percent?: number }>;
      const d = customEvent.detail;
      if (!d) return;

      register({
        id: "upload-status",
        type: "upload",
        priority: 3,
        duration: 4500,
        content: {
          title: "Importation",
          subtitle: d.fileName,
        },
      });
    }

    function handleGenericNotification(e: Event) {
      const customEvent = e as CustomEvent<any>;
      if (customEvent.detail) {
        add(customEvent.detail);
      }
    }

    window.addEventListener("ethone:island-notification", handleIslandNotification);
    window.addEventListener("ethone:island-upload-start", handleUploadIsland);
    window.addEventListener("ethone:new-notification", handleGenericNotification);
    window.addEventListener("v8:stop-focus", handleFocusEnd);
    window.addEventListener("v8:focus-completed", handleFocusEnd);

    return () => {
      window.removeEventListener("ethone:island-notification", handleIslandNotification);
      window.removeEventListener("ethone:island-upload-start", handleUploadIsland);
      window.removeEventListener("ethone:new-notification", handleGenericNotification);
      window.removeEventListener("v8:stop-focus", handleFocusEnd);
      window.removeEventListener("v8:focus-completed", handleFocusEnd);
    };
  }, [register, focusDigest, info, settings.islandShowNotifications]);

  useEffect(() => {
    // No signed-in user (e.g. the login page): the mail endpoint would 401.
    // Skip the request entirely rather than logging a console error.
    if (!user) return;
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
          const text = (v: unknown) => (typeof v === "string" && v ? v : "");
          const subject = text(raw.title) || text(raw.subject) || i18n("newMail", "Nouveau mail");
          const from = text(raw.body) || text(raw.from) || text(raw.sender);
          const important = raw.important === true;
          // Identifiant et date du serveur : la même notification de mail n'est plus recréée à chaque chargement
          // (avant : une copie de plus par visite tant que le mail restait non lu).
          const serverId = text(raw.id) || text(raw.message_id);
          const at = Date.parse(text(raw.created_at));

          add({
            ...(serverId ? { id: `mail-${serverId}` } : {}),
            ...(Number.isFinite(at) ? { timestamp: at, createdAt: new Date(at).toISOString() } : {}),
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
  }, [user, add, i18n]);

  return null;
}
