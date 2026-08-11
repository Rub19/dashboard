"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from "react";
import { useSettings } from "@/components/SettingsProvider";

export type PresenceState = {
  brain?: "ready" | "thinking" | "responding";
  sync?: "idle" | "syncing";
  notification?: "idle" | "important" | "new";
  media?: "idle" | "playing";
  mail?: "idle" | "new";
};

type PresenceContextType = {
  state: PresenceState;
  setBrain: (value?: PresenceState["brain"]) => void;
  setSync: (value?: PresenceState["sync"]) => void;
  setNotification: (value?: PresenceState["notification"], autoClearMs?: number) => void;
  setMedia: (value?: PresenceState["media"]) => void;
  setMail: (value?: PresenceState["mail"], autoClearMs?: number) => void;
};

const PresenceContext = createContext<PresenceContextType | null>(null);

export function usePresence() {
  const ctx = useContext(PresenceContext);
  if (!ctx) throw new Error("usePresence must be used within PresenceProvider");
  return ctx;
}

function applyPresenceToHtml(state: PresenceState) {
  const html = document.documentElement;
  if (state.brain) html.setAttribute("data-presence-brain", state.brain);
  else html.removeAttribute("data-presence-brain");

  if (state.sync) html.setAttribute("data-presence-sync", state.sync);
  else html.removeAttribute("data-presence-sync");

  if (state.notification) html.setAttribute("data-presence-notification", state.notification);
  else html.removeAttribute("data-presence-notification");

  if (state.media) html.setAttribute("data-presence-media", state.media);
  else html.removeAttribute("data-presence-media");

  if (state.mail) html.setAttribute("data-presence-mail", state.mail);
  else html.removeAttribute("data-presence-mail");
}

export default function PresenceProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings();
  const [state, setState] = useState<PresenceState>({});
  const timeouts = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const clearActiveTimeout = useCallback((key: string) => {
    if (timeouts.current[key]) {
      clearTimeout(timeouts.current[key]);
      delete timeouts.current[key];
    }
  }, []);

  const setBrain = useCallback((value?: PresenceState["brain"]) => {
    setState((s) => ({ ...s, brain: value }));
  }, []);

  const setSync = useCallback((value?: PresenceState["sync"]) => {
    setState((s) => ({ ...s, sync: value }));
  }, []);

  const setNotification = useCallback((value?: PresenceState["notification"], autoClearMs?: number) => {
    setState((s) => ({ ...s, notification: value }));
    clearActiveTimeout("notification");
    if (value && autoClearMs) {
      timeouts.current.notification = setTimeout(() => {
        setState((s) => ({ ...s, notification: undefined }));
      }, autoClearMs);
    }
  }, [clearActiveTimeout]);

  const setMedia = useCallback((value?: PresenceState["media"]) => {
    setState((s) => ({ ...s, media: value }));
  }, []);

  const setMail = useCallback((value?: PresenceState["mail"], autoClearMs?: number) => {
    setState((s) => ({ ...s, mail: value }));
    clearActiveTimeout("mail");
    if (value && autoClearMs) {
      timeouts.current.mail = setTimeout(() => {
        setState((s) => ({ ...s, mail: undefined }));
      }, autoClearMs);
    }
  }, [clearActiveTimeout]);

  useEffect(() => {
    const html = document.documentElement;
    if (settings.reducedMotion) {
      html.setAttribute("data-presence-engine", "paused");
    } else {
      html.setAttribute("data-presence-engine", "active");
    }
    return () => {
      html.removeAttribute("data-presence-engine");
    };
  }, [settings.reducedMotion]);

  useEffect(() => {
    applyPresenceToHtml(state);
  }, [state]);

  return (
    <PresenceContext.Provider value={{ state, setBrain, setSync, setNotification, setMedia, setMail }}>
      {children}
    </PresenceContext.Provider>
  );
}
