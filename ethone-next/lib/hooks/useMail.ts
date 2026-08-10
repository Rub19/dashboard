"use client";

import { useEffect, useState } from "react";
import { fetchWorker } from "@/lib/api";

export type MailMessage = {
  id: string;
  subject: string;
  from_email: string;
  from_name?: string;
  folder: string;
  read: boolean;
  received_at: string;
  snippet?: string;
};

export function useMail(folder = "inbox", limit = 50) {
  const [messages, setMessages] = useState<MailMessage[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchWorker(`/api/mail/inbox?folder=${folder}&limit=${limit}`)
      .then((res) => {
        if (cancelled) return;
        setMessages(Array.isArray(res.data) ? res.data : []);
        setUnread(res.meta?.unread ?? 0);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || "Erreur");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [folder, limit]);

  return { messages, unread, loading, error };
}
