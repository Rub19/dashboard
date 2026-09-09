import { renderHook, waitFor, act } from "@testing-library/react";
import { useSecurity, decodeSessionIdFromAccessToken } from "./useSecurity";
import { fetchWorker, getToken } from "../api";

jest.mock("../api");

const mockedFetchWorker = fetchWorker as jest.MockedFunction<typeof fetchWorker>;
const mockedGetToken = getToken as jest.MockedFunction<typeof getToken>;

function fakeAccessToken(payload: Record<string, unknown>): string {
  const base64url = (obj: Record<string, unknown>) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  return `${base64url({ alg: "HS256", typ: "JWT" })}.${base64url(payload)}.signature`;
}

describe("decodeSessionIdFromAccessToken", () => {
  it("extracts the session_id claim from a well-formed access token", () => {
    const token = fakeAccessToken({ sub: "user-1", session_id: "sess-abc-123" });
    expect(decodeSessionIdFromAccessToken(token)).toBe("sess-abc-123");
  });

  it("returns null when there is no session_id claim (legacy/system token)", () => {
    const token = fakeAccessToken({ sub: "user-1" });
    expect(decodeSessionIdFromAccessToken(token)).toBeNull();
  });

  it("returns null for a malformed or missing token", () => {
    expect(decodeSessionIdFromAccessToken(null)).toBeNull();
    expect(decodeSessionIdFromAccessToken(undefined)).toBeNull();
    expect(decodeSessionIdFromAccessToken("not-a-jwt")).toBeNull();
    expect(decodeSessionIdFromAccessToken("only.two")).toBeNull();
  });
});

describe("useSecurity", () => {
  beforeEach(() => {
    mockedFetchWorker.mockReset();
    mockedGetToken.mockReset();
  });

  it("marks the device matching the current token's session_id as current", async () => {
    mockedGetToken.mockResolvedValue(fakeAccessToken({ sub: "user-1", session_id: "sess-current" }));
    mockedFetchWorker.mockImplementation(async (path) => {
      const p = String(path);
      if (p.startsWith("/api/auth/devices")) {
        return {
          data: [
            { id: "d1", name: "Windows Chrome", session_id: "sess-current", trusted: true, created_at: "2026-01-01T00:00:00Z" },
            { id: "d2", name: "iPhone Safari", session_id: "sess-other", trusted: false, created_at: "2026-01-01T00:00:00Z" },
          ],
        };
      }
      if (p.startsWith("/api/auth/security-events")) return { data: [] };
      if (p.startsWith("/api/auth/passkeys")) return { data: [] };
      return { data: [] };
    });

    const { result } = renderHook(() => useSecurity());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.currentSessionId).toBe("sess-current");
    const d1 = result.current.devices.find((d) => d.id === "d1");
    const d2 = result.current.devices.find((d) => d.id === "d2");
    expect(d1?.current).toBe(true);
    expect(d2?.current).toBe(false);
  });

  it("no device is marked current when the token carries no session_id", async () => {
    mockedGetToken.mockResolvedValue(fakeAccessToken({ sub: "user-1" }));
    mockedFetchWorker.mockImplementation(async (path) => {
      const p = String(path);
      if (p.startsWith("/api/auth/devices")) {
        return { data: [{ id: "d1", name: "Windows Chrome", session_id: null, trusted: true, created_at: "2026-01-01T00:00:00Z" }] };
      }
      return { data: [] };
    });

    const { result } = renderHook(() => useSecurity());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.currentSessionId).toBeNull();
    expect(result.current.devices[0]?.current).toBe(false);
  });

  it("revokeDevice sends confirmCurrent and reloads", async () => {
    mockedGetToken.mockResolvedValue(null);
    mockedFetchWorker.mockImplementation(async (path) => {
      const p = String(path);
      if (p === "/api/auth/device/revoke") return { data: { revoked: true } };
      return { data: [] };
    });

    const { result } = renderHook(() => useSecurity());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.revokeDevice("d1", true);
    });

    expect(mockedFetchWorker).toHaveBeenCalledWith(
      "/api/auth/device/revoke",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ deviceId: "d1", confirmCurrent: true }),
      })
    );
  });

  it("revokeOtherDevices calls the revoke-others route and returns the result", async () => {
    mockedGetToken.mockResolvedValue(null);
    mockedFetchWorker.mockImplementation(async (path) => {
      const p = String(path);
      if (p === "/api/auth/device/revoke-others") return { data: { revokedCount: 2, revokedDeviceIds: ["d2", "d3"] } };
      return { data: [] };
    });

    const { result } = renderHook(() => useSecurity());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const res = await act(async () => result.current.revokeOtherDevices());
    expect(mockedFetchWorker).toHaveBeenCalledWith(
      "/api/auth/device/revoke-others",
      expect.objectContaining({ method: "POST" })
    );
    expect(res).toEqual({ revokedCount: 2, revokedDeviceIds: ["d2", "d3"] });
  });

  it("totpSetup, totpVerify and totpDisable call the right routes", async () => {
    mockedGetToken.mockResolvedValue(null);
    mockedFetchWorker.mockImplementation(async (path) => {
      const p = String(path);
      if (p === "/api/auth/totp/setup") return { data: { secret: "SECRET", otpauth: "otpauth://totp/x", backupCodes: ["a", "b"] } };
      if (p === "/api/auth/totp/verify") return { data: { enabled: true } };
      if (p === "/api/auth/totp/disable") return { data: { disabled: true } };
      return { data: [] };
    });

    const { result } = renderHook(() => useSecurity());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const setup = await act(async () => result.current.totpSetup("user@example.com"));
    expect(setup?.secret).toBe("SECRET");
    expect(mockedFetchWorker).toHaveBeenCalledWith(
      "/api/auth/totp/setup",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ email: "user@example.com" }) })
    );

    const verify = await act(async () => result.current.totpVerify("123456"));
    expect(verify?.enabled).toBe(true);
    expect(mockedFetchWorker).toHaveBeenCalledWith(
      "/api/auth/totp/verify",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ code: "123456" }) })
    );

    await act(async () => result.current.totpDisable());
    expect(mockedFetchWorker).toHaveBeenCalledWith(
      "/api/auth/totp/disable",
      expect.objectContaining({ method: "POST" })
    );
  });
});
