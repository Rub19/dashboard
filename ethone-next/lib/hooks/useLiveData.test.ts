import React from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { useLiveData } from "./useLiveData";
import { fetchWorker } from "../api";
import SettingsProvider from "@/components/SettingsProvider";

jest.mock("../api");

const mockedFetchWorker = fetchWorker as jest.MockedFunction<typeof fetchWorker>;

const SETTINGS_KEY = "ethone-settings-v1";

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(SettingsProvider, null, children);
}

function allCalls() {
  return mockedFetchWorker.mock.calls.map((c) => String(c[0]));
}

describe("useLiveData", () => {
  beforeEach(() => {
    mockedFetchWorker.mockReset();
    localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({ liveLanyardUserId: "123456789", liveWeatherCity: "Paris" })
    );
    mockedFetchWorker.mockImplementation(async (path) => {
      const p = String(path);
      if (p === "/api/connections") return { data: [{ provider: "github", connected: true }] };
      if (p === "/api/profiles") return { data: { list: [], active: null } };
      if (p.startsWith("/api/weather")) return { data: { temperature: 22, condition: "Sunny" } };
      if (p.startsWith("/api/github/profile")) return { data: { login: "testuser" } };
      if (p.startsWith("/api/lanyard/presence")) return { data: { discord_status: "online" } };
      if (p.startsWith("/api/tracker/valorant-matches")) return { data: [{ map: "Ascent", mode: "Competitive" }] };
      if (p.startsWith("/api/tracker/lol-matches")) return { data: [{ champion: "Ahri", result: "Win" }] };
      if (p.startsWith("/api/steam/player")) return { data: { personaName: "SteamUser" } };
      if (p.startsWith("/api/minecraft/profile")) return { data: { name: "MinecraftUser" } };
      if (p.startsWith("/api/lastfm/recent-tracks")) return { data: { track: [{ name: "Track", artist: "Artist" }] } };
      if (p.startsWith("/api/twitch/channel")) return { data: { channel: { displayName: "TwitchUser", isLive: false } } };
      return { data: null };
    });
  });

  it("loads connections and fetches provider data", async () => {
    const { result } = renderHook(() => useLiveData(60_000), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 3000 });
    await waitFor(() => expect(allCalls()).toContain("/api/lanyard/presence?userId=123456789"), { timeout: 3000 });

    const calls = allCalls();
    expect(calls).toContain("/api/connections");
    expect(calls).toContain("/api/weather?city=Paris");
    expect(calls).toContain("/api/github/profile");
  });

  it("skips unconnected providers", async () => {
    mockedFetchWorker.mockImplementation(async (path) => {
      if (String(path) === "/api/connections") return { data: [] };
      if (String(path) === "/api/profiles") return { data: { list: [], active: null } };
      return { data: null };
    });

    const { result } = renderHook(() => useLiveData(60_000), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 3000 });

    const calls = allCalls();
    expect(calls).toContain("/api/connections");
    expect(calls).not.toContain("/api/github/profile");
  });
});
