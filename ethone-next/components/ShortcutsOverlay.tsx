"use client";

import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/lib/icons";
import Modal from "@/components/ui/Modal";
import { useSettings } from "@/components/SettingsProvider";
import { useShortcuts } from "@/components/ShortcutsProvider";

const DOCK_LABELS: Record<string, string> = {
  home: "Accueil",
  notes: "Notes",
  tasks: "Tâches",
  calendar: "Calendrier",
  files: "Fichiers",
  bills: "Factures",
  activity: "Activité",
  interactions: "Interactions",
  connections: "Connexions",
  plugins: "Plugins",
  spaces: "Spaces",
  flows: "Flows",
  brain: "Brain",
  focus: "Focus",
  weather: "Météo",
  team: "Équipe",
  mail: "Mail",
  settings: "Paramètres",
};

const STATIC_GROUPS = [
  {
    label: "Command Center",
    icon: "command",
    shortcuts: [
      { keys: ["Ctrl", "K"], label: "Ouvrir Spotlight" },
      { keys: ["Esc"], label: "Fermer" },
    ],
  },
  {
    label: "Création rapide",
    icon: "plus-circle",
    shortcuts: [
      { keys: ["Ctrl", "Shift", "N"], label: "Nouvelle note" },
      { keys: ["Ctrl", "Shift", "T"], label: "Nouvelle tâche" },
      { keys: ["Ctrl", "Shift", "E"], label: "Nouvel événement calendrier" },
      { keys: ["Ctrl", "Shift", "S"], label: "Ouvrir/fermer le Brouillon rapide" },
    ],
  },
  {
    label: "Interface & Affichage",
    icon: "layout-dashboard",
    shortcuts: [
      { keys: ["Alt", "Z"], label: "Basculer le Mode minimal / par défaut" },
      { keys: ["Home"], label: "Aller en haut de la page" },
      { keys: ["End"], label: "Aller en bas de la page" },
    ],
  },
  {
    label: "Panneaux & overlays",
    icon: "panels-right-bottom",
    shortcuts: [
      { keys: ["Ctrl", "/"], label: "Raccourcis clavier (cette fenêtre)" },
      { keys: ["?"], label: "Ouvrir cette vue" },
      { keys: ["F2"], label: "Ouvrir Mission Control" },
      { keys: ["Esc"], label: "Fermer panneau / dialog ouvert" },
    ],
  },
];

function isEditable(target: EventTarget | null) {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}

export default function ShortcutsOverlay() {
  const [open, setOpen] = useState(false);
  const { settings } = useSettings();
  const { shortcuts } = useShortcuts();

  const groups = useMemo(() => {
    const dockShortcuts = settings.dockItems
      .map((id, i) => (DOCK_LABELS[id] ? { keys: [String(i + 1)], label: `Aller à ${DOCK_LABELS[id]}` } : null))
      .filter(Boolean) as { keys: string[]; label: string }[];

    const navigation = {
      label: "Navigation",
      icon: "navigation",
      shortcuts: [
        ...dockShortcuts,
        { keys: ["Ctrl", "K"], label: "Ouvrir le Command Center" },
        { keys: ["/"], label: "Ouvrir le Command Center (alternative)" },
        { keys: ["F2"], label: "Ouvrir Mission Control" },
        { keys: ["?"], label: "Ouvrir Mission Control (alternative)" },
      ],
    };

    const dynamicGroups = new Map<string, { label: string; icon: string; shortcuts: { keys: string[]; label: string }[] }>();
    for (const sc of shortcuts) {
      const existing = dynamicGroups.get(sc.group);
      if (existing) {
        existing.shortcuts.push({ keys: sc.keys, label: sc.label });
      } else {
        dynamicGroups.set(sc.group, {
          label: sc.group,
          icon: sc.groupIcon || sc.icon || "command",
          shortcuts: [{ keys: sc.keys, label: sc.label }],
        });
      }
    }

    return [navigation, ...STATIC_GROUPS, ...dynamicGroups.values()];
  }, [settings.dockItems, shortcuts]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && open) {
        event.preventDefault();
        setOpen(false);
      }
      if (isEditable(event.target)) return;
      if ((event.ctrlKey || event.metaKey) && event.key === "/") {
        event.preventDefault();
        setOpen((v) => !v);
      }
      if (event.key === "?" && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        setOpen(true);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <Modal
      isOpen={open}
      onClose={() => setOpen(false)}
      title="Raccourcis clavier"
      description="ETHONE"
      size="lg"
      hideFooter
      className="sm:max-w-3xl p-0"
      contentClassName="overflow-hidden"
    >
      <div className="grid max-h-[60vh] gap-4 overflow-y-auto p-5 sm:grid-cols-2">
              {groups.map((group) => (
                <section
                  key={group.label}
                  className="space-y-3 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4 backdrop-blur-[var(--panel-blur)]"
                >
                  <header className="flex items-center gap-2 text-sm font-semibold text-[var(--accent)]">
                    <Icon name={group.icon} className="h-4 w-4" />
                    {group.label}
                  </header>
                  <div className="space-y-2.5">
                    {group.shortcuts.map((shortcut, i) => (
                      <div key={i} className="flex items-start justify-between gap-3 text-xs">
                        <span className="text-[var(--muted)]">{shortcut.label}</span>
                        <span className="flex shrink-0 items-center gap-1">
                          {shortcut.keys.map((key, j) => (
                            <span key={j}>
                              <kbd className="rounded bg-[var(--panel-bg)] px-1.5 py-0.5 text-[10px] text-[var(--foreground)]">
                                {key}
                              </kbd>
                              {j < shortcut.keys.length - 1 && <span className="text-[var(--muted)]">+</span>}
                            </span>
                          ))}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
            <footer className="flex items-center justify-center gap-2 border-t border-[var(--panel-border)] p-3 text-xs text-[var(--muted)]">
              <kbd className="rounded bg-[var(--panel-bg)] px-1 py-0.5">Ctrl</kbd>
              <span>+</span>
              <kbd className="rounded bg-[var(--panel-bg)] px-1 py-0.5">/</kbd>
              <span>pour ouvrir / fermer cette vue</span>
            </footer>
    </Modal>
  );
}
