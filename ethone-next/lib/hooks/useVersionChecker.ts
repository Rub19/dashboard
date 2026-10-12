"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "ethone:version";
const PENDING_UPDATE_KEY = "ethone:pending-update";
const DISMISS_KEY = "ethone:update-dismissed";
const CHECK_INTERVAL = 5 * 60_000;
const COOLDOWN = 5_000;
const DISMISS_COOLDOWN = 60 * 60_000;

export type VersionData = {
  version: string;
  commit?: string | null;
  buildAt?: string;
};

export type UseVersionChecker = {
  hasUpdate: boolean;
  currentVersion: string | null;
  newVersion: string | null;
  currentData: VersionData | null;
  newData: VersionData | null;
  dismiss: () => void;
  check: () => void;
};

type VersionStoreState = {
  hasUpdate: boolean;
  currentData: VersionData | null;
  newData: VersionData | null;
};

async function fetchVersion(): Promise<VersionData | null> {
  const tryFetch = async (path: string) => {
    try {
      const res = await fetch(`${path}?t=${Date.now()}`, {
        cache: "reload",
        headers: {
          Accept: "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
        },
      });
      if (!res.ok) return null;
      const data = (await res.json()) as unknown;
      if (data && typeof data === "object" && "version" in data && typeof (data as VersionData).version === "string") {
        return data as VersionData;
      }
      return null;
    } catch {
      return null;
    }
  };

  if (process.env.NODE_ENV === "development") {
    return (await tryFetch("/api/version")) ?? (await tryFetch("/version.json"));
  }
  return tryFetch("/version.json");
}

let versionInFlight: Promise<VersionData | null> | null = null;
function fetchVersionShared(): Promise<VersionData | null> {
  if (!versionInFlight) {
    versionInFlight = fetchVersion().finally(() => {
      setTimeout(() => {
        versionInFlight = null;
      }, 1500);
    });
  }
  return versionInFlight;
}

function parseBuildAt(value?: string): number {
  if (!value) return 0;
  const ts = new Date(value).getTime();
  return Number.isNaN(ts) ? 0 : ts;
}

export function builtVersion(): VersionData | null {
  const version = process.env.NEXT_PUBLIC_BUILD_VERSION;
  if (!version) return null;
  return { version, commit: process.env.NEXT_PUBLIC_BUILD_COMMIT || null };
}

export function isNewerBuild(current: VersionData, remote: VersionData): boolean {
  if (current.version !== remote.version) return true;

  const currentCommit = current.commit ?? null;
  const remoteCommit = remote.commit ?? null;
  if (currentCommit !== remoteCommit) return true;

  if (!current.buildAt) return false;

  const currentAt = parseBuildAt(current.buildAt);
  const remoteAt = parseBuildAt(remote.buildAt);

  if (currentAt === 0 || remoteAt === 0) {
    if (current.buildAt !== remote.buildAt) return true;
  }

  return remoteAt > currentAt;
}

function loadStored(): VersionData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object" && "version" in parsed && typeof (parsed as VersionData).version === "string") {
      return parsed as VersionData;
    }
    return { version: raw };
  } catch {
    return null;
  }
}

function saveStored(data: VersionData) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

function loadPending(): VersionData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PENDING_UPDATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object" && "version" in parsed && typeof (parsed as VersionData).version === "string") {
      return parsed as VersionData;
    }
  } catch {}
  return null;
}

function syncStoreFromStorage(): VersionStoreState {
  if (typeof window === "undefined") {
    return { hasUpdate: false, currentData: null, newData: null };
  }
  const built = builtVersion();
  const current = built ?? loadStored();
  const pending = loadPending();
  let hasUpdate = false;
  if (current && pending && isNewerBuild(current, pending)) {
    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || "0");
    if (Date.now() - dismissedAt > DISMISS_COOLDOWN) {
      hasUpdate = true;
    }
  }
  return {
    hasUpdate,
    currentData: current,
    newData: pending,
  };
}

const subscribers = new Set<(state: VersionStoreState) => void>();
let currentStoreState: VersionStoreState = syncStoreFromStorage();
let lastCheckTimestamp = 0;

function setStoreState(updater: (prev: VersionStoreState) => VersionStoreState) {
  currentStoreState = updater(currentStoreState);
  subscribers.forEach((fn) => {
    try {
      fn(currentStoreState);
    } catch {}
  });
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === PENDING_UPDATE_KEY || e.key === DISMISS_KEY || e.key === STORAGE_KEY) {
      setStoreState(() => syncStoreFromStorage());
    }
  });
}

export function useVersionChecker(): UseVersionChecker {
  const [state, setState] = useState<VersionStoreState>(() => currentStoreState);

  useEffect(() => {
    setState(currentStoreState);
    const sub = (next: VersionStoreState) => setState(next);
    subscribers.add(sub);
    return () => {
      subscribers.delete(sub);
    };
  }, []);

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(DISMISS_KEY, Date.now().toString());
    } catch {}
    setStoreState((prev) => ({ ...prev, hasUpdate: false }));
  }, []);

  const check = useCallback(async () => {
    if (typeof window === "undefined") return;
    const now = Date.now();
    if (now - lastCheckTimestamp < COOLDOWN) return;
    lastCheckTimestamp = now;

    try {
      const remote = await fetchVersionShared();
      if (!remote?.version) return;

      const built = builtVersion();
      const current = built ?? loadStored();
      if (!current) {
        saveStored(remote);
        setStoreState((prev) => ({ ...prev, currentData: remote }));
        return;
      }

      if (isNewerBuild(current, remote)) {
        try {
          localStorage.setItem(PENDING_UPDATE_KEY, JSON.stringify(remote));
        } catch {}

        const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || "0");
        const hasUpdate = now - dismissedAt > DISMISS_COOLDOWN;
        setStoreState((prev) => ({
          ...prev,
          currentData: current,
          newData: remote,
          hasUpdate,
        }));
      } else {
        try {
          localStorage.removeItem(PENDING_UPDATE_KEY);
        } catch {}
        setStoreState((prev) => ({
          ...prev,
          currentData: current,
          newData: remote,
          hasUpdate: false,
        }));
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const built = builtVersion();
    if (built) {
      saveStored(built);
    }

    check();
    const interval = setInterval(() => check(), CHECK_INTERVAL);

    function onVisibilityChange() {
      if (document.visibilityState === "visible") check();
    }
    function onWindowFocus() {
      check();
    }
    function onPageShow() {
      check();
    }
    function onOnline() {
      check();
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", onWindowFocus);
    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("online", onOnline);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", onWindowFocus);
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("online", onOnline);
    };
  }, [check]);

  return {
    hasUpdate: state.hasUpdate,
    currentVersion: state.currentData?.version ?? null,
    newVersion: state.newData?.version ?? null,
    currentData: state.currentData,
    newData: state.newData,
    dismiss,
    check,
  };
}
