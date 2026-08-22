"use client";

import { useEffect } from "react";
import type { Item } from "./useItems";
import { useTasks, type Task as CloudTask, type TaskInput } from "./useTasks";
import { scheduleTaskReminder, cancelReminder } from "@/lib/local-notifications";
import { notificationIdFromString } from "@/lib/local-notifications";

export type TaskPriority = "low" | "medium" | "high" | "urgent";

export type CloudTaskItem = Item & {
  data?: {
    category?: string;
    priority?: TaskPriority;
    dueDate?: string;
  };
};

function toItem(task: CloudTask): CloudTaskItem {
  return {
    id: task.id,
    title: task.title,
    body: task.description || "",
    done: task.is_completed,
    createdAt: task.created_at,
    updatedAt: task.updated_at,
    data: {
      priority: (task.priority as TaskPriority) || "medium",
      dueDate: task.due_date || undefined,
    },
  };
}

function toInput(input: Partial<Omit<Item, "id">>): Partial<TaskInput> {
  const next: Partial<TaskInput> = {};
  if ("title" in input) next.title = input.title;
  if ("body" in input) next.description = input.body || null;
  if ("done" in input) next.is_completed = input.done;
  if (input.data?.priority) next.priority = (input.data.priority === "urgent" ? "high" : String(input.data.priority)) as CloudTask["priority"];
  if (input.data?.dueDate) next.due_date = String(input.data.dueDate);
  return next;
}

export function useCloudTasks() {
  const { items, loading, error, status, create, update, remove, reload } = useTasks();

  const mappedItems = items.map(toItem);

  useEffect(() => {
    if (loading) return;
    for (const task of items) {
      if (task.is_completed || !task.due_date) continue;
      const dueDate = new Date(task.due_date);
      if (Number.isNaN(dueDate.getTime()) || dueDate.getTime() <= Date.now()) continue;
      void scheduleTaskReminder({ id: task.id, title: task.title, dueDate });
    }
  }, [items, loading]);

  const createItem = async (input: Omit<Item, "id">) => {
    const next = await create({
      title: input.title,
      description: input.body || null,
      is_completed: input.done || false,
      priority: (input.data?.priority === "urgent" ? "high" : String(input.data?.priority || "medium")) as CloudTask["priority"],
      due_date: input.data?.dueDate ? String(input.data.dueDate) : null,
    });
    if (next?.due_date && !next.is_completed) {
      await scheduleTaskReminder({
        id: next.id,
        title: next.title,
        dueDate: new Date(next.due_date),
      });
    }
  };

  const updateItem = async (id: string, input: Partial<Omit<Item, "id">>) => {
    const next = await update(id, toInput(input));
    if (!next) return;

    const reminderId = notificationIdFromString("task", next.id);
    if (next.is_completed || !next.due_date) {
      await cancelReminder(reminderId);
    } else {
      await scheduleTaskReminder({
        id: next.id,
        title: next.title,
        dueDate: new Date(next.due_date),
      });
    }
  };

  const removeItem = async (id: string) => {
    await remove(id);
    await cancelReminder(notificationIdFromString("task", id));
  };

  return {
    items: mappedItems,
    loading,
    error,
    status,
    create: createItem,
    update: updateItem,
    remove: removeItem,
    reload,
  };
}
