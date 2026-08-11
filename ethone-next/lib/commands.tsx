"use client";

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSettings } from "@/components/SettingsProvider";
import type { Settings } from "@/lib/settings";
import { useAuth } from "@/components/AuthProvider";
import { useUserData } from "@/lib/hooks/useUserData";
import { useWindowManager } from "@/components/WindowManagerProvider";
import { useProfiles } from "@/lib/hooks/useProfiles";
import { PRESETS } from "@/lib/presets";
import { Icon } from "@/lib/icons";

export type CommandItem = {
  id: string;
  label: string;
  category: string;
  icon?: React.ReactNode;
  shortcut?: string;
  action: () => void;
};

const LANGUAGES = ["fr", "en", "es", "de"];
const ACCENTS = ["violet", "mint", "sky", "amber", "rose", "teal", "coral"];
const DOCK_SCALES = [20, 50, 80];

function cycle<T>(arr: T[], current: T): T {
  const index = arr.indexOf(current);
  return arr[(index + 1) % arr.length];
}

export function useCommandItems(setOpen: (v: boolean) => void): CommandItem[] {
  const router = useRouter();
  const { settings, update } = useSettings();
  const { signOut } = useAuth();
  const { items: macros } = useUserData("macro");
  const { openWindow, toggleMissionControl } = useWindowManager();
  const { select, profiles } = useProfiles();

  const navigate = useCallback(
    (href: string) => {
      router.push(href);
      setOpen(false);
    },
    [router, setOpen]
  );

  const open = useCallback(
    (href: string, title: string) => {
      openWindow(href, title);
      setOpen(false);
    },
    [openWindow, setOpen]
  );

  const activateSpace = useCallback(
    (workspace: "personal" | "focus" | "studio") => {
      const p = profiles.find((x) => x.workspace === workspace) || profiles[0];
      if (p) select(p.id).catch(() => {});
      else navigate("/profile-selection/");
    },
    [profiles, select, navigate]
  );

  const toggleBrainMemory = useCallback(() => {
    const allEnabled = Object.values(settings.brainMemoryCategories).every(Boolean);
    const next = Object.fromEntries(
      Object.keys(settings.brainMemoryCategories).map((k) => [k, !allEnabled])
    ) as typeof settings.brainMemoryCategories;
    update({ brainMemoryCategories: next });
  }, [settings, update]);

  const cycleDockScale = useCallback(() => {
    const current = DOCK_SCALES.find((s) => s >= settings.dockRadius) ?? settings.dockRadius;
    const next = cycle(DOCK_SCALES, current);
    update({ dockRadius: next });
  }, [settings.dockRadius, update]);

  const cycleAccent = useCallback(() => {
    update({ accentColor: cycle(ACCENTS, settings.accentColor) as Settings["accentColor"] });
  }, [settings, update]);

  const cycleLanguage = useCallback(() => {
    update({ language: cycle(LANGUAGES, settings.language) });
  }, [settings, update]);

  const setDensity = useCallback(
    (mode: Settings["densityMode"]) => update({ densityMode: mode }),
    [update]
  );

  const applyPreset = useCallback(
    (id: string) => {
      const preset = PRESETS.find((p) => p.id === id);
      if (preset) update({ ...preset.settings });
    },
    [update]
  );

  const macroCommands: CommandItem[] = useMemo(
    () =>
      macros.map((m) => {
        const data = m.data as { action?: string; href?: string; setting?: string };
        return {
          id: `macro-${m.id}`,
          label: m.label,
          category: "Macros",
          icon: <Icon name="workflow" className="h-4 w-4" />,
          action: () => {
            if (data.action === "navigate" && data.href) navigate(data.href);
            if (data.action === "toggle" && data.setting) {
              if (data.setting === "brainEnabled") update({ brainEnabled: !settings.brainEnabled });
              if (data.setting === "darkMode") update({ darkMode: !settings.darkMode });
            }
          },
        };
      }),
    [macros, navigate, settings.brainEnabled, settings.darkMode, update]
  );

  return useMemo<CommandItem[]>(() => {
    const navigateCmd = (id: string, label: string, href: string, icon: string, shortcut?: string, category = "Navigation"): CommandItem => ({
      id,
      label,
      category,
      icon: <IconPlaceholder name={icon} />,
      shortcut,
      action: () => navigate(href),
    });

    return [
      navigateCmd("home.open", "Accueil", "/", "home", "H"),
      navigateCmd("activity.open", "Activity Hub", "/activity/", "activity"),
      navigateCmd("connections.open", "Connexions", "/connections/", "plug"),
      navigateCmd("spaces.open", "Spaces", "/spaces/", "layout-grid"),
      navigateCmd("flows.open", "Flows", "/flows/", "workflow"),
      { id: "mission.open", label: "Mission Control", category: "Système", icon: <IconPlaceholder name="layout-dashboard" />, action: () => { toggleMissionControl(); setOpen(false); } },
      navigateCmd("notes.open", "Notes", "/notes/", "notebook-pen"),
      navigateCmd("tasks.open", "Tâches", "/tasks/", "circle-check"),
      navigateCmd("calendar.open", "Agenda", "/calendar/", "calendar-days"),
      navigateCmd("files.open", "Fichiers", "/files/", "folder"),
      navigateCmd("interactions.open", "Interactions", "/interactions/", "flame"),
      navigateCmd("brain.open", "Brain", "/brain/", "brain"),
      navigateCmd("team.open", "Équipe", "/team/", "users"),
      navigateCmd("mail.open", "Mail", "/mail/", "mail"),
      navigateCmd("settings.open", "Réglages", "/settings/", "settings"),
      navigateCmd("changelog.open", "Notes de version", "/changelog/", "badge-check"),
      navigateCmd("profiles.open", "Changer de profil", "/profile-selection/", "layout-grid"),
      navigateCmd("security.open", "Sécurité", "/security/", "shield-check"),
      navigateCmd("marketplace.open", "Marketplace", "/connections/", "store"),
      navigateCmd("widgets.open", "Widgets", "/", "panels-top-left"),

      { id: "notes.new", label: "Nouvelle note", category: "Créer", icon: <IconPlaceholder name="file-plus-2" />, action: () => navigate("/notes/") },
      { id: "tasks.new", label: "Nouvelle tâche", category: "Créer", icon: <IconPlaceholder name="list-plus" />, action: () => navigate("/tasks/") },
      { id: "calendar.new", label: "Nouvel événement", category: "Créer", icon: <IconPlaceholder name="calendar-plus" />, action: () => navigate("/calendar/") },
      { id: "files.new-link", label: "Ajouter un lien", category: "Créer", icon: <IconPlaceholder name="link-2" />, action: () => navigate("/files/?add=link") },
      { id: "brain.note", label: "Capturer une note", category: "Créer", icon: <IconPlaceholder name="file-plus-2" />, action: () => navigate("/notes/") },
      { id: "mail.compose", label: "Nouveau mail", category: "Créer", icon: <IconPlaceholder name="mail-plus" />, action: () => navigate("/mail/") },
      { id: "files.upload", label: "Uploader un fichier", category: "Créer", icon: <IconPlaceholder name="upload" />, action: () => navigate("/files/") },
      { id: "new-interaction", label: "Nouvelle interaction", category: "Créer", icon: <IconPlaceholder name="interactions" />, action: () => navigate("/interactions/") },
      { id: "new-task", label: "Nouvelle tâche (raccourci)", category: "Créer", icon: <IconPlaceholder name="plus" />, shortcut: "T", action: () => navigate("/tasks/") },

      { id: "open-notes", label: "Notes (fenêtre)", category: "Fenêtres", icon: <IconPlaceholder name="app-window" />, action: () => open("/notes/", "Notes") },
      { id: "open-tasks", label: "Tâches (fenêtre)", category: "Fenêtres", icon: <IconPlaceholder name="app-window" />, action: () => open("/tasks/", "Tâches") },
      { id: "open-mail", label: "Mail (fenêtre)", category: "Fenêtres", icon: <IconPlaceholder name="app-window" />, action: () => open("/mail/", "Mail") },
      { id: "open-bills", label: "Factures (fenêtre)", category: "Fenêtres", icon: <IconPlaceholder name="app-window" />, action: () => open("/bills/", "Factures") },

      { id: "space.personal", label: "Space Personnel", category: "Spaces", icon: <IconPlaceholder name="user-round" />, action: () => activateSpace("personal") },
      { id: "space.focus", label: "Space Focus", category: "Spaces", icon: <IconPlaceholder name="focus" />, action: () => activateSpace("focus") },
      { id: "space.studio", label: "Space Studio", category: "Spaces", icon: <IconPlaceholder name="sparkles" />, action: () => activateSpace("studio") },

      { id: "preset.productivity", label: "Preset Productivité", category: "Presets", icon: <IconPlaceholder name="circle-check" />, action: () => applyPreset("productivity") },
      { id: "preset.focus", label: "Preset Focus", category: "Presets", icon: <IconPlaceholder name="focus" />, action: () => applyPreset("focus") },
      { id: "preset.gaming", label: "Preset Gaming", category: "Presets", icon: <IconPlaceholder name="gamepad-2" />, action: () => applyPreset("gaming") },
      { id: "preset.creative", label: "Preset Créatif", category: "Presets", icon: <IconPlaceholder name="sparkles" />, action: () => applyPreset("creative") },
      { id: "preset.minimal", label: "Preset Minimal", category: "Presets", icon: <IconPlaceholder name="minimize-2" />, action: () => applyPreset("minimal") },
      { id: "preset.developer", label: "Preset Développement", category: "Presets", icon: <IconPlaceholder name="code" />, action: () => applyPreset("developer") },

      { id: "density.automatic", label: "Densité automatique", category: "Réglages", icon: <IconPlaceholder name="wand-sparkles" />, action: () => setDensity("automatic") },
      { id: "density.spacious", label: "Densité spacieuse", category: "Réglages", icon: <IconPlaceholder name="maximize-2" />, action: () => setDensity("spacious") },
      { id: "density.comfortable", label: "Densité confortable", category: "Réglages", icon: <IconPlaceholder name="panel-top" />, action: () => setDensity("comfortable") },
      { id: "density.compact", label: "Densité compacte", category: "Réglages", icon: <IconPlaceholder name="rows-3" />, action: () => setDensity("compact") },
      { id: "density.ultra", label: "Densité ultra-compacte", category: "Réglages", icon: <IconPlaceholder name="list-collapse" />, action: () => setDensity("ultra") },
      { id: "density.custom", label: "Densité personnalisée", category: "Réglages", icon: <IconPlaceholder name="sliders-horizontal" />, action: () => setDensity("custom") },

      { id: "theme.toggle", label: settings.darkMode ? "Passer en clair" : "Passer en sombre", category: "Réglages", icon: <IconPlaceholder name={settings.darkMode ? "sun" : "moon"} />, action: () => update({ darkMode: !settings.darkMode }) },
      { id: "appearance.cycle", label: "Changer l'accent", category: "Réglages", icon: <IconPlaceholder name="palette" />, action: cycleAccent },
      { id: "locale.cycle", label: "Changer de langue", category: "Réglages", icon: <IconPlaceholder name="languages" />, action: cycleLanguage },
      { id: "dock.scale", label: "Taille du Dock", category: "Réglages", icon: <IconPlaceholder name="dock" />, action: cycleDockScale },
      { id: "sidebar.toggle", label: "Basculer la barre latérale", category: "Réglages", icon: <IconPlaceholder name="panel-left" />, action: () => update({ sidebarVisible: !settings.sidebarVisible }) },
      { id: "sound.toggle", label: settings.masterVolume ? "Couper le son" : "Activer le son", category: "Réglages", icon: <IconPlaceholder name="volume-2" />, action: () => update({ masterVolume: !settings.masterVolume }) },
      { id: "brain.memory.toggle", label: "Basculer la mémoire Brain", category: "Brain", icon: <IconPlaceholder name="bookmark-check" />, action: toggleBrainMemory },
      { id: "zen.toggle", label: "Mode Zen", category: "Navigation", icon: <IconPlaceholder name="minimize-2" />, action: () => update({ layoutPreset: settings.layoutPreset === "minimal" ? "default" : "minimal" }) },
      { id: "dock.edit", label: "Personnaliser le Dock", category: "Réglages", icon: <IconPlaceholder name="sliders-horizontal" />, action: () => navigate("/settings/") },

      { id: "focus.pomodoro", label: "Démarrer Pomodoro (25 min)", category: "Focus", icon: <IconPlaceholder name="timer" />, action: () => navigate("/focus/") },
      { id: "focus.deep", label: "Démarrer Deep Work (50 min)", category: "Focus", icon: <IconPlaceholder name="brain" />, action: () => navigate("/focus/") },
      { id: "focus.stop", label: "Arrêter le Focus", category: "Focus", icon: <IconPlaceholder name="square" />, action: () => navigate("/focus/") },

      { id: "ambience.rain", label: "Ambiance : Pluie", category: "Ambiance", icon: <IconPlaceholder name="cloud-rain" />, action: () => update({ soundPack: "liquid", soundEffects: true, masterVolume: true }) },
      { id: "ambience.pink", label: "Ambiance : Bruit rose", category: "Ambiance", icon: <IconPlaceholder name="sparkles" />, action: () => update({ soundPack: "minimal", soundEffects: true, masterVolume: true }) },
      { id: "ambience.stop", label: "Arrêter l'ambiance", category: "Ambiance", icon: <IconPlaceholder name="volume-x" />, action: () => update({ soundEffects: false }) },

      { id: "sync.refresh", label: "Synchroniser maintenant", category: "Système", icon: <IconPlaceholder name="cloud-cog" />, action: () => window.location.reload() },
      { id: "signout", label: "Se déconnecter", category: "Compte", icon: <IconPlaceholder name="logout" />, action: () => signOut().then(() => navigate("/login")) },

      ...macroCommands,
    ];
  }, [
    settings,
    navigate,
    open,
    applyPreset,
    setDensity,
    cycleAccent,
    cycleLanguage,
    cycleDockScale,
    toggleBrainMemory,
    activateSpace,
    toggleMissionControl,
    setOpen,
    update,
    signOut,
    macroCommands,
  ]);
}

function IconPlaceholder({ name }: { name: string }) {
  return <Icon name={name} className="h-4 w-4" />;
}
