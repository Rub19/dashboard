"use client";

export interface RiotAuditStats {
  totalVisits: number;
  uniqueSessions: number;
  gameVisits: {
    valorant: number;
    lol: number;
    tft: number;
  };
  actionsCount: {
    demoClicks: number;
    searchQueries: number;
    apiTests: number;
    rsoAttempts: number;
  };
  lastVisitAt: string | null;
  recentLogs: Array<{
    id: string;
    timestamp: string;
    event: string;
    game: string;
    status: string;
  }>;
}

const STORAGE_KEY = "ethone:riot_audit:v1";
const SESSION_FLAG = "ethone:riot_audit_session_logged";

function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function getSession(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function defaultStats(): RiotAuditStats {
  return {
    totalVisits: 0,
    uniqueSessions: 0,
    gameVisits: { valorant: 0, lol: 0, tft: 0 },
    actionsCount: { demoClicks: 0, searchQueries: 0, apiTests: 0, rsoAttempts: 0 },
    lastVisitAt: null,
    recentLogs: [],
  };
}

export function getRiotAuditStats(): RiotAuditStats {
  return defaultStats();
}

export function recordRiotAudit(_params?: {
  game?: "valorant" | "lol" | "tft";
  actionType?: "visit" | "demo" | "search" | "api" | "rso";
  description?: string;
}): void {
}

export function clearRiotAuditStats(): void {
  const store = getStorage();
  if (!store) return;
  try {
    store.removeItem(STORAGE_KEY);
    const sessionStore = getSession();
    sessionStore?.removeItem(SESSION_FLAG);
  } catch {
  }
}
