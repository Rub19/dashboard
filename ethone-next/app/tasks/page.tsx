"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Plus,
  Sparkles,
  Search,
  Flame,
  Clock,
  LayoutList,
  Kanban,
  Layers,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { useCloudTasks } from "@/lib/hooks/useCloudTasks";
import { useToast } from "@/components/ToastProvider";
import { type Task, type TaskPriority } from "@/components/TasksWidget";
import { TaskItemRow } from "@/components/tasks/TaskItemRow";
import { TasksKanbanView } from "@/components/tasks/TasksKanbanView";
import AiTaskDrawer from "@/components/tasks/AiTaskDrawer";
import { type GeneratedTask } from "@/lib/tasks/ai-task-engine";
import { cn } from "@/lib/utils";

type FilterTab = "all" | "open" | "priority" | "done";
type ViewMode = "list" | "kanban";

const CATEGORIES = ["Tous", "Général", "Dev", "Design", "Organisation", "Personnel", "Projet"];

export default function TasksPage() {
  const { items, loading, error, create, update, remove, reload } = useCloudTasks();
  const { notify, success, error: showError } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [selectedCategory, setSelectedCategory] = useState("Tous");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false);

  // Quick Add State
  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState<TaskPriority>("medium");
  const [newCategory, setNewCategory] = useState("Général");

  // Stats
  const stats = useMemo(() => {
    const total = items.length;
    const done = items.filter((t) => t.done).length;
    const open = total - done;
    const urgentOrHigh = items.filter((t) => !t.done && ["urgent", "high"].includes(t.data?.priority || "")).length;
    const percent = total > 0 ? Math.round((done / total) * 100) : 0;
    return { total, done, open, urgentOrHigh, percent };
  }, [items]);

  // Filtering
  const filteredTasks = useMemo(() => {
    return items.filter((t) => {
      // Tab filter
      if (activeTab === "open" && t.done) return false;
      if (activeTab === "done" && !t.done) return false;
      if (activeTab === "priority" && (t.done || !["urgent", "high"].includes(t.data?.priority || ""))) return false;

      // Category filter
      if (selectedCategory !== "Tous" && (t.data?.category || "Général") !== selectedCategory) return false;

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const titleMatch = t.title.toLowerCase().includes(query);
        const categoryMatch = (t.data?.category || "").toLowerCase().includes(query);
        if (!titleMatch && !categoryMatch) return false;
      }

      return true;
    });
  }, [items, activeTab, selectedCategory, searchQuery]);

  // Actions
  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      await create({
        title: newTitle.trim(),
        body: "",
        done: false,
        data: {
          category: newCategory,
          priority: newPriority,
          dueDate: new Date().toISOString(),
        },
      });
      notify.taskAdded(newTitle.trim());
      setNewTitle("");
    } catch {
      showError("Erreur lors de l'ajout de la tâche");
    }
  };

  const handleToggleTask = useCallback(
    async (id: string, done: boolean) => {
      try {
        await update(id, { done });
      } catch {
        showError("Erreur de synchronisation");
      }
    },
    [update, showError]
  );

  const handleDeleteTask = useCallback(
    async (id: string) => {
      try {
        await remove(id);
        notify.taskDeleted();
      } catch {
        showError("Erreur de suppression");
      }
    },
    [remove, notify, showError]
  );

  const handleUpdateTitle = useCallback(
    async (id: string, title: string) => {
      try {
        await update(id, { title });
        success("Titre modifié", title);
      } catch {
        showError("Erreur de mise à jour");
      }
    },
    [update, success, showError]
  );

  const handleAddBatchAiTasks = async (tasks: GeneratedTask[]) => {
    for (const t of tasks) {
      await create({
        title: t.title,
        body: "",
        done: false,
        data: {
          category: t.category,
          priority: t.priority,
          dueDate: new Date().toISOString(),
        },
      });
    }
  };

  const KPIS = [
    { label: "Total", value: stats.total, icon: Layers },
    { label: "En cours", value: stats.open, icon: Clock },
    { label: "Prioritaires", value: stats.urgentOrHigh, icon: Flame },
    { label: "Progression", value: `${stats.percent}%`, icon: CheckCircle2 },
  ];

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden p-4 sm:p-6 lg:p-8 space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between shrink-0">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-[var(--text-primary)]">Tâches</h1>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            Organisez et priorisez votre travail du jour.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsAiDrawerOpen(true)}
            className="flex items-center gap-2 rounded-xl border border-[var(--panel-border)] px-3 py-1.5 text-xs font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Assistant IA</span>
          </button>

          <div className="flex items-center rounded-xl border border-[var(--panel-border)] p-0.5">
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-lg transition-colors",
                viewMode === "list"
                  ? "bg-[var(--surface-2)] text-[var(--text-primary)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              )}
              title="Vue Liste"
            >
              <LayoutList className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("kanban")}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-lg transition-colors",
                viewMode === "kanban"
                  ? "bg-[var(--surface-2)] text-[var(--text-primary)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              )}
              title="Vue Kanban"
            >
              <Kanban className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* KPI strip */}
      <div className="v8-panel grid shrink-0 grid-cols-2 divide-[var(--panel-border)] sm:grid-cols-4 sm:divide-x">
        {KPIS.map((kpi) => (
          <div key={kpi.label} className="flex items-center gap-3 p-3.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-2)] text-[var(--text-muted)]">
              <kpi.icon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">{kpi.label}</p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums text-[var(--text-primary)]">{kpi.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick add */}
      <form
        onSubmit={handleQuickAdd}
        className="v8-panel flex flex-col gap-2 p-2 sm:flex-row sm:items-center shrink-0"
      >
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Ajouter une tâche…"
          className="flex-1 bg-transparent px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
        />

        <div className="flex items-center gap-2 px-1">
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className="cursor-pointer rounded-lg border border-[var(--panel-border)] bg-transparent px-2.5 py-1.5 text-xs text-[var(--text-muted)] outline-none hover:text-[var(--text-primary)]"
          >
            {CATEGORIES.filter((c) => c !== "Tous").map((c) => (
              <option key={c} value={c} className="bg-[var(--panel-bg)] text-[var(--text-primary)]">
                {c}
              </option>
            ))}
          </select>

          <select
            value={newPriority}
            onChange={(e) => setNewPriority(e.target.value as TaskPriority)}
            className="cursor-pointer rounded-lg border border-[var(--panel-border)] bg-transparent px-2.5 py-1.5 text-xs text-[var(--text-muted)] outline-none hover:text-[var(--text-primary)]"
          >
            <option value="low" className="bg-[var(--panel-bg)] text-[var(--text-primary)]">Basse</option>
            <option value="medium" className="bg-[var(--panel-bg)] text-[var(--text-primary)]">Moyenne</option>
            <option value="high" className="bg-[var(--panel-bg)] text-[var(--text-primary)]">Haute</option>
            <option value="urgent" className="bg-[var(--panel-bg)] text-[var(--text-primary)]">Urgente</option>
          </select>

          <button
            type="submit"
            disabled={!newTitle.trim()}
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-[var(--accent-primary)] px-3.5 py-1.5 text-xs font-medium text-[var(--accent-contrast)] transition-[filter] hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
          >
            <Plus className="h-4 w-4" />
            <span>Ajouter</span>
          </button>
        </div>
      </form>

      {/* Tabs + search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between shrink-0">
        <div className="flex items-center gap-1 overflow-x-auto os-scroll pb-1 sm:pb-0">
          {[
            { id: "all", label: "Toutes", count: stats.total },
            { id: "open", label: "En cours", count: stats.open },
            { id: "priority", label: "Prioritaires", count: stats.urgentOrHigh },
            { id: "done", label: "Terminées", count: stats.done },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as FilterTab)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                activeTab === tab.id
                  ? "bg-[var(--accent-primary)] text-[var(--accent-contrast)]"
                  : "text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
              )}
            >
              {tab.label} <span className="opacity-60">({tab.count})</span>
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-muted)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher…"
            className="w-full rounded-lg border border-[var(--panel-border)] bg-transparent pl-8 pr-3 py-1.5 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent-primary)]"
          />
        </div>
      </div>

      {/* View area */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {loading && items.length === 0 ? (
          <div className="h-full space-y-2.5 overflow-hidden" aria-busy="true">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-[var(--surface-2)]/60" />
            ))}
          </div>
        ) : error && items.length === 0 ? (
          <div className="v8-panel flex flex-col items-center justify-center p-12 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--danger)]/10 text-[var(--danger)]">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-medium text-[var(--text-primary)]">Impossible de charger vos tâches</h3>
            <p className="mt-1 max-w-sm text-xs text-[var(--text-muted)]">
              Vérifiez votre connexion. Vos tâches se resynchroniseront automatiquement.
            </p>
            <button
              type="button"
              onClick={() => reload()}
              className="mt-4 flex items-center gap-2 rounded-lg border border-[var(--panel-border)] px-4 py-2 text-xs font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-2)] active:scale-95"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Réessayer</span>
            </button>
          </div>
        ) : viewMode === "kanban" ? (
          <TasksKanbanView
            tasks={filteredTasks as Task[]}
            onToggle={handleToggleTask}
            onDelete={handleDeleteTask}
            onNewTask={() => setIsAiDrawerOpen(true)}
          />
        ) : (
          <div className="h-full min-h-0 overflow-y-auto os-scroll pr-1 space-y-2 pb-6">
            <AnimatePresence mode="popLayout" initial={false}>
              {filteredTasks.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="v8-panel flex flex-col items-center justify-center p-12 text-center"
                >
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--surface-2)] text-[var(--text-muted)]">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <h3 className="text-sm font-medium text-[var(--text-primary)]">Aucune tâche correspondante</h3>
                  <p className="mt-1 max-w-sm text-xs text-[var(--text-muted)]">
                    {searchQuery
                      ? "Aucune tâche ne correspond à votre recherche."
                      : "Votre liste est vide. L'assistant peut générer un plan pour vous."}
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsAiDrawerOpen(true)}
                    className="mt-4 flex items-center gap-2 rounded-lg bg-[var(--accent-primary)] px-4 py-2 text-xs font-medium text-[var(--accent-contrast)] transition-[filter] hover:brightness-110 active:scale-95"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Générer un plan</span>
                  </button>
                </motion.div>
              ) : (
                filteredTasks.map((task) => (
                  <TaskItemRow
                    key={task.id}
                    task={task as Task}
                    onToggle={handleToggleTask}
                    onDelete={handleDeleteTask}
                    onUpdateTitle={handleUpdateTitle}
                  />
                ))
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* AI Task Drawer */}
      <AiTaskDrawer
        isOpen={isAiDrawerOpen}
        onClose={() => setIsAiDrawerOpen(false)}
        onAddTasks={handleAddBatchAiTasks}
      />
    </div>
  );
}
