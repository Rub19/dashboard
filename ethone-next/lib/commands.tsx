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
import { PLUGINS } from "@/lib/plugins";
import { Icon } from "@/lib/icons";
import { useFocus } from "@/components/FocusProvider";
import { activityJournal } from "@/lib/activity-journal";

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
const AURAS = ["classic", "boreal", "cyberpunk", "eclipse", "emerald", "mineral"];
const WALLPAPERS: Settings["wallpaper"][] = ["none", "aurora", "nebula", "mesh", "noise", "grain", "mineral"];
const SESSION_MODES: Settings["sessionMode"][] = ["default", "focus", "intense", "zen", "night"];

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
  const { start, stop } = useFocus();

  const navigate = useCallback(
    (href: string) => {
      router.push(href);
      setOpen(false);
    },
    [router, setOpen]
  );

  const open = useCallback(
    (href: string, title: string) => {
      openWindow(title, href);
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

  const cycleAura = useCallback(() => {
    update({ aura: cycle(AURAS, settings.aura) });
  }, [settings.aura, update]);

  const cycleWallpaper = useCallback(() => {
    update({ wallpaper: cycle(WALLPAPERS, settings.wallpaper) });
  }, [settings.wallpaper, update]);

  const cycleSessionMode = useCallback(() => {
    update({ sessionMode: cycle(SESSION_MODES, settings.sessionMode) });
  }, [settings.sessionMode, update]);

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

  const startFocus = useCallback(
    (preset: string) => {
      start(preset);
      if (["pomodoro", "deep", "sprint", "quick"].includes(preset)) {
        update({ focusPreset: preset });
      }
      setOpen(false);
      router.push("/focus/");
    },
    [start, update, setOpen, router]
  );

  const stopFocus = useCallback(() => {
    stop();
    setOpen(false);
  }, [stop, setOpen]);

  const toggleBrain = useCallback(() => {
    update({ brainEnabled: !settings.brainEnabled });
  }, [settings.brainEnabled, update]);

  const toggleAura = useCallback(() => {
    update({ ambientEffectsEnabled: !settings.ambientEffectsEnabled });
  }, [settings.ambientEffectsEnabled, update]);

  const toggleDock = useCallback(() => {
    update({ dockVisible: !settings.dockVisible });
  }, [settings.dockVisible, update]);

  const toggleZen = useCallback(() => {
    update({ zenMode: !settings.zenMode });
  }, [settings.zenMode, update]);

  const toggleStatusBar = useCallback(() => {
    const bar =
      typeof document !== "undefined"
        ? (document.querySelector("[data-v8-status-bar]") as HTMLElement | null)
        : null;
    if (bar) {
      bar.style.display = bar.style.display === "none" ? "" : "none";
    }
    setOpen(false);
  }, [setOpen]);

  const openNotificationCenter = useCallback(() => {
    setOpen(false);
    window.dispatchEvent(new CustomEvent("v8:open-notifications"));
  }, [setOpen]);

  const syncActivity = useCallback(() => {
    setOpen(false);
    activityJournal.sync().catch(() => {});
  }, [setOpen]);

  const refreshNetwork = useCallback(() => {
    window.location.reload();
  }, []);

  const exportPresets = useCallback(() => {
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ethone-settings-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setOpen(false);
  }, [settings, setOpen]);

  const importPresets = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        if (parsed && typeof parsed === "object") {
          update(parsed as Partial<Settings>);
        }
      } catch {
        /* invalid import ignored */
      }
      setOpen(false);
    };
    input.click();
  }, [update, setOpen]);

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

    const openCmd = (id: string, label: string, href: string, icon: string, category: string): CommandItem => ({
      id,
      label,
      category,
      icon: <IconPlaceholder name={icon} />,
      action: () => open(href, label),
    });

    return [
      // Navigation
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
      navigateCmd("mail.open", "Mail", "/mail/", "mail", "M"),
      navigateCmd("settings.open", "Réglages", "/settings/", "settings", "S"),
      navigateCmd("changelog.open", "Notes de version", "/changelog/", "badge-check"),
      navigateCmd("profiles.open", "Changer de profil", "/profile-selection/", "layout-grid"),
      navigateCmd("security.open", "Sécurité", "/security/", "shield-check"),
      navigateCmd("marketplace.open", "Marketplace", "/connections/", "store"),
      navigateCmd("widgets.open", "Widgets", "/", "panels-top-left"),
      navigateCmd("bills.open", "Factures", "/bills/", "receipt", undefined, "Facturation"),
      navigateCmd("rss.open", "Flux RSS", "/rss/", "rss", undefined, "RSS"),
      navigateCmd("scratchpad.open", "Brouillon rapide", "/scratchpad/", "sticky-note", undefined, "Scratchpad"),
      navigateCmd("matches.open", "Matchs", "/matches/", "trophy", undefined, "Matchs"),
      navigateCmd("drop.open", "Drops", "/drop/", "upload", undefined, "Drops"),
      navigateCmd("system.open", "Système", "/system/", "monitor", undefined, "Système"),
      navigateCmd("weather.open", "Météo", "/weather/", "cloud-sun", undefined, "Météo"),
      navigateCmd("macros.open", "Macros", "/macros/", "workflow", undefined, "Macros"),
      navigateCmd("plugins.open", "Plugins", "/plugins/", "plug", undefined, "Plugins"),

      // Créer
      { id: "notes.new", label: "Nouvelle note", category: "Créer", icon: <IconPlaceholder name="file-plus-2" />, action: () => navigate("/notes/") },
      { id: "tasks.new", label: "Nouvelle tâche", category: "Créer", icon: <IconPlaceholder name="list-plus" />, action: () => navigate("/tasks/") },
      { id: "calendar.new", label: "Nouvel événement", category: "Créer", icon: <IconPlaceholder name="calendar-plus" />, action: () => navigate("/calendar/") },
      { id: "files.new-link", label: "Ajouter un lien", category: "Créer", icon: <IconPlaceholder name="link-2" />, action: () => navigate("/files/?add=link") },
      { id: "brain.note", label: "Capturer une note", category: "Créer", icon: <IconPlaceholder name="file-plus-2" />, action: () => navigate("/notes/") },
      { id: "mail.compose", label: "Nouveau mail", category: "Créer", icon: <IconPlaceholder name="mail-plus" />, action: () => navigate("/mail/") },
      { id: "files.upload", label: "Uploader un fichier", category: "Créer", icon: <IconPlaceholder name="upload" />, action: () => navigate("/files/") },
      { id: "new-interaction", label: "Nouvelle interaction", category: "Créer", icon: <IconPlaceholder name="interactions" />, action: () => navigate("/interactions/") },
      { id: "new-task", label: "Nouvelle tâche (raccourci)", category: "Créer", icon: <IconPlaceholder name="plus" />, shortcut: "T", action: () => navigate("/tasks/") },
      { id: "billing.new", label: "Nouvelle facture", category: "Créer", icon: <IconPlaceholder name="receipt" />, action: () => navigate("/bills/") },
      { id: "drop.create", label: "Créer un drop", category: "Créer", icon: <IconPlaceholder name="share-2" />, action: () => navigate("/drop/") },

      // Fenêtres
      { id: "open-notes", label: "Notes (fenêtre)", category: "Fenêtres", icon: <IconPlaceholder name="app-window" />, action: () => open("/notes/", "Notes") },
      { id: "open-tasks", label: "Tâches (fenêtre)", category: "Fenêtres", icon: <IconPlaceholder name="app-window" />, action: () => open("/tasks/", "Tâches") },
      { id: "open-mail", label: "Mail (fenêtre)", category: "Fenêtres", icon: <IconPlaceholder name="app-window" />, action: () => open("/mail/", "Mail") },
      { id: "open-bills", label: "Factures (fenêtre)", category: "Fenêtres", icon: <IconPlaceholder name="app-window" />, action: () => open("/bills/", "Factures") },

      // Spaces
      { id: "space.personal", label: "Space Personnel", category: "Spaces", icon: <IconPlaceholder name="user-round" />, action: () => activateSpace("personal") },
      { id: "space.focus", label: "Space Focus", category: "Spaces", icon: <IconPlaceholder name="focus" />, action: () => activateSpace("focus") },
      { id: "space.studio", label: "Space Studio", category: "Spaces", icon: <IconPlaceholder name="sparkles" />, action: () => activateSpace("studio") },

      // Presets
      { id: "preset.productivity", label: "Preset Productivité", category: "Presets", icon: <IconPlaceholder name="circle-check" />, action: () => applyPreset("productivity") },
      { id: "preset.focus", label: "Preset Focus", category: "Presets", icon: <IconPlaceholder name="focus" />, action: () => applyPreset("focus") },
      { id: "preset.gaming", label: "Preset Gaming", category: "Presets", icon: <IconPlaceholder name="gamepad-2" />, action: () => applyPreset("gaming") },
      { id: "preset.creative", label: "Preset Créatif", category: "Presets", icon: <IconPlaceholder name="sparkles" />, action: () => applyPreset("creative") },
      { id: "preset.minimal", label: "Preset Minimal", category: "Presets", icon: <IconPlaceholder name="minimize-2" />, action: () => applyPreset("minimal") },
      { id: "preset.developer", label: "Preset Développement", category: "Presets", icon: <IconPlaceholder name="code" />, action: () => applyPreset("developer") },
      { id: "presets.export", label: "Exporter les réglages", category: "Presets", icon: <IconPlaceholder name="download" />, action: exportPresets },
      { id: "presets.import", label: "Importer les réglages", category: "Presets", icon: <IconPlaceholder name="upload" />, action: importPresets },

      // Réglages
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
      { id: "dock.edit", label: "Personnaliser le Dock", category: "Réglages", icon: <IconPlaceholder name="sliders-horizontal" />, action: () => navigate("/settings/") },
      { id: "aura.cycle", label: "Cycle Aura", category: "Réglages", icon: <IconPlaceholder name="sparkles" />, action: cycleAura },
      { id: "wallpaper.cycle", label: "Cycle fond d'écran", category: "Réglages", icon: <IconPlaceholder name="image" />, action: cycleWallpaper },
      { id: "session.cycle", label: "Cycle mode de session", category: "Réglages", icon: <IconPlaceholder name="coffee" />, action: cycleSessionMode },
      { id: "aura.toggle", label: "Basculer l'aura", category: "Réglages", icon: <IconPlaceholder name="moon-star" />, action: toggleAura },
      { id: "dock.toggle", label: "Basculer le Dock", category: "Réglages", icon: <IconPlaceholder name="dock" />, action: toggleDock },
      { id: "statusbar.toggle", label: "Basculer la barre de statut", category: "Réglages", icon: <IconPlaceholder name="activity" />, action: toggleStatusBar },

      // Brain
      { id: "brain.memory.toggle", label: "Basculer la mémoire Brain", category: "Brain", icon: <IconPlaceholder name="bookmark-check" />, action: toggleBrainMemory },
      { id: "brain.toggle", label: "Basculer Brain", category: "Brain", icon: <IconPlaceholder name="brain" />, action: toggleBrain },

      // Navigation / mode
      { id: "zen.toggle", label: "Mode Zen", category: "Navigation", icon: <IconPlaceholder name="minimize-2" />, action: toggleZen },

      // Focus
      { id: "focus.pomodoro", label: "Démarrer Pomodoro (25 min)", category: "Focus", icon: <IconPlaceholder name="timer" />, shortcut: "P", action: () => startFocus("pomodoro") },
      { id: "focus.deep", label: "Démarrer Deep Work (50 min)", category: "Focus", icon: <IconPlaceholder name="brain" />, action: () => startFocus("deep") },
      { id: "focus.sprint", label: "Démarrer Sprint (10 min)", category: "Focus", icon: <IconPlaceholder name="zap" />, action: () => startFocus("sprint") },
      { id: "focus.quick", label: "Focus rapide (15 min)", category: "Focus", icon: <IconPlaceholder name="timer" />, action: () => startFocus("quick") },
      { id: "focus.shortBreak", label: "Pause courte", category: "Focus", icon: <IconPlaceholder name="coffee" />, action: () => startFocus("shortBreak") },
      { id: "focus.longBreak", label: "Pause longue", category: "Focus", icon: <IconPlaceholder name="armchair" />, action: () => startFocus("longBreak") },
      { id: "focus.stop", label: "Arrêter le Focus", category: "Focus", icon: <IconPlaceholder name="square" />, action: stopFocus },

      // Ambiance
      { id: "ambience.rain", label: "Ambiance : Pluie", category: "Ambiance", icon: <IconPlaceholder name="cloud-rain" />, action: () => update({ soundPack: "apple-inspired", soundEffects: true, masterVolume: true }) },
      { id: "ambience.pink", label: "Ambiance : Bruit rose", category: "Ambiance", icon: <IconPlaceholder name="sparkles" />, action: () => update({ soundPack: "minimal", soundEffects: true, masterVolume: true }) },
      { id: "ambience.stop", label: "Arrêter l'ambiance", category: "Ambiance", icon: <IconPlaceholder name="volume-x" />, action: () => update({ soundEffects: false }) },

      // Système
      { id: "sync.refresh", label: "Synchroniser maintenant", category: "Système", icon: <IconPlaceholder name="cloud-cog" />, action: () => window.location.reload() },
      { id: "notifications.open", label: "Centre de notifications", category: "Système", icon: <IconPlaceholder name="bell" />, action: openNotificationCenter },
      { id: "activity.sync", label: "Sync activité", category: "Système", icon: <IconPlaceholder name="refresh-cw" />, action: syncActivity },
      { id: "network.refresh", label: "Rafraîchir le réseau", category: "Système", icon: <IconPlaceholder name="wifi" />, action: refreshNetwork },

      // Compte
      { id: "signout", label: "Se déconnecter", category: "Compte", icon: <IconPlaceholder name="logout" />, action: () => signOut().then(() => navigate("/login")) },

      // Facturation
      { id: "billing.pay", label: "Payer une facture", category: "Facturation", icon: <IconPlaceholder name="credit-card" />, action: () => navigate("/bills/") },

      // Mail
      { id: "mail.rules", label: "Règles mail", category: "Mail", icon: <IconPlaceholder name="list" />, action: () => navigate("/mail/") },
      { id: "mail.templates", label: "Modèles mail", category: "Mail", icon: <IconPlaceholder name="file-text" />, action: () => navigate("/mail/") },

      // Plugins
      ...PLUGINS.map((p) => openCmd(`plugin.${p.id}`, p.label, p.route, p.icon, "Plugins")),

      // Macros (dynamic)
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
    cycleAura,
    cycleWallpaper,
    cycleSessionMode,
    toggleBrainMemory,
    toggleBrain,
    toggleAura,
    toggleDock,
    toggleZen,
    toggleStatusBar,
    startFocus,
    stopFocus,
    activateSpace,
    toggleMissionControl,
    setOpen,
    update,
    signOut,
    openNotificationCenter,
    syncActivity,
    refreshNetwork,
    exportPresets,
    importPresets,
    macroCommands,
  ]);
}

function IconPlaceholder({ name }: { name: string }) {
  return <Icon name={name} className="h-4 w-4" />;
}
