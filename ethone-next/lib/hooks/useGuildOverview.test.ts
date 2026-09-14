import { renderHook, waitFor } from "@testing-library/react";

// BOT_API_URL is read from process.env at module-load time, so the env var
// must be set BEFORE the module is first required -- import statements are
// hoisted, so this file uses a deferred require() in beforeAll instead.
let useGuildOverview: typeof import("./useGuildOverview")["useGuildOverview"];

beforeAll(async () => {
  process.env.NEXT_PUBLIC_DISCORD_BOT_API = "https://bot.ethone.test";
  useGuildOverview = (await import("./useGuildOverview")).useGuildOverview;
});

function okResponse(body: unknown) {
  return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) } as Response);
}

describe("useGuildOverview", () => {
  beforeEach(() => {
    (global as any).fetch = jest.fn();
  });

  it("does nothing when guildId is null", async () => {
    const fetchSpy = global.fetch as jest.Mock;
    const { result } = renderHook(() => useGuildOverview(null));
    await waitFor(() => expect(result.current.guild.loading).toBe(false));
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.current.guild.data).toBeNull();
  });

  it("fires all 8 guild-scoped overview endpoints in parallel with the right guildId", async () => {
    const fetchSpy = (global.fetch as jest.Mock).mockImplementation((input: unknown) => {
      const url = String(input);
      // Order matters: /bot/overview and /moderation/overview etc. also end
      // with "/overview", so the more specific checks must run first.
      if (url.endsWith("/bot/overview")) return okResponse({ snapshot: { guildsCount: 3, cachedUsersCount: 100 } });
      if (url.endsWith("/moderation/overview")) return okResponse({ stats: { totalCases: 1, casesToday: 0, activeSanctionsCount: 0, counts: {} }, recentCases: [] });
      if (url.endsWith("/tickets/overview")) return okResponse({ openCount: 2, pendingCount: 1, closedToday: 0 });
      if (url.endsWith("/giveaways/overview")) return okResponse({ activeCount: 1, endedCount: 4 });
      if (url.endsWith("/security/overview")) return okResponse({ status: "protected", score: 100, recentIncidents: [] });
      if (url.endsWith("/backups/overview")) return okResponse({ kpis: { totalBackups: 1, lastBackupAt: null, healthStatus: "HEALTHY" } });
      if (url.endsWith("/music/state")) return okResponse({ state: { status: "IDLE", currentTrack: null } });
      if (url.endsWith("/overview")) return okResponse({ guild: { memberCount: 10 }, botStatus: { online: true, uptimeMs: 1000, pingMs: 40 }, stats: { totalCommands: 5, commandsToday: 1, recentActivities: [] } });
      throw new Error(`Unexpected fetch: ${url}`);
    });

    const { result } = renderHook(() => useGuildOverview("guild-1"));
    await waitFor(() => expect(result.current.guild.loading).toBe(false));
    await waitFor(() => expect(result.current.backups.loading).toBe(false));

    expect(fetchSpy).toHaveBeenCalledTimes(8);
    const urls = fetchSpy.mock.calls.map((c) => String(c[0]));
    expect(urls.every((u) => u.includes("/api/guilds/guild-1/"))).toBe(true);

    expect(result.current.guild.data?.guild?.memberCount).toBe(10);
    expect(result.current.botWide.data?.guildsCount).toBe(3);
    expect(result.current.tickets.data?.openCount).toBe(2);
    expect(result.current.giveaways.data?.activeCount).toBe(1);
    expect(result.current.backups.data?.kpis.healthStatus).toBe("HEALTHY");
  });

  it("one endpoint failing doesn't blank the others (Promise.allSettled resilience)", async () => {
    (global.fetch as jest.Mock).mockImplementation((input: unknown) => {
      const url = String(input);
      if (url.endsWith("/backups/overview")) return Promise.reject(new Error("network down"));
      return okResponse({ ok: true });
    });

    const { result } = renderHook(() => useGuildOverview("guild-1"));
    await waitFor(() => expect(result.current.backups.loading).toBe(false));

    expect(result.current.backups.error).toBe(true);
    expect(result.current.backups.data).toBeNull();
    expect(result.current.tickets.error).toBe(false);
    expect(result.current.tickets.loading).toBe(false);
  });

  it("refetches with the new guildId when guildId changes", async () => {
    const fetchSpy = (global.fetch as jest.Mock).mockImplementation(() => okResponse({ ok: true }));

    const { result, rerender } = renderHook(({ guildId }: { guildId: string }) => useGuildOverview(guildId), {
      initialProps: { guildId: "guild-1" },
    });
    await waitFor(() => expect(result.current.tickets.loading).toBe(false));
    expect(fetchSpy.mock.calls.some((c) => String(c[0]).includes("/api/guilds/guild-1/"))).toBe(true);

    fetchSpy.mockClear();
    rerender({ guildId: "guild-2" });
    await waitFor(() => expect(result.current.tickets.loading).toBe(false));
    expect(fetchSpy.mock.calls.every((c) => String(c[0]).includes("/api/guilds/guild-2/"))).toBe(true);
  });
});
