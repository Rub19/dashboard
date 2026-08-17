"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  Calendar,
  Clock,
  Tag,
  Sparkles,
  Trash2,
  CheckSquare,
  ListFilter,
} from "lucide-react";
import { useItems, type Item } from "@/lib/hooks/useItems";
import { useI18n } from "@/lib/hooks/useI18n";
import { useToast } from "@/components/ToastProvider";
import StylizedTaskCheckbox from "@/components/StylizedTaskCheckbox";
import TaskSuggestionsBar, { type TaskSuggestion, INITIAL_SUGGESTIONS } from "@/components/TaskSuggestionsBar";

export type TaskPriority = "low" | "medium" | "high" | "urgent";

export type Task = Item & {
  data?: {
    category?: string;
    priority?: TaskPriority;
    dueDate?: string;
  };
};

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  urgent: "bg-rose-500/10 border-rose-500/20 text-rose-300",
  high: "bg-amber-500/10 border-amber-500/20 text-amber-300",
  medium: "bg-cyan-500/10 border-cyan-500/20 text-cyan-300",
  low: "bg-zinc-500/10 border-zinc-500/20 text-zinc-400",
};

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  urgent: "Urgent",
  high: "Haute",
  medium: "Moyenne",
  low: "Basse",
};

const DEFAULT_PRIORITY: TaskPriority = "medium";
const DEFAULT_CATEGORY = "Général";

function getTaskData(task: Task) {
  return task.data || {};
}

function taskTitleClass(done?: boolean) {
  return `min-w-0 flex-1 truncate text-xs sm:text-sm font-medium transition-all ${
    done ? "text-zinc-500 line-through" : "text-zinc-200 group-hover:text-white"
  }`;
}

export default function TasksPage() {
  const i18n = useI18n();
  const { success, error: showError } = useToast();
  const { items, loading, error, create, update, remove } = useItems("tasks");

  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>(DEFAULT_PRIORITY);
  const [newTaskCategory, setNewTaskCategory] = useState(DEFAULT_CATEGORY);
  const [newTaskDueDate, setNewTaskDueDate] = useState("");

  const [activeFilter, setActiveFilter] = useState<"all" | "open" | "done">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    let list = items as Task[];
    if (activeFilter === "done") list = list.filter((t) => t.done);
    if (activeFilter === "open") list = list.filter((t) => !t.done);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((t) => t.title.toLowerCase().includes(q));
    }
    return list;
  }, [items, activeFilter, searchQuery]);

  const stats = useMemo(() => {
    const total = items.length;
    const done = items.filter((t) => t.done).length;
    const open = total - done;
    return { total, done, open };
  }, [items]);

  const allSelected = filtered.length > 0 && selected.size === filtered.length;

  async function addTask(title: string, category = DEFAULT_CATEGORY, priority: TaskPriority = DEFAULT_PRIORITY, dueDate = "") {
    if (!title.trim()) return;
    try {
      await create({
        title,
        body: "",
        done: false,
        data: {
          category,
          priority,
          dueDate,
        },
      });
      setNewTaskTitle("");
      setNewTaskCategory(DEFAULT_CATEGORY);
      setNewTaskPriority(DEFAULT_PRIORITY);
      setNewTaskDueDate("");
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
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      success(i18n("deleted"));
    } catch {
      showError(i18n("error"));
    }
  }

  async function deleteSelected() {
    try {
      await Promise.all([...selected].map((id) => remove(id)));
      setSelected(new Set());
      success(i18n("deleted"));
    } catch {
      showError(i18n("error"));
    }
  }

  async function markSelectedDone(done: boolean) {
    try {
      await Promise.all([...selected].map((id) => update(id, { done })));
      success(i18n("saved"));
    } catch {
      showError(i18n("error"));
    }
  }

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
      return;
    }
    setSelected(new Set(filtered.map((t) => t.id)));
  }

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSuggestion(suggestion: TaskSuggestion) {
    addTask(suggestion.title, suggestion.category, suggestion.priority);
  }

  const tabs = [
    { id: "all" as const, label: i18n("all"), count: stats.total },
    { id: "open" as const, label: i18n("open"), count: stats.open },
    { id: "done" as const, label: i18n("done"), count: stats.done },
  ];

  return (
    <div className="mx-auto flex w-full max-w-5xl select-none flex-col gap-5 p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">{i18n("tasksTitle")}</h1>
          <p className="mt-0.5 text-xs text-zinc-400">{i18n("tasksDescription") || "Organisez vos objectifs et sprints du jour"}</p>
        </div>
        <div className="font-mono text-xs text-zinc-400">
          <strong className="text-white">{stats.done}</strong> / {stats.total} {i18n("done")}
        </div>
      </div>

      {/* Creation + Suggestions */}
      <div className="flex flex-col gap-3 rounded-2xl border border-white/[0.08] bg-zinc-950/80 p-3 shadow-xl backdrop-blur-2xl">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            addTask(newTaskTitle, newTaskCategory, newTaskPriority, newTaskDueDate);
          }}
          className="flex flex-col gap-2"
        >
          <div className="flex items-center gap-2">
            <div className="flex flex-1 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 transition-all focus-within:border-white/20">
              <CheckSquare className="h-4 w-4 shrink-0 text-zinc-500" />
              <input
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder={i18n("tasksPlaceholder") || "Ajouter une nouvelle tâche..."}
                className="w-full bg-transparent text-xs text-zinc-100 placeholder-zinc-500 outline-none sm:text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={!newTaskTitle.trim() || loading}
              style={
                newTaskTitle.trim()
                  ? { background: "var(--accent-color, #10b981)", color: "#09090b" }
                  : undefined
              }
              className={`flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
                newTaskTitle.trim()
                  ? "shadow-md hover:brightness-110 active:scale-95"
                  : "cursor-not-allowed border border-white/[0.05] bg-white/[0.05] text-zinc-500"
              }`}
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">{i18n("add")}</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2 py-1 text-zinc-400">
              <Tag className="h-3 w-3" />
              <select
                value={newTaskCategory}
                onChange={(e) => setNewTaskCategory(e.target.value)}
                className="bg-transparent text-[11px] text-zinc-200 outline-none"
              >
                <option value="Général">Général</option>
                <option value="Dev">Dev</option>
                <option value="GitHub">GitHub</option>
                <option value="Focus">Focus</option>
                <option value="Système">Système</option>
                <option value="Santé">Santé</option>
                <option value="Produit">Produit</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2 py-1 text-zinc-400">
              <ListFilter className="h-3 w-3" />
              <select
                value={newTaskPriority}
                onChange={(e) => setNewTaskPriority(e.target.value as TaskPriority)}
                className="bg-transparent text-[11px] text-zinc-200 outline-none"
              >
                <option value="low">{PRIORITY_LABELS.low}</option>
                <option value="medium">{PRIORITY_LABELS.medium}</option>
                <option value="high">{PRIORITY_LABELS.high}</option>
                <option value="urgent">{PRIORITY_LABELS.urgent}</option>
              </select>
            </div>

            <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2 py-1 text-zinc-400 transition-colors hover:bg-white/[0.04]">
              <Calendar className="h-3 w-3" />
              <input
                type="date"
                value={newTaskDueDate}
                onChange={(e) => setNewTaskDueDate(e.target.value)}
                className="bg-transparent text-[11px] text-zinc-200 outline-none"
              />
            </label>
          </div>
        </form>

        <TaskSuggestionsBar onSelect={handleSuggestion} suggestions={INITIAL_SUGGESTIONS} />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-1 rounded-xl border border-white/[0.08] bg-zinc-950/70 p-1 backdrop-blur-xl">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                activeFilter === tab.id
                  ? "border border-white/20 bg-white/[0.08] text-white shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {tab.label} <span className="opacity-60">({tab.count})</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleAll}
            className="flex items-center gap-2 text-zinc-400 transition-colors hover:text-zinc-200"
          >
            <StylizedTaskCheckbox checked={allSelected} onChange={toggleAll} ariaLabel={i18n("selectAll")} />
            <span className="text-xs">{i18n("selectAll")}</span>
          </button>

          <div className="relative flex items-center">
            <Search className="absolute left-3 h-3.5 w-3.5 text-zinc-500" />
            <input
              type="text"
              placeholder={i18n("search") || "Rechercher..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-44 rounded-xl border border-white/10 bg-white/[0.03] py-1.5 pl-8 pr-3 text-xs text-zinc-200 placeholder-zinc-500 outline-none transition-all focus:border-white/20 sm:w-56"
            />
          </div>
        </div>
      </div>

      {/* Bulk actions */}
      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] p-2"
          >
            <span className="text-xs text-zinc-400">
              {selected.size} {i18n("selected")}
            </span>
            <button
              type="button"
              onClick={() => markSelectedDone(true)}
              className="rounded-lg bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400 transition-colors hover:bg-emerald-500/20"
            >
              {i18n("markDone")}
            </button>
            <button
              type="button"
              onClick={() => markSelectedDone(false)}
              className="rounded-lg bg-zinc-500/10 px-2.5 py-1 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-500/20"
            >
              {i18n("markUndone")}
            </button>
            <button
              type="button"
              onClick={deleteSelected}
              className="ml-auto rounded-lg bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/20"
            >
              {i18n("delete")}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
          {error.message}
        </div>
      )}

      {/* Task list */}
      <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-zinc-950/70 backdrop-blur-2xl">
        {loading && items.length === 0 ? (
          <div className="flex items-center gap-3 p-5 text-sm text-zinc-400">
            <Sparkles className="h-5 w-5 animate-spin" />
            {i18n("loading")}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <CheckSquare className="mb-2 h-8 w-8 text-zinc-600" />
            <p className="text-sm font-semibold text-white">{i18n("noTasks") || "Aucune tâche trouvée"}</p>
            <p className="mt-0.5 text-xs text-zinc-500">{i18n("createOrSuggest") || "Créez une tâche ou cliquez sur une suggestion."}</p>
          </div>
        ) : (
          filtered.map((task, index) => {
            const data = getTaskData(task);
            const priority = data.priority || "medium";
            const category = data.category || "Général";
            const dueDate = data.dueDate;
            const isSel = selected.has(task.id);
            return (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15, delay: index * 0.02 }}
                onClick={() => toggleTask(task.id, !!task.done)}
                className="group flex cursor-pointer items-center justify-between border-b border-white/[0.04] p-3.5 transition-colors hover:bg-white/[0.02] last:border-b-0"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div onClick={(e) => e.stopPropagation()}>
                    <StylizedTaskCheckbox
                      checked={isSel}
                      onChange={() => toggleSelected(task.id)}
                      ariaLabel={i18n("select")}
                    />
                  </div>

                  <div onClick={(e) => e.stopPropagation()}>
                    <StylizedTaskCheckbox
                      checked={!!task.done}
                      onChange={() => toggleTask(task.id, !!task.done)}
                      ariaLabel={task.done ? i18n("markUndone") : i18n("markDone")}
                    />
                  </div>

                  <span className={taskTitleClass(task.done)}>{task.title}</span>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {category !== "Général" && (
                    <span className="rounded-md border border-white/[0.06] bg-white/[0.04] px-2 py-0.5 text-[10px] text-zinc-400">
                      {category}
                    </span>
                  )}
                  <span className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold ${PRIORITY_STYLES[priority]}`}>
                    {PRIORITY_LABELS[priority]}
                  </span>
                  {dueDate && (
                    <span className="flex items-center gap-1 rounded-md border border-white/[0.06] bg-white/[0.04] px-2 py-0.5 text-[10px] text-zinc-400">
                      <Clock className="h-3 w-3" />
                      {dueDate}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteTask(task.id);
                    }}
                    disabled={loading}
                    className="p-1 text-zinc-500 opacity-0 transition-all hover:text-rose-400 group-hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
