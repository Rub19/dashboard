"use client";

import { Sparkles, Plus } from "lucide-react";

export type TaskSuggestion = {
  title: string;
  category: string;
  priority: "low" | "medium" | "high" | "urgent";
};

const INITIAL_SUGGESTIONS: TaskSuggestion[] = [
  { title: "Revue de code Next.js", category: "Dev", priority: "high" },
  { title: "Vérifier PRs & Commits GitHub", category: "GitHub", priority: "medium" },
  { title: "Session Deep Work (45 min)", category: "Focus", priority: "urgent" },
  { title: "Exporter sauvegarde du profil", category: "Système", priority: "low" },
];

export { INITIAL_SUGGESTIONS };

export default function TaskSuggestionsBar({
  onSelect,
  suggestions = INITIAL_SUGGESTIONS,
}: {
  onSelect: (suggestion: TaskSuggestion) => void;
  suggestions?: TaskSuggestion[];
}) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto border-t border-white/[0.04] py-2 scrollbar-none">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 shrink-0">
        <Sparkles className="h-3.5 w-3.5 animate-pulse text-emerald-400" />
        <span>Suggérées :</span>
      </div>
      {suggestions.map((sug, idx) => (
        <button
          key={idx}
          type="button"
          onClick={() => onSelect(sug)}
          className="flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-xl border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-xs text-zinc-300 transition-all hover:border-white/20 hover:bg-white/[0.08] hover:text-white active:scale-95"
        >
          <Plus className="h-3 w-3 text-zinc-500" />
          <span>{sug.title}</span>
        </button>
      ))}
    </div>
  );
}
