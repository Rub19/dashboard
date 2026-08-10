"use client";

import { useCallback, useEffect, useState } from "react";

export type NotificationCategory = "mail" | "security" | "tracker" | "system" | "brain" | "integration";

export type NotificationPriority = "low" | "normal" | "high";

export type Notification = {
  id: string;
  title: string;
  message: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  read: boolean;
  snoozed?: boolean;
  createdAt: string;
};

const KEY = "ethone-notifications-v1";

function load(): Notification[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function save(items: Notification[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(items));
}

export function useNotifications() {
  const [items, setItems] = useState<Notification[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setItems(load());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) save(items);
  }, [items, loaded]);

  const add = useCallback((notification: Omit<Notification, "id" | "read" | "createdAt">) => {
    const n: Notification = {
      ...notification,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      read: false,
      createdAt: new Date().toISOString(),
    };
    setItems((prev) => [n, ...prev].slice(0, 100));
    return n.id;
  }, []);

  const markRead = useCallback((id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const markAllRead = useCallback(() => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clear = useCallback(() => {
    setItems([]);
  }, []);

  const snooze = useCallback((id: string) => {
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, snoozed: true, read: true } : n))
    );
  }, []);

  const unreadCount = items.filter((n) => !n.read && !n.snoozed).length;

  return {
    items,
    unreadCount,
    add,
    markRead,
    markAllRead,
    remove,
    clear,
    snooze,
  };
}
