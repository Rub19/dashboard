"use client";

import { useRouter } from "next/navigation";
import { useSettings } from "@/components/SettingsProvider";
import { useAuth } from "@/components/AuthProvider";
import { useFocus } from "@/components/FocusProvider";
import { useWindowManager } from "@/components/WindowManagerProvider";

export type ActionResult = { ok: boolean; status: string; message: string; data?: unknown };

function completed(message: string, data?: unknown): ActionResult {
  return { ok: true, status: "completed", message, data };
}

function failed(message: string, error?: unknown): ActionResult {
  return { ok: false, status: "failed", message, data: error ?? null };
}

export type ActionOptions = {
  navigate?: (route: string) => void;
  openWindow?: (title: string, href: string) => void;
  settings?: { update: (patch: Record<string, unknown>) => void; settings: Record<string, unknown> };
  signOut?: () => Promise<void> | void;
  setLocale?: (locale: string) => void;
  onActivity?: (entry: { source: string; title: string }) => void;
  sounds?: { trigger: (type: string) => void };
  focus?: { start: (mode: string) => void; stop: () => void };
};

export type ActionMap = Record<string, (params?: Record<string, unknown>) => ActionResult | Promise<ActionResult>>;

export function createActionFacade(options: ActionOptions = {}) {
  const handlers = new Map<string, (params?: Record<string, unknown>) => ActionResult | Promise<ActionResult>>();

  function register(id: string, handler: (params?: Record<string, unknown>) => ActionResult | Promise<ActionResult>) {
    if (!id || typeof handler !== "function") return false;
    handlers.set(String(id), handler);
    return true;
  }

  function unregister(id: string) {
    return handlers.delete(String(id));
  }

  function scope(id: string, handler: (params?: Record<string, unknown>) => ActionResult | Promise<ActionResult>) {
    const actionId = String(id);
    if (!actionId || typeof handler !== "function") return () => false;
    const previous = handlers.get(actionId);
    handlers.set(actionId, handler);
    let restored = false;
    return () => {
      if (restored || handlers.get(actionId) !== handler) return false;
      restored = true;
      if (previous) handlers.set(actionId, previous);
      else handlers.delete(actionId);
      return true;
    };
  }

  function openRoute(route: string, label: string) {
    return () => {
      options.navigate?.(route);
      return completed(`${label} ouvert`);
    };
  }

  const actions: ActionMap = {
    "v8.home.open": openRoute("/", "Accueil"),
    "v8.notes.open": openRoute("/notes/", "Notes"),
    "v8.tasks.open": openRoute("/tasks/", "Taches"),
    "v8.calendar.open": openRoute("/calendar/", "Calendrier"),
    "v8.files.open": openRoute("/files/", "Fichiers"),
    "v8.bills.open": openRoute("/bills/", "Bills"),
    "v8.activity.open": openRoute("/activity/", "Activity Hub"),
    "v8.interactions.open": openRoute("/interactions/", "Interactions"),
    "v8.connections.open": openRoute("/connections/", "Connections"),
    "v8.plugins.open": openRoute("/plugins/", "Plugins"),
    "v8.spaces.open": openRoute("/spaces/", "Spaces"),
    "v8.flows.open": openRoute("/flows/", "Flows"),
    "v8.brain.open": openRoute("/brain/", "Brain"),
    "v8.team.open": openRoute("/team/", "Equipe"),
    "v8.mail.open": openRoute("/mail/", "Mail"),
    "v8.focus.open": openRoute("/focus/", "Focus"),
    "v8.weather.open": openRoute("/weather/", "Meteo"),
    "v8.settings.open": openRoute("/settings/", "Reglages"),
    "v8.changelog.open": openRoute("/changelog/", "Changelog"),
    "v8.security.open": openRoute("/security/", "Securite"),
    "v8.mission.open": () => {
      options.openWindow?.("Mission Control", "/system/");
      return completed("Mission Control ouvert");
    },
    "v8.auth.signout": async () => {
      try {
        await options.signOut?.();
        return completed("Deconnecte");
      } catch (error) {
        return failed("Deconnexion echouee", error);
      }
    },
    "v8.focus.start.pomodoro": () => {
      options.focus?.start("pomodoro");
      return completed("Pomodoro demarre");
    },
    "v8.focus.start.deep": () => {
      options.focus?.start("deep");
      return completed("Deep Work demarre");
    },
    "v8.focus.stop": () => {
      options.focus?.stop();
      return completed("Focus arrete");
    },
  };

  Object.entries(actions).forEach(([id, handler]) => register(id, handler));

  async function dispatch(id: string, params?: Record<string, unknown>): Promise<ActionResult> {
    const handler = handlers.get(String(id));
    if (!handler) return failed(`Action inconnue : ${id}`);
    try {
      const result = await handler(params);
      return result;
    } catch (error) {
      return failed(`Erreur action ${id}`, error);
    }
  }

  return {
    register,
    unregister,
    scope,
    dispatch,
    has: (id: string) => handlers.has(id),
    list: () => Array.from(handlers.keys()),
  };
}

export function useActionFacade() {
  const router = useRouter();
  const settings = useSettings();
  const auth = useAuth();
  const focus = useFocus();
  const { openWindow } = useWindowManager();

  const facade = createActionFacade({
    navigate: (route: string) => router.push(route),
    openWindow,
    settings: { update: settings.update as (patch: Record<string, unknown>) => void, settings: settings.settings as Record<string, unknown> },
    signOut: auth.signOut,
    setLocale: (locale: string) => {
      settings.update({ language: locale });
    },
    focus: { start: focus.start, stop: focus.stop },
  });

  return facade;
}
