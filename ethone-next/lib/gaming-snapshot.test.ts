import { syncCurrentDaySnapshot, loadGamingSnapshots } from "./gaming-snapshot";
import { supabase } from "./supabase";
import type { GamingAnalyticsSummary } from "./hooks/useGamingAnalytics";

jest.mock("./supabase");

const mockedSupabase = supabase as jest.Mocked<typeof supabase>;

function summary(overrides: Partial<GamingAnalyticsSummary> = {}): GamingAnalyticsSummary {
  return {
    configured: true,
    lol: { days: [], totalGames: 12, winRate: 58, lastSync: null },
    valorant: { days: [], totalGames: 8, winRate: 50, lastSync: null },
    tft: { days: [], totalGames: 4, top4Rate: 75, lastSync: null },
    ...overrides,
  };
}

describe("syncCurrentDaySnapshot", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date(2026, 8, 15));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("does nothing when gaming tracking isn't configured", async () => {
    const upsert = jest.fn();
    (mockedSupabase.from as jest.Mock) = jest.fn(() => ({ upsert }));

    await syncCurrentDaySnapshot(summary({ configured: false }));

    expect(upsert).not.toHaveBeenCalled();
    expect(mockedSupabase.from).not.toHaveBeenCalled();
  });

  it("does nothing when there is no authenticated user", async () => {
    (mockedSupabase.auth.getSession as jest.Mock) = jest.fn().mockResolvedValue({ data: { session: null } });
    const upsert = jest.fn();
    (mockedSupabase.from as jest.Mock) = jest.fn(() => ({ upsert }));

    await syncCurrentDaySnapshot(summary());

    expect(upsert).not.toHaveBeenCalled();
  });

  it("upserts today's snapshot keyed on the current user and day", async () => {
    (mockedSupabase.auth.getSession as jest.Mock) = jest.fn().mockResolvedValue({ data: { session: { user: { id: "user-a" } } } });
    const upsert = jest.fn().mockResolvedValue({ data: null, error: null });
    (mockedSupabase.from as jest.Mock) = jest.fn(() => ({ upsert }));

    await syncCurrentDaySnapshot(summary());

    expect(mockedSupabase.from).toHaveBeenCalledWith("ethone_gaming_snapshots");
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-a",
        day: "2026-09-15",
        lol_games: 12,
        lol_win_rate: 58,
        valorant_games: 8,
        valorant_win_rate: 50,
        tft_games: 4,
        tft_top4_rate: 75,
      }),
      { onConflict: "user_id,day" }
    );
  });

  it("never throws when the upsert itself fails", async () => {
    (mockedSupabase.auth.getSession as jest.Mock) = jest.fn().mockResolvedValue({ data: { session: { user: { id: "user-a" } } } });
    (mockedSupabase.from as jest.Mock) = jest.fn(() => ({
      upsert: jest.fn().mockRejectedValue(new Error("network down")),
    }));

    await expect(syncCurrentDaySnapshot(summary())).resolves.toBeUndefined();
  });
});

describe("loadGamingSnapshots", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns an empty list when there is no authenticated user", async () => {
    (mockedSupabase.auth.getSession as jest.Mock) = jest.fn().mockResolvedValue({ data: { session: null } });
    expect(await loadGamingSnapshots()).toEqual([]);
  });

  it("scopes the query to the current user and orders by day ascending", async () => {
    (mockedSupabase.auth.getSession as jest.Mock) = jest.fn().mockResolvedValue({ data: { session: { user: { id: "user-a" } } } });
    const builder: Record<string, jest.Mock> = {};
    ["select", "eq", "order"].forEach((method) => {
      builder[method] = jest.fn(() => builder);
    });
    (builder as any).then = (resolve: (v: unknown) => void) =>
      resolve({ data: [{ day: "2026-09-15", lol_win_rate: 58, valorant_win_rate: 50, tft_top4_rate: 75 }], error: null });
    (mockedSupabase.from as jest.Mock) = jest.fn(() => builder);

    const rows = await loadGamingSnapshots();

    expect(mockedSupabase.from).toHaveBeenCalledWith("ethone_gaming_snapshots");
    expect(builder.eq).toHaveBeenCalledWith("user_id", "user-a");
    expect(builder.order).toHaveBeenCalledWith("day", { ascending: true });
    expect(rows).toEqual([{ day: "2026-09-15", lol_win_rate: 58, valorant_win_rate: 50, tft_top4_rate: 75 }]);
  });
});
