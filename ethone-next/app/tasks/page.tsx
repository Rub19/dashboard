"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Plus,
  Sparkles,
  Search,
  Filter,
  Flame,
  Clock,
  ListFilter,
  LayoutList,
  Kanban,
  Zap,
  Tag,
  ArrowUpDown,
  Brain,
  Calendar,
  Layers,
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
  const { items, loading, create, update, remove } = useCloudTasks();
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

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between shrink-0">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">Tâches & Objectifs</h1>
            <span className="rounded-full border border-purple-500/30 bg-purple-500/10 px-2.5 py-0.5 font-mono text-[10px] font-bold text-purple-400">
              {stats.total} actives
            </span>
          </div>
          <p className="mt-1 text-xs text-zinc-400">
            Organisez, priorisez et automatisez votre productivité quotidienne.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsAiDrawerOpen(true)}
            className="flex items-center gap-2 rounded-2xl border border-purple-500/40 bg-purple-500/15 px-3.5 py-2 text-xs font-bold text-purple-300 shadow-[0_0_20px_rgba(168,85,247,0.2)] transition-all hover:bg-purple-500/25 hover:scale-105 active:scale-95 cursor-pointer"
          >
            <Sparkles className="h-4 w-4 text-purple-400" />
            <span>Assistant & Suggestions IA</span>
          </button>

          {/* View Toggle */}
          <div className="flex items-center rounded-2xl border border-white/10 bg-white/5 p-1">
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-xl transition-colors",
                viewMode === "list" ? "bg-white/15 text-white" : "text-zinc-400 hover:text-white"
              )}
              title="Vue Liste"
            >
              <LayoutList className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("kanban")}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-xl transition-colors",
                viewMode === "kanban" ? "bg-white/15 text-white" : "text-zinc-400 hover:text-white"
              )}
              title="Vue Kanban"
            >
              <Kanban className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 shrink-0">
        <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#0c0d14]/80 p-3.5 backdrop-blur-xl">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Total Tâches</p>
            <p className="text-xl font-bold text-white mt-0.5">{stats.total}</p>
          </div>
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-300">
            <Layers className="h-4 w-4" />
          </span>
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-3.5 backdrop-blur-xl">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">En cours</p>
            <p className="text-xl font-bold text-cyan-300 mt-0.5">{stats.open}</p>
          </div>
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-400">
            <Clock className="h-4 w-4" />
          </span>
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3.5 backdrop-blur-xl">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Prioritaires</p>
            <p className="text-xl font-bold text-amber-300 mt-0.5">{stats.urgentOrHigh}</p>
          </div>
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400">
            <Flame className="h-4 w-4" />
          </span>
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3.5 backdrop-blur-xl">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Progression</p>
            <p className="text-xl font-bold text-emerald-300 mt-0.5">{stats.percent}%</p>
          </div>
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
          </span>
        </div>
      </div>

      {/* Quick Add Bar */}
      <form
        onSubmit={handleQuickAdd}
        className="flex flex-col gap-2 rounded-2xl border border-white/15 bg-[#0c0d14]/90 p-2.5 backdrop-blur-2xl shadow-xl sm:flex-row sm:items-center shrink-0"
      >
        <div className="relative flex-1">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Ajouter une nouvelle tâche rapide (ex: Finaliser la doc API)..."
            className="w-full bg-transparent px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-2 px-1">
          {/* Category Picker */}
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className="rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 font-mono text-xs text-zinc-300 outline-none cursor-pointer hover:bg-white/10"
          >
            {CATEGORIES.filter((c) => c !== "Tous").map((c) => (
              <option key={c} value={c} className="bg-[#0c0d14] text-white">
                {c}
              </option>
            ))}
          </select>

          {/* Priority Picker */}
          <select
            value={newPriority}
            onChange={(e) => setNewPriority(e.target.value as TaskPriority)}
            className="rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 font-mono text-xs text-zinc-300 outline-none cursor-pointer hover:bg-white/10"
          >
            <option value="low" className="bg-[#0c0d14] text-white">Basse</option>
            <option value="medium" className="bg-[#0c0d14] text-white">Moyenne</option>
            <option value="high" className="bg-[#0c0d14] text-white">Haute</option>
            <option value="urgent" className="bg-[#0c0d14] text-white">Urgente</option>
          </select>

          {/* Submit */}
          <button
            type="submit"
            disabled={!newTitle.trim()}
            className="flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-1.5 text-xs font-bold text-black shadow-md transition-all hover:bg-zinc-200 active:scale-95 disabled:opacity-40 disabled:pointer-events-none cursor-pointer shrink-0"
          >
            <Plus className="h-4 w-4 stroke-[3]" />
            <span>Ajouter</span>
          </button>
        </div>
      </form>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between shrink-0">
        {/* Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto os-scroll pb-1 sm:pb-0">
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
                "rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer",
                activeTab === tab.id
                  ? "border border-white/20 bg-white/15 text-white shadow-sm"
                  : "text-zinc-400 hover:bg-white/5 hover:text-white"
              )}
            >
              {tab.label} <span className="opacity-60 text-[10px] font-mono">({tab.count})</span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher une tâche..."
            className="w-full rounded-xl border border-white/10 bg-white/5 pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-white/20"
          />
        </div>
      </div>

      {/* Main View Area */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {viewMode === "kanban" ? (
          <TasksKanbanView
            tasks={filteredTasks as Task[]}
            onToggle={handleToggleTask}
            onDelete={handleDeleteTask}
            onNewTask={() => setIsAiDrawerOpen(true)}
          />
        ) : (
          <div className="h-full min-h-0 overflow-y-auto os-scroll pr-1 space-y-2.5 pb-6">
            <AnimatePresence mode="popLayout" initial={false}>
              {filteredTasks.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  className="flex flex-col items-center justify-center rounded-3xl border border-white/10 bg-[#0c0d14]/50 p-12 text-center backdrop-blur-2xl"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-zinc-400 mb-3">
                    <CheckCircle2 className="h-7 w-7" />
                  </div>
                  <h3 className="text-base font-bold text-white">Aucune tâche correspondante</h3>
                  <p className="text-xs text-zinc-400 max-w-sm mt-1">
                    {searchQuery ? "Aucune tâche ne correspond à votre recherche." : "Votre liste est vide. Utilisez l'IA pour générer votre sprint du jour !"}
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsAiDrawerOpen(true)}
                    className="mt-4 flex items-center gap-2 rounded-2xl bg-purple-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-purple-600/30 transition-all hover:bg-purple-500 active:scale-95 cursor-pointer"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Générer un plan avec l&apos;IA</span>
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
