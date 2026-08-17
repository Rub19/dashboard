"use client";

import type { Item } from "./useItems";
import { useTasks, type Task as CloudTask, type TaskInput } from "./useTasks";

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

  const createItem = async (input: Omit<Item, "id">) => {
    await create({
      title: input.title,
      description: input.body || null,
      is_completed: input.done || false,
      priority: (input.data?.priority === "urgent" ? "high" : String(input.data?.priority || "medium")) as CloudTask["priority"],
      due_date: input.data?.dueDate ? String(input.data.dueDate) : null,
    });
  };

  const updateItem = async (id: string, input: Partial<Omit<Item, "id">>) => {
    await update(id, toInput(input));
  };

  return {
    items: mappedItems,
    loading,
    error,
    status,
    create: createItem,
    update: updateItem,
    remove,
    reload,
  };
}
