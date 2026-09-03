"use client";

import { useMemo, useCallback } from "react";
import { useLocalStorage } from "@/lib/hooks/useLocalStorage";
import { useSettings } from "@/components/SettingsProvider";
import { useToast } from "@/components/ToastProvider";
import { activityJournal } from "@/lib/activity-journal";

export type UserInterest =
  | "development"
  | "gaming"
  | "music"
  | "productivity"
  | "ai"
  | "study"
  | "design"
  | "finance";

export type InterfaceDensity = "compact" | "balanced" | "comfortable";

export type PresenceStatus =
  | "online"
  | "focus"
  | "gaming"
  | "busy"
  | "dnd"
  | "away"
  | "offline";

export interface CustomStatus {
  text: string;
  emoji: string;
  expiresAt?: string;
}

export interface InferredPreference {
  id: string;
  label: string;
  category: string;
  confidence: number; // 0-100
  reason: string;
}

export interface PersonalizationPreferences {
  interests: UserInterest[];
  density: InterfaceDensity;
  soundEffects: boolean;
  autoStatus: boolean;
  presenceStatus: PresenceStatus;
  customStatus?: CustomStatus;
  privacy: {
    personalizedRecommendations: boolean;
    contextAwareSuggestions: boolean;
    behaviorBasedLearning: boolean;
    workspacePersonalization: boolean;
  };
}

const STORAGE_KEY = "ethone-personalization-v2";

const DEFAULT_PREFERENCES: PersonalizationPreferences = {
  interests: ["development", "productivity", "gaming"],
  density: "balanced",
  soundEffects: true,
  autoStatus: true,
  presenceStatus: "online",
  customStatus: {
    text: "Building with ETHONE OS",
    emoji: "💻",
  },
  privacy: {
    personalizedRecommendations: true,
    contextAwareSuggestions: true,
    behaviorBasedLearning: true,
    workspacePersonalization: true,
  },
};

export function usePersonalizationStore() {
  const { success, error: toastError } = useToast();
  const { settings, update: updateSettings } = useSettings();

  const [preferences, setPreferences] = useLocalStorage<PersonalizationPreferences>(
    STORAGE_KEY,
    DEFAULT_PREFERENCES
  );

  const [activeWorkspace] = useLocalStorage<string>("ethone-active-workspace", "personal");
  const [pinnedWidgets] = useLocalStorage<string[]>("ethone-pinned-widgets", []);

  // Compute Inferred Preferences dynamically based on real user actions
  const inferredPreferences = useMemo<InferredPreference[]>(() => {
    const list: InferredPreference[] = [];

    // Check connected services in localStorage
    const hasSpotify = typeof window !== "undefined" && Boolean(localStorage.getItem("ethone:connected:spotify") || localStorage.getItem("spotify_access_token"));
    const hasDiscord = typeof window !== "undefined" && Boolean(localStorage.getItem("ethone:connected:discord"));
    const hasRiot = typeof window !== "undefined" && Boolean(localStorage.getItem("ethone:connected:valorant") || localStorage.getItem("ethone:connected:riot"));

    // 1. Developer affinity
    if (activeWorkspace === "studio" || pinnedWidgets.some((w) => w.includes("github") || w.includes("code"))) {
      list.push({
        id: "inf-dev",
        label: "Orientation Développement Logiciel",
        category: "development",
        confidence: 94,
        reason: "Utilisation active de l'Espace Studio et widgets de code épinglés.",
      });
    }

    // 2. Gaming affinity
    if (activeWorkspace === "gaming" || hasRiot || hasDiscord) {
      list.push({
        id: "inf-gaming",
        label: "Profil Joueur & Compétition",
        category: "gaming",
        confidence: 88,
        reason: "Comptes Discord / Riot connectés et intérêt gaming détecté.",
      });
    }

    // 3. Audio & Immersion
    if (hasSpotify || pinnedWidgets.some((w) => w.includes("spotify") || w.includes("music"))) {
      list.push({
        id: "inf-audio",
        label: "Ambiance Musicale Continue",
        category: "media",
        confidence: 91,
        reason: "Session Spotify active et préférences de fond sonore.",
      });
    }

    // 4. Deep Work Focus
    list.push({
      id: "inf-focus",
      label: "Régularité Deep Work",
      category: "productivity",
      confidence: 85,
      reason: "Sessions Focus enregistrées et planification quotidienne.",
    });

    return list;
  }, [activeWorkspace, pinnedWidgets]);

  // Update presence status
  const setPresenceStatus = useCallback(
    (status: PresenceStatus) => {
      setPreferences((prev) => ({
        ...prev,
        presenceStatus: status,
      }));

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("ethone:presence:changed", { detail: { status } })
        );
      }
      success(`Statut mis à jour : ${status.toUpperCase()}`);
    },
    [setPreferences, success]
  );

  // Update custom status
  const setCustomStatus = useCallback(
    (custom: CustomStatus | undefined) => {
      setPreferences((prev) => ({
        ...prev,
        customStatus: custom,
      }));
      success("Message de statut personnalisé enregistré !");
    },
    [setPreferences, success]
  );

  // Toggle interest
  const toggleInterest = useCallback(
    (interest: UserInterest) => {
      setPreferences((prev) => {
        const exists = prev.interests.includes(interest);
        const nextInterests = exists
          ? prev.interests.filter((i) => i !== interest)
          : [...prev.interests, interest];

        return {
          ...prev,
          interests: nextInterests,
        };
      });
    },
    [setPreferences]
  );

  // Set interface density
  const setDensity = useCallback(
    (density: InterfaceDensity) => {
      setPreferences((prev) => ({
        ...prev,
        density,
      }));
      success(`Densité d'affichage : ${density}`);
    },
    [setPreferences, success]
  );

  // Toggle privacy option
  const togglePrivacySetting = useCallback(
    (key: keyof PersonalizationPreferences["privacy"]) => {
      setPreferences((prev) => ({
        ...prev,
        privacy: {
          ...prev.privacy,
          [key]: !prev.privacy[key],
        },
      }));
    },
    [setPreferences]
  );

  // Toggle auto status
  const toggleAutoStatus = useCallback(() => {
    setPreferences((prev) => ({
      ...prev,
      autoStatus: !prev.autoStatus,
    }));
  }, [setPreferences]);

  // Export all user personalization data as JSON
  const exportPersonalData = useCallback(() => {
    try {
      const data = {
        exportedAt: new Date().toISOString(),
        version: "2.0",
        activeWorkspace,
        preferences,
        inferredPreferences,
        pinnedWidgets,
        theme: settings.theme,
        accentColor: settings.accentColor,
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ethone-personalization-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      activityJournal.record({
        title: "Exportation des données personnelles",
        description: "Archive JSON téléchargée par l'utilisateur.",
        category: "system",
        icon: "download",
      });

      success("Données de personnalisation exportées avec succès !");
    } catch (err: any) {
      toastError(`Erreur lors de l'export : ${err?.message || "Inconnue"}`);
    }
  }, [activeWorkspace, preferences, inferredPreferences, pinnedWidgets, settings, success, toastError]);

  // Reset personalization data without deleting account or files
  const resetPersonalization = useCallback(() => {
    setPreferences(DEFAULT_PREFERENCES);
    if (typeof window !== "undefined") {
      localStorage.removeItem("ethone-marketplace-dismissed-recs");
    }

    activityJournal.record({
      title: "Réinitialisation de la personnalisation",
      description: "Préférences et apprentissages Brain réinitialisés par défaut.",
      category: "system",
      icon: "refresh-cw",
    });

    success("Préférences de personnalisation réinitialisées aux valeurs par défaut.");
  }, [setPreferences, success]);

  return {
    preferences,
    inferredPreferences,
    setPresenceStatus,
    setCustomStatus,
    toggleInterest,
    setDensity,
    togglePrivacySetting,
    toggleAutoStatus,
    exportPersonalData,
    resetPersonalization,
  };
}
