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
import { transitionTheme } from "@/lib/theme-transition";
import {
  PRESET_THEMES,
  PRESET_THEME_IDS,
  UNIVERSAL_ACCENTS,
  type PremiumThemeId,
} from "@/lib/theme-engine";

export type CommandItem = {
  id: string;
  label: string;
  category: string;
  icon?: React.ReactNode;
  shortcut?: string;
  subtitle?: string;
  keywords?: string[];
  aliases?: string[];
  contexts?: string[];
  contextPriority?: number;
  isSensitive?: boolean;
  requiresOnline?: boolean;
  badge?: string;
  action: () => void;
};

const LANGUAGES = ["fr", "en", "es", "de"];
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
      setOpen(false);
      router.push("/focus/");
    },
    [start, setOpen, router]
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
    a.download = "ethone-settings.json";
    a.click();
    URL.revokeObjectURL(url);
    setOpen(false);
  }, [settings, setOpen]);

  const selectTheme = useCallback(
    (themeId: string) => {
      transitionTheme(themeId, (id) => update({ theme: id }), {
        accentColor: settings.accentColor,
        customAccent: settings.customAccent,
        glassLevel: settings.glassLevel,
        performanceMode: settings.performanceMode,
        customThemes: settings.customThemes,
        reducedMotion: settings.reducedMotion,
      });
      setOpen(false);
    },
    [settings, update, setOpen]
  );

  const selectAccent = useCallback(
    (accentId: string) => {
      update({ accentColor: accentId as typeof settings.accentColor });
      transitionTheme(settings.theme, () => {}, {
        accentColor: accentId,
        glassLevel: settings.glassLevel,
        performanceMode: settings.performanceMode,
        customThemes: settings.customThemes,
        reducedMotion: settings.reducedMotion,
      });
      setOpen(false);
    },
    [settings, update, setOpen]
  );

  return useMemo(() => {
    const base: CommandItem[] = [
      // 1. Navigation Principale
      { id: "nav-home", label: "Aller à l'Accueil", subtitle: "Tableau de bord principal", category: "Navigation", icon: <Icon name="home" />, shortcut: "H", keywords: ["home", "accueil", "dashboard", "bento", "tableau de bord"], action: () => navigate("/") },
      { id: "nav-brain", label: "Ouvrir ETHONE Brain", subtitle: "Assistant IA central et raisonnement", category: "Brain", icon: <Icon name="brain" />, shortcut: "B", contexts: ["/brain/", "/notes/"], contextPriority: 90, keywords: ["brain", "ia", "assistant", "chat", "llm", "intelligence", "ask brain"], action: () => navigate("/brain/") },
      { id: "nav-focus", label: "Ouvrir le Mode Focus", subtitle: "Session de travail et chronomètre", category: "Focus", icon: <Icon name="timer" />, shortcut: "F", contexts: ["/focus/"], contextPriority: 90, keywords: ["focus", "pomodoro", "timer", "chrono", "travail", "concentration", "deep work"], action: () => navigate("/focus/") },
      { id: "nav-files", label: "Ouvrir les Fichiers", subtitle: "Explorateur de documents et drive", category: "Navigation", icon: <Icon name="folder" />, contexts: ["/files/"], contextPriority: 90, keywords: ["files", "fichiers", "documents", "drive", "upload", "stockage", "pdf"], action: () => navigate("/files/") },
      { id: "nav-mail", label: "Ouvrir ETHONE Mail", subtitle: "Boîte de réception unifiée", category: "Navigation", icon: <Icon name="mail" />, contexts: ["/mail/"], contextPriority: 90, keywords: ["mail", "email", "inbox", "messages", "courriel", "boite"], action: () => navigate("/mail/") },
      { id: "nav-marketplace", label: "Ouvrir le Marketplace", subtitle: "Extensions, widgets et thèmes", category: "Marketplace", icon: <Icon name="sparkles" />, keywords: ["marketplace", "store", "plugins", "extensions", "addons", "widgets", "themes"], action: () => navigate("/plugins/") },
      { id: "nav-activity", label: "Journal d'Activité", subtitle: "Historique et analytics système", category: "Navigation", icon: <Icon name="activity" />, keywords: ["activity", "activite", "historique", "logs", "analytics"], action: () => navigate("/activity/") },
      { id: "nav-connections", label: "Gérer les Connexions", subtitle: "Comptes tiers liés et intégrations", category: "Intégrations", icon: <Icon name="link" />, keywords: ["connections", "connexions", "integrations", "spotify", "github", "discord", "steam"], action: () => navigate("/connections/") },
      { id: "nav-settings", label: "Ouvrir les Réglages", subtitle: "Préférences globales du système", category: "Réglages", icon: <Icon name="settings" />, shortcut: ",", contexts: ["/settings/"], contextPriority: 90, keywords: ["settings", "reglages", "parametres", "preferences", "config", "options"], action: () => navigate("/settings/") },
      { id: "nav-profile", label: "Mon Profil Public", subtitle: "Gérer mon avatar et ma biographie", category: "Navigation", icon: <Icon name="user" />, keywords: ["profile", "profil", "avatar", "compte", "moi", "bio"], action: () => navigate("/profile/") },
      { id: "nav-tasks", label: "Voir mes Tâches", subtitle: "Gestionnaire de tâches et todo-list", category: "Navigation", icon: <Icon name="check" />, keywords: ["tasks", "taches", "todo", "actions", "list"], action: () => navigate("/tasks/") },
      { id: "nav-notes", label: "Voir mes Notes", subtitle: "Prise de notes et synthèses", category: "Navigation", icon: <Icon name="file-text" />, keywords: ["notes", "scratchpad", "ecriture", "bloc-notes"], action: () => navigate("/notes/") },
      { id: "nav-calendar", label: "Ouvrir le Calendrier", subtitle: "Événements et plannings", category: "Navigation", icon: <Icon name="calendar" />, keywords: ["calendar", "calendrier", "agenda", "planning", "events"], action: () => navigate("/calendar/") },
      { id: "nav-weather", label: "Météo en direct", subtitle: "Prévisions et conditions locales", category: "Navigation", icon: <Icon name="cloud" />, keywords: ["weather", "meteo", "temperature", "pluie", "soleil"], action: () => navigate("/weather/") },

      // 2. Actions Focus Timer
      { id: "focus-pomodoro-25", label: "Lancer un Pomodoro (25 min)", subtitle: "25 min concentration + 5 min pause", category: "Focus", icon: <Icon name="timer" />, contexts: ["/focus/"], contextPriority: 95, keywords: ["pomodoro", "start pomodoro", "lance un pomodoro", "focus 25", "travail 25"], action: () => startFocus("pomodoro") },
      { id: "focus-deep-45", label: "Lancer un Deep Work (45 min)", subtitle: "45 min de travail intensif sans interruption", category: "Focus", icon: <Icon name="timer" />, contexts: ["/focus/"], contextPriority: 95, keywords: ["deep work", "focus 45", "lance deep work", "travail 45", "immersion"], action: () => startFocus("deep") },
      { id: "focus-sprint-15", label: "Lancer un Sprint Court (15 min)", subtitle: "15 min d'exécution rapide", category: "Focus", icon: <Icon name="timer" />, contexts: ["/focus/"], contextPriority: 95, keywords: ["sprint", "focus 15", "rapide", "quick focus"], action: () => startFocus("sprint") },
      { id: "focus-stop", label: "Arrêter la Session Focus", subtitle: "Stopper le chronomètre en cours", category: "Focus", icon: <Icon name="x" />, contexts: ["/focus/"], contextPriority: 95, keywords: ["stop focus", "arreter focus", "quitter focus", "finir focus"], action: stopFocus },

      // 3. Actions Rapides Fichiers & Mail & Brain
      { id: "action-upload-file", label: "Téléverser un Fichier", subtitle: "Ajouter un document au stockage", category: "Actions Rapides", icon: <Icon name="upload" />, contexts: ["/files/"], contextPriority: 95, keywords: ["upload", "importer", "televerser", "ajouter fichier", "drop"], action: () => { navigate("/files/"); window.dispatchEvent(new CustomEvent("v8:trigger-upload")); } },
      { id: "action-new-folder", label: "Créer un Nouveau Dossier", subtitle: "Organiser les documents", category: "Actions Rapides", icon: <Icon name="folder-plus" />, contexts: ["/files/"], contextPriority: 95, keywords: ["nouveau dossier", "new folder", "creer dossier"], action: () => { navigate("/files/"); window.dispatchEvent(new CustomEvent("v8:create-folder")); } },
      { id: "action-view-favorites", label: "Voir mes Fichiers Favoris", subtitle: "Documents marqués d'une étoile", category: "Actions Rapides", icon: <Icon name="star" />, contexts: ["/files/"], keywords: ["favoris fichiers", "starred files", "fichiers favoris"], action: () => { navigate("/files/?tab=favorites"); } },
      { id: "action-view-recent-files", label: "Voir les Fichiers Récents", subtitle: "Historique d'activité des fichiers", category: "Actions Rapides", icon: <Icon name="clock" />, contexts: ["/files/"], keywords: ["recents fichiers", "recent files", "derniers fichiers"], action: () => { navigate("/files/?tab=recent"); } },
      { id: "action-new-brain-chat", label: "Nouvelle Conversation Brain", subtitle: "Démarrer un fil de discussion vierge", category: "Brain", icon: <Icon name="brain" />, contexts: ["/brain/"], contextPriority: 95, keywords: ["new chat", "nouvelle conversation", "reset brain", "clear chat"], action: () => { navigate("/brain/"); window.dispatchEvent(new CustomEvent("v8:new-brain-chat")); } },
      { id: "action-open-notifications", label: "Ouvrir les Notifications", subtitle: "Consulter le centre de notifications", category: "Actions Rapides", icon: <Icon name="bell" />, shortcut: "N", keywords: ["notifications", "alertes", "messages", "centre de notifications", "non lues"], action: openNotificationCenter },
      { id: "action-mark-notifications-read", label: "Marquer toutes les notifications comme lues", subtitle: "Acquitter les alertes", category: "Actions Rapides", icon: <Icon name="check" />, keywords: ["marquer tout lu", "read all", "clear unread", "acquitter notifications"], action: () => { window.dispatchEvent(new CustomEvent("v8:mark-all-notifications-read")); } },
      { id: "action-add-widget", label: "Ajouter un Widget", subtitle: "Parcourir le catalogue des widgets (System 2.0)", category: "Actions Rapides", icon: <Icon name="plus" />, contexts: ["/"], keywords: ["widget", "ajouter widget", "add widget", "picker", "catalogue widgets"], action: () => { navigate("/"); window.dispatchEvent(new CustomEvent("v8:open-widget-picker")); } },
      { id: "action-customize-home", label: "Organiser l'Accueil & Widgets", subtitle: "Réorganiser ou masquer des widgets", category: "Actions Rapides", icon: <Icon name="sliders-horizontal" />, contexts: ["/"], keywords: ["organiser", "widgets", "layout", "customiser", "deplacer"], action: () => { navigate("/"); window.dispatchEvent(new CustomEvent("v8:toggle-customize-home")); } },
      { id: "action-lock-layout", label: "Verrouiller / Déverrouiller les Widgets", subtitle: "Empêcher le déplacement accidentel des widgets", category: "Actions Rapides", icon: <Icon name="lock" />, contexts: ["/"], keywords: ["lock", "verrouiller", "bloquer layout"], action: () => { navigate("/"); window.dispatchEvent(new CustomEvent("v8:toggle-lock-layout")); } },

      // 4. Thèmes Haute Fidélité (Theme Engine 3.0)
      ...PRESET_THEME_IDS.map((themeId) => {
        const def = PRESET_THEMES[themeId];
        return {
          id: `theme-${themeId}`,
          label: `Thème : ${def.label}`,
          subtitle: def.description,
          category: "Thèmes & Apparence",
          icon: <Icon name="palette" />,
          keywords: ["theme", "palette", themeId, def.label.toLowerCase(), "sombre", "clair", "oled", "cyber", "glass"],
          action: () => selectTheme(themeId),
        };
      }),

      // 5. Couleurs d'Accent Universelles
      ...UNIVERSAL_ACCENTS.map((acc) => ({
        id: `accent-${acc.id}`,
        label: `Accent : ${acc.label}`,
        subtitle: `Changer la couleur d'accent en ${acc.label} (${acc.hex})`,
        category: "Thèmes & Apparence",
        icon: <span className="h-3 w-3 rounded-full" style={{ backgroundColor: acc.hex }} />,
        keywords: ["accent", "couleur", acc.id, acc.label.toLowerCase(), "color", "tint"],
        action: () => selectAccent(acc.id),
      })),

      // 6. Réglages Sub-sections
      { id: "settings-appearance", label: "Réglages d'Apparence & Thèmes", subtitle: "Thèmes, studio de personnalisation, icônes et polices", category: "Réglages", icon: <Icon name="palette" />, keywords: ["appearance", "apparence", "themes", "icones", "studio"], action: () => navigate("/settings/appearance/") },
      { id: "settings-security", label: "Sécurité & Authentification", subtitle: "Mots de passe, 2FA et clés Passkeys", category: "Réglages", icon: <Icon name="lock" />, keywords: ["security", "securite", "password", "mot de passe", "2fa", "passkey"], action: () => navigate("/settings/security/") },
      { id: "settings-notifications", label: "Préférences des Notifications", subtitle: "Sons, push, emails et alertes", category: "Réglages", icon: <Icon name="bell" />, keywords: ["notifications", "alertes", "sons", "volume", "push"], action: () => navigate("/settings/notifications/") },
      { id: "settings-dock", label: "Personnalisation du Dock", subtitle: "Alignement, taille, effet verre et auto-masquage", category: "Réglages", icon: <Icon name="layout" />, keywords: ["dock", "barre", "alignement", "taille", "verre"], action: () => navigate("/settings/dock/") },

      // 7. Intégrations Directes
      { id: "plugin-spotify", label: "Ouvrir Spotify", subtitle: "Lecteur musical et playlists", category: "Intégrations", icon: <Icon name="music" />, requiresOnline: true, keywords: ["spotify", "musique", "player", "playlist", "audio"], action: () => open("/plugins/spotify/", "Spotify") },
      { id: "plugin-github", label: "Ouvrir GitHub", subtitle: "Dépôts, pull requests et notifications", category: "Intégrations", icon: <Icon name="code" />, requiresOnline: true, keywords: ["github", "git", "repos", "pr", "issues", "commits"], action: () => open("/plugins/github/", "GitHub") },
      { id: "plugin-discord", label: "Ouvrir Discord", subtitle: "Statut de présence et communautés", category: "Intégrations", icon: <Icon name="message-circle" />, requiresOnline: true, keywords: ["discord", "chat", "presence", "serveur"], action: () => open("/plugins/discord/", "Discord") },
      { id: "plugin-steam", label: "Ouvrir Steam", subtitle: "Bibliothèque de jeux et succès", category: "Intégrations", icon: <Icon name="gamepad" />, requiresOnline: true, keywords: ["steam", "jeux", "gaming", "valve"], action: () => open("/plugins/steam/", "Steam") },

      // 8. Actions Système & Sensibles
      { id: "sys-notifications", label: "Afficher le Centre de Notifications", subtitle: "Voir les alertes récentes", category: "Système", icon: <Icon name="bell" />, shortcut: "N", keywords: ["notifications", "centre", "alertes"], action: openNotificationCenter },
      { id: "sys-sync", label: "Forcer la Synchronisation", subtitle: "Synchroniser le journal d'activité avec le cloud", category: "Système", icon: <Icon name="refresh" />, requiresOnline: true, keywords: ["sync", "synchronisation", "cloud", "journal", "actualiser"], action: syncActivity },
      { id: "sys-reload", label: "Recharger l'Application", subtitle: "Rafraîchissement complet du navigateur", category: "Système", icon: <Icon name="refresh" />, shortcut: "R", keywords: ["reload", "refresh", "recharger", "actualiser"], action: refreshNetwork },
      { id: "sys-export-settings", label: "Exporter mes Préférences (JSON)", subtitle: "Télécharger un backup complet de vos réglages", category: "Système", icon: <Icon name="download" />, keywords: ["export", "backup", "sauvegarde", "json"], action: exportPresets },
      { id: "sys-signout", label: "Se Déconnecter", subtitle: "Fermer la session actuelle en toute sécurité", category: "Compte", icon: <Icon name="log-out" />, isSensitive: true, keywords: ["logout", "signout", "deconnexion", "quitter", "fermer session"], action: () => signOut() },
    ];

    return base;
  }, [
    navigate,
    open,
    startFocus,
    stopFocus,
    selectTheme,
    selectAccent,
    openNotificationCenter,
    syncActivity,
    refreshNetwork,
    exportPresets,
    signOut,
  ]);
}
