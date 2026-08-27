"use client";

import { useState, useMemo } from "react";
import { Icon } from "@/lib/icons";
import { useI18n } from "@/lib/hooks/useI18n";
import { cn } from "@/lib/utils";

interface ShortcutGroup {
  category: string;
  shortcuts: {
    label: string;
    keys: string[];
    description: string;
  }[];
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    category: "Navigation & Recherche",
    shortcuts: [
      { label: "Recherche globale", keys: ["⌘", "K"], description: "Ouvre la barre de recherche rapide" },
      { label: "Palette de commandes", keys: ["⌘", "Shift", "P"], description: "Exécute n'importe quelle action ETHONE" },
      { label: "Fermer / Retour", keys: ["Esc"], description: "Ferme la modale, le menu ou la Dynamic Island" },
      { label: "Basculer la Sidebar", keys: ["⌘", "B"], description: "Affiche ou masque la barre latérale" },
    ],
  },
  {
    category: "Productivité & Fichiers",
    shortcuts: [
      { label: "Nouvel élément", keys: ["⌘", "N"], description: "Crée une nouvelle note, tâche ou email" },
      { label: "Enregistrer", keys: ["⌘", "S"], description: "Sauvegarde immédiate des modifications" },
      { label: "Annuler", keys: ["⌘", "Z"], description: "Rétablit l'action précédente" },
      { label: "Refaire", keys: ["⌘", "Shift", "Z"], description: "Répète l'action annulée" },
      { label: "Recharger la vue", keys: ["⌘", "R"], description: "Actualise les données synchronisées" },
    ],
  },
  {
    category: "Média & Soundscapes",
    shortcuts: [
      { label: "Lecture / Pause", keys: ["Space"], description: "Contrôle la lecture Spotify ou les ambiances" },
      { label: "Couper le son", keys: ["⌘", "M"], description: "Bascule le son en sourdine" },
      { label: "Piste suivante", keys: ["⌘", "→"], description: "Passe au morceau suivant" },
      { label: "Piste précédente", keys: ["⌘", "←"], description: "Revient au morceau précédent" },
    ],
  },
];

export default function ShortcutsSettings() {
  const [query, setQuery] = useState("");

  const filteredGroups = useMemo(() => {
    if (!query.trim()) return SHORTCUT_GROUPS;
    const q = query.toLowerCase();
    return SHORTCUT_GROUPS.map((group) => ({
      ...group,
      shortcuts: group.shortcuts.filter(
        (s) =>
          s.label.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.keys.some((k) => k.toLowerCase().includes(q))
      ),
    })).filter((group) => group.shortcuts.length > 0);
  }, [query]);

  return (
    <div className="flex flex-col gap-6">
      {/* Search Input for Shortcuts */}
      <div className="relative">
        <Icon
          name="magnifying-glass"
          className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un raccourci clavier..."
          className="w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] py-2.5 pl-10 pr-4 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
        />
      </div>

      {/* Shortcuts List by Categories */}
      <div className="flex flex-col gap-5">
        {filteredGroups.map((group) => (
          <div key={group.category} className="flex flex-col gap-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              {group.category}
            </h4>

            <div className="overflow-hidden rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] divide-y divide-[var(--panel-border)]/50">
              {group.shortcuts.map((shortcut) => (
                <div
                  key={shortcut.label}
                  className="flex items-center justify-between gap-4 p-3.5 hover:bg-[var(--surface-hover)]/30 transition-colors"
                >
                  <div>
                    <p className="text-xs font-semibold text-[var(--text-primary)]">
                      {shortcut.label}
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      {shortcut.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {shortcut.keys.map((k) => (
                      <kbd
                        key={k}
                        className="flex h-6 min-w-[24px] items-center justify-center rounded-lg border border-[var(--panel-border)] bg-[var(--surface-raised)] px-2 font-mono text-[11px] font-bold text-[var(--text-primary)] shadow-sm"
                      >
                        {k}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
