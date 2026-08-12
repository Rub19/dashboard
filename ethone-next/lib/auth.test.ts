import { signOut, sendOtp, verifyOtp, signInWithPasskey } from "./auth";
import { fetchWorker } from "./api";
import { supabase } from "./supabase";

jest.mock("./api");
jest.mock("./rate-limiter", () => ({
  consumeAuthAttempt: jest.fn().mockReturnValue({ allowed: true, retryAfterMs: 0 }),
  resetAuthAttempt: jest.fn(),
}));
jest.mock("./supabase", () => ({
  supabase: {
    auth: {
      signOut: jest.fn().mockResolvedValue({ error: null }),
      verifyOtp: jest.fn().mockResolvedValue({ data: { session: { access_token: "x" } } }),
      setSession: jest.fn().mockResolvedValue({ data: { session: { access_token: "x" } }, error: null }),
    },
  },
}));

const mockedFetchWorker = fetchWorker as jest.MockedFunction<typeof fetchWorker>;

describe("auth", () => {
  beforeEach(() => {
    mockedFetchWorker.mockReset();
  });

  it("calls /api/signout before local supabase signOut", async () => {
    mockedFetchWorker.mockResolvedValue({ data: { ok: true } });
    await signOut();
    expect(mockedFetchWorker).toHaveBeenCalledWith("/api/signout", { method: "POST" });
    expect(supabase.auth.signOut).toHaveBeenCalled();
  });

  it("still signs out locally when /api/signout fails", async () => {
    mockedFetchWorker.mockRejectedValue(new Error("Worker down"));
    await signOut();
    expect(supabase.auth.signOut).toHaveBeenCalled();
  });

  it("calls /api/auth/otp/send", async () => {
    mockedFetchWorker.mockResolvedValue({ data: { sent: true, userId: "u1", expiresIn: 600000 } });
    const res = await sendOtp("rub19.mailpro@gmail.com");
    expect(mockedFetchWorker).toHaveBeenCalledWith(
      "/api/auth/otp/send",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email: "rub19.mailpro@gmail.com" }),
      })
    );
    expect(res.ok).toBe(true);
  });

  it("calls /api/auth/otp/verify", async () => {
    mockedFetchWorker.mockResolvedValue({ data: { token: "token-hash-1" } });
    const res = await verifyOtp("u1", "rub19.mailpro@gmail.com", "123456");
    expect(mockedFetchWorker).toHaveBeenCalledWith(
      "/api/auth/otp/verify",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ userId: "u1", email: "rub19.mailpro@gmail.com", code: "123456" }),
      })
    );
    expect(res.ok).toBe(true);
  });

  it("calls /api/auth/passkey/* for sign-in", async () => {
    const mockCredential = {
      rawId: new Uint8Array([1, 2, 3]).buffer,
      response: {
        clientDataJSON: new Uint8Array([4, 5]).buffer,
        authenticatorData: new Uint8Array([6]).buffer,
        signature: new Uint8Array([7]).buffer,
        userHandle: new Uint8Array([8]).buffer,
      },
    };
    Object.defineProperty(window.navigator, "credentials", {
      value: { get: jest.fn().mockResolvedValue(mockCredential) },
      configurable: true,
    });
    mockedFetchWorker
      .mockResolvedValueOnce({ data: { challenge: "abc", allowCredentials: [{ id: "c1", type: "public-key" }] } })
      .mockResolvedValueOnce({ data: { token_hash: "hash-1" } });
    const res = await signInWithPasskey("rub19.mailpro@gmail.com");
    expect(mockedFetchWorker).toHaveBeenCalledWith(
      "/api/auth/passkey/authenticate-options",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email: "rub19.mailpro@gmail.com" }),
      })
    );
    expect(res.ok).toBe(true);
  });
});
