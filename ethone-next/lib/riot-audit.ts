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
  const store = getStorage();
  if (!store) return defaultStats();
  try {
    const raw = store.getItem(STORAGE_KEY);
    if (!raw) return defaultStats();
    const parsed = JSON.parse(raw);
    return {
      totalVisits: typeof parsed.totalVisits === "number" ? parsed.totalVisits : 0,
      uniqueSessions: typeof parsed.uniqueSessions === "number" ? parsed.uniqueSessions : 0,
      gameVisits: {
        valorant: typeof parsed.gameVisits?.valorant === "number" ? parsed.gameVisits.valorant : 0,
        lol: typeof parsed.gameVisits?.lol === "number" ? parsed.gameVisits.lol : 0,
        tft: typeof parsed.gameVisits?.tft === "number" ? parsed.gameVisits.tft : 0,
      },
      actionsCount: {
        demoClicks: typeof parsed.actionsCount?.demoClicks === "number" ? parsed.actionsCount.demoClicks : 0,
        searchQueries: typeof parsed.actionsCount?.searchQueries === "number" ? parsed.actionsCount.searchQueries : 0,
        apiTests: typeof parsed.actionsCount?.apiTests === "number" ? parsed.actionsCount.apiTests : 0,
        rsoAttempts: typeof parsed.actionsCount?.rsoAttempts === "number" ? parsed.actionsCount.rsoAttempts : 0,
      },
      lastVisitAt: typeof parsed.lastVisitAt === "string" ? parsed.lastVisitAt : null,
      recentLogs: Array.isArray(parsed.recentLogs) ? parsed.recentLogs.slice(0, 30) : [],
    };
  } catch {
    return defaultStats();
  }
}

export function recordRiotAudit(params: {
  game?: "valorant" | "lol" | "tft";
  actionType?: "visit" | "demo" | "search" | "api" | "rso";
  description?: string;
}): void {
  const store = getStorage();
  if (!store) return;
  try {
    const current = getRiotAuditStats();
    const now = new Date().toISOString();
    const game = params.game || "valorant";
    const action = params.actionType || "visit";

    const sessionStore = getSession();
    let isNewSession = false;
    if (sessionStore && !sessionStore.getItem(SESSION_FLAG)) {
      isNewSession = true;
      sessionStore.setItem(SESSION_FLAG, "1");
    }

    const next: RiotAuditStats = {
      ...current,
      totalVisits: current.totalVisits + 1,
      uniqueSessions: current.uniqueSessions + (isNewSession ? 1 : 0),
      gameVisits: {
        ...current.gameVisits,
        [game]: (current.gameVisits[game] || 0) + 1,
      },
      actionsCount: {
        ...current.actionsCount,
        demoClicks: current.actionsCount.demoClicks + (action === "demo" ? 1 : 0),
        searchQueries: current.actionsCount.searchQueries + (action === "search" ? 1 : 0),
        apiTests: current.actionsCount.apiTests + (action === "api" ? 1 : 0),
        rsoAttempts: current.actionsCount.rsoAttempts + (action === "rso" ? 1 : 0),
      },
      lastVisitAt: now,
      recentLogs: [
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          timestamp: now,
          event: params.description || `Navigation Hub ${game.toUpperCase()}`,
          game: game.toUpperCase(),
          status: "200 OK (Anonymisé)",
        },
        ...current.recentLogs,
      ].slice(0, 30),
    };

    store.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
  }
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
