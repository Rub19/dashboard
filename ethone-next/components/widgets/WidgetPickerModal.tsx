"use client";

import { useState, useMemo } from "react";
import { Search, Plus, Check, Sparkles, Star } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { Icon } from "@/lib/icons";
import { cn } from "@/lib/utils";
import {
  WIDGET_REGISTRY,
  WIDGET_CATEGORIES,
  type WidgetCategory,
  type WidgetManifest,
} from "@/lib/widget-registry";

export type WidgetPickerModalProps = {
  isOpen: boolean;
  onClose: () => void;
  activeWidgetIds: string[];
  onAddWidget: (widgetId: string) => void;
};

export default function WidgetPickerModal({
  isOpen,
  onClose,
  activeWidgetIds,
  onAddWidget,
}: WidgetPickerModalProps) {
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<WidgetCategory | "all" | "brain">("all");

  const activeSet = useMemo(() => new Set(activeWidgetIds), [activeWidgetIds]);

  const filteredWidgets = useMemo(() => {
    let list = Object.values(WIDGET_REGISTRY);

    if (selectedCategory === "brain") {
      list = list.filter((w) => (w.brainMatchScore || 0) >= 90);
    } else if (selectedCategory !== "all") {
      list = list.filter((w) => w.category === selectedCategory);
    }

    if (query.trim()) {
      const q = query.toLowerCase().trim();
      list = list.filter(
        (w) =>
          w.name.toLowerCase().includes(q) ||
          w.description.toLowerCase().includes(q) ||
          w.permissions.some((p) => p.toLowerCase().includes(q))
      );
    }

    return list;
  }, [query, selectedCategory]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Catalogue des Widgets (System 2.0)"
      description="Personnalisez votre espace avec des widgets intelligents et interactifs."
      size="lg"
      hideFooter
    >
      <div className="space-y-4 p-1">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un widget, une permission ou un service..."
            className="w-full rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/70 py-2.5 pl-10 pr-4 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--accent-primary)] focus:outline-none"
          />
        </div>

        {/* Categories Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs">
          <button
            type="button"
            onClick={() => setSelectedCategory("all")}
            className={cn(
              "shrink-0 rounded-xl px-3 py-1.5 font-semibold transition-all cursor-pointer",
              selectedCategory === "all"
                ? "bg-[var(--accent-primary)] text-[var(--accent-contrast)] shadow-xs"
                : "bg-[var(--surface-raised)]/40 text-[var(--text-muted)] hover:text-white"
            )}
          >
            Tous ({Object.keys(WIDGET_REGISTRY).length})
          </button>

          <button
            type="button"
            onClick={() => setSelectedCategory("brain")}
            className={cn(
              "shrink-0 flex items-center gap-1.5 rounded-xl px-3 py-1.5 font-semibold transition-all cursor-pointer",
              selectedCategory === "brain"
                ? "bg-purple-600 text-white shadow-xs"
                : "bg-purple-950/20 text-purple-300 hover:bg-purple-900/30"
            )}
          >
            <Sparkles className="h-3 w-3" />
            <span>Recommandés Brain</span>
          </button>

          {WIDGET_CATEGORIES.map((cat) => {
            const active = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  "shrink-0 rounded-xl px-3 py-1.5 font-semibold transition-all cursor-pointer",
                  active
                    ? "bg-[var(--accent-primary)] text-[var(--accent-contrast)] shadow-xs"
                    : "bg-[var(--surface-raised)]/40 text-[var(--text-muted)] hover:text-white"
                )}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Widgets Grid */}
        <div className="max-h-[50vh] overflow-y-auto os-scroll pr-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filteredWidgets.map((manifest) => {
            const isInstalled = activeSet.has(manifest.id);

            return (
              <div
                key={manifest.id}
                className={cn(
                  "flex flex-col justify-between rounded-2xl border p-4 transition-all",
                  isInstalled
                    ? "border-[var(--panel-border)] bg-[var(--surface-raised)]/30 opacity-75"
                    : "border-[var(--panel-border)]/80 bg-[var(--surface-raised)]/70 hover:border-[var(--accent-primary)]/50"
                )}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--accent-primary)]/15 text-[var(--accent-primary)]">
                        <Icon name={manifest.icon} className="h-4 w-4" />
                      </span>
                      <div>
                        <h4 className="text-xs font-bold text-[var(--text-primary)]">
                          {manifest.name}
                        </h4>
                        <span className="text-[10px] text-[var(--text-muted)]">
                          {manifest.author} · v{manifest.version}
                        </span>
                      </div>
                    </div>

                    {manifest.brainMatchScore && manifest.brainMatchScore >= 90 && (
                      <span className="flex items-center gap-1 rounded-md bg-purple-500/15 px-1.5 py-0.5 text-[9px] font-bold text-purple-300">
                        <Sparkles className="h-2.5 w-2.5" />
                        {manifest.brainMatchScore}%
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] leading-relaxed text-[var(--text-muted)]">
                    {manifest.description}
                  </p>

                  {/* Badges / Permissions */}
                  <div className="flex items-center gap-1 flex-wrap pt-1">
                    {manifest.realtime && (
                      <span className="rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-400">
                        Live Stream
                      </span>
                    )}
                    {manifest.permissions.map((p) => (
                      <span
                        key={p}
                        className="rounded-md bg-white/5 px-1.5 py-0.5 text-[9px] font-mono text-zinc-400"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Bottom action */}
                <div className="mt-4 flex items-center justify-end pt-2 border-t border-[var(--panel-border)]/40">
                  {isInstalled ? (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                      <Check className="h-3.5 w-3.5" />
                      Installé
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        onAddWidget(manifest.id);
                        onClose();
                      }}
                      className="flex items-center gap-1.5 rounded-xl bg-[var(--accent-primary)] px-3 py-1.5 text-xs font-bold text-[var(--accent-contrast)] hover:opacity-90 active:scale-95 transition-all cursor-pointer shadow-xs"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Ajouter
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}
