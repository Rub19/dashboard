"use client";

import { useState } from "react";
import { useItems } from "@/lib/hooks/useItems";
import Card3D from "@/components/Card3D";
import { Icon } from "@/lib/icons";
;

export default function TasksPage() {
  const { items, loading, error, create, update, remove } = useItems("tasks");
  const [text, setText] = useState("");

  async function addTask() {
    if (!text.trim()) return;
    await create({ title: text, body: "", done: false });
    setText("");
  }

  const open = items.filter((t) => !t.done).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tâches</h1>
        <span className="rounded-full bg-[var(--surface-raised)] px-3 py-1 text-sm text-[var(--muted)]">
          {open} ouverte{open > 1 ? "s" : ""}
        </span>
      </div>

      <Card3D>
        <div className="flex gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTask()}
            placeholder="Nouvelle tâche..."
            className="min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
          />
          <button
            type="button"
            onClick={addTask}
            disabled={loading}
            className="flex shrink-0 items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            <Icon name="plus" className="h-4 w-4" />
          </button>
        </div>
      </Card3D>

      {error && (
        <Card3D>
          <p className="text-sm text-red-400">{error.message}</p>
        </Card3D>
      )}

      <div className="space-y-3">
        {loading && items.length === 0 && (
          <Card3D>
            <Icon name="loader-2" className="h-5 w-5 animate-spin text-[var(--muted)]" />
          </Card3D>
        )}
        {items.map((task) => (
          <Card3D key={task.id}>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => update(task.id, { done: !task.done })}
                disabled={loading}
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                  task.done
                    ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                    : "border-[var(--border)]"
                }`}
              >
                {task.done && <Icon name="circle-check" className="h-4 w-4" />}
              </button>
              <span
                className={`min-w-0 flex-1 truncate ${
                  task.done ? "text-[var(--muted)] line-through" : ""
                }`}
              >
                {task.title}
              </span>
              <button
                type="button"
                onClick={() => remove(task.id)}
                disabled={loading}
                className="text-[var(--muted)] hover:text-red-400 disabled:opacity-50"
              >
                <Icon name="trash-2" className="h-4 w-4" />
              </button>
            </div>
          </Card3D>
        ))}
      </div>
    </div>
  );
}
