"use client";

import { useState } from "react";
import Card3D from "@/components/Card3D";
import { CircleCheck, Plus, Trash2 } from "lucide-react";

export default function TasksPage() {
  const [tasks, setTasks] = useState<{ id: number; text: string; done: boolean }[]>([
    { id: 1, text: "Tester le dashboard Next.js", done: false },
  ]);
  const [text, setText] = useState("");

  function addTask() {
    if (!text.trim()) return;
    setTasks([{ id: Date.now(), text, done: false }, ...tasks]);
    setText("");
  }

  function toggle(id: number) {
    setTasks(tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  }

  function remove(id: number) {
    setTasks(tasks.filter((t) => t.id !== id));
  }

  const open = tasks.filter((t) => !t.done).length;

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
            className="flex shrink-0 items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </Card3D>

      <div className="space-y-3">
        {tasks.map((task) => (
          <Card3D key={task.id}>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => toggle(task.id)}
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                  task.done
                    ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                    : "border-[var(--border)]"
                }`}
              >
                {task.done && <CircleCheck className="h-4 w-4" />}
              </button>
              <span
                className={`min-w-0 flex-1 truncate ${
                  task.done ? "text-[var(--muted)] line-through" : ""
                }`}
              >
                {task.text}
              </span>
              <button
                type="button"
                onClick={() => remove(task.id)}
                className="text-[var(--muted)] hover:text-red-400"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </Card3D>
        ))}
      </div>
    </div>
  );
}
