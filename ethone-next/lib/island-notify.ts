export interface IslandMailDetail {
  id?: string;
  sender: string;
  subject?: string;
  unreadCount?: number;
  duration?: number;
  status?: "received" | "sending" | "sent" | "error" | "syncing";
}

export interface IslandNotificationDetail {
  id?: string;
  title: string;
  message?: string;
  icon?: string;
  pack?: string;
  variant?: "success" | "warning" | "error" | "info";
  priority?: "critical" | "important" | "normal";
  duration?: number;
  actionUrl?: string;
}

export function triggerIslandMail(detail: IslandMailDetail): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("ethone:island-mail", { detail }));
}

export function triggerIslandNotification(detail: IslandNotificationDetail): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("ethone:island-notification", { detail }));
}

export function triggerIslandClipboard(label?: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("ethone:island-notification", {
      detail: {
        id: `clip-${Date.now()}`,
        title: label || "Copié dans le presse-papiers",
        message: "Élément prêt à être collé",
        icon: "clipboard-check",
        variant: "success",
        duration: 2500,
      },
    }),
  );
}
