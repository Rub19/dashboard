"use client";

import { useState } from "react";
import { useItems } from "@/lib/hooks/useItems";
import Card3D from "@/components/Card3D";
import { Icon } from "@/lib/icons";
import { useI18n } from "@/lib/hooks/useI18n";
import { useToast } from "@/components/ToastProvider";
import ContextMenu from "@/components/ContextMenu";

export default function TasksPage() {
  const i18n = useI18n();
  const { success, error: showError } = useToast();
  const { items, loading, error, create, update, remove } = useItems("tasks");
  const [text, setText] = useState("");

  async function addTask() {
    if (!text.trim()) return;
    try {
      await create({ title: text, body: "", done: false });
      setText("");
      success(i18n("added"));
    } catch {
      showError(i18n("error"));
    }
  }

  async function toggleTask(id: string, done: boolean) {
    try {
      await update(id, { done: !done });
      success(i18n("saved"));
    } catch {
      showError(i18n("error"));
    }
  }

  async function deleteTask(id: string) {
    try {
      await remove(id);
      success(i18n("deleted"));
    } catch {
      showError(i18n("error"));
    }
  }

  async function duplicateTask(task: { id: string; title: string }) {
    try {
      await create({ title: `${task.title} (${i18n("copy")})`, body: "", done: false });
      success(i18n("created"));
    } catch {
      showError(i18n("error"));
    }
  }

  function taskContextItems(task: { id: string; title: string; done?: boolean }) {
    return [
      {
        id: "copy-title",
        label: i18n("copyTitle"),
        icon: "copy",
        onClick: () => navigator.clipboard.writeText(task.title).then(() => success(i18n("copied"))).catch(() => showError(i18n("error"))),
      },
      {
        id: "toggle",
        label: task.done ? i18n("markUndone") : i18n("markDone"),
        icon: task.done ? "circle" : "circle-check",
        onClick: () => toggleTask(task.id, !!task.done),
      },
      {
        id: "duplicate",
        label: i18n("duplicate"),
        icon: "copy-plus",
        onClick: () => duplicateTask(task),
      },
      { id: "sep", label: "", separator: true },
      {
        id: "delete",
        label: i18n("delete"),
        icon: "trash-2",
        danger: true,
        onClick: () => deleteTask(task.id),
      },
    ];
  }

  const open = items.filter((t) => !t.done).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{i18n("tasksTitle")}</h1>
        <span className="rounded-full bg-[var(--surface-raised)] px-3 py-1 text-sm text-[var(--muted)]">
          {open} {open > 1 ? i18n("opens") : i18n("open")}
        </span>
      </div>

      <Card3D>
        <div className="flex gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTask()}
            aria-label={i18n("tasksPlaceholder")} placeholder={i18n("tasksPlaceholder")}
            className="min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
          />
          <button
            type="button"
            aria-label={i18n("add")}
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
          <ContextMenu key={task.id} items={taskContextItems(task)}>
            <Card3D>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  aria-label={task.done ? i18n("markUndone") : i18n("markDone")}
                  onClick={() => toggleTask(task.id, !!task.done)}
                  disabled={loading}
                  data-haptic
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
                  aria-label={i18n("delete")}
                  onClick={() => deleteTask(task.id)}
                  disabled={loading}
                  data-tooltip={i18n("delete")}
                  data-haptic
                  className="text-[var(--muted)] hover:text-red-400 disabled:opacity-50"
                >
                  <Icon name="trash-2" className="h-4 w-4" />
                </button>
              </div>
            </Card3D>
          </ContextMenu>
        ))}
      </div>
    </div>
  );
}
