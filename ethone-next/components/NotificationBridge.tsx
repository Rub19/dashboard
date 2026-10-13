"use client";

import { useEffect, useRef } from "react";
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

  useEffect(() => {
    function handleIslandNotification(e: Event) {
      const customEvent = e as CustomEvent<{
        id?: string;
        title: string;
        message?: string;
        subtitle?: string;
        icon?: string;
        pack?: string;
        variant?: string;
        priority?: string;
        duration?: number;
      }>;
      const notif = customEvent.detail;
      if (!notif || !settings.islandShowNotifications) return;

      register({
        id: notif.id || `notif-${Date.now()}`,
        type: "notification",
        priority: notif.priority === "critical" ? 8 : 6,
        duration: notif.duration ?? 4500,
        content: {
          title: notif.title,
          message: notif.message || notif.subtitle,
          icon: notif.icon,
          pack: notif.pack,
          variant: notif.variant,
        },
      });
    }

    function handleIslandMail(e: Event) {
      const customEvent = e as CustomEvent<{
        id?: string;
        sender?: string;
        subject?: string;
        unreadCount?: number;
        status?: "sending" | "sent" | "error" | "syncing" | "received";
        duration?: number;
      }>;
      const d = customEvent.detail;
      if (!d || !settings.islandShowNotifications) return;

      register({
        id: d.id || `mail-${Date.now()}`,
        type: "mail",
        priority: 7,
        duration: d.duration ?? 7000,
        content: {
          title: d.sender || "Nouveau message",
          sender: d.sender || "Nouveau message",
          subject: d.subject || "",
          unreadCount: d.unreadCount ?? 1,
          status: d.status || "received",
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
    window.addEventListener("ethone:island-mail", handleIslandMail);
    window.addEventListener("ethone:island-upload-start", handleUploadIsland);
    window.addEventListener("ethone:new-notification", handleGenericNotification);
    window.addEventListener("v8:stop-focus", handleFocusEnd);
    window.addEventListener("v8:focus-completed", handleFocusEnd);

    return () => {
      window.removeEventListener("ethone:island-notification", handleIslandNotification);
      window.removeEventListener("ethone:island-mail", handleIslandMail);
      window.removeEventListener("ethone:island-upload-start", handleUploadIsland);
      window.removeEventListener("ethone:new-notification", handleGenericNotification);
      window.removeEventListener("v8:stop-focus", handleFocusEnd);
      window.removeEventListener("v8:focus-completed", handleFocusEnd);
    };
  }, [register, focusDigest, info, settings.islandShowNotifications, add]);

  const addRef = useRef(add);
  addRef.current = add;
  const i18nRef = useRef(i18n);
  i18nRef.current = i18n;
  const userId = user?.id ?? null;

  useEffect(() => {
    if (!userId) return;
    let mounted = true;
    const knownMailIds = new Set<string>();
    let isInitial = true;

    async function loadMails() {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
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

        let latestIncoming: { sender: string; subject: string; id: string } | null = null;
        let incomingCount = 0;

        for (const item of list) {
          if (!item || typeof item !== "object") continue;
          const raw = item as Record<string, unknown>;
          const text = (v: unknown) => (typeof v === "string" && v ? v : "");
          const subject = text(raw.title) || text(raw.subject) || i18nRef.current("newMail", "Nouveau mail");
          const from = text(raw.body) || text(raw.from) || text(raw.sender);
          const important = raw.important === true;
          const serverId = text(raw.id) || text(raw.message_id);
          const at = Date.parse(text(raw.created_at));

          if (serverId) {
            if (!knownMailIds.has(serverId)) {
              knownMailIds.add(serverId);
              if (!isInitial) {
                incomingCount++;
                latestIncoming = { sender: from, subject, id: serverId };
              }
            }
          }

          addRef.current({
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

        if (incomingCount > 0 && latestIncoming && settings.islandShowNotifications) {
          register({
            id: `mail-recv-${latestIncoming.id}`,
            type: "mail",
            priority: 7,
            duration: 8000,
            content: {
              title: "Nouveau mail",
              sender: latestIncoming.sender || "ETHONE Mail",
              subject: latestIncoming.subject,
              unreadCount: list.length,
              status: "received",
            },
          });
        }

        isInitial = false;
      } catch {
      }
    }

    loadMails();
    const interval = window.setInterval(loadMails, 30000);

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, [userId, settings.islandShowNotifications, register]);

  return null;
}
