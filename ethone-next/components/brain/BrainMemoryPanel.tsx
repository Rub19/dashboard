"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  Search,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  AlertTriangle,
  Info,
  Shield,
  Sparkles,
} from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import {
  listBrainMemories,
  createBrainMemory,
  updateBrainMemory,
  removeBrainMemory,
  clearBrainMemories,
  type BrainMemory,
} from "@/lib/brain/memory";
import type { BrainMemoryCategory } from "@/lib/brain/preferences";
import { cn } from "@/lib/utils";
import Button from "@/components/ui/Button";

const MEMORY_CATEGORIES: { id: BrainMemoryCategory | "all"; label: string }[] = [
  { id: "all", label: "Toutes" },
  { id: "interface", label: "Interface & Style" },
  { id: "habits", label: "Habitudes & Routines" },
  { id: "spaces", label: "Workspaces" },
  { id: "flows", label: "Flows & Focus" },
  { id: "goals", label: "Objectifs" },
  { id: "task-types", label: "Tâches" },
];

export default function BrainMemoryPanel() {
  const { success, error: toastError } = useToast();
  const [memories, setMemories] = useState<BrainMemory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");

  // Add / Edit Modal State
  const [editingMemory, setEditingMemory] = useState<BrainMemory | null>(null);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newCategory, setNewCategory] = useState<BrainMemoryCategory>("habits");
  const [isAdding, setIsAdding] = useState(false);

  // Delete confirmation
  const [memoryToDelete, setMemoryToDelete] = useState<BrainMemory | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const fetchMemories = async () => {
    try {
      setLoading(true);
      const data = await listBrainMemories();
      setMemories(data);
    } catch {
      toastError("Impossible de charger les souvenirs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMemories();
  }, []);

  const filteredMemories = useMemo(() => {
    return memories.filter((m) => {
      const matchCat = activeCategory === "all" || m.category === activeCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        m.key.toLowerCase().includes(q) ||
        m.value.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [memories, activeCategory, searchQuery]);

  const handleSaveNew = async () => {
    if (!newKey.trim() || !newValue.trim()) {
      toastError("Veuillez renseigner un titre et un contenu.");
      return;
    }
    try {
      await createBrainMemory({
        category: newCategory,
        key: newKey.trim(),
        value: newValue.trim(),
        retentionDays: 90,
      });
      setIsAdding(false);
      setNewKey("");
      setNewValue("");
      fetchMemories();
      success("Souvenir enregistré dans la mémoire Brain !");
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : "Erreur de sauvegarde.");
    }
  };

  const handleUpdate = async () => {
    if (!editingMemory || !newValue.trim()) return;
    try {
      await updateBrainMemory(editingMemory.id, newValue.trim());
      setEditingMemory(null);
      setNewValue("");
      fetchMemories();
      success("Souvenir mis à jour avec succès.");
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : "Erreur lors de la mise à jour.");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await removeBrainMemory(id);
      setMemoryToDelete(null);
      fetchMemories();
      success("Souvenir supprimé.");
    } catch {
      toastError("Erreur lors de la suppression.");
    }
  };

  const handleClearAll = async () => {
    try {
      await clearBrainMemories();
      setShowClearConfirm(false);
      fetchMemories();
      success("Mémoire Brain réinitialisée.");
    } catch {
      toastError("Erreur lors de la réinitialisation.");
    }
  };

  return (
    <div className="h-full overflow-y-auto os-scroll p-4 sm:p-6 max-w-4xl mx-auto space-y-6 select-none">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--panel-border)]/60 pb-4">
        <div>
          <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Brain className="h-5 w-5 text-[var(--accent-primary)]" />
            <span>Centre de Mémoire Brain</span>
          </h3>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Préférences, routines et souvenirs explicites utilisés pour adapter vos interactions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="primary"
            onClick={() => {
              setIsAdding(true);
              setEditingMemory(null);
              setNewKey("");
              setNewValue("");
            }}
            leftIcon={<Plus className="h-3.5 w-3.5" />}
          >
            Nouveau souvenir
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowClearConfirm(true)}
            className="text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
          >
            Tout effacer
          </Button>
        </div>
      </div>

      {/* Privacy First Explanation Card */}
      <div className="flex items-start gap-3 rounded-2xl border border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/10 p-3.5 text-xs text-[var(--text-primary)]">
        <Shield className="h-4 w-4 text-[var(--accent-primary)] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-[var(--accent-primary)]">
            Transparence & Confidentialité Prioritaire
          </p>
          <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
            Brain mémorise uniquement les faits et habitudes utiles à votre productivité. Les clés de sécurité, mots de passe et données sensibles sont automatiquement bloqués. Vous gardez un contrôle total sur vos données.
          </p>
        </div>
      </div>

      {/* Search & Category Filter Bar */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher dans les souvenirs Brain..."
            className="w-full rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/50 py-2 pl-9.5 pr-4 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--accent-primary)] focus:outline-none"
          />
        </div>

        {/* Categories Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {MEMORY_CATEGORIES.map((cat) => {
            const active = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  "rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all touch-manipulation",
                  active
                    ? "bg-[var(--accent-primary)] text-[var(--accent-contrast)] shadow-sm"
                    : "border border-[var(--panel-border)]/60 bg-[var(--surface-raised)]/40 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
                )}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Memories Grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {filteredMemories.map((m) => (
          <motion.div
            key={m.id}
            layout
            className="group relative flex flex-col justify-between rounded-2xl border border-[var(--panel-border)]/60 bg-[var(--surface-raised)]/40 p-4 hover:border-[var(--panel-border)] transition-all shadow-sm"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="rounded-md bg-[var(--accent-primary)]/15 px-2 py-0.5 text-[9px] font-bold text-[var(--accent-primary)] uppercase tracking-wider">
                  {m.category}
                </span>
                <span className="text-[10px] text-[var(--text-muted)] font-mono">
                  {new Date(m.created_at).toLocaleDateString("fr-FR")}
                </span>
              </div>
              <h4 className="text-xs font-bold text-[var(--text-primary)] mb-1">
                {m.key}
              </h4>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed line-clamp-3">
                {m.value}
              </p>
            </div>

            {/* Actions footer */}
            <div className="mt-3 flex items-center justify-between pt-2 border-t border-[var(--panel-border)]/40">
              <span className="text-[10px] text-[var(--text-muted)] italic">
                Source : Utilisateur
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setEditingMemory(m);
                    setNewValue(m.value);
                  }}
                  className="p-1 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all"
                  title="Modifier"
                >
                  <Edit2 className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => setMemoryToDelete(m)}
                  className="p-1 rounded-lg hover:bg-rose-500/10 text-[var(--text-muted)] hover:text-rose-400 transition-all"
                  title="Supprimer"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}

        {!loading && filteredMemories.length === 0 && (
          <div className="col-span-full py-12 text-center space-y-2">
            <Sparkles className="mx-auto h-8 w-8 text-[var(--text-muted)] opacity-40" />
            <p className="text-xs font-medium text-[var(--text-muted)]">
              Aucun souvenir trouvé pour cette recherche.
            </p>
          </div>
        )}
      </div>

      {/* Add Memory Modal */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--bg-overlay)] backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-3xl border border-[var(--panel-border)] bg-[var(--bg-surface)] p-6 shadow-2xl space-y-4"
            >
              <h4 className="text-sm font-bold text-[var(--text-primary)]">
                Ajouter un souvenir à Brain
              </h4>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-[var(--text-primary)]">Catégorie</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as BrainMemoryCategory)}
                    className="mt-1 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)] px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none"
                  >
                    <option value="habits">Habitudes & Routines</option>
                    <option value="interface">Interface & Style</option>
                    <option value="spaces">Workspaces</option>
                    <option value="flows">Flows & Focus</option>
                    <option value="goals">Objectifs</option>
                    <option value="task-types">Tâches</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[var(--text-primary)]">Titre / Sujet</label>
                  <input
                    type="text"
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value)}
                    placeholder="Ex: Préférence thématique, horaire de travail"
                    className="mt-1 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)] px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[var(--text-primary)]">Contenu du souvenir</label>
                  <textarea
                    rows={3}
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    placeholder="Ex: L'utilisateur préfère travailler en session Focus de 45 minutes le matin."
                    className="mt-1 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)] p-3 text-xs text-[var(--text-primary)] focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={() => setIsAdding(false)}>
                  Annuler
                </Button>
                <Button variant="primary" onClick={handleSaveNew}>
                  Enregistrer
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Memory Modal */}
      <AnimatePresence>
        {editingMemory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--bg-overlay)] backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-3xl border border-[var(--panel-border)] bg-[var(--bg-surface)] p-6 shadow-2xl space-y-4"
            >
              <h4 className="text-sm font-bold text-[var(--text-primary)]">
                Modifier : {editingMemory.key}
              </h4>

              <div>
                <label className="text-xs font-semibold text-[var(--text-primary)]">Contenu</label>
                <textarea
                  rows={4}
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)] p-3 text-xs text-[var(--text-primary)] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={() => setEditingMemory(null)}>
                  Annuler
                </Button>
                <Button variant="primary" onClick={handleUpdate}>
                  Mettre à jour
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {memoryToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--bg-overlay)] backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm rounded-3xl border border-[var(--panel-border)] bg-[var(--bg-surface)] p-6 shadow-2xl space-y-4 text-center"
            >
              <AlertTriangle className="mx-auto h-8 w-8 text-rose-400" />
              <div>
                <h4 className="text-sm font-bold text-[var(--text-primary)]">
                  Supprimer ce souvenir ?
                </h4>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Brain n'utilisera plus cette information pour personnaliser ses réponses.
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 pt-2">
                <Button variant="ghost" onClick={() => setMemoryToDelete(null)}>
                  Annuler
                </Button>
                <button
                  type="button"
                  onClick={() => handleDelete(memoryToDelete.id)}
                  className="rounded-xl bg-rose-500 px-4 py-2 text-xs font-semibold text-white shadow-md hover:bg-rose-600"
                >
                  Supprimer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Clear All Confirmation Modal */}
      <AnimatePresence>
        {showClearConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--bg-overlay)] backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm rounded-3xl border border-[var(--panel-border)] bg-[var(--bg-surface)] p-6 shadow-2xl space-y-4 text-center"
            >
              <AlertTriangle className="mx-auto h-8 w-8 text-rose-400" />
              <div>
                <h4 className="text-sm font-bold text-[var(--text-primary)]">
                  Réinitialiser toute la mémoire ?
                </h4>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Cette action supprimera l'ensemble de vos souvenirs sauvegardés. Cette opération est irréversible.
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 pt-2">
                <Button variant="ghost" onClick={() => setShowClearConfirm(false)}>
                  Annuler
                </Button>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="rounded-xl bg-rose-500 px-4 py-2 text-xs font-semibold text-white shadow-md hover:bg-rose-600"
                >
                  Tout effacer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
