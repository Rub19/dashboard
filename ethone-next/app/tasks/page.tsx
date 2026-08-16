"use client";

import { useMemo, useState } from "react";
import { useItems } from "@/lib/hooks/useItems";
import { useSelection } from "@/lib/hooks/useSelection";
import Card3D from "@/components/Card3D";
import BulkActionBar from "@/components/BulkActionBar";
import { Icon } from "@/lib/icons";
import { useI18n } from "@/lib/hooks/useI18n";
import { useToast } from "@/components/ToastProvider";
import ContextMenu from "@/components/ContextMenu";
import Input from "@/components/Input";

type Task = { id: string; title: string; body?: string; done?: boolean };

export default function TasksPage() {
  const i18n = useI18n();
  const { success, error: showError } = useToast();
  const { items, loading, error, create, update, remove } = useItems("tasks");
  const [text, setText] = useState("");
  const [filter, setFilter] = useState<"all" | "done" | "open">("all");
  const [query, setQuery] = useState("");

  const { selected, selectedItems, hasSelection, isAllSelected, toggle, selectAll, clear, isSelected } = useSelection<Task>(items);

  const filtered = useMemo(() => {
    let list = items;
    if (filter === "done") list = list.filter((t) => t.done);
    if (filter === "open") list = list.filter((t) => !t.done);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((t) => t.title.toLowerCase().includes(q));
    }
    return list;
  }, [items, filter, query]);

  const stats = useMemo(() => {
    const total = items.length;
    const done = items.filter((t) => t.done).length;
    const open = total - done;
    return { total, done, open };
  }, [items]);

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

  async function bulkDone() {
    try {
      await Promise.all(selectedItems.map((t) => update(t.id, { done: true })));
      clear();
      success(i18n("saved"));
    } catch {
      showError(i18n("error"));
    }
  }

  async function bulkUndone() {
    try {
      await Promise.all(selectedItems.map((t) => update(t.id, { done: false })));
      clear();
      success(i18n("saved"));
    } catch {
      showError(i18n("error"));
    }
  }

  async function bulkDelete() {
    try {
      await Promise.all(selectedItems.map((t) => remove(t.id)));
      clear();
      success(i18n("deleted"));
    } catch {
      showError(i18n("error"));
    }
  }

  function taskContextItems(task: Task) {
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

  const FILTER_BUTTONS: { id: "all" | "done" | "open"; label: string; count: number }[] = [
    { id: "all", label: i18n("all"), count: stats.total },
    { id: "open", label: i18n("open"), count: stats.open },
    { id: "done", label: i18n("done"), count: stats.done },
  ];

  return (
    <div className="w-full sm:max-w-5xl lg:max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{i18n("tasksTitle")}</h1>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {FILTER_BUTTONS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`rounded-[var(--panel-radius)] border px-3 py-2 text-sm font-medium transition-colors ${
              filter === f.id
                ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                : "border-[var(--panel-border)] bg-[var(--panel-bg)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--foreground)]"
            } backdrop-blur-[var(--panel-blur)]`}
          >
            {f.label} <span className="text-[var(--muted)]">({f.count})</span>
          </button>
        ))}
      </div>

      <Card3D>
        <div className="flex flex-wrap gap-2 sm:flex-nowrap">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTask()}
            aria-label={i18n("tasksPlaceholder")}
            placeholder={i18n("tasksPlaceholder")}
            className="w-full flex-1"
          />
          <button
            type="button"
            aria-label={i18n("add")}
            onClick={addTask}
            disabled={loading}
            className="flex shrink-0 items-center gap-2 rounded-[var(--panel-radius)] bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            <Icon name="plus" className="h-4 w-4" />
          </button>
        </div>
      </Card3D>

      {hasSelection && (
        <BulkActionBar
          count={selected.size}
          onDone={bulkDone}
          onUndone={bulkUndone}
          onDelete={bulkDelete}
          onClear={clear}
        />
      )}

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="checkbox"
          checked={isAllSelected}
          onChange={() => (isAllSelected ? clear() : selectAll())}
          className="accent-[var(--accent)]"
          aria-label={i18n("selectAll")}
        />
        <span className="text-sm text-[var(--muted)]">{i18n("selectAll")}</span>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={i18n("search")}
          aria-label={i18n("search")}
          icon="search"
          className="w-full sm:ml-auto sm:w-48"
        />
      </div>

      {error && (
        <Card3D>
          <p className="break-words text-sm text-red-400">{error.message}</p>
        </Card3D>
      )}

      <div className="space-y-3">
        {loading && items.length === 0 && (
          <Card3D>
            <Icon name="loader-2" className="h-5 w-5 animate-spin text-[var(--muted)]" />
          </Card3D>
        )}
        {filtered.map((task) => (
          <ContextMenu key={task.id} items={taskContextItems(task)}>
            <Card3D>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={isSelected(task.id)}
                  onChange={() => toggle(task.id)}
                  className="accent-[var(--accent)]"
                  aria-label={i18n("select")}
                  onClick={(e) => e.stopPropagation()}
                />
                <button
                  type="button"
                  aria-label={task.done ? i18n("markUndone") : i18n("markDone")}
                  onClick={() => toggleTask(task.id, !!task.done)}
                  disabled={loading}
                  data-haptic
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                    task.done
                      ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                      : "border-[var(--panel-border)]"
                  } backdrop-blur-[var(--panel-blur)]`}
                >
                  {task.done && <Icon name="circle-check" className="h-4 w-4" />}
                </button>
                <span
                  className={`min-w-0 flex-1 break-words ${
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
