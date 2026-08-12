"use client";

import { useEffect, useState, useCallback } from "react";
import { fetchWorker } from "../api";
import { activityJournal } from "@/lib/activity-journal";

export type Item = {
  id: string;
  title: string;
  body: string;
  done?: boolean;
  startAt?: string;
  endAt?: string;
  data?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
};

export function useItems(kind: "notes" | "tasks" | "events") {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWorker(`/api/${kind}`);
      setItems(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [kind]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function create(input: Omit<Item, "id">) {
    const res = await fetchWorker(`/api/${kind}`, {
      method: "POST",
      body: JSON.stringify(input),
    });
    const data = res?.data;
    const actionMap = {
      notes: "v8.notes.new" as const,
      tasks: "v8.tasks.create" as const,
      events: "v8.calendar.create" as const,
    };
    const actionId = actionMap[kind];
    activityJournal.capture(actionId, { ok: !!data, title: input.title });
    await reload();
    return data;
  }

  async function update(id: string, input: Partial<Omit<Item, "id">>) {
    await fetchWorker(`/api/${kind}`, {
      method: "PATCH",
      body: JSON.stringify({ id, ...input }),
    });
    if (kind === "notes") {
      activityJournal.capture("v8.notes.save", { ok: true, title: input.title });
    }
    if (kind === "tasks" && input.done === true) {
      const item = items.find((i) => i.id === id);
      activityJournal.capture("v8.tasks.complete", { ok: true, title: item?.title });
    }
    await reload();
  }

  async function remove(id: string) {
    await fetchWorker(`/api/${kind}`, {
      method: "DELETE",
      body: JSON.stringify({ id }),
    });
    await reload();
  }

  return { items, loading, error, reload, create, update, remove };
}
