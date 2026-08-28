import { buildAuthUrl, exchangeCode, parseOAuthState, PROVIDERS } from "./oauth";
import { fetchWorker } from "./api";

jest.mock("./api");

const mockedFetchWorker = fetchWorker as jest.MockedFunction<typeof fetchWorker>;

describe("oauth", () => {
  beforeEach(() => {
    mockedFetchWorker.mockReset();
  });

  it("builds auth URL for github", () => {
    const url = buildAuthUrl("github", "client-123", { provider: "github", clientId: "client-123" });
    expect(url).toContain("https://github.com/login/oauth/authorize");
    expect(url).toContain("client_id=client-123");
    expect(url).toContain("response_type=code");
    expect(url).toContain("state=");
    expect(url).toContain("scope=read%3Auser");
  });

  it("exchanges code via worker", async () => {
    mockedFetchWorker.mockResolvedValue({ data: { connected: true } });
    const res = await exchangeCode("github", "code-456", "client-123");
    expect(mockedFetchWorker).toHaveBeenCalledWith("/api/github/oauth/exchange", {
      method: "POST",
      body: JSON.stringify({ code: "code-456", clientId: "client-123", redirectUri: "http://localhost/" }),
    });
    expect(res).toEqual({ data: { connected: true } });
  });

  it("parses OAuth state", () => {
    expect(parseOAuthState('{"provider":"github","clientId":"c1"}')).toEqual({ provider: "github", clientId: "c1" });
    expect(parseOAuthState("github")).toEqual({ provider: "github", clientId: "" });
  });

  it("covers all expected providers", () => {
    expect(Object.keys(PROVIDERS).sort()).toEqual([
      "discord", "github", "google-calendar", "google-drive", "notion", "reddit", "spotify", "todoist", "twitch", "youtube",
    ]);
  });
});
